-- Publishing, version history, audit trail and two-factor rules, exercised as
-- real sessions. Everything runs in one transaction that is rolled back.
\o /dev/null
begin;

create temporary table expect_results (name text, ok boolean) on commit drop;
grant all on expect_results to authenticated, anon;

create or replace function pg_temp.expect(_name text, _ok boolean) returns void language sql as $$
  insert into expect_results values (_name, coalesce(_ok, false));
$$;

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-0000-0000-00000000a001', 'admin@example.test', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000a002', 'translator@example.test', 'authenticated', 'authenticated');
insert into public.user_roles (user_id, role) values
  ('00000000-0000-0000-0000-00000000a001', 'admin'),
  ('00000000-0000-0000-0000-00000000a002', 'translator');

-- An admin with two-factor creates a page, drafts it and publishes it. -------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated","aal":"aal2"}', true);

insert into public.pages (id, path, title)
values ('00000000-0000-0000-0000-0000000000b1', '/test-page', 'Draft title');

insert into public.content_drafts (entity_type, entity_id, data)
values ('page', '00000000-0000-0000-0000-0000000000b1',
  '{"title": "Live title", "status": "hidden", "id": "00000000-0000-0000-0000-000000000000",
    "sections": [{"id": "5ec71011-0000-4000-8000-000000000001", "type": "rich_text", "props": {}}]}');

select pg_temp.expect('publish returns the live row',
  (public.publish_draft('page', '00000000-0000-0000-0000-0000000000b1') ->> 'title') = 'Live title');

select pg_temp.expect('page is live with the draft sections',
  (select status = 'published' and published_at is not null and jsonb_array_length(sections) = 1
   from public.pages where id = '00000000-0000-0000-0000-0000000000b1'));

select pg_temp.expect('a draft cannot change protected columns',
  exists (select 1 from public.pages where id = '00000000-0000-0000-0000-0000000000b1'));

select pg_temp.expect('the draft is gone after publishing',
  not exists (select 1 from public.content_drafts where entity_id = '00000000-0000-0000-0000-0000000000b1'));

select pg_temp.expect('publishing records a version',
  (select count(*) = 1 from public.content_versions where entity_id = '00000000-0000-0000-0000-0000000000b1'));

select pg_temp.expect('restoring a version returns its editable fields',
  (select r ->> 'title' = 'Live title' and not (r ? 'status') and not (r ? 'id')
   from (select public.restore_version((select id from public.content_versions
     where entity_id = '00000000-0000-0000-0000-0000000000b1')) as r) x));

select pg_temp.expect('restoring loads the draft without touching the live page',
  exists (select 1 from public.content_drafts where entity_id = '00000000-0000-0000-0000-0000000000b1')
  and (select status = 'published' from public.pages where id = '00000000-0000-0000-0000-0000000000b1'));

select pg_temp.expect('the audit log names the admin and the change',
  exists (select 1 from public.audit_log
    where entity_type = 'pages' and entity_id = '00000000-0000-0000-0000-0000000000b1'
      and action = 'update' and actor_id = '00000000-0000-0000-0000-00000000a001'
      and 'title' = any (changed) and after ->> 'title' = 'Live title'));

-- Only the newest 20 versions are kept.
do $$
begin
  for i in 1..22 loop
    perform public.publish_draft('page', '00000000-0000-0000-0000-0000000000b1');
  end loop;
end;
$$;
select pg_temp.expect('versions are trimmed to 20',
  (select count(*) = 20 from public.content_versions where entity_id = '00000000-0000-0000-0000-0000000000b1'));

-- Stale Greek: an approved translation becomes stale when the English changes.
insert into public.content_translations (entity_type, entity_id, locale, fields, status, source_hash, english_hash, approved_by, approved_at)
values ('page_section', '5ec71011-0000-4000-8000-000000000001', 'el', '{"body": "Γεια"}', 'approved', 'h1', 'h1',
  '00000000-0000-0000-0000-00000000a001', now());
select public.publish_draft('page', '00000000-0000-0000-0000-0000000000b1', 'published',
  '[{"entity_type": "page_section", "entity_id": "5ec71011-0000-4000-8000-000000000001", "hash": "h2"}]');
select pg_temp.expect('publishing new English marks approved Greek stale',
  (select is_stale from public.content_translations where entity_id = '5ec71011-0000-4000-8000-000000000001'));

-- An admin without two-factor gets nothing. --------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated","aal":"aal1"}', true);
select pg_temp.expect('aal1 admin cannot read pages', not exists (select 1 from public.pages));
select pg_temp.expect('aal1 admin still sees their own role',
  exists (select 1 from public.user_roles where user_id = '00000000-0000-0000-0000-00000000a001'));
do $$
begin
  update public.pages set title = 'hijack';
  if found then raise exception 'aal1 admin updated a page'; end if;
end;
$$;

-- A translator manages Greek but cannot change content. ----------------------------
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated","aal":"aal2"}', true);
select pg_temp.expect('translator reads pages', exists (select 1 from public.pages));
select pg_temp.expect('translator cannot read subscribers or orders',
  not exists (select 1 from public.subscribers) and not exists (select 1 from public.orders));
do $$
begin
  update public.pages set title = 'translator edit';
  if found then raise exception 'translator updated a page'; end if;
end;
$$;
update public.content_translations set draft_fields = '{"body": "Γεια σου"}'
where entity_id = '5ec71011-0000-4000-8000-000000000001';
select pg_temp.expect('translator edits Greek drafts',
  (select draft_fields ->> 'body' = 'Γεια σου' from public.content_translations
   where entity_id = '5ec71011-0000-4000-8000-000000000001'));

-- Visitors ----------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.expect('visitors see the published page', exists (select 1 from public.pages where path = '/test-page'));
select pg_temp.expect('visitors never see drafts', not exists (select 1 from public.content_drafts));
select pg_temp.expect('visitors never see the audit log', not exists (select 1 from public.audit_log));

reset role;
do $$
declare
  failed text;
begin
  select string_agg(name, '; ') into failed from expect_results where not ok;
  if failed is not null then raise exception 'Failed: %', failed; end if;
end;
$$;
\o
select count(*) || ' publishing checks ok' as result from expect_results;
rollback;
