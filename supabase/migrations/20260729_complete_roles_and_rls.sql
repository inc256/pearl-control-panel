-- =========================
-- Complete role + RLS setup
-- Safe to run on a fresh or existing DB
-- =========================

-- 1) Create enum if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','editor','tech','business','secretary','media','developer');
  END IF;
END $$;

-- 2) Create tables if missing
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3) Helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_editor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('developer','secretary','admin','editor'))
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count int;
DECLARE selected_role text;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (user_id) DO NOTHING;

  selected_role := NEW.raw_user_meta_data->>'role';

  IF NEW.email = 'lunainc256@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'developer') ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF selected_role IS NOT NULL 
    AND selected_role != 'developer' 
    AND selected_role IN ('tech', 'business', 'secretary', 'media', 'admin', 'editor') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, selected_role::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    SELECT count(*) INTO user_count FROM auth.users;
    IF user_count = 1 THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'developer') ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'media') ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 4) Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Enable RLS on ALL tables
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
ALTER TABLE IF EXISTS public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6) Drop old policies if they exist to allow re-running
DROP POLICY IF EXISTS "Public read about_us" ON public.about_us;
DROP POLICY IF EXISTS "Admin write about_us" ON public.about_us;
DROP POLICY IF EXISTS "Public read blogs" ON public.blogs;
DROP POLICY IF EXISTS "Admin write blogs" ON public.blogs;
DROP POLICY IF EXISTS "Public read packages" ON public.packages;
DROP POLICY IF EXISTS "Admin write packages" ON public.packages;
DROP POLICY IF EXISTS "Public read tours" ON public.tours;
DROP POLICY IF EXISTS "Admin write tours" ON public.tours;
DROP POLICY IF EXISTS "Public read hotels" ON public.hotels;
DROP POLICY IF EXISTS "Admin write hotels" ON public.hotels;
DROP POLICY IF EXISTS "Public read gallery" ON public.gallery;
DROP POLICY IF EXISTS "Admin write gallery" ON public.gallery;
DROP POLICY IF EXISTS "Public read faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admin write faqs" ON public.faqs;
DROP POLICY IF EXISTS "Public read contact_info" ON public.contact_info;
DROP POLICY IF EXISTS "Admin write contact_info" ON public.contact_info;
DROP POLICY IF EXISTS "Admin manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admin read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admin manage booking_statuses" ON public.booking_statuses;
DROP POLICY IF EXISTS "Admin manage clients" ON public.clients;
DROP POLICY IF EXISTS "Admin read contact_messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admin manage contributions" ON public.contributions;
DROP POLICY IF EXISTS "Admin manage expenditure" ON public.expenditure;
DROP POLICY IF EXISTS "Admin manage income" ON public.income;
DROP POLICY IF EXISTS "Admin manage payments" ON public.payments;
DROP POLICY IF EXISTS "Admin manage payment_plans" ON public.payment_plans;
DROP POLICY IF EXISTS "Profiles self view" ON public.profiles;
DROP POLICY IF EXISTS "Admin manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users see own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Business read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Business read payments" ON public.payments;
DROP POLICY IF EXISTS "Business read clients" ON public.clients;
DROP POLICY IF EXISTS "Business read contributions" ON public.contributions;
DROP POLICY IF EXISTS "Business read income" ON public.income;
DROP POLICY IF EXISTS "Business read expenditure" ON public.expenditure;
DROP POLICY IF EXISTS "Tech write packages" ON public.packages;
DROP POLICY IF EXISTS "Tech write tours" ON public.tours;
DROP POLICY IF EXISTS "Tech write hotels" ON public.hotels;
DROP POLICY IF EXISTS "Tech write gallery" ON public.gallery;
DROP POLICY IF EXISTS "Tech write blogs" ON public.blogs;
DROP POLICY IF EXISTS "Tech write faqs" ON public.faqs;
DROP POLICY IF EXISTS "Tech write about_us" ON public.about_us;
DROP POLICY IF EXISTS "Media read packages" ON public.packages;
DROP POLICY IF EXISTS "Media read tours" ON public.tours;
DROP POLICY IF EXISTS "Media read hotels" ON public.hotels;
DROP POLICY IF EXISTS "Media read gallery" ON public.gallery;
DROP POLICY IF EXISTS "Media read blogs" ON public.blogs;
DROP POLICY IF EXISTS "Media read faqs" ON public.faqs;
DROP POLICY IF EXISTS "Media read about_us" ON public.about_us;

-- 7) Create policies
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


CREATE POLICY "Public read faqs" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Admin write faqs" ON public.faqs FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "Public read contact_info" ON public.contact_info FOR SELECT USING (true);
CREATE POLICY "Admin write contact_info" ON public.contact_info FOR ALL USING (public.is_admin_or_editor(auth.uid())) WITH CHECK (public.is_admin_or_editor(auth.uid()));

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
CREATE POLICY "Tech write blogs" ON public.blogs FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));
CREATE POLICY "Tech write faqs" ON public.faqs FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));
CREATE POLICY "Tech write about_us" ON public.about_us FOR ALL USING (public.has_role(auth.uid(), 'tech')) WITH CHECK (public.has_role(auth.uid(), 'tech'));

CREATE POLICY "Media read packages" ON public.packages FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read tours" ON public.tours FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read hotels" ON public.hotels FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read gallery" ON public.gallery FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read blogs" ON public.blogs FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read faqs" ON public.faqs FOR SELECT USING (public.has_role(auth.uid(), 'media'));
CREATE POLICY "Media read about_us" ON public.about_us FOR SELECT USING (public.has_role(auth.uid(), 'media'));

-- 8) Seed roles for existing users and the developer email
DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'lunainc256@gmail.com';
  IF uid IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = uid AND role != 'developer';
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'developer') ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  UPDATE public.user_roles SET role = 'developer' WHERE role = 'admin';
  UPDATE public.user_roles SET role = 'secretary' WHERE role = 'editor';
END $$;
