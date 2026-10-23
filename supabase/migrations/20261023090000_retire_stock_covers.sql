-- DESIGN.md §7: blog-one.jpg (a generic flatlay) and blog-two.jpg (another
-- woman) are not used. The starter posts lose those covers (their social image
-- falls back to the site's card); the library rows go unless something else
-- still uses them or their alt text was edited. Their storage files are left
-- in place.

update public.blog_posts set cover_media_id = null
where cover_media_id in ('5eed0000-0000-4000-8000-000000000012', '5eed0000-0000-4000-8000-000000000013');

do $$
declare
  _id uuid := '5eed0000-0000-4000-8000-000000000012';
  _used boolean := false;
  _ref record;
begin
  if not exists (
    select 1 from public.media_assets
    where id = _id
      and path = 'library/journal-desk/original.jpg'
      and alt = 'An open journal, a fountain pen and a cup of tea on a velvet throw'
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

do $$
declare
  _id uuid := '5eed0000-0000-4000-8000-000000000013';
  _used boolean := false;
  _ref record;
begin
  if not exists (
    select 1 from public.media_assets
    where id = _id
      and path = 'library/laptop-writing/original.jpg'
      and alt = 'A woman writing at a laptop by a sunny window'
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
