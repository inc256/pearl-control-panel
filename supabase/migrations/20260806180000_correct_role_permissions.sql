-- Correct role access and contributions permissions
-- This migration ensures developer is recognized by email for RLS,
-- and adds read access to contributions for tech, media, and business roles.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','editor','tech','business','secretary','media','developer');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
  OR (_role = 'developer' AND auth.jwt() ->> 'email' = 'lunainc256@gmail.com');
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_editor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('developer','secretary','admin','editor')
  )
  OR auth.jwt() ->> 'email' = 'lunainc256@gmail.com';
$$;

ALTER TABLE IF EXISTS public.contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tech read contributions" ON public.contributions;
CREATE POLICY "Tech read contributions" ON public.contributions
FOR SELECT USING (public.has_role(auth.uid(), 'tech'));

DROP POLICY IF EXISTS "Media read contributions" ON public.contributions;
CREATE POLICY "Media read contributions" ON public.contributions
FOR SELECT USING (public.has_role(auth.uid(), 'media'));

DROP POLICY IF EXISTS "Business read contributions" ON public.contributions;
CREATE POLICY "Business read contributions" ON public.contributions
FOR SELECT USING (public.has_role(auth.uid(), 'business'));
