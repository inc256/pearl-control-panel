CREATE TABLE IF NOT EXISTS public.brand_identity (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand_name text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '#6b1d2b',
  secondary_color text NOT NULL DEFAULT '#b8925a',
  tertiary_color text NOT NULL DEFAULT '#f9f2f4',
  primary_logo text NOT NULL DEFAULT '',
  secondary_logo text NOT NULL DEFAULT '',
  submark text NOT NULL DEFAULT '',
  primary_typeface text NOT NULL DEFAULT '',
  secondary_typeface text NOT NULL DEFAULT '',
  tertiary_typeface text NOT NULL DEFAULT '',
  primary_color_palette text[] NOT NULL DEFAULT '{}',
  secondary_color_palette text[] NOT NULL DEFAULT '{}',
  brand_rules text[] NOT NULL DEFAULT '{}',
  slogan_motto text NOT NULL DEFAULT '',
  vision_mission text NOT NULL DEFAULT '',
  business_overview text NOT NULL DEFAULT '',
  business_objectives text[] NOT NULL DEFAULT '{}',
  primary_audience text NOT NULL DEFAULT '',
  secondary_audience text NOT NULL DEFAULT '',
  competitors text NOT NULL DEFAULT '',
  opportunities text NOT NULL DEFAULT '',
  strategies text NOT NULL DEFAULT '',
  challenges text NOT NULL DEFAULT '',
  weaknesses text NOT NULL DEFAULT '',
  brand_values text[] NOT NULL DEFAULT '{}',
  brand_personality text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.brand_identity (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.brand_identity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brand managers read identity" ON public.brand_identity;
CREATE POLICY "Brand managers read identity" ON public.brand_identity FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'tech') OR public.has_role(auth.uid(), 'media')
);

DROP POLICY IF EXISTS "Brand managers write identity" ON public.brand_identity;
CREATE POLICY "Brand managers write identity" ON public.brand_identity FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'tech') OR public.has_role(auth.uid(), 'media')
) WITH CHECK (
  public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'tech') OR public.has_role(auth.uid(), 'media')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_identity TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Brand assets public read" ON storage.objects;
CREATE POLICY "Brand assets public read" ON storage.objects FOR SELECT USING (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Brand managers upload assets" ON storage.objects;
CREATE POLICY "Brand managers upload assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'brand-assets' AND (
    public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'tech') OR public.has_role(auth.uid(), 'media')
  )
);

DROP POLICY IF EXISTS "Brand managers update assets" ON storage.objects;
CREATE POLICY "Brand managers update assets" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'brand-assets' AND (
    public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'tech') OR public.has_role(auth.uid(), 'media')
  )
) WITH CHECK (bucket_id = 'brand-assets');

DROP POLICY IF EXISTS "Brand managers delete assets" ON storage.objects;
CREATE POLICY "Brand managers delete assets" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'brand-assets' AND (
    public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'tech') OR public.has_role(auth.uid(), 'media')
  )
);
