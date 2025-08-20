-- Add GIN indexes on tag arrays for faster tag-based queries
CREATE INDEX IF NOT EXISTS idx_notes_tags_gin ON public.notes USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_files_tags_gin ON public.files USING GIN (tags);

-- Add composite indexes for common tag queries
CREATE INDEX IF NOT EXISTS idx_notes_user_tags ON public.notes (user_id, tags) WHERE tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_user_created_tags ON public.notes (user_id, created_at DESC, tags) WHERE tags IS NOT NULL;

-- Add full-text search indexes combining content and tags
CREATE INDEX IF NOT EXISTS idx_notes_fts ON public.notes USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '') || ' ' || array_to_string(COALESCE(tags, '{}'), ' '))
);

-- Create trigger function for tag usage tracking
CREATE OR REPLACE FUNCTION public.update_tag_usage_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tag_name text;
BEGIN
  -- Handle INSERT and UPDATE operations
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update tag analytics for each tag
    IF NEW.tags IS NOT NULL THEN
      FOREACH tag_name IN ARRAY NEW.tags
      LOOP
        INSERT INTO public.tag_analytics (user_id, tag_name, total_usage_count, last_used_at)
        VALUES (NEW.user_id, tag_name, 1, now())
        ON CONFLICT (user_id, tag_name) 
        DO UPDATE SET 
          total_usage_count = tag_analytics.total_usage_count + 1,
          last_used_at = now(),
          updated_at = now();
      END LOOP;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE operations
  IF TG_OP = 'DELETE' THEN
    -- Decrease usage count for deleted tags
    IF OLD.tags IS NOT NULL THEN
      FOREACH tag_name IN ARRAY OLD.tags
      LOOP
        UPDATE public.tag_analytics 
        SET total_usage_count = GREATEST(0, total_usage_count - 1),
            updated_at = now()
        WHERE user_id = OLD.user_id AND tag_name = tag_analytics.tag_name;
      END LOOP;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers for tag usage tracking
DROP TRIGGER IF EXISTS trigger_notes_tag_usage ON public.notes;
CREATE TRIGGER trigger_notes_tag_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tag_usage_tracking();

DROP TRIGGER IF EXISTS trigger_files_tag_usage ON public.files;
CREATE TRIGGER trigger_files_tag_usage
  AFTER INSERT OR UPDATE OR DELETE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tag_usage_tracking();

-- Optimize RLS policies with better indexes
CREATE INDEX IF NOT EXISTS idx_tag_analytics_user_usage ON public.tag_analytics (user_id, total_usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_tag_relationships_user_strength ON public.tag_relationships (user_id, relationship_strength DESC);

-- Create function for efficient tag search
CREATE OR REPLACE FUNCTION public.search_tags_fts(
  p_user_id uuid,
  p_search_query text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  note_id uuid,
  title text,
  content text,
  tags text[],
  rank real
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.content,
    n.tags,
    ts_rank(
      to_tsvector('english', COALESCE(n.title, '') || ' ' || COALESCE(n.content, '') || ' ' || array_to_string(COALESCE(n.tags, '{}'), ' ')),
      plainto_tsquery('english', p_search_query)
    ) as rank
  FROM public.notes n
  WHERE n.user_id = p_user_id
    AND to_tsvector('english', COALESCE(n.title, '') || ' ' || COALESCE(n.content, '') || ' ' || array_to_string(COALESCE(n.tags, '{}'), ' '))
        @@ plainto_tsquery('english', p_search_query)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$;