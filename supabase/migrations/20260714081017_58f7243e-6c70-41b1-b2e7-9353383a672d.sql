
-- Gallery sections
CREATE TABLE public.gallery_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gallery_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_sections TO authenticated;
GRANT ALL ON public.gallery_sections TO service_role;
ALTER TABLE public.gallery_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections public read" ON public.gallery_sections FOR SELECT TO public USING (true);
CREATE POLICY "sections admin write" ON public.gallery_sections FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER gallery_sections_updated BEFORE UPDATE ON public.gallery_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link gallery_images to sections; keep chapter for backfill compatibility
ALTER TABLE public.gallery_images ADD COLUMN section_id uuid REFERENCES public.gallery_sections(id) ON DELETE SET NULL;
CREATE INDEX gallery_images_section_idx ON public.gallery_images(section_id, sort_order);

-- Product categories
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod cats public read" ON public.product_categories FOR SELECT TO public USING (true);
CREATE POLICY "prod cats admin write" ON public.product_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER product_categories_updated BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Extend products
ALTER TABLE public.products ADD COLUMN category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL;
ALTER TABLE public.products ADD COLUMN sale_price text;
ALTER TABLE public.products ADD COLUMN stock_note text;
ALTER TABLE public.products ADD COLUMN featured boolean NOT NULL DEFAULT false;

-- Multi-image per product
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_idx ON public.product_images(product_id, sort_order);
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod imgs public read" ON public.product_images FOR SELECT TO public USING (true);
CREATE POLICY "prod imgs admin write" ON public.product_images FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Blog categories
CREATE TABLE public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_categories TO authenticated;
GRANT ALL ON public.blog_categories TO service_role;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog cats public read" ON public.blog_categories FOR SELECT TO public USING (true);
CREATE POLICY "blog cats admin write" ON public.blog_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER blog_categories_updated BEFORE UPDATE ON public.blog_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Subscribers: add name, status, unsubscribe token
ALTER TABLE public.subscribers ADD COLUMN name text;
ALTER TABLE public.subscribers ADD COLUMN status text NOT NULL DEFAULT 'active';
ALTER TABLE public.subscribers ADD COLUMN unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX subscribers_unsubscribe_token_idx ON public.subscribers(unsubscribe_token);
-- Admins can update subscribers; public can update via token (unsubscribe) — token-scoped policy
CREATE POLICY "admins update subscribers" ON public.subscribers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "unsubscribe by token" ON public.subscribers FOR UPDATE TO public USING (true) WITH CHECK (status = 'unsubscribed');
GRANT UPDATE ON public.subscribers TO anon;

-- Page content
CREATE TABLE public.page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  block_key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page, block_key)
);
GRANT SELECT ON public.page_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_content TO authenticated;
GRANT ALL ON public.page_content TO service_role;
ALTER TABLE public.page_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page content public read" ON public.page_content FOR SELECT TO public USING (true);
CREATE POLICY "page content admin write" ON public.page_content FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER page_content_updated BEFORE UPDATE ON public.page_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Newsletters
CREATE TABLE public.newsletters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL DEFAULT '',
  header_image text,
  filter_source text,
  status text NOT NULL DEFAULT 'draft',
  recipient_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletters TO authenticated;
GRANT ALL ON public.newsletters TO service_role;
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "newsletters admin all" ON public.newsletters FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER newsletters_updated BEFORE UPDATE ON public.newsletters FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket policies for 'media' — allow authenticated admins to write, public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media public read') THEN
    CREATE POLICY "media public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media admin write') THEN
    CREATE POLICY "media admin write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media admin update') THEN
    CREATE POLICY "media admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.has_role(auth.uid(),'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='media admin delete') THEN
    CREATE POLICY "media admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.has_role(auth.uid(),'admin'));
  END IF;
END $$;
