-- Migration: Enhance Structural Wisdom
-- Purpose: Ensure tag_interaction_history persists lessons learned even if notes are deleted, 
-- by making the note_id reference nullable and using ON DELETE SET NULL.

-- 1. Make note_id nullable and add Foreign Key constraint
ALTER TABLE public.tag_interaction_history 
  ALTER COLUMN note_id DROP NOT NULL;

-- 2. Add the Foreign Key constraint with ON DELETE SET NULL
-- First, drop if it somehow exists (standard safety)
ALTER TABLE public.tag_interaction_history
  DROP CONSTRAINT IF EXISTS fk_tag_interaction_history_note;

ALTER TABLE public.tag_interaction_history
  ADD CONSTRAINT fk_tag_interaction_history_note 
  FOREIGN KEY (note_id) 
  REFERENCES public.notes(id) 
  ON DELETE SET NULL;

-- 3. Add comment to explain the rationale (for future John or AI)
COMMENT ON TABLE public.tag_interaction_history IS 'Stores AI interaction history. note_id is nullable to preserve "lessons learned" global preferences even if the specific source note is deleted.';
