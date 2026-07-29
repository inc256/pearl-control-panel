-- =========================
-- Extended Roles System
-- =========================

-- Extend app_role enum with custom roles
DO $$
BEGIN
  BEGIN ALTER TYPE public.app_role ADD VALUE 'secretary'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.app_role ADD VALUE 'tech'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.app_role ADD VALUE 'business'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.app_role ADD VALUE 'media'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER TYPE public.app_role ADD VALUE 'developer'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Update is_admin_or_editor to include developer and secretary
CREATE OR REPLACE FUNCTION public.is_admin_or_editor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('developer','secretary','admin','editor'))
$$;

-- Update handle_new_user trigger behavior
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count int;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));

  IF NEW.email = 'lunainc256@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'developer');
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

-- Allow developers and secretaries to view all profiles
CREATE POLICY "Admin manage profiles" ON public.profiles FOR SELECT USING (
  public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'secretary')
);

-- Update user_roles policy to allow developer and secretary to manage roles
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (
  public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'secretary')
) WITH CHECK (
  public.has_role(auth.uid(), 'developer') OR public.has_role(auth.uid(), 'secretary')
);

-- Migrate existing enum values
DO $$
BEGIN
  BEGIN
    UPDATE public.user_roles SET role = 'developer' WHERE role = 'admin';
  EXCEPTION WHEN undefined_object THEN NULL; WHEN others THEN NULL; END;
  BEGIN
    UPDATE public.user_roles SET role = 'secretary' WHERE role = 'editor';
  EXCEPTION WHEN undefined_object THEN NULL; WHEN others THEN NULL; END;
END $$;
