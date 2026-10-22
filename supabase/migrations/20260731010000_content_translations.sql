-- Bilingual content: English source rows + Greek translations (draft → approved)
CREATE TABLE IF NOT EXISTS public.content_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  locale text NOT NULL DEFAULT 'el',
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
  source_hash text,
  approved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, locale)
);

CREATE INDEX IF NOT EXISTS content_translations_entity_idx
  ON public.content_translations (entity_type, entity_id);

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read approved translations" ON public.content_translations;
CREATE POLICY "public read approved translations"
  ON public.content_translations FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "admins manage translations" ON public.content_translations;
CREATE POLICY "admins manage translations"
  ON public.content_translations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.content_translations TO anon, authenticated;
GRANT ALL ON public.content_translations TO authenticated;
GRANT ALL ON public.content_translations TO service_role;
