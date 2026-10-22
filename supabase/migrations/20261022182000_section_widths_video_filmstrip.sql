-- Two section settings renamed in the design pass:
-- * widths are now narrow / default / full (Text 720, Wide 1280, Edge to
--   edge in the studio); the old fourth width "wide" had no layout of its
--   own and becomes "default";
-- * the video section's "latest" variant (the newest film with Up next) is
--   now "filmstrip", the studio's name for it.
-- It rewrites published sections, drafts and versions alike. The schema still
-- reads the old names, so a row this misses renders the same.

create or replace function pg_temp.closeout_section(s jsonb) returns jsonb
language plpgsql immutable as $$
begin
  if s is null or jsonb_typeof(s) <> 'object' then
    return s;
  end if;
  if s #>> '{settings,width}' = 'wide' then
    s := jsonb_set(s, '{settings,width}', '"default"');
  end if;
  if s ->> 'type' = 'video' and s ->> 'variant' = 'latest' then
    s := jsonb_set(s, '{variant}', '"filmstrip"');
  end if;
  return s;
end;
$$;

create or replace function pg_temp.closeout_sections(a jsonb) returns jsonb
language sql immutable as $$
  select case
    when a is null or jsonb_typeof(a) <> 'array' then a
    else coalesce(
      (select jsonb_agg(pg_temp.closeout_section(e) order by i) from jsonb_array_elements(a) with ordinality as x(e, i)),
      '[]'::jsonb)
  end
$$;

update public.pages set sections = pg_temp.closeout_sections(sections) where sections::text like any (array['%"wide"%', '%"latest"%']);
update public.books set sections = pg_temp.closeout_sections(sections) where sections::text like any (array['%"wide"%', '%"latest"%']);
update public.products set sections = pg_temp.closeout_sections(sections) where sections::text like any (array['%"wide"%', '%"latest"%']);
update public.masterclasses set sections = pg_temp.closeout_sections(sections) where sections::text like any (array['%"wide"%', '%"latest"%']);
update public.events set sections = pg_temp.closeout_sections(sections) where sections::text like any (array['%"wide"%', '%"latest"%']);
update public.foundation_stories set sections = pg_temp.closeout_sections(sections) where sections::text like any (array['%"wide"%', '%"latest"%']);

update public.content_drafts
set data = jsonb_set(data, '{sections}', pg_temp.closeout_sections(data -> 'sections'))
where jsonb_typeof(data -> 'sections') = 'array'
  and (data -> 'sections')::text like any (array['%"wide"%', '%"latest"%']);

update public.content_versions
set snapshot = jsonb_set(snapshot, '{sections}', pg_temp.closeout_sections(snapshot -> 'sections'))
where jsonb_typeof(snapshot) = 'object' and jsonb_typeof(snapshot -> 'sections') = 'array'
  and (snapshot -> 'sections')::text like any (array['%"wide"%', '%"latest"%']);
