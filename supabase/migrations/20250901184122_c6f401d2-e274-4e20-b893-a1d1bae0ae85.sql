
-- 1) Add persisted summary for notes
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS summary TEXT;

-- 2) Add processing flags to persist what has been applied (and embeddings choice)
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS processing_flags JSONB NOT NULL DEFAULT '{}'::jsonb;
