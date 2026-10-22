-- Foundation page: mission/settings + impact stories (cases)
CREATE TABLE IF NOT EXISTS public.foundation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eyebrow text NOT NULL DEFAULT 'The foundation',
  headline text NOT NULL DEFAULT 'Hope, held open.',
  subheadline text,
  mission text,
  vision text,
  hero_image_url text,
  cta_label text DEFAULT 'Partner with us',
  cta_href text DEFAULT '/contact',
  donate_label text,
  donate_href text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.foundation_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  person_name text NOT NULL,
  title text NOT NULL,
  summary text,
  body text NOT NULL DEFAULT '',
  cover_url text,
  location text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','hidden')),
  featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS foundation_stories_status_idx ON public.foundation_stories (status, sort_order);

INSERT INTO public.foundation_settings (eyebrow, headline, subheadline, mission, vision)
SELECT
  'The foundation',
  'Hope, held open.',
  'Stories of people we walk beside — and the quiet work of turning compassion into action.',
  'We exist to extend a hand where life has grown heavy: practical care, dignity, and the kind of presence that says you are not alone.',
  'A community where no one''s story ends in silence — where generosity becomes a lantern for the next person walking through the dark.'
WHERE NOT EXISTS (SELECT 1 FROM public.foundation_settings LIMIT 1);

ALTER TABLE public.foundation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foundation_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "foundation settings public read" ON public.foundation_settings;
CREATE POLICY "foundation settings public read" ON public.foundation_settings FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "foundation settings admin write" ON public.foundation_settings;
CREATE POLICY "foundation settings admin write" ON public.foundation_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "foundation stories public read" ON public.foundation_stories;
CREATE POLICY "foundation stories public read" ON public.foundation_stories FOR SELECT TO public USING (status = 'published');

DROP POLICY IF EXISTS "foundation stories admin all" ON public.foundation_stories;
CREATE POLICY "foundation stories admin all" ON public.foundation_stories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON public.foundation_settings TO anon, authenticated;
GRANT ALL ON public.foundation_settings TO authenticated, service_role;
GRANT SELECT ON public.foundation_stories TO anon, authenticated;
GRANT ALL ON public.foundation_stories TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_foundation_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_foundation_settings_updated ON public.foundation_settings;
CREATE TRIGGER trg_foundation_settings_updated BEFORE UPDATE ON public.foundation_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_foundation_updated_at();

DROP TRIGGER IF EXISTS trg_foundation_stories_updated ON public.foundation_stories;
CREATE TRIGGER trg_foundation_stories_updated BEFORE UPDATE ON public.foundation_stories
  FOR EACH ROW EXECUTE FUNCTION public.set_foundation_updated_at();
