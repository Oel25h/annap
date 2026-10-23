-- Where each media library item is used, for the studio's media library: the
-- columns that point at media_assets, the sections of pages and items (live
-- and drafts), and download links that still work. A file in use cannot be
-- deleted: several references cascade (gallery and product photos, book
-- files), so deleting a used file would silently remove those rows too.
--
-- Runs as the caller (security invoker): admins see every reference; nobody
-- else can read the tables it looks at.
-- Rollback: drop trigger media_assets_in_use_guard on public.media_assets;
--           drop function public.media_assets_in_use_guard();
--           drop function public.media_usage(uuid[]);
create or replace function public.media_usage(_ids uuid[])
returns table (media_id uuid, kind text, item_id text, label text, field text)
language sql
stable
security invoker
set search_path = public
as $$
  select cover_media_id, 'book', id::text, title, 'Cover' from books where cover_media_id = any(_ids)
  union all
  select delivery_media_id, 'book', f.book_id::text, b.title, initcap(f.format) || ' file'
    from book_formats f join books b on b.id = f.book_id where delivery_media_id = any(_ids)
  union all
  select f.media_id, 'book', f.book_id::text, b.title,
         case f.purpose when 'sample' then 'Sample' else 'Free download' end || ' (' || upper(f.locale) || ')'
    from book_files f join books b on b.id = f.book_id where f.media_id = any(_ids)
  union all
  select cover_media_id, 'audiobook', id::text, title, 'Cover' from audiobooks where cover_media_id = any(_ids)
  union all
  select t.audio_media_id, 'audiobook', t.audiobook_id::text, a.title, 'Chapter: ' || t.title
    from audiobook_tracks t join audiobooks a on a.id = t.audiobook_id where t.audio_media_id = any(_ids)
  union all
  select cover_media_id, 'blog_post', id::text, title, 'Cover' from blog_posts where cover_media_id = any(_ids)
  union all
  select cover_media_id, 'product', id::text, name, 'Cover' from products where cover_media_id = any(_ids)
  union all
  select delivery_media_id, 'product', id::text, name, 'File' from products where delivery_media_id = any(_ids)
  union all
  select i.media_id, 'product', i.product_id::text, p.name, 'Photo'
    from product_images i join products p on p.id = i.product_id where i.media_id = any(_ids)
  union all
  select cover_media_id, 'gallery', id::text, name, 'Album cover' from gallery_sections where cover_media_id = any(_ids)
  union all
  select media_id, 'gallery', coalesce(section_id::text, id::text), coalesce(nullif(chapter, ''), 'Gallery'), 'Photo'
    from gallery_images where media_id = any(_ids)
  union all
  select cover_media_id, 'foundation_story', id::text, title, 'Cover' from foundation_stories where cover_media_id = any(_ids)
  union all
  select cover_media_id, 'masterclass', id::text, title, 'Cover' from masterclasses where cover_media_id = any(_ids)
  union all
  select cover_media_id, 'event', id::text, title, 'Cover' from events where cover_media_id = any(_ids)
  union all
  select logo_media_id, 'press', id::text, outlet, 'Logo' from press_mentions where logo_media_id = any(_ids)
  union all
  select thumbnail_media_id, 'video', id::text, title, 'Thumbnail' from videos where thumbnail_media_id = any(_ids)
  union all
  select photo_media_id, 'testimonial', id::text, name, 'Photo' from testimonials where photo_media_id = any(_ids)
  union all
  select m.id, 'settings', 'site', 'Site settings',
         case m.id when s.social_image_id then 'Social card' when s.logo_media_id then 'Logo' else 'Favicon' end
    from site_settings s join media_assets m on m.id in (s.social_image_id, s.logo_media_id, s.favicon_media_id)
    where m.id = any(_ids)
  union all
  select og_image_id, 'page', id::text, title, 'Social card' from pages where og_image_id = any(_ids)
  union all
  -- Sections hold media ids anywhere in their props (…MediaId, …MediaIds).
  select m.id, 'page', p.id::text, p.title, 'Section'
    from pages p join media_assets m on p.sections::text like '%' || m.id::text || '%'
    where m.id = any(_ids)
  union all
  select m.id, src.kind, src.id::text, src.title, 'Section'
    from (
      select 'book' as kind, id, title, sections from books
      union all select 'product', id, name, sections from products
      union all select 'masterclass', id, title, sections from masterclasses
      union all select 'event', id, title, sections from events
      union all select 'foundation_story', id, title, sections from foundation_stories
    ) src
    join media_assets m on src.sections::text like '%' || m.id::text || '%'
    where m.id = any(_ids)
  union all
  select m.id, case d.entity_type when 'blog_post' then 'blog_post' else d.entity_type end,
         d.entity_id::text, coalesce(p.title, initcap(replace(d.entity_type, '_', ' '))), 'Unpublished draft'
    from content_drafts d
    join media_assets m on d.data::text like '%' || m.id::text || '%'
    left join pages p on d.entity_type = 'page' and p.id = d.entity_id
    where m.id = any(_ids)
  union all
  select media_id, 'download', media_id::text, 'Download links', count(*)::text || ' still working'
    from download_tokens where media_id = any(_ids) and expires_at > now() and uses < max_uses
    group by media_id
$$;

revoke all on function public.media_usage(uuid[]) from public, anon;
grant execute on function public.media_usage(uuid[]) to authenticated, service_role;

-- The database refuses to delete a file that something still uses.
create or replace function public.media_assets_in_use_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _where text;
begin
  select u.label || ' (' || u.field || ')' into _where from public.media_usage(array[old.id]) u limit 1;
  if _where is not null then
    raise exception 'This file is still used: %.', _where using errcode = '23503';
  end if;
  return old;
end;
$$;

revoke all on function public.media_assets_in_use_guard() from public, anon;

drop trigger if exists media_assets_in_use_guard on public.media_assets;
create trigger media_assets_in_use_guard
  before delete on public.media_assets
  for each row execute function public.media_assets_in_use_guard();
