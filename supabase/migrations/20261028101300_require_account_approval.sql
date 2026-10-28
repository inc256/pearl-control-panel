-- Require Secretary or Developer approval before new accounts receive access.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_role text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_by uuid;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_approval_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_approval_status_check
  CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- New sign-ups have a pending profile and receive no application role until approved.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  selected_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'media');
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name, approval_status, requested_role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = 'lunainc256@gmail.com' THEN 'approved' ELSE 'pending' END,
    selected_role
  );

  IF NEW.email = 'lunainc256@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'developer')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_user_account(target_user_id uuid, approved_role text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  role_to_assign public.app_role;
  requested text;
BEGIN
  IF NOT public.is_admin_or_editor(auth.uid()) THEN
    RAISE EXCEPTION 'Only a Secretary, Developer, or Administrator can approve accounts';
  END IF;

  SELECT requested_role INTO requested FROM public.profiles WHERE user_id = target_user_id;
  role_to_assign := COALESCE(approved_role, requested, 'media')::public.app_role;

  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, role_to_assign)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
  SET approval_status = 'approved',
      requested_role = role_to_assign::text,
      approved_at = now(),
      approved_by = auth.uid()
  WHERE user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_user_account(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_editor(auth.uid()) THEN
    RAISE EXCEPTION 'Only a Secretary, Developer, or Administrator can disapprove accounts';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  UPDATE public.profiles
  SET approval_status = 'rejected',
      approved_at = NULL,
      approved_by = auth.uid(),
      updated_at = now()
  WHERE user_id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_user_account(uuid) TO authenticated;

DROP POLICY IF EXISTS "Profiles visible to account managers" ON public.profiles;
CREATE POLICY "Profiles visible to account managers" ON public.profiles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin_or_editor(auth.uid())
);
