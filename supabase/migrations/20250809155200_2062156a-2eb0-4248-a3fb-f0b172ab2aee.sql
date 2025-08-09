-- 1) Add slug to notes and create note_links table with RLS and triggers

-- Add slug column to notes (nullable). Unique per user when present.
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS slug text;

-- Unique index on (user_id, slug) ignoring nulls
CREATE UNIQUE INDEX IF NOT EXISTS uq_notes_user_slug ON public.notes (user_id, slug);

-- 2) Create note_links table
CREATE TABLE IF NOT EXISTS public.note_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_note_id uuid NOT NULL,
  target_note_id uuid NOT NULL,
  anchor_text text,
  canonical_title text NOT NULL,
  canonical_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_note_links_user ON public.note_links (user_id);
CREATE INDEX IF NOT EXISTS idx_note_links_source ON public.note_links (source_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON public.note_links (target_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_user_slug ON public.note_links (user_id, canonical_slug);

-- Add FKs to notes (do not cascade deletes by default)
ALTER TABLE public.note_links
  ADD CONSTRAINT fk_note_links_source FOREIGN KEY (source_note_id) REFERENCES public.notes(id) ON DELETE CASCADE;
ALTER TABLE public.note_links
  ADD CONSTRAINT fk_note_links_target FOREIGN KEY (target_note_id) REFERENCES public.notes(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'note_links' AND policyname = 'Users can view their own note links'
  ) THEN
    CREATE POLICY "Users can view their own note links"
    ON public.note_links FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'note_links' AND policyname = 'Users can create their own note links'
  ) THEN
    CREATE POLICY "Users can create their own note links"
    ON public.note_links FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'note_links' AND policyname = 'Users can update their own note links'
  ) THEN
    CREATE POLICY "Users can update their own note links"
    ON public.note_links FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'note_links' AND policyname = 'Users can delete their own note links'
  ) THEN
    CREATE POLICY "Users can delete their own note links"
    ON public.note_links FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

DROP TRIGGER IF EXISTS trg_note_links_updated_at ON public.note_links;
CREATE TRIGGER trg_note_links_updated_at
BEFORE UPDATE ON public.note_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();