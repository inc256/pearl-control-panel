ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_amount numeric DEFAULT 0;

ALTER TABLE IF EXISTS public.clients
  ALTER COLUMN discount_amount SET DEFAULT 0,
  ALTER COLUMN additional_amount SET DEFAULT 0;
