-- Redo, part 2: collections, commerce and audience.
--
-- Additive and idempotent. Existing columns stay so the current site keeps
-- working until each page is rebuilt. Collection items that have their own
-- page (books, products, masterclasses, stories, events) get a sections list
-- shown after their fixed header.
-- Rollback: drop the tables created here and the columns added below.

-- ---------------------------------------------------------------------------
-- Blog
-- ---------------------------------------------------------------------------
alter table public.blog_posts add column if not exists category_id uuid references public.blog_categories (id) on delete set null;
alter table public.blog_posts add column if not exists cover_media_id uuid references public.media_assets (id) on delete set null;
alter table public.blog_posts add column if not exists seo_title text not null default '';
alter table public.blog_posts add column if not exists seo_description text not null default '';
alter table public.blog_posts add column if not exists reading_minutes integer check (reading_minutes > 0);
alter table public.blog_posts add column if not exists published_at timestamptz;
alter table public.blog_posts add column if not exists featured boolean not null default false;

update public.blog_posts
set published_at = publish_date::timestamptz
where published_at is null and status = 'published';

create index if not exists blog_posts_published_idx on public.blog_posts (status, published_at desc);

-- ---------------------------------------------------------------------------
-- Books, their formats, files and reviews
-- ---------------------------------------------------------------------------
alter table public.books add column if not exists subtitle text not null default '';
alter table public.books add column if not exists cover_media_id uuid references public.media_assets (id) on delete set null;
alter table public.books add column if not exists featured boolean not null default false;
alter table public.books add column if not exists sections jsonb not null default '[]'::jsonb;
alter table public.books add column if not exists seo_title text not null default '';
alter table public.books add column if not exists seo_description text not null default '';
alter table public.books add column if not exists published_at timestamptz;

do $$
declare
  t text;
begin
  -- Allow drafts alongside published and hidden.
  foreach t in array array['books', 'products'] loop
    if exists (select 1 from pg_constraint where conname = t || '_status_check')
       and not exists (
         select 1 from pg_constraint
         where conname = t || '_status_check' and pg_get_constraintdef(oid) like '%draft%'
       ) then
      execute format('alter table public.%I drop constraint %I', t, t || '_status_check');
      execute format(
        'alter table public.%I add constraint %I check (status in (''draft'', ''published'', ''hidden''))',
        t, t || '_status_check'
      );
    end if;
  end loop;
end;
$$;

-- A format is either sold here (Stripe price) or elsewhere (retailer link).
-- locale null means the format applies to both languages.
create table if not exists public.book_formats (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  format text not null check (format in ('paperback', 'hardcover', 'ebook', 'audiobook')),
  locale text check (locale in ('en', 'el')),
  price_cents integer check (price_cents >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  stripe_price_id text,
  external_url text check (external_url is null or external_url ~ '^https://'),
  retailer text not null default '',
  isbn text not null default '',
  -- Paid digital formats deliver this file (in the private downloads bucket).
  delivery_media_id uuid references public.media_assets (id) on delete set null,
  available boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists book_formats_unique_idx
  on public.book_formats (book_id, format, coalesce(locale, '*'));

-- Free files given away behind the name-and-email form, and samples, per language.
create table if not exists public.book_files (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  locale text not null check (locale in ('en', 'el')),
  purpose text not null check (purpose in ('free_download', 'sample')),
  media_id uuid not null references public.media_assets (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (book_id, locale, purpose, media_id)
);

alter table public.book_reviews add column if not exists source text not null default '';
alter table public.book_reviews add column if not exists published boolean not null default true;

-- ---------------------------------------------------------------------------
-- Audiobooks: one per book and language; chapters point at audio assets.
-- ---------------------------------------------------------------------------
create table if not exists public.audiobooks (
  id uuid primary key default gen_random_uuid(),
  book_id uuid references public.books (id) on delete set null,
  locale text not null check (locale in ('en', 'el')),
  title text not null,
  subtitle text not null default '',
  narrator text not null default '',
  description text not null default '',
  cover_media_id uuid references public.media_assets (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  featured boolean not null default false,
  position integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audiobooks_locale_idx on public.audiobooks (locale, status, position);

create table if not exists public.audiobook_tracks (
  id uuid primary key default gen_random_uuid(),
  audiobook_id uuid not null references public.audiobooks (id) on delete cascade,
  title text not null,
  audio_media_id uuid references public.media_assets (id) on delete set null,
  duration_seconds numeric(10, 2) check (duration_seconds >= 0),
  -- Chapters not free to stream live in the private bucket and need a purchase.
  free_to_stream boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audiobook_tracks_book_idx on public.audiobook_tracks (audiobook_id, position);

-- ---------------------------------------------------------------------------
-- Shop (Buy now straight to Stripe Checkout; no cart)
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists price_cents integer check (price_cents >= 0);
alter table public.products add column if not exists compare_at_cents integer check (compare_at_cents >= 0);
alter table public.products add column if not exists currency text not null default 'EUR';
alter table public.products add column if not exists stock integer check (stock >= 0);
alter table public.products add column if not exists stripe_price_id text;
alter table public.products add column if not exists cover_media_id uuid references public.media_assets (id) on delete set null;
alter table public.products add column if not exists delivery_media_id uuid references public.media_assets (id) on delete set null;
alter table public.products add column if not exists sections jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists seo_title text not null default '';
alter table public.products add column if not exists seo_description text not null default '';
alter table public.products add column if not exists published_at timestamptz;

alter table public.product_images add column if not exists media_id uuid references public.media_assets (id) on delete cascade;
alter table public.product_images alter column image_url drop not null;

-- ---------------------------------------------------------------------------
-- Gallery: sections become albums; images reference the media library.
-- ---------------------------------------------------------------------------
alter table public.gallery_sections add column if not exists description text not null default '';
alter table public.gallery_sections add column if not exists cover_media_id uuid references public.media_assets (id) on delete set null;
alter table public.gallery_sections add column if not exists published boolean not null default true;

alter table public.gallery_images add column if not exists media_id uuid references public.media_assets (id) on delete cascade;
alter table public.gallery_images add column if not exists published boolean not null default true;
alter table public.gallery_images alter column image_url drop not null;

-- ---------------------------------------------------------------------------
-- Foundation stories
-- ---------------------------------------------------------------------------
alter table public.foundation_stories add column if not exists cover_media_id uuid references public.media_assets (id) on delete set null;
alter table public.foundation_stories add column if not exists sections jsonb not null default '[]'::jsonb;
alter table public.foundation_stories add column if not exists seo_title text not null default '';
alter table public.foundation_stories add column if not exists seo_description text not null default '';
-- A story about a real person needs their consent on record before it is
-- published; anonymise shows first name only and hides face photos.
alter table public.foundation_stories add column if not exists consent_recorded boolean not null default false;
alter table public.foundation_stories add column if not exists anonymise boolean not null default false;

-- ---------------------------------------------------------------------------
-- Masterclasses (many). Enrolment is an external link or a shop product; a
-- waitlist uses the lead form (source 'masterclass:<slug>'). No capacity
-- tracking or masterclass checkout in this redo. The single-row masterclass
-- table is copied once and retired after launch.
-- ---------------------------------------------------------------------------
create table if not exists public.masterclasses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  description text not null default '',
  included text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  schedule_note text not null default '',
  format text not null default 'online' check (format in ('online', 'in_person', 'hybrid')),
  location text not null default '',
  price_label text not null default '',
  enrol_url text check (enrol_url is null or enrol_url ~ '^(/|https://)'),
  enrol_product_id uuid references public.products (id) on delete set null,
  cover_media_id uuid references public.media_assets (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  availability text not null default 'open' check (availability in ('open', 'waitlist', 'closed')),
  sections jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  seo_title text not null default '',
  seo_description text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.masterclasses (slug, title, description, included, schedule_note, price_label, enrol_url, status, availability, published_at)
select
  'masterclass',
  coalesce(nullif(m.title, ''), 'Masterclass'),
  m.description,
  m.included,
  m.dates,
  m.price,
  case when m.enroll_url ~ '^https://' then m.enroll_url end,
  'published',
  case when m.status = 'open' then 'open' else 'closed' end,
  now()
from public.masterclass m
where not exists (select 1 from public.masterclasses)
limit 1;

-- ---------------------------------------------------------------------------
-- Events (talks, readings, signings) and press mentions
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  time_zone text not null default 'Asia/Nicosia',
  online boolean not null default false,
  venue text not null default '',
  city text not null default '',
  ticket_url text check (ticket_url is null or ticket_url ~ '^https://'),
  cover_media_id uuid references public.media_assets (id) on delete set null,
  sections jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  seo_title text not null default '',
  seo_description text not null default '',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_upcoming_idx on public.events (status, starts_at);

create table if not exists public.press_mentions (
  id uuid primary key default gen_random_uuid(),
  outlet text not null,
  headline text not null,
  published_on date,
  url text check (url is null or url ~ '^https://'),
  logo_media_id uuid references public.media_assets (id) on delete set null,
  published boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Videos synced from YouTube. Thumbnails are copied into the media library so
-- a page makes no request to Google until a visitor presses play.
-- ---------------------------------------------------------------------------
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_id text not null unique check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text not null,
  description text not null default '',
  published_at timestamptz,
  duration_seconds integer,
  thumbnail_media_id uuid references public.media_assets (id) on delete set null,
  hidden boolean not null default false,
  featured boolean not null default false,
  position integer,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists videos_listing_idx on public.videos (hidden, published_at desc);

-- ---------------------------------------------------------------------------
-- Testimonials. Seeded unpublished until Anastasia confirms each one.
-- ---------------------------------------------------------------------------
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  name text not null,
  role text not null default '',
  book_id uuid references public.books (id) on delete set null,
  photo_media_id uuid references public.media_assets (id) on delete set null,
  published boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audience: subscribers (double opt-in), leads (ebook gate, waitlists)
-- ---------------------------------------------------------------------------
alter table public.subscribers add column if not exists locale text not null default 'en';
alter table public.subscribers add column if not exists confirm_token_hash text;
alter table public.subscribers add column if not exists confirm_sent_at timestamptz;
alter table public.subscribers add column if not exists confirmed_at timestamptz;
alter table public.subscribers add column if not exists consent_key text;
alter table public.subscribers add column if not exists consent_version integer;
-- 'legacy_single_opt_in' for people who joined before double opt-in. Their
-- consent is never back-filled; whether they get newsletters is Joel's call.
alter table public.subscribers add column if not exists consent_source text;
alter table public.subscribers add column if not exists unsubscribed_at timestamptz;

update public.subscribers
set consent_source = 'legacy_single_opt_in'
where consent_source is null and confirmed_at is null;

create unique index if not exists subscribers_confirm_token_idx
  on public.subscribers (confirm_token_hash) where confirm_token_hash is not null;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(first_name) between 1 and 120),
  email text not null check (length(email) between 3 and 320),
  email_normalized text generated always as (lower(btrim(email))) stored,
  locale text not null default 'en' check (locale in ('en', 'el')),
  -- 'ebook:<book slug>' or 'masterclass:<slug>'
  source text not null check (source ~ '^(ebook|masterclass):[a-z0-9-]+$'),
  book_id uuid references public.books (id) on delete set null,
  consent_key text not null,
  consent_version integer not null,
  newsletter_opt_in boolean not null default false,
  subscriber_id uuid references public.subscribers (id) on delete set null,
  last_requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (email_normalized, source)
);

create index if not exists leads_created_idx on public.leads (created_at desc);

-- ---------------------------------------------------------------------------
-- Orders and donations, written only by the server and the Stripe webhook.
-- Rows are created before Checkout and keyed by our own id.
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  email text,
  name text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'refunded', 'cancelled', 'failed')),
  fulfilment_status text not null default 'not_required'
    check (fulfilment_status in ('not_required', 'unfulfilled', 'shipped')),
  currency text not null default 'EUR',
  subtotal_cents integer not null default 0,
  tax_cents integer not null default 0,
  shipping_cents integer not null default 0,
  total_cents integer not null default 0,
  locale text not null default 'en' check (locale in ('en', 'el')),
  return_path text not null default '/',
  shipping_address jsonb,
  paid_at timestamptz,
  shipped_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_type text not null check (item_type in ('book_format', 'product')),
  item_id uuid not null,
  title text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_cents integer not null,
  total_cents integer not null,
  created_at timestamptz not null default now()
);

-- Download links for free files (lead) and paid digital items (order item).
create table if not exists public.download_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  lead_id uuid references public.leads (id) on delete cascade,
  order_item_id uuid references public.order_items (id) on delete cascade,
  media_id uuid not null references public.media_assets (id) on delete cascade,
  expires_at timestamptz not null,
  uses integer not null default 0,
  max_uses integer not null default 10,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  check (lead_id is not null or order_item_id is not null)
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  stripe_invoice_id text unique,
  stripe_subscription_id text,
  stripe_customer_id text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  interval text not null default 'one_off' check (interval in ('one_off', 'month')),
  donor_name text,
  donor_email text,
  message text,
  anonymous boolean not null default false,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'failed', 'refunded')),
  locale text not null default 'en' check (locale in ('en', 'el')),
  return_path text not null default '/foundation',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists donations_created_idx on public.donations (created_at desc);
create index if not exists donations_subscription_idx on public.donations (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Stripe event ids already applied, so webhook retries are no-ops.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Contact messages, newsletters, outgoing email
-- ---------------------------------------------------------------------------
alter table public.contact_messages add column if not exists read_at timestamptz;
alter table public.contact_messages add column if not exists archived_at timestamptz;
alter table public.contact_messages add column if not exists locale text not null default 'en';

update public.contact_messages set read_at = created_at where read and read_at is null;

alter table public.newsletters add column if not exists locale_mode text not null default 'per_subscriber'
  check (locale_mode in ('per_subscriber', 'english_to_all'));
alter table public.newsletters add column if not exists scheduled_for timestamptz;

-- Emails queued for sending. params holds what the template needs; links and
-- tokens in it are encrypted by the server, and params is cleared once sent.
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  template text not null,
  locale text not null default 'en' check (locale in ('en', 'el')),
  subject text not null default '',
  params jsonb,
  newsletter_id uuid references public.newsletters (id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  provider_id text,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_outbox_pending_idx on public.email_outbox (status, send_after)
  where status in ('queued', 'failed');
create unique index if not exists email_outbox_newsletter_idx on public.email_outbox (newsletter_id, to_email)
  where newsletter_id is not null;

-- ---------------------------------------------------------------------------
-- updated_at triggers for the new tables
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'book_formats', 'audiobooks', 'audiobook_tracks', 'masterclasses', 'events', 'press_mentions',
    'videos', 'testimonials', 'orders', 'donations', 'email_outbox'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated', t
    );
  end loop;
end;
$$;
