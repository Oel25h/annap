-- Edited during the redo: replays never overwrite live rows (was DO UPDATE).
-- Phase prod-audit: seed gallery sections + images from static brand assets (idempotent).
-- Images served from /public/gallery/* so URLs work without Storage upload.

INSERT INTO public.gallery_sections (name, slug, sort_order) VALUES
  ('My Journey', 'my-journey', 10),
  ('Family Moments', 'family-moments', 20),
  ('Speaking & Livestreams', 'speaking', 30),
  ('Community & Events', 'community', 40),
  ('Behind the Scenes', 'bts', 50)
ON CONFLICT (slug) DO NOTHING;

-- Only seed images when table is empty (avoid duplicates on re-run)
INSERT INTO public.gallery_images (chapter, image_url, caption, sort_order, section_id)
SELECT v.chapter, v.image_url, v.caption, v.sort_order, s.id
FROM (
  VALUES
    ('My Journey', '/gallery/gallery-ghana.jpg', 'Sunset silhouette, Ghana', 10, 'my-journey'),
    ('My Journey', '/gallery/gallery-cyprus.jpg', 'Mediterranean coastal town, Cyprus', 20, 'my-journey'),
    ('Family Moments', '/gallery/gallery-family.jpg', 'Family moment', 10, 'family-moments'),
    ('Speaking & Livestreams', '/gallery/gallery-speaking.jpg', 'Speaking on stage', 10, 'speaking'),
    ('Community & Events', '/gallery/gallery-community.jpg', 'Community gathering', 10, 'community'),
    ('Behind the Scenes', '/gallery/gallery-bts.jpg', 'Behind the scenes', 10, 'bts')
) AS v(chapter, image_url, caption, sort_order, section_slug)
JOIN public.gallery_sections s ON s.slug = v.section_slug
WHERE NOT EXISTS (SELECT 1 FROM public.gallery_images LIMIT 1);

-- Soft shop bridge product → book detail (editors can replace with real checkout URLs)
INSERT INTO public.products (
  slug, name, description, price, product_type, checkout_url, image_url, status, sort_order
) VALUES (
  'find-your-reason-to-smile-companion',
  'Find Your Reason to Smile',
  'Anastasia''s memoir — open the book page for formats and purchase links.',
  'See books',
  'ebook',
  '/books/find-your-reason-to-smile',
  '/fyrts-cover.jpg',
  'published',
  10
)
ON CONFLICT (slug) DO NOTHING;
