-- Foundation story categories (like blog_categories) + category on stories
CREATE TABLE IF NOT EXISTS public.foundation_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.foundation_stories
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS foundation_stories_category_idx
  ON public.foundation_stories (category) WHERE category <> '';

ALTER TABLE public.foundation_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "foundation cats public read" ON public.foundation_categories;
CREATE POLICY "foundation cats public read" ON public.foundation_categories
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "foundation cats admin write" ON public.foundation_categories;
CREATE POLICY "foundation cats admin write" ON public.foundation_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON public.foundation_categories TO anon, authenticated;
GRANT ALL ON public.foundation_categories TO authenticated, service_role;

DROP TRIGGER IF EXISTS trg_foundation_categories_updated ON public.foundation_categories;
CREATE TRIGGER trg_foundation_categories_updated
  BEFORE UPDATE ON public.foundation_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_foundation_updated_at();

-- Seed pillar categories (Food / Care / Community / Animals)
INSERT INTO public.foundation_categories (name, slug, sort_order)
SELECT v.name, v.slug, v.sort_order
FROM (VALUES
  ('Food assistance', 'food-assistance', 10),
  ('Compassionate care', 'compassionate-care', 20),
  ('Community support', 'community-support', 30),
  ('Rescued animals', 'rescued-animals', 40)
) AS v(name, slug, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.foundation_categories c WHERE c.slug = v.slug
);

-- Backfill existing stories to first category if empty
UPDATE public.foundation_stories s
SET category = COALESCE(
  (SELECT name FROM public.foundation_categories ORDER BY sort_order LIMIT 1),
  'Community support'
)
WHERE COALESCE(trim(s.category), '') = '';
