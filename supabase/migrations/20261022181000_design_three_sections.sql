-- Design 3.0 ("The Open Book") reshapes a few section props:
-- * no section carries an eyebrow any more: where a section has an empty
--   title, the eyebrow becomes its title, and the key is removed;
-- * the quote's caption is split into a source (a work, cited) and an
--   attribution (a person or caption); old values become the attribution;
--   its accent and portrait go, and its variants are now centred / statement;
-- * rich text loses the pull-quote aside (with_pull_quote becomes foreword);
-- * the hero's full_bleed variant is now photo.
-- It rewrites published sections, drafts, versions and Greek overlays alike.

create or replace function pg_temp.d3_titled(t text) returns boolean
language sql immutable as $$
  select t = any (array[
    'audiobook_player', 'book_list', 'book_excerpts', 'rich_text', 'gallery', 'video',
    'latest_posts', 'timeline', 'list', 'testimonials', 'products', 'masterclasses',
    'events', 'press', 'media_kit', 'foundation_stories', 'contact_form', 'faq'
  ])
$$;

create or replace function pg_temp.d3_section(s jsonb) returns jsonb
language plpgsql immutable as $$
declare
  t text;
  p jsonb;
begin
  if s is null or jsonb_typeof(s) <> 'object' then
    return s;
  end if;
  t := s ->> 'type';
  p := coalesce(s -> 'props', '{}'::jsonb);
  if jsonb_typeof(p) <> 'object' then
    return s;
  end if;
  if pg_temp.d3_titled(t)
     and coalesce(p ->> 'title', '') = ''
     and coalesce(p ->> 'eyebrow', '') <> '' then
    p := jsonb_set(p, '{title}', p -> 'eyebrow');
  end if;
  p := p - 'eyebrow';
  if t = 'quote' then
    if p ? 'by' then
      p := jsonb_set(p - 'by', '{attribution}', p -> 'by');
    end if;
    p := p - 'accent' - 'imageMediaId';
    s := jsonb_set(s, '{variant}',
      to_jsonb(case s ->> 'variant' when 'with_portrait' then 'statement' else 'centred' end));
  elsif t = 'rich_text' then
    p := p - 'pullQuote';
    if s ->> 'variant' = 'with_pull_quote' then
      s := jsonb_set(s, '{variant}', '"foreword"');
    end if;
  elsif t = 'hero' then
    if s ->> 'variant' = 'full_bleed' then
      s := jsonb_set(s, '{variant}', '"photo"');
    end if;
  end if;
  return jsonb_set(s, '{props}', p);
end;
$$;

create or replace function pg_temp.d3_sections(a jsonb) returns jsonb
language sql immutable as $$
  select case
    when a is null or jsonb_typeof(a) <> 'array' then a
    else coalesce(
      (select jsonb_agg(pg_temp.d3_section(e) order by i) from jsonb_array_elements(a) with ordinality as x(e, i)),
      '[]'::jsonb)
  end
$$;

update public.pages set sections = pg_temp.d3_sections(sections) where sections::text like any (array['%eyebrow%', '%"quote"%', '%with_pull_quote%', '%full_bleed%']);
update public.books set sections = pg_temp.d3_sections(sections) where sections::text like '%"type"%';
update public.products set sections = pg_temp.d3_sections(sections) where sections::text like '%"type"%';
update public.masterclasses set sections = pg_temp.d3_sections(sections) where sections::text like '%"type"%';
update public.events set sections = pg_temp.d3_sections(sections) where sections::text like '%"type"%';
update public.foundation_stories set sections = pg_temp.d3_sections(sections) where sections::text like '%"type"%';

update public.content_drafts
set data = jsonb_set(data, '{sections}', pg_temp.d3_sections(data -> 'sections'))
where jsonb_typeof(data -> 'sections') = 'array';

update public.content_versions
set snapshot = jsonb_set(snapshot, '{sections}', pg_temp.d3_sections(snapshot -> 'sections'))
where jsonb_typeof(snapshot) = 'object' and jsonb_typeof(snapshot -> 'sections') = 'array';

-- Greek overlays are keyed by section id; their field names follow the props.
create or replace function pg_temp.d3_fields(f jsonb, t text) returns jsonb
language plpgsql immutable as $$
begin
  if f is null or jsonb_typeof(f) <> 'object' then
    return f;
  end if;
  if pg_temp.d3_titled(t) and not (f ? 'title') and coalesce(f ->> 'eyebrow', '') <> '' then
    f := jsonb_set(f, '{title}', f -> 'eyebrow');
  end if;
  f := f - 'eyebrow' - 'pullQuote';
  if t = 'quote' then
    if f ? 'by' then
      f := jsonb_set(f - 'by', '{attribution}', f -> 'by');
    end if;
    f := f - 'accent';
  end if;
  return f;
end;
$$;

with section_types as (
  select e ->> 'id' as id, e ->> 'type' as type
  from (
    select sections from public.pages
    union all select sections from public.books
    union all select sections from public.products
    union all select sections from public.masterclasses
    union all select sections from public.events
    union all select sections from public.foundation_stories
  ) s(sections)
  cross join lateral jsonb_array_elements(case when jsonb_typeof(sections) = 'array' then sections else '[]'::jsonb end) e
)
update public.content_translations ct
set fields = pg_temp.d3_fields(ct.fields, st.type),
    draft_fields = pg_temp.d3_fields(ct.draft_fields, st.type),
    field_hashes = pg_temp.d3_fields(ct.field_hashes, st.type)
from section_types st
where ct.entity_type = 'page_section'
  and ct.entity_id::text = st.id;
