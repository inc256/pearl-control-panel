CREATE TABLE IF NOT EXISTS public.processed_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_documents
  ADD COLUMN IF NOT EXISTS reference text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS writer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS writer_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS document_date date NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE public.processed_documents
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.processed_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Document managers view documents" ON public.processed_documents;
CREATE POLICY "Document managers view documents" ON public.processed_documents
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'developer') OR
  public.has_role(auth.uid(), 'secretary') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'business')
);

DROP POLICY IF EXISTS "Document managers create documents" ON public.processed_documents;
CREATE POLICY "Document managers create documents" ON public.processed_documents
FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid() AND (
    public.has_role(auth.uid(), 'developer') OR
    public.has_role(auth.uid(), 'secretary') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'business')
  )
);

DROP POLICY IF EXISTS "Document managers update documents" ON public.processed_documents;
CREATE POLICY "Document managers update documents" ON public.processed_documents
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'developer') OR
  public.has_role(auth.uid(), 'secretary') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'business')
) WITH CHECK (
  public.has_role(auth.uid(), 'developer') OR
  public.has_role(auth.uid(), 'secretary') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'business')
);

DROP POLICY IF EXISTS "Document managers delete documents" ON public.processed_documents;
CREATE POLICY "Document managers delete documents" ON public.processed_documents
FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'developer') OR
  public.has_role(auth.uid(), 'secretary') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'business')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.processed_documents TO authenticated;
