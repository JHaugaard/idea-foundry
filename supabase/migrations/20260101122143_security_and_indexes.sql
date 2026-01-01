-- Migration: Security hardening and performance indexes
-- Date: 2026-01-01
-- Purpose:
--   1. Add RLS policies to note_links table
--   2. Add missing indexes for common queries

-- ============================================
-- PHASE 2: RLS for note_links table
-- ============================================

-- Enable RLS on note_links (may already be enabled, IF NOT EXISTS handles this)
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to ensure clean state)
DROP POLICY IF EXISTS "Users can view own links" ON note_links;
DROP POLICY IF EXISTS "Users can insert own links" ON note_links;
DROP POLICY IF EXISTS "Users can delete own links" ON note_links;
DROP POLICY IF EXISTS "Users can update own links" ON note_links;

-- Create RLS policies based on ownership through source_note_id -> notes.user_id
CREATE POLICY "Users can view own links" ON note_links
  FOR SELECT USING (
    source_note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own links" ON note_links
  FOR INSERT WITH CHECK (
    source_note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own links" ON note_links
  FOR UPDATE USING (
    source_note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own links" ON note_links
  FOR DELETE USING (
    source_note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
  );

-- ============================================
-- PHASE 4: Performance indexes
-- ============================================

-- Index for semantic search queries (user_id + semantic_enabled)
-- Used by match_notes RPC and semantic search features
CREATE INDEX IF NOT EXISTS idx_notes_user_semantic
  ON notes(user_id, semantic_enabled)
  WHERE semantic_enabled = true;

-- Index for embedding queue polling
-- Used by process-queue Edge Function to find pending jobs
CREATE INDEX IF NOT EXISTS idx_embedding_queue_status
  ON embedding_queue(status)
  WHERE status = 'pending';

-- Index for embedding queue by user (if needed for user-specific queue views)
CREATE INDEX IF NOT EXISTS idx_embedding_queue_user_status
  ON embedding_queue(user_id, status);

-- ============================================
-- Verification comments
-- ============================================
-- Run these queries after migration to verify:
--
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'note_links';
--
-- Check policies exist:
-- SELECT policyname FROM pg_policies WHERE tablename = 'note_links';
--
-- Check indexes exist:
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('notes', 'embedding_queue');
