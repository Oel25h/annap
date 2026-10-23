-- Sample rows for the LOCAL database only, so every public page and item page
-- can be checked (and the e2e specs run) before the real content arrives.
-- Never run against production.
--
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f scripts/content/local-fixtures.sql
--
-- Run it after the migrations and `bun scripts/seed-media.ts --local --fixtures`
-- (the photos it points at), and before scripts/content/greek-fixtures.ts,
-- which adds the Greek for the categories and the newest video. Safe to re-run.
--
-- 1. A masterclass, an upcoming and a past event, and a foundation story, each
--    with its item page; /events and /press published.
-- 2. Four videos (the mock's placeholder titles and durations), newest first,
--    with library photos as thumbnails, and a YouTube social link for the
--    channel link to fall back to.
-- 3. The five story categories, with the seeded posts moved from their legacy
--    text columns (category, read_time) onto category_id and reading_minutes.
-- 4. Three press mentions, one in Greek and one without a link.
-- 5. Two redirects.
\set ON_ERROR_STOP on
begin;

insert into public.masterclasses (slug, title, summary, description, included, starts_at, ends_at, schedule_note, format, location, price_label, status, availability, published_at)
values ('fixture-purpose-masterclass', 'Find your purpose in ninety days', 'A small online circle for women starting again after loss.',
  E'Twelve weeks, one call a week, homework you can do with a child on your hip.\n\nWe start with grief, move through faith, and finish with a plan you can hold.',
  E'Twelve live calls\nWorkbook (PDF)\nPrivate group for the cohort',
  '2026-12-01 18:00+02', '2027-02-23 19:30+02', 'Tuesdays, 18:00 Cyprus time', 'online', '', '€240', 'published', 'waitlist', now())
on conflict do nothing;

insert into public.events (slug, title, summary, starts_at, ends_at, time_zone, online, venue, city, ticket_url, status, published_at)
values
  ('fixture-book-evening-limassol', 'An evening with Find Your Reason to Smile', 'Readings, questions and tea.',
   '2026-12-12 19:00+02', '2026-12-12 21:00+02', 'Asia/Nicosia', false, 'Pattihio Theatre', 'Limassol', 'https://example.com/tickets', 'published', now()),
  ('fixture-past-reading', 'A reading in Accra', 'Where the book began.',
   '2026-03-02 17:00+00', null, 'Africa/Accra', false, 'Goethe-Institut', 'Accra', null, 'published', now())
on conflict do nothing;

insert into public.foundation_stories (slug, person_name, title, summary, body, location, status, published_at, category, consent_recorded, anonymise)
values ('fixture-maria-kitchen', 'Maria', 'A kitchen that feeds forty families', 'Every Friday the foundation kitchen in Larnaca cooks for forty families.',
  '<p>Maria came to the kitchen first as a guest. Now she runs the Friday shift.</p><p>She says the food is the easy part.</p>',
  'Larnaca', 'published', now(), 'Food assistance', true, true)
on conflict do nothing;

-- The seed keeps these two drafts until there is something to show.
update public.pages set status = 'published', published_at = coalesce(published_at, now())
where path in ('/events', '/press') and status = 'draft';

insert into public.videos (youtube_id, title, description, published_at, duration_seconds, thumbnail_media_id, hidden, featured, position)
values
  ('fixtureVid1', 'Inside Find Your Reason to Smile', E'Why I wrote it, and the chapter I almost left out.\n\nA longer second paragraph that the section never shows.', '2026-10-01 10:00+00', 522, '5eed0000-0000-4000-8000-000000000004', false, false, null),
  -- Sunset, not the second desk shot, so the feature never sits beside its own twin.
  ('fixtureVid2', 'A letter to the woman starting over', 'For anyone rebuilding after loss.', '2026-09-12 10:00+00', 665, '5eed0000-0000-4000-8000-000000000009', false, false, null),
  ('fixtureVid3', 'Two suitcases and a promise', 'From Ghana to Cyprus.', '2026-08-20 10:00+00', 552, '5eed0000-0000-4000-8000-000000000008', false, false, null),
  ('fixtureVid4', 'Reading chapter one aloud', 'The first chapter, in my own voice.', '2026-07-30 10:00+00', 390, '5eed0000-0000-4000-8000-000000000010', false, false, null)
on conflict (youtube_id) do nothing;

insert into public.social_links (platform, url, label, position)
select 'youtube', 'https://www.youtube.com/@fixture-anastasia-patience', '', 0
where not exists (select 1 from public.social_links where platform = 'youtube');

insert into public.blog_categories (name, slug, sort_order) values
  ('Purpose & Faith', 'purpose-and-faith', 1),
  ('Women & Business', 'women-and-business', 2),
  ('Digital Skills', 'digital-skills', 3),
  ('Wellness & Lifestyle', 'wellness-and-lifestyle', 4),
  ('Personal Stories', 'personal-stories', 5)
on conflict (slug) do nothing;

update public.blog_posts p
set category_id = c.id,
    reading_minutes = nullif(substring(p.read_time from '^(\d+)'), '')::int
from public.blog_categories c
where c.name = p.category and p.category_id is null;

insert into public.press_mentions (outlet, headline, published_on, url, published, position)
select v.outlet, v.headline, v.published_on::date, v.url, true, v.position
from (values
  ('Cyprus Mail', 'The author who turned a hard year into a book of hope', '2026-04-18', 'https://example.com/fixture-press-1', 1),
  ('Phileleftheros', 'Μια γυναίκα, δύο βαλίτσες και μια υπόσχεση', '2026-03-05', 'https://example.com/fixture-press-2', 2),
  ('Women in Business Podcast', 'Building a business from the honest middle', '2026-01-22', null, 3)
) as v(outlet, headline, published_on, url, position)
where not exists (select 1 from public.press_mentions m where m.outlet = v.outlet and m.headline = v.headline);

insert into public.redirects (from_path, to_path, status_code) values
  ('/old-journal', '/blog', 301),
  ('/books/fyrts', '/books/find-your-reason-to-smile', 301)
on conflict do nothing;

commit;
