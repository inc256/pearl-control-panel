ALTER TABLE public.processed_documents
  ADD COLUMN IF NOT EXISTS second_party_signature boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS second_party_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS second_party_title text NOT NULL DEFAULT '';
