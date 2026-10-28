CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_is_developer boolean;
  target_is_developer boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  IF NOT public.has_role(auth.uid(), 'developer') AND NOT public.has_role(auth.uid(), 'secretary') THEN
    RAISE EXCEPTION 'Only developers and secretaries can delete users';
  END IF;

  caller_is_developer := public.has_role(auth.uid(), 'developer');
  target_is_developer := public.has_role(target_user_id, 'developer');

  IF target_is_developer AND NOT caller_is_developer THEN
    RAISE EXCEPTION 'Secretaries cannot delete developer accounts';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated;
