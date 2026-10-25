-- Where a library file is actually played from, when it does not live in
-- Supabase storage. Full-length recordings are stored on Cloudflare R2 and
-- this is their public address. Null means the file is still in `bucket`.

alter table public.media_assets
  add column if not exists playback_url text;

comment on column public.media_assets.playback_url is
  'Public playback address for files stored outside Supabase (R2 audio). Null for files in the bucket.';
