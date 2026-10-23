-- Brings content seeded by an earlier 20261022180500_redo_content.sql in line
-- with the current seed (scripts/content/build-seed.ts). Every change applies
-- only where the row still holds the earlier seed, so nothing the owner has
-- edited is touched, and on a database seeded with the current version it
-- changes nothing.
--
-- The new /cookies page comes from the seed itself: on a database seeded
-- earlier, run 20261022180500_redo_content.sql again first (it only adds what
-- is missing), then this.

create or replace function pg_temp.swap(o jsonb, k text, was text, now text) returns jsonb
language sql immutable as $$
  select case when o ->> k = was then jsonb_set(o, array[k], to_jsonb(now)) else o end
$$;

-- /videos is published (its own empty state points to the channel), and Videos links to it.
update public.pages set status = 'published', published_at = coalesce(published_at, now())
where path = '/videos' and status = 'draft';
update public.navigation_items n
set page_id = p.id, url = null
from public.pages p
where p.path = '/videos' and n.label = 'Videos' and n.page_id is null and n.url = '/#videos';

-- Cookies in the legal menu, after Terms.
insert into public.navigation_items (menu, label, page_id, url, parent_id, position)
select 'legal', 'Cookies', p.id, null, null,
  coalesce((select max(position) + 1 from public.navigation_items where menu = 'legal' and parent_id is null), 0)
from public.pages p
where p.path = '/cookies'
  and exists (select 1 from public.navigation_items where menu = 'legal')
  and not exists (select 1 from public.navigation_items n where n.page_id = p.id);

-- /start: stories, not the journal; her own voice.
update public.pages
set seo_description = 'Everything in one place: the free ebook, the audiobook, my stories, masterclasses and the foundation.'
where path = '/start'
  and seo_description = 'Everything in one place: the free ebook, the audiobook, the journal, masterclasses and the foundation.';

update public.pages p
set sections = jsonb_set(p.sections, '{0,props,items}', (
  select jsonb_agg(
    pg_temp.swap(pg_temp.swap(pg_temp.swap(e,
      'label', 'Read the journal', 'Read my stories'),
      'description', 'Letters on faith, purpose and the honest middle', 'Stories from the honest middle.'),
      'description', 'The first chapters, read by Anastasia', 'The first chapters, in my own voice')
    order by i)
  from jsonb_array_elements(p.sections #> '{0,props,items}') with ordinality as x(e, i)
))
where p.path = '/start'
  and p.sections #>> '{0,type}' = 'link_list'
  and jsonb_typeof(p.sections #> '{0,props,items}') = 'array'
  and p.sections::text like any (array['%Read the journal%', '%Letters on faith, purpose and the honest middle%', '%The first chapters, read by Anastasia%']);

-- Privacy: everything the browser keeps, with a link to /cookies.
update public.pages
set sections = jsonb_set(sections, '{0,props,body}', to_jsonb(replace(sections #>> '{0,props,body}',
  '<li><strong>In your browser only:</strong> where you stopped in an audiobook chapter, your language choice and whether you dismissed a notice. These stay on your device and are never sent to us.</li>',
  '<li><strong>In your browser only:</strong> for the audiobook player, the edition you chose, where you stopped in each chapter, the chapters you have finished and your playback speed; your language choice; and whether you closed the language suggestion. These stay on your device, and we never collect them. More in <a href="/cookies">cookies and storage</a>.</li>')))
where path = '/privacy'
  and sections #>> '{0,type}' = 'rich_text'
  and strpos(sections #>> '{0,props,body}', '<li><strong>In your browser only:</strong> where you stopped in an audiobook chapter, your language choice and whether you dismissed a notice. These stay on your device and are never sent to us.</li>') > 0;

-- Terms: the seeded sentences with typographic apostrophes.
update public.pages
set sections = jsonb_set(sections, '{0,props,body}', to_jsonb(replace(replace(sections #>> '{0,props,body}',
  'covered by that shop''s terms.', 'covered by that shop’s terms.'),
  'used for the foundation''s work.', 'used for the foundation’s work.')))
where path = '/terms'
  and sections #>> '{0,type}' = 'rich_text'
  and sections #>> '{0,props,body}' like any (array['%that shop''s terms.%', '%the foundation''s work.%']);

-- The hero portrait belongs to the home hero: out of the gallery and the media kit.
update public.pages
set sections = jsonb_set(sections, '{0,props,imageMediaIds}', (sections #> '{0,props,imageMediaIds}') - '5eed0000-0000-4000-8000-000000000001')
where path = '/gallery'
  and sections #>> '{0,type}' = 'gallery'
  and sections #> '{0,props,imageMediaIds}' = '["5eed0000-0000-4000-8000-000000000001", "5eed0000-0000-4000-8000-000000000004", "5eed0000-0000-4000-8000-000000000008", "5eed0000-0000-4000-8000-000000000002", "5eed0000-0000-4000-8000-000000000005", "5eed0000-0000-4000-8000-000000000003", "5eed0000-0000-4000-8000-000000000009"]'::jsonb;

-- The gallery keeps one frame per pose: the second desk shot and the rust portrait leave it.
update public.pages
set sections = jsonb_set(sections, '{0,props,imageMediaIds}',
  (sections #> '{0,props,imageMediaIds}') - '5eed0000-0000-4000-8000-000000000005' - '5eed0000-0000-4000-8000-000000000003')
where path = '/gallery'
  and sections #>> '{0,type}' = 'gallery'
  and sections #> '{0,props,imageMediaIds}' = '["5eed0000-0000-4000-8000-000000000004", "5eed0000-0000-4000-8000-000000000008", "5eed0000-0000-4000-8000-000000000002", "5eed0000-0000-4000-8000-000000000005", "5eed0000-0000-4000-8000-000000000003", "5eed0000-0000-4000-8000-000000000009"]'::jsonb;

update public.pages
set sections = jsonb_set(sections, '{1,props,downloadMediaIds}', (sections #> '{1,props,downloadMediaIds}') - '5eed0000-0000-4000-8000-000000000001')
where path = '/press'
  and sections #>> '{1,type}' = 'media_kit'
  and sections #> '{1,props,downloadMediaIds}' = '["5eed0000-0000-4000-8000-000000000001", "5eed0000-0000-4000-8000-000000000002", "5eed0000-0000-4000-8000-000000000006"]'::jsonb;

-- The generated foundation emblem leaves the library, unless something uses it
-- or its alt text was edited. Its storage files are left in place.
do $$
declare
  _id uuid := '5eed0000-0000-4000-8000-000000000011';
  _used boolean := false;
  _ref record;
begin
  if not exists (
    select 1 from public.media_assets
    where id = _id
      and path = 'library/foundation-emblem/original.jpg'
      and alt = 'The Patience Humanitarian Foundation emblem: two hands holding a golden heart'
  ) then
    return;
  end if;
  for _ref in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f' and c.confrelid = 'public.media_assets'::regclass
  loop
    execute format('select exists (select 1 from %s where %I = $1)', _ref.tbl, _ref.col) into _used using _id;
    exit when _used;
  end loop;
  if not _used then
    select exists (
      select 1
      from (
        select sections from public.pages
        union all select sections from public.books
        union all select sections from public.products
        union all select sections from public.masterclasses
        union all select sections from public.events
        union all select sections from public.foundation_stories
        union all select data from public.content_drafts
      ) s(v)
      where strpos(v::text, _id::text) > 0
    ) into _used;
  end if;
  if not _used then
    delete from public.media_assets where id = _id;
  end if;
end;
$$;
