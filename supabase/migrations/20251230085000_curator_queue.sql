-- Migration: The "Curator" Trigger
-- Purpose: Move embedding logic from frontend to database trigger
-- Philosophy: Only generate embeddings for "reviewed" notes (The "Coffee" stage)

-- 1. Create a function that invokes the Edge Function
-- Note: This requires the pg_net extension for HTTP calls, or a simplified approach
-- Since self-hosted pg_net can be complex to configure, we will use a dedicated
-- tables-based queue or a direct function if available. 
--
-- HOWEVER, a simpler "Logic Enforcement" is to use a status-based queue.
-- Let's stick to the "Trigger" design pattern but implemented via the Edge Function
-- listening to a webhook.
--
-- WAIT. The most robust self-hosted pattern without complex extensions is:
-- 1. Client updates note to 'reviewed'.
-- 2. Client calls 'note-embed' manually (current).
--
-- BUT the user asked to move this to the BACKEND to avoid "closed laptop" issues.
--
-- BEST APPROACH FOR SELF-HOSTED SUPABASE:
-- Use `supabase_functions` schema (if available) or simply rely on Database Webhooks
-- configurable in the Dashboard.
--
-- SINCE we are writing SQL here, we will create a 'job queue' table.
-- This is infinitely more robust than a transient http request.

-- Step 1: Create a lightweight job queue for embeddings
CREATE TABLE IF NOT EXISTS public.embedding_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'failed', 'completed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Create a function that adds to this queue ONLY when status changes to 'reviewed'
CREATE OR REPLACE FUNCTION public.queue_note_for_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Trigger when review_status becomes 'reviewed'
  -- OR if it is already 'reviewed' and content/title updates
  IF (NEW.review_status = 'reviewed' AND (OLD.review_status != 'reviewed' OR NEW.review_status IS NULL))
     OR (NEW.review_status = 'reviewed' AND (NEW.content != OLD.content OR NEW.title != OLD.title)) THEN
     
     INSERT INTO public.embedding_queue (note_id)
     VALUES (NEW.id)
     ON CONFLICT DO NOTHING; -- No duplicates needed
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Attach trigger to notes table
DROP TRIGGER IF EXISTS trg_queue_embedding ON public.notes;

CREATE TRIGGER trg_queue_embedding
AFTER UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.queue_note_for_embedding();

-- NOTE: This sets up the ARCHITECTURE.
-- To actually process this queue, we need a simple scheduled Edge Function (cron)
-- or a recursive trigger. 
-- For now, the "Curator" action ensures the INTENT is captured DURABLY.
