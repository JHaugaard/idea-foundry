-- Ensure 'work' exists in category_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'category_type' AND e.enumlabel = 'work'
  ) THEN
    ALTER TYPE public.category_type ADD VALUE 'work';
  END IF;
END $$;

-- Add pinned flag with default false
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

-- Add captured_on date (UTC date at creation time) with default today
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS captured_on date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date;

-- Index to speed up per-user date searches
CREATE INDEX IF NOT EXISTS idx_notes_user_captured_on ON public.notes (user_id, captured_on DESC);