-- Phase 1: seed books from static site.ts shape (idempotent on slug).
-- Covers live under /public so cover_url works without storage upload.
-- status CHECK remains published | hidden.

INSERT INTO public.books (
  slug,
  title,
  tagline,
  who_for,
  description,
  formats,
  cover_url,
  amazon_url,
  ebook_url,
  status,
  sort_order
) VALUES
(
  'find-your-reason-to-smile',
  'Find Your Reason to Smile',
  'A companion for the days you almost gave up.',
  'For every woman rebuilding after loss, redefining herself after motherhood, or searching for hope in the middle of the ordinary.',
  'Part memoir, part gentle guide — a book about choosing joy on purpose. Anastasia shares the losses that broke her open and the small daily practices that carried her back to herself. If you''ve forgotten how to smile, this book will remind you.',
  ARRAY['Paperback', 'eBook', 'Audiobook']::text[],
  '/fyrts-cover.jpg',
  NULL,
  NULL,
  'published',
  10
),
(
  'turning-pain-into-purpose',
  'Turning Pain Into Purpose',
  'The workbook that turns your story into your calling.',
  'For the woman with an idea burning inside her — and the pain behind it that she''s afraid to touch.',
  'A companion workbook that walks you step by step from grief to gift. Journaling prompts, faith reflections, and practical business exercises help you extract meaning from what broke you and build something that heals others.',
  ARRAY['Paperback', 'eBook']::text[],
  '/book-turning-pain.jpg',
  NULL,
  NULL,
  'published',
  20
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  tagline = EXCLUDED.tagline,
  who_for = EXCLUDED.who_for,
  description = EXCLUDED.description,
  formats = EXCLUDED.formats,
  cover_url = COALESCE(public.books.cover_url, EXCLUDED.cover_url),
  status = public.books.status,
  sort_order = COALESCE(public.books.sort_order, EXCLUDED.sort_order),
  updated_at = now();

-- Reviews for FYRTS (only if none yet for that book)
INSERT INTO public.book_reviews (book_id, by_name, quote, sort_order)
SELECT b.id, v.by_name, v.quote, v.sort_order
FROM public.books b
CROSS JOIN (
  VALUES
    (
      'Ama, Accra',
      'I read this in one sitting and cried the good kind of tears. It felt like a long letter from a wise older sister.',
      10
    ),
    (
      'Elena, Nicosia',
      'Every chapter is a hug. This book is a lantern for anyone walking through a dark season.',
      20
    )
) AS v(by_name, quote, sort_order)
WHERE b.slug = 'find-your-reason-to-smile'
  AND NOT EXISTS (
    SELECT 1 FROM public.book_reviews r WHERE r.book_id = b.id
  );

INSERT INTO public.book_reviews (book_id, by_name, quote, sort_order)
SELECT b.id, v.by_name, v.quote, v.sort_order
FROM public.books b
CROSS JOIN (
  VALUES
    (
      'Nana, London',
      'I finally have language for the mission I''ve been carrying for years.',
      10
    ),
    (
      'Grace, Athens',
      'Half prayer, half business plan. Exactly what I needed.',
      20
    )
) AS v(by_name, quote, sort_order)
WHERE b.slug = 'turning-pain-into-purpose'
  AND NOT EXISTS (
    SELECT 1 FROM public.book_reviews r WHERE r.book_id = b.id
  );
