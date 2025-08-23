-- Performance optimizations for backlinking system

-- Add composite index for common backlink queries (user + target + created_at)
CREATE INDEX IF NOT EXISTS idx_note_links_user_target_created 
ON public.note_links (user_id, target_note_id, created_at DESC);

-- Add composite index for source + user queries
CREATE INDEX IF NOT EXISTS idx_note_links_user_source_created 
ON public.note_links (user_id, source_note_id, created_at DESC);

-- Optimize tag relationship queries
CREATE INDEX IF NOT EXISTS idx_tag_relationships_user_tags 
ON public.tag_relationships (user_id, tag_a, tag_b);

-- Add index for tag analytics by last_used_at for recent activity queries
CREATE INDEX IF NOT EXISTS idx_tag_analytics_user_recent 
ON public.tag_analytics (user_id, last_used_at DESC NULLS LAST);

-- Add partial index for notes with semantic search enabled
CREATE INDEX IF NOT EXISTS idx_notes_semantic_enabled 
ON public.notes (user_id, updated_at DESC) 
WHERE semantic_enabled = true;

-- Add index for note embeddings with semantic enabled notes
CREATE INDEX IF NOT EXISTS idx_note_embeddings_semantic 
ON public.note_embeddings (user_id, created_at DESC);

-- Optimize file queries by type and tags
CREATE INDEX IF NOT EXISTS idx_files_user_type_created 
ON public.files (user_id, file_type, created_at DESC);