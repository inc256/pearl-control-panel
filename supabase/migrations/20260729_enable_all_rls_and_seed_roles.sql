-- =========================
-- Comprehensive RLS + Role Seed
-- =========================

-- 1) Ensure every table uses RLS
ALTER TABLE IF EXISTS public.about_us ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenditure ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper for public read
CREATE OR REPLACE FUNCTION public.is_public_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT true
$$;

-- 2) Public-facing content tables (landing page)
-- Public read, authenticated admin/editor/developer/secretary write
CREATE POLICY "Public read about_us" ON public.about_us FOR SELECT USING (true);
CREATE POLICY "Admin write about_us" ON public.about_us FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Public read blogs" ON public.blogs FOR SELECT USING (true);
CREATE POLICY "Admin write blogs" ON public.blogs FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Public read packages" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Admin write packages" ON public.packages FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Public read tours" ON public.tours FOR SELECT USING (true);
CREATE POLICY "Admin write tours" ON public.tours FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Public read hotels" ON public.hotels FOR SELECT USING (true);
CREATE POLICY "Admin write hotels" ON public.hotels FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Public read gallery" ON public.gallery FOR SELECT USING (true);
CREATE POLICY "Admin write gallery" ON public.gallery FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Public read gallery_images" ON public.gallery_images FOR SELECT USING (true);
CREATE POLICY "Admin write gallery_images" ON public.gallery_images FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Public read faqs" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Admin write faqs" ON public.faqs FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Public read contact_info" ON public.contact_info FOR SELECT USING (true);
CREATE POLICY "Admin write contact_info" ON public.contact_info FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Public read site_content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Admin write site_content" ON public.site_content FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

-- 3) Admin/Operational tables
-- Only developer, secretary, admin, editor can access
CREATE POLICY "Admin manage bookings" ON public.bookings FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admin read bookings" ON public.bookings FOR SELECT USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin manage booking_statuses" ON public.booking_statuses FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin manage clients" ON public.clients FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin read contact_messages" ON public.contact_messages FOR SELECT USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin manage contributions" ON public.contributions FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin manage expenditure" ON public.expenditure FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin manage income" ON public.income FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin manage payments" ON public.payments FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Admin manage payment_plans" ON public.payment_plans FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Profiles self view" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manage profiles" ON public.profiles FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

-- 4) Role-specific read policies for business summaries
CREATE POLICY "Business read bookings" ON public.bookings FOR SELECT USING (public.has_role(auth.uid(), 'business'));
CREATE POLICY "Business read payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'business'));
CREATE POLICY "Business read clients" ON public.clients FOR SELECT USING (public.has_role(auth.uid(), 'business'));
CREATE POLICY "Business read contributions" ON public.contributions FOR SELECT USING (public.has_role(auth.uid(), 'business'));
CREATE POLICY "Business read income" ON public.income FOR SELECT USING (public.has_role(auth.uid(), 'business'));
CREATE POLICY "Business read expenditure" ON public.expenditure FOR SELECT USING (public.has_role(auth.uid(), 'business'));

CREATE POLICY "Tech write packages" ON public.packages FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));
CREATE POLICY "Tech write tours" ON public.tours FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));
CREATE POLICY "Tech write hotels" ON public.hotels FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));
CREATE POLICY "Tech write gallery" ON public.gallery FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));
CREATE POLICY "Tech write gallery_images" ON public.gallery_images FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));
CREATE POLICY "Tech write blogs" ON public.blogs FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));
CREATE POLICY "Tech write faqs" ON public.faqs FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));
CREATE POLICY "Tech write site_content" ON public.site_content FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));
CREATE POLICY "Tech write about_us" ON public.about_us FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));

CREATE POLICY "Media read packages" ON public.packages FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read tours" ON public.tours FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read hotels" ON public.hotels FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read gallery" ON public.gallery FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read gallery_images" ON public.gallery_images FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read blogs" ON public.blogs FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read faqs" ON public.faqs FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read site_content" ON public.site_content FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read about_us" ON public.about_us FOR SELECT USING (public.has_role(auth.uid(), 'media'));

-- 5) Updated trigger to support role selection at signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count int;
DECLARE selected_role text;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));

  selected_role := NEW.raw_user_meta_data->>'role';

  IF NEW.email = 'lunainc256@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'developer');
  ELSIF selected_role IS NOT NULL 
    AND selected_role != 'developer' 
    AND selected_role IN ('tech', 'business', 'secretary', 'media', 'admin', 'editor') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, selected_role::public.app_role);
  ELSE
    SELECT count(*) INTO user_count FROM auth.users;
    IF user_count = 1 THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'developer');
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'media');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 6) Seed / fix roles for existing users
-- Map old roles to new ones and ensure the developer email has developer role
DO $$
DECLARE uid uuid;
BEGIN
  -- Ensure developer email gets developer role
  SELECT id INTO uid FROM auth.users WHERE email = 'lunainc256@gmail.com';
  IF uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = uid AND role != 'developer';
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'developer') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Migrate old admin -> developer
  UPDATE public.user_roles SET role = 'developer' WHERE role = 'admin';
  -- Migrate old editor -> secretary
  UPDATE public.user_roles SET role = 'secretary' WHERE role = 'editor';
END $$;
