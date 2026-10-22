
-- 1) Settings (single row)
CREATE TABLE public.start_page_settings (
  id text PRIMARY KEY DEFAULT 'singleton',
  hero_eyebrow text NOT NULL DEFAULT 'Find Your Reason to Smile',
  hero_subtitle text NOT NULL DEFAULT 'Author · Storyteller · Founder of Patience Media House',
  footer_tag text NOT NULL DEFAULT 'Patience Media House',
  featured_enabled boolean NOT NULL DEFAULT true,
  featured_label text,
  featured_sub text,
  featured_href text,
  featured_icon text NOT NULL DEFAULT 'Sparkles',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT start_page_settings_singleton CHECK (id = 'singleton')
);
GRANT SELECT ON public.start_page_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.start_page_settings TO authenticated;
GRANT ALL ON public.start_page_settings TO service_role;
ALTER TABLE public.start_page_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Start settings readable by all" ON public.start_page_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage start settings" ON public.start_page_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_start_settings_updated BEFORE UPDATE ON public.start_page_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Links stack
CREATE TABLE public.start_page_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  sub text,
  icon text NOT NULL DEFAULT 'ArrowRight',
  href text,
  to_path text,
  is_internal boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.start_page_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.start_page_links TO authenticated;
GRANT ALL ON public.start_page_links TO service_role;
ALTER TABLE public.start_page_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Start links readable by all" ON public.start_page_links FOR SELECT USING (true);
CREATE POLICY "Admins manage start links" ON public.start_page_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_start_links_updated BEFORE UPDATE ON public.start_page_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Socials row
CREATE TABLE public.start_page_socials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  url text NOT NULL DEFAULT '#',
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.start_page_socials TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.start_page_socials TO authenticated;
GRANT ALL ON public.start_page_socials TO service_role;
ALTER TABLE public.start_page_socials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Start socials readable by all" ON public.start_page_socials FOR SELECT USING (true);
CREATE POLICY "Admins manage start socials" ON public.start_page_socials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_start_socials_updated BEFORE UPDATE ON public.start_page_socials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed defaults
INSERT INTO public.start_page_settings (id, featured_label, featured_sub, featured_href)
VALUES ('singleton', 'Get My Free Guide', '7 Steps to Turn Your Pain Into Purpose', '#');

INSERT INTO public.start_page_links (label, sub, icon, href, to_path, is_internal, sort_order, enabled) VALUES
  ('Join the Community', 'A village of women becoming', 'Users', '#', NULL, false, 10, true),
  ('Next Masterclass', '8-week live program · Waitlist open', 'BookOpen', NULL, '/masterclasses', true, 20, true),
  ('My Books', 'Memoir · Workbook', 'BookOpen', NULL, '/books', true, 30, true),
  ('Prayer with Patience', 'Pray with me — daily', 'HandHeart', '#', NULL, false, 40, true),
  ('Daily Affirmations', 'Speak life over your day', 'Sparkles', '#', NULL, false, 50, true),
  ('Daily Devotions', 'A short word each morning', 'Sunrise', '#', NULL, false, 60, true),
  ('Words of Hope', 'Encouragement for hard seasons', 'MessageCircleHeart', '#', NULL, false, 70, true),
  ('Watch My Latest Video', 'New every Wednesday', 'Youtube', '#', NULL, false, 80, true),
  ('Contact Me', 'Speaking · Media · Partnerships', 'Mail', NULL, '/contact', true, 90, true);

INSERT INTO public.start_page_socials (platform, url, sort_order, enabled) VALUES
  ('tiktok', '#', 10, true),
  ('instagram', '#', 20, true),
  ('youtube', '#', 30, true),
  ('facebook', '#', 40, true);
