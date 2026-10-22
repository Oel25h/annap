-- Redo, part 1: platform tables shared by every content type.
--
-- Additive and idempotent: safe to replay against production, whose schema is
-- not fully captured by earlier migrations. Nothing is dropped or renamed.
-- Rollback: drop the tables created here (none existed before) and the columns
-- added to content_translations.

-- ---------------------------------------------------------------------------
-- Who may do what. Both checks require a two-factor (aal2) session.
-- ---------------------------------------------------------------------------
-- A signed-out or revoked session stops working at once, not when its access
-- token expires.
create or replace function public.session_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions
    where id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and (not_after is null or not_after > now())
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and public.has_role(auth.uid(), 'admin')
     and public.session_is_active()
$$;

-- Translators review Greek. Admins can do everything a translator can.
create or replace function public.is_translator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and (public.has_role(auth.uid(), 'translator') or public.has_role(auth.uid(), 'admin'))
     and public.session_is_active()
$$;

revoke all on function public.session_is_active() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_translator() from public;
grant execute on function public.session_is_active() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.is_translator() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Media library. Alt text and captions are English; Greek is an overlay in
-- content_translations (entity_type 'media_asset') and goes through review.
-- ---------------------------------------------------------------------------
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('image', 'audio', 'video', 'document')),
  bucket text not null check (bucket in ('media', 'audio', 'downloads')),
  path text not null,
  original_name text,
  mime text not null,
  bytes bigint not null default 0 check (bytes >= 0),
  width integer check (width > 0),
  height integer check (height > 0),
  duration_seconds numeric(10, 2) check (duration_seconds >= 0),
  -- [{ "w": 480, "path": "…", "bytes": 1234 }, …], smallest first
  variants jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  dominant_color text check (dominant_color ~ '^#[0-9a-fA-F]{6}$'),
  -- Where crops should centre, as fractions of width and height.
  focal_x numeric(4, 3) not null default 0.5 check (focal_x between 0 and 1),
  focal_y numeric(4, 3) not null default 0.5 check (focal_y between 0 and 1),
  alt text not null default '',
  caption text not null default '',
  credit text not null default '',
  status text not null default 'uploading' check (status in ('uploading', 'ready', 'failed')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path)
);

create index if not exists media_assets_kind_created_idx on public.media_assets (kind, created_at desc);

-- ---------------------------------------------------------------------------
-- Site settings (one row) and integrations
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  id text primary key default 'site' check (id = 'site'),
  site_name text not null default 'Anastasia Patience',
  tagline text not null default '',
  contact_email text not null default '',
  default_seo_title text not null default '',
  default_seo_description text not null default '',
  social_image_id uuid references public.media_assets (id) on delete set null,
  logo_media_id uuid references public.media_assets (id) on delete set null,
  favicon_media_id uuid references public.media_assets (id) on delete set null,
  footer_text text not null default '',
  legal_name text not null default '',
  legal_address text not null default '',
  company_number text not null default '',
  vat_number text not null default '',
  charity_number text not null default '',
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values ('site') on conflict (id) do nothing;

-- Third-party keys, AES-GCM encrypted by the server with APP_ENCRYPTION_KEY.
-- RLS on with no policies and no grants: only the service role reaches it.
create table if not exists public.integration_secrets (
  provider text primary key
    check (provider in ('stripe', 'youtube', 'resend', 'gemini', 'turnstile')),
  ciphertext text,
  iv text,
  last4 text not null default '',
  -- Non-secret settings (YouTube channel id, Resend sender, Gemini model,
  -- Stripe webhook endpoint id). Secrets never go here.
  config jsonb not null default '{}'::jsonb,
  status text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error')),
  last_error text,
  checked_at timestamptz,
  -- Background jobs (YouTube sync) claim this lease so only one runs at a time.
  locked_until timestamptz,
  synced_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pages. The row holds what is live; unpublished edits live in content_drafts.
-- ---------------------------------------------------------------------------
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  path text not null unique
    check (path ~ '^/([a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9]+(-[a-z0-9]+)*)*)?$'),
  kind text not null default 'standard'
    check (kind in ('home', 'standard', 'collection', 'legal', 'links', 'system')),
  -- System pages (home, collection indexes, contact, start, legal) cannot be
  -- deleted and keep their path.
  locked boolean not null default false,
  title text not null,
  seo_title text not null default '',
  seo_description text not null default '',
  og_image_id uuid references public.media_assets (id) on delete set null,
  noindex boolean not null default false,
  -- Ordered sections: [{ "id": uuid, "type", "variant", "settings", "props" }]
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Drafts, versions and preview links for every publishable content type.
-- entity_type names the content type (see public.entity_table).
-- ---------------------------------------------------------------------------
create or replace function public.entity_table(_entity_type text)
returns text
language sql
immutable
as $$
  select case _entity_type
    when 'page' then 'pages'
    when 'blog_post' then 'blog_posts'
    when 'book' then 'books'
    when 'product' then 'products'
    when 'masterclass' then 'masterclasses'
    when 'foundation_story' then 'foundation_stories'
    when 'event' then 'events'
    when 'audiobook' then 'audiobooks'
  end
$$;

-- Unpublished edits: the editable fields of one item, as the studio saves them.
create table if not exists public.content_drafts (
  entity_type text not null check (public.entity_table(entity_type) is not null),
  entity_id uuid not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (entity_type, entity_id)
);

-- What was live after each publish. Restoring copies a version into the draft.
create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (public.entity_table(entity_type) is not null),
  entity_id uuid not null,
  snapshot jsonb not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists content_versions_entity_idx
  on public.content_versions (entity_type, entity_id, created_at desc);

-- Shareable read-only previews of a draft. Only the SHA-256 of the token is kept.
create table if not exists public.preview_tokens (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (public.entity_table(entity_type) is not null),
  entity_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '30 days')
);

create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique check (from_path ~ '^/'),
  to_path text not null check (to_path ~ '^(/|https://)'),
  status_code integer not null default 301 check (status_code in (301, 302)),
  enabled boolean not null default true,
  hits integer not null default 0,
  last_hit_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_path <> to_path)
);

-- ---------------------------------------------------------------------------
-- Navigation and social links (save straight to the live site, with undo)
-- ---------------------------------------------------------------------------
create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  menu text not null check (menu in ('header', 'footer', 'legal')),
  label text not null,
  page_id uuid references public.pages (id) on delete cascade,
  url text check (url is null or url ~ '^(/|https://|mailto:)'),
  parent_id uuid references public.navigation_items (id) on delete cascade,
  position integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (page_id is not null or url is not null)
);

create index if not exists navigation_items_menu_idx on public.navigation_items (menu, position);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in (
    'instagram', 'facebook', 'youtube', 'tiktok', 'x', 'linkedin', 'threads', 'spotify', 'email', 'website'
  )),
  url text not null check (url ~ '^(https://|mailto:)'),
  label text not null default '',
  position integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Words readers receive: email templates and versioned consent texts.
-- English here; Greek through the translation queue.
-- ---------------------------------------------------------------------------
create table if not exists public.email_templates (
  key text primary key check (key in (
    'newsletter_confirm', 'ebook_link', 'order_receipt', 'donation_thanks', 'contact_autoreply',
    'contact_notification', 'waitlist_confirm'
  )),
  subject text not null,
  body text not null default '',
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.consent_texts (
  id uuid primary key default gen_random_uuid(),
  key text not null check (key in ('newsletter', 'ebook_gate', 'contact', 'checkout', 'donation')),
  version integer not null,
  body text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (key, version)
);

-- ---------------------------------------------------------------------------
-- Audit log, written only by triggers (see redo_functions).
-- ---------------------------------------------------------------------------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  changed text[] not null default '{}',
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Translations.
--   fields        the approved Greek that is live
--   draft_fields  work in progress (Gemini drafts, edits); never public
--   source_hash   the English hash the live Greek was approved against
--   english_hash  the English hash now, refreshed on every English publish
-- Only the approve server function sets status 'approved', and it records who.
-- ---------------------------------------------------------------------------
alter table public.content_translations add column if not exists draft_fields jsonb;
alter table public.content_translations add column if not exists approved_by uuid references auth.users (id) on delete set null;
alter table public.content_translations add column if not exists english_hash text;
alter table public.content_translations add column if not exists field_hashes jsonb not null default '{}'::jsonb;
alter table public.content_translations add column if not exists origin text not null default 'human';
-- A stale translation whose English changed in substance can be pulled until updated.
alter table public.content_translations add column if not exists show_english boolean not null default false;
alter table public.content_translations add column if not exists updated_by uuid references auth.users (id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'content_translations_origin_check') then
    alter table public.content_translations
      add constraint content_translations_origin_check check (origin in ('human', 'machine', 'fixture'));
  end if;

  -- Greek that went live before this redo was Gemini output approved without a
  -- named reviewer. It moves back to draft, text kept, until a person approves it.
  update public.content_translations
  set draft_fields = coalesce(draft_fields, fields),
      fields = '{}'::jsonb,
      status = 'draft',
      origin = 'machine',
      approved_at = null
  where status = 'approved' and approved_by is null and origin <> 'fixture';

  if not exists (select 1 from pg_constraint where conname = 'content_translations_approved_by_check') then
    alter table public.content_translations
      add constraint content_translations_approved_by_check
      check (status <> 'approved' or approved_by is not null or origin = 'fixture');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'content_translations' and column_name = 'is_stale'
  ) then
    alter table public.content_translations
      add column is_stale boolean generated always as (
        status = 'approved' and english_hash is not null and source_hash is distinct from english_hash
      ) stored;
  end if;
end;
$$;

create index if not exists content_translations_status_idx on public.content_translations (entity_type, status);

-- Human approvals of the Greek UI strings in src/lib/i18n/messages/el.ts,
-- keyed by message path and the SHA-256 of the Greek text that was approved.
create table if not exists public.ui_string_reviews (
  key text not null,
  locale text not null default 'el' check (locale in ('el')),
  text_hash text not null,
  approved_by uuid not null references auth.users (id) on delete set null,
  approved_at timestamptz not null default now(),
  primary key (key, locale)
);

-- ---------------------------------------------------------------------------
-- Rate limiting for public forms. Workers share no memory between requests,
-- so counts live here. Callers pass a hashed key (IP or email, salted).
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

create or replace function public.hit_rate_limit(_key text, _limit integer, _window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  _start timestamptz := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds);
  _count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (_key, _start, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning count into _count;
  return _count <= _limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'media_assets', 'site_settings', 'integration_secrets', 'pages', 'content_drafts',
    'redirects', 'navigation_items', 'social_links', 'email_templates'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated', t
    );
  end loop;
end;
$$;
