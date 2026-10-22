-- Redo, part 3: publishing, version history, audit trail and retention.
--
-- Multi-step writes are single Postgres functions so they are atomic. They run
-- as the caller (security invoker), so row-level security still applies.
-- Rollback: drop the functions and triggers created here.

-- ---------------------------------------------------------------------------
-- Publishing
-- ---------------------------------------------------------------------------

-- Columns a draft can never set: identity, bookkeeping and what publish sets.
create or replace function public.draft_protected_columns()
returns text[]
language sql
immutable
as $$
  select array['id', 'created_at', 'updated_at', 'published_at', 'status', 'locked', 'kind', 'updated_by']
$$;

-- Make an item's draft live: copy its fields onto the row, set the status,
-- snapshot what is now live, drop the draft, and record the current English
-- hashes so the translation queue can tell which Greek is stale.
--   _english_hashes: [{ "entity_type": "page_section", "entity_id": "…", "hash": "…" }]
create or replace function public.publish_draft(
  _entity_type text,
  _entity_id uuid,
  _status text default 'published',
  _english_hashes jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  _table text := public.entity_table(_entity_type);
  _data jsonb;
  _assignments text;
  _snapshot jsonb;
begin
  if _table is null then
    raise exception 'Unknown content type: %', _entity_type using errcode = '22023';
  end if;
  if _status not in ('published', 'hidden', 'draft') then
    raise exception 'Unknown status: %', _status using errcode = '22023';
  end if;

  select d.data into _data
  from public.content_drafts d
  where d.entity_type = _entity_type and d.entity_id = _entity_id
  for update;

  if _data is not null then
    select string_agg(format('%1$I = r.%1$I', c.column_name), ', ')
    into _assignments
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = _table
      and c.is_generated = 'NEVER'
      and _data ? c.column_name
      and c.column_name <> all (public.draft_protected_columns());
  end if;

  execute format(
    'update public.%1$I t set %2$s status = $3, published_at = case when $3 = ''published'' then coalesce(t.published_at, now()) else t.published_at end
     from jsonb_populate_record(null::public.%1$I, $1) r
     where t.id = $2
     returning to_jsonb(t)',
    _table,
    coalesce(_assignments || ',', '')
  )
  into _snapshot
  using coalesce(_data, '{}'::jsonb), _entity_id, _status;

  if _snapshot is null then
    raise exception 'Not found or not allowed: % %', _entity_type, _entity_id using errcode = '42501';
  end if;

  delete from public.content_drafts where entity_type = _entity_type and entity_id = _entity_id;

  if _status = 'published' then
    insert into public.content_versions (entity_type, entity_id, snapshot, created_by)
    values (_entity_type, _entity_id, _snapshot, auth.uid());
  end if;

  update public.content_translations ct
  set english_hash = h.hash
  from jsonb_to_recordset(_english_hashes) as h (entity_type text, entity_id text, hash text)
  where ct.entity_type = h.entity_type and ct.entity_id = h.entity_id;

  return _snapshot;
end;
$$;

-- Load a published version into the draft. Never changes the live item.
create or replace function public.restore_version(_version_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  _v public.content_versions;
  _data jsonb;
begin
  select * into _v from public.content_versions where id = _version_id;
  if _v.id is null then
    raise exception 'Version not found' using errcode = 'P0002';
  end if;

  _data := _v.snapshot - public.draft_protected_columns();

  insert into public.content_drafts (entity_type, entity_id, data, updated_by)
  values (_v.entity_type, _v.entity_id, _data, auth.uid())
  on conflict (entity_type, entity_id)
  do update set data = excluded.data, updated_by = excluded.updated_by;

  return _data;
end;
$$;

-- Keep the newest 20 published versions of each item.
create or replace function public.trim_content_versions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.content_versions
  where id in (
    select id from public.content_versions
    where entity_type = new.entity_type and entity_id = new.entity_id
    order by created_at desc, id desc
    offset 20
  );
  return null;
end;
$$;

drop trigger if exists content_versions_trim on public.content_versions;
create trigger content_versions_trim
  after insert on public.content_versions
  for each row execute function public.trim_content_versions();

revoke all on function public.publish_draft(text, uuid, text, jsonb) from public, anon;
revoke all on function public.restore_version(uuid) from public, anon;
grant execute on function public.publish_draft(text, uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.restore_version(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Audit trail. Triggers record every change however it was made, so a write
-- that skips the studio is still on record.
--   'content'      changed columns with their old and new values
--                  (values over 2 KB are noted, not copied)
--   'private'      changed column names only (personal data stays out)
--   'skip_system'  like content, but ignores writes with no signed-in user
--                  (background sync jobs)
-- ---------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _mode text := coalesce(tg_argv[0], 'content');
  _actor uuid := auth.uid();
  _old jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  _new jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  _row jsonb := coalesce(_new, _old);
  _changed text[];
  _before jsonb;
  _after jsonb;
begin
  if _mode = 'skip_system' and _actor is null then
    return null;
  end if;

  select coalesce(array_agg(k order by k), '{}')
  into _changed
  from (
    select jsonb_object_keys(coalesce(_new, '{}'::jsonb)) as k
    union
    select jsonb_object_keys(coalesce(_old, '{}'::jsonb))
  ) keys
  where k <> 'updated_at'
    and (coalesce(_old -> k, 'null'::jsonb) is distinct from coalesce(_new -> k, 'null'::jsonb));

  if tg_op = 'UPDATE' and cardinality(_changed) = 0 then
    return null;
  end if;

  if _mode <> 'private' then
    select
      jsonb_object_agg(k, case when pg_column_size(_old -> k) > 2048 then '"(large value)"'::jsonb else _old -> k end)
        filter (where _old is not null),
      jsonb_object_agg(k, case when pg_column_size(_new -> k) > 2048 then '"(large value)"'::jsonb else _new -> k end)
        filter (where _new is not null)
    into _before, _after
    from unnest(_changed) as k;
  end if;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, changed, before, after)
  values (
    _actor,
    lower(tg_op),
    tg_table_name,
    coalesce(
      _row ->> 'id',
      _row ->> 'key',
      _row ->> 'provider',
      (_row ->> 'entity_type') || ':' || (_row ->> 'entity_id')
    ),
    _changed,
    _before,
    _after
  );
  return null;
end;
$$;

do $$
declare
  t text;
  spec text[];
begin
  foreach spec slice 1 in array array[
    -- content
    ['pages', 'content'], ['blog_posts', 'content'], ['blog_categories', 'content'],
    ['books', 'content'], ['book_formats', 'content'], ['book_files', 'content'],
    ['book_reviews', 'content'], ['audiobooks', 'content'], ['audiobook_tracks', 'content'],
    ['products', 'content'], ['product_categories', 'content'], ['product_images', 'content'],
    ['gallery_sections', 'content'], ['gallery_images', 'content'],
    ['foundation_stories', 'content'], ['foundation_categories', 'content'],
    ['masterclasses', 'content'], ['events', 'content'], ['press_mentions', 'content'],
    ['testimonials', 'content'], ['media_assets', 'content'], ['site_settings', 'content'],
    ['navigation_items', 'content'], ['social_links', 'content'], ['email_templates', 'content'],
    ['consent_texts', 'content'], ['content_translations', 'content'],
    ['ui_string_reviews', 'content'], ['preview_tokens', 'content'], ['newsletters', 'content'],
    ['user_roles', 'content'],
    -- written by background jobs as well as people
    ['videos', 'skip_system'], ['redirects', 'skip_system'],
    -- personal data: names of changed columns only
    ['subscribers', 'private'], ['leads', 'private'], ['contact_messages', 'private'],
    ['orders', 'private'], ['donations', 'private']
  ] loop
    t := spec[1];
    execute format('drop trigger if exists audit on public.%I', t);
    execute format(
      'create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_row_change(%L)',
      t, spec[2]
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Retention, run daily by the worker's cron with the service role.
-- ---------------------------------------------------------------------------
create or replace function public.purge_expired()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _result jsonb := '{}'::jsonb;
  _n integer;
begin
  delete from public.subscribers
  where confirmed_at is null
    and coalesce(consent_source, '') <> 'legacy_single_opt_in'
    and created_at < now() - interval '30 days';
  get diagnostics _n = row_count;
  _result := _result || jsonb_build_object('unconfirmed_subscribers', _n);

  delete from public.contact_messages
  where archived_at is not null and archived_at < now() - interval '24 months';
  get diagnostics _n = row_count;
  _result := _result || jsonb_build_object('contact_messages', _n);

  delete from public.leads l
  where l.created_at < now() - interval '24 months'
    and not exists (
      select 1 from public.subscribers s
      where s.id = l.subscriber_id and s.confirmed_at is not null and s.unsubscribed_at is null
    );
  get diagnostics _n = row_count;
  _result := _result || jsonb_build_object('leads', _n);

  update public.email_outbox set params = null
  where params is not null
    and (sent_at < now() - interval '7 days' or created_at < now() - interval '7 days');
  delete from public.email_outbox where created_at < now() - interval '12 months';

  delete from public.rate_limits where window_start < now() - interval '2 days';
  delete from public.download_tokens where expires_at < now() - interval '30 days';
  delete from public.preview_tokens where expires_at < now() - interval '30 days';
  delete from public.audit_log where created_at < now() - interval '24 months';

  return _result;
end;
$$;

revoke all on function public.purge_expired() from public, anon, authenticated;
grant execute on function public.purge_expired() to service_role;

-- ---------------------------------------------------------------------------
-- What visitors may know about private tables, and nothing more.
-- ---------------------------------------------------------------------------

-- Which published books have a free download, and in which languages. The
-- files themselves stay private until the reader fills in the form.
create or replace function public.free_download_locales(_book_ids uuid[])
returns table (book_id uuid, locale text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct f.book_id, f.locale
  from public.book_files f
  join public.books b on b.id = f.book_id
  where f.purpose = 'free_download'
    and b.status = 'published'
    and f.book_id = any (_book_ids);
$$;

-- Whether readers can pay here, and the Turnstile site key (public by design).
create or replace function public.public_integrations()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'payments', coalesce(
      (select status = 'connected' from public.integration_secrets where provider = 'stripe'),
      false
    ),
    'turnstileSiteKey', (
      select config ->> 'site_key' from public.integration_secrets
      where provider = 'turnstile' and status = 'connected'
    )
  );
$$;

revoke all on function public.free_download_locales(uuid[]) from public;
revoke all on function public.public_integrations() from public;
grant execute on function public.free_download_locales(uuid[]) to anon, authenticated, service_role;
grant execute on function public.public_integrations() to anon, authenticated, service_role;
