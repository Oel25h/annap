-- Redo, part 4: row-level security and storage.
--
-- Every policy on the content tables is rebuilt from scratch, by looping over
-- pg_policies rather than by name, so production (whose policy names drifted
-- from the migrations) ends in a known state:
--   * visitors read published rows only, and write nothing directly;
--   * admins (role plus two-factor) manage everything; translators manage the
--     Greek and can read everything they translate;
--   * a restrictive policy refuses any signed-in session without two-factor,
--     so a leftover permissive policy can never grant an aal1 session anything.
-- This migration locks the old studio out (it signs in without two-factor), so
-- it is applied to production only at cutover. Rollback: re-run the policy
-- statements from the earlier migrations and drop the "require aal2" policies.

do $$
declare
  t text;
  p record;
  tables text[] := array[
    -- content
    'blog_categories', 'blog_posts', 'books', 'book_formats', 'book_files', 'book_reviews',
    'audiobooks', 'audiobook_tracks', 'products', 'product_categories', 'product_images',
    'gallery_sections', 'gallery_images', 'foundation_stories', 'foundation_categories',
    'masterclasses', 'events', 'press_mentions', 'videos', 'testimonials', 'media_assets',
    'site_settings', 'pages', 'navigation_items', 'social_links', 'redirects',
    'email_templates', 'consent_texts', 'content_translations', 'ui_string_reviews',
    -- still read by the current site until each page is rebuilt
    'page_content', 'start_page_settings', 'start_page_links', 'start_page_socials',
    'foundation_settings', 'masterclass',
    -- private
    'content_drafts', 'content_versions', 'preview_tokens', 'contact_messages', 'subscribers',
    'newsletters', 'leads', 'download_tokens', 'orders', 'order_items', 'donations',
    'email_outbox', 'audit_log',
    -- server only
    'integration_secrets', 'rate_limits', 'stripe_events'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;

    -- Visitors never write directly; public forms go through server functions.
    execute format('revoke insert, update, delete, truncate on public.%I from anon', t);

    execute format(
      'create policy "require aal2" on public.%I as restrictive for all to authenticated
         using ((select auth.jwt() ->> ''aal'') = ''aal2'')
         with check ((select auth.jwt() ->> ''aal'') = ''aal2'')',
      t
    );

    continue when t in ('integration_secrets', 'rate_limits', 'stripe_events', 'audit_log');

    execute format(
      'create policy "admin all" on public.%I for all to authenticated
         using ((select public.is_admin())) with check ((select public.is_admin()))',
      t
    );
  end loop;
end;
$$;

-- Public reads --------------------------------------------------------------------
create policy "public read" on public.blog_categories for select using (true);
create policy "public read" on public.blog_posts for select using (status = 'published');
create policy "public read" on public.books for select using (status = 'published');
create policy "public read" on public.book_formats for select using (
  available and exists (select 1 from public.books b where b.id = book_id and b.status = 'published')
);
create policy "public read" on public.book_reviews for select using (published);
create policy "public read" on public.audiobooks for select using (status = 'published');
create policy "public read" on public.audiobook_tracks for select using (
  exists (select 1 from public.audiobooks a where a.id = audiobook_id and a.status = 'published')
);
create policy "public read" on public.products for select using (status = 'published');
create policy "public read" on public.product_categories for select using (true);
create policy "public read" on public.product_images for select using (
  exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
);
create policy "public read" on public.gallery_sections for select using (published);
create policy "public read" on public.gallery_images for select using (published);
create policy "public read" on public.foundation_stories for select using (status = 'published');
create policy "public read" on public.foundation_categories for select using (true);
create policy "public read" on public.masterclasses for select using (status = 'published');
create policy "public read" on public.events for select using (status = 'published');
create policy "public read" on public.press_mentions for select using (published);
create policy "public read" on public.videos for select using (not hidden);
create policy "public read" on public.testimonials for select using (published);
-- Private files (downloads bucket) are never listed, even by path.
create policy "public read" on public.media_assets for select using (status = 'ready' and bucket <> 'downloads');
create policy "public read" on public.site_settings for select using (true);
create policy "public read" on public.pages for select using (status = 'published');
create policy "public read" on public.navigation_items for select using (enabled);
create policy "public read" on public.social_links for select using (enabled);
create policy "public read" on public.redirects for select using (enabled);
create policy "public read" on public.consent_texts for select using (true);
create policy "public read" on public.content_translations for select using (status = 'approved' and not show_english);
create policy "public read" on public.page_content for select using (true);
create policy "public read" on public.start_page_settings for select using (true);
create policy "public read" on public.start_page_links for select using (true);
create policy "public read" on public.start_page_socials for select using (true);
create policy "public read" on public.foundation_settings for select using (true);
create policy "public read" on public.masterclass for select using (true);

-- Book files and paid formats point at the private bucket: admins only.
-- (book_files has no public policy on purpose.)

-- Translators ---------------------------------------------------------------------
-- They read everything that has words to translate, including drafts, and
-- manage the Greek. Approval is recorded by the approve server function.
do $$
declare
  t text;
begin
  foreach t in array array[
    'blog_categories', 'blog_posts', 'books', 'book_formats', 'book_reviews', 'audiobooks',
    'audiobook_tracks', 'products', 'product_categories', 'gallery_sections', 'gallery_images',
    'foundation_stories', 'foundation_categories', 'masterclasses', 'events', 'press_mentions',
    'videos', 'testimonials', 'media_assets', 'site_settings', 'pages', 'navigation_items',
    'email_templates', 'consent_texts', 'content_drafts'
  ] loop
    execute format(
      'create policy "translator read" on public.%I for select to authenticated using ((select public.is_translator()))',
      t
    );
  end loop;
end;
$$;

create policy "translator manage" on public.content_translations for all to authenticated
  using ((select public.is_translator())) with check ((select public.is_translator()));
create policy "translator manage" on public.ui_string_reviews for all to authenticated
  using ((select public.is_translator()))
  with check ((select public.is_translator()) and approved_by = auth.uid());

-- Audit log: readable by admins; written only by triggers and the server.
create policy "admin read" on public.audit_log for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete, truncate on public.audit_log from authenticated;

-- Roles: everyone signed in sees their own roles (the studio needs this before
-- two-factor to show the right screen); changes go through the server.
do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'user_roles' loop
    execute format('drop policy %I on public.user_roles', p.policyname);
  end loop;
end;
$$;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admin read" on public.user_roles for select to authenticated using ((select public.is_admin()));
revoke insert, update, delete, truncate on public.user_roles from anon, authenticated;

-- Server-only tables are invisible to every client role.
revoke all on public.integration_secrets from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;

-- Storage ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 52428800, array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm'
  ]),
  ('audio', 'audio', true, 52428800, array[
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'
  ]),
  ('downloads', 'downloads', false, 52428800, array[
    'application/pdf', 'application/epub+zip', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'
  ])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Drop every policy that mentions our buckets, whatever it was called, then
-- recreate the intended set. Public buckets serve files by URL without a
-- policy, so visitors get no list access at all.
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (
        coalesce(qual, '') ~ '(media|audio|downloads)'
        or coalesce(with_check, '') ~ '(media|audio|downloads)'
        or policyname in ('require aal2')
      )
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end;
$$;

create policy "require aal2" on storage.objects as restrictive for all to authenticated
  using (bucket_id not in ('media', 'audio', 'downloads') or (select auth.jwt() ->> 'aal') = 'aal2')
  with check (bucket_id not in ('media', 'audio', 'downloads') or (select auth.jwt() ->> 'aal') = 'aal2');
create policy "site buckets admin read" on storage.objects for select to authenticated
  using (bucket_id in ('media', 'audio', 'downloads') and (select public.is_admin()));
create policy "site buckets admin insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('media', 'audio', 'downloads') and (select public.is_admin()));
create policy "site buckets admin update" on storage.objects for update to authenticated
  using (bucket_id in ('media', 'audio', 'downloads') and (select public.is_admin()));
create policy "site buckets admin delete" on storage.objects for delete to authenticated
  using (bucket_id in ('media', 'audio', 'downloads') and (select public.is_admin()));
