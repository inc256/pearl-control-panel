-- Add explicit delete permissions for clients and payments for admin/editor-style roles

ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin delete clients" ON public.clients;
CREATE POLICY "Admin delete clients"
  ON public.clients
  FOR DELETE
  USING (public.is_admin_or_editor(auth.uid()));

DROP POLICY IF EXISTS "Admin delete payments" ON public.payments;
CREATE POLICY "Admin delete payments"
  ON public.payments
  FOR DELETE
  USING (public.is_admin_or_editor(auth.uid()));

CREATE OR REPLACE FUNCTION public.delete_client_and_payments(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_editor(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  DELETE FROM public.payments WHERE client_id = p_client_id;
  DELETE FROM public.clients WHERE id = p_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_client_and_payments(uuid) TO authenticated;
