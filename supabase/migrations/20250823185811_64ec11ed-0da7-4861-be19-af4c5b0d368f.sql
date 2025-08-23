-- Update statistics for all tables (critical for query optimization)
ANALYZE public.notes;
ANALYZE public.note_links; 
ANALYZE public.note_embeddings;
ANALYZE public.files;
ANALYZE public.profiles;
ANALYZE public.tag_analytics;
ANALYZE public.tag_relationships;
ANALYZE public.tag_quality_analysis;
ANALYZE public.tag_interaction_history;
ANALYZE public.ai_tag_preferences;
ANALYZE public.user_tag_preferences;
ANALYZE public.tag_backups;
ANALYZE public.invitation_tokens;

-- Remove duplicate/redundant indexes to reduce maintenance overhead
DROP INDEX IF EXISTS public.idx_notes_tags; -- redundant with idx_notes_tags_gin
DROP INDEX IF EXISTS public.idx_files_tags; -- redundant with idx_files_tags_gin

-- Optimize frequently queried single-user table access patterns
CREATE INDEX IF NOT EXISTS idx_ai_tag_preferences_user_lookup 
ON public.ai_tag_preferences (user_id) 
WHERE auto_suggest_enabled = true;

CREATE INDEX IF NOT EXISTS idx_user_tag_preferences_lookup 
ON public.user_tag_preferences (user_id);

-- Add missing composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_note_links_user_slug_lookup
ON public.note_links (user_id, canonical_slug) 
WHERE target_note_id IS NOT NULL;

-- Set more aggressive autovacuum settings for heavily accessed tables
ALTER TABLE public.notes SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE public.note_links SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE public.files SET (autovacuum_vacuum_scale_factor = 0.1);