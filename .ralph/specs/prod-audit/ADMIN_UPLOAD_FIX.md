# Admin upload / add fix (2026-08-25)

## Root cause
Supabase project had **zero storage buckets**. Admin `uploadMedia()` targeted bucket `media` → all gallery/book/blog image uploads failed silently (UI swallowed errors).

## Fixed
1. Created public `media` bucket (10MB, image MIME allow-list) via Storage API
2. Confirmed storage RLS policies exist (admin write + public read)
3. Confirmed table RLS for gallery/books/blog uses `has_role(..., admin)`
4. `uploadMedia` now returns **public URL** (stable) + clearer errors
5. `ImageUploader` surfaces error text
6. Gallery add section / attach images checks Supabase errors
7. Migration note: `supabase/migrations/20260825042100_ensure_media_bucket.sql`
8. Deployed to https://anastasia-heartfelt-journey.vercel.app

## Verify (user)
1. Sign in `/auth`
2. Admin → Gallery → Add section → Upload photo
3. Books/Blog cover upload
4. Hard refresh if old session
