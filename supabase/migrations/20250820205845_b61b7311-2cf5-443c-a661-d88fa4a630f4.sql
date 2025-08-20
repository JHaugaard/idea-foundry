-- Add GIN indexes on tag arrays for faster tag-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_tags_gin ON public.notes USING GIN (tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_tags_gin ON public.files USING GIN (tags);

-- Add composite indexes for common tag queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_user_tags ON public.notes (user_id, tags) WHERE tags IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_user_created_tags ON public.notes (user_id, created_at DESC, tags) WHERE tags IS NOT NULL;

-- Add full-text search indexes combining content and tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_fts ON public.notes USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '') || ' ' || array_to_string(COALESCE(tags, '{}'), ' '))
);

-- Create materialized view for tag statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_tag_statistics AS
SELECT 
  user_id,
  tag_name,
  usage_count,
  last_used_at,
  first_used_at,
  avg_notes_per_month,
  related_tags
FROM (
  SELECT 
    n.user_id,
    unnest(n.tags) as tag_name,
    COUNT(*) as usage_count,
    MAX(n.updated_at) as last_used_at,
    MIN(n.created_at) as first_used_at,
    COUNT(*) / GREATEST(1, EXTRACT(MONTH FROM AGE(MAX(n.updated_at), MIN(n.created_at))) + 1) as avg_notes_per_month,
    array_agg(DISTINCT other_tags.tag ORDER BY other_tags.tag) FILTER (WHERE other_tags.tag != unnest(n.tags)) as related_tags
  FROM public.notes n
  CROSS JOIN unnest(n.tags) as other_tags(tag)
  WHERE n.tags IS NOT NULL AND array_length(n.tags, 1) > 0
  GROUP BY n.user_id, unnest(n.tags)
) stats;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS mv_tag_statistics_user_tag_idx ON public.mv_tag_statistics (user_id, tag_name);

-- Create materialized view for tag combinations
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_tag_combinations AS
SELECT 
  user_id,
  tag_combination,
  usage_count,
  effectiveness_score,
  last_used_at,
  sample_note_titles
FROM (
  SELECT 
    n.user_id,
    n.tags as tag_combination,
    COUNT(*) as usage_count,
    COUNT(*) * 1.0 / (SELECT COUNT(*) FROM notes n2 WHERE n2.user_id = n.user_id AND n2.tags IS NOT NULL) as effectiveness_score,
    MAX(n.updated_at) as last_used_at,
    array_agg(n.title ORDER BY n.updated_at DESC) FILTER (WHERE n.title IS NOT NULL) as sample_note_titles
  FROM public.notes n
  WHERE n.tags IS NOT NULL AND array_length(n.tags, 1) > 1
  GROUP BY n.user_id, n.tags
  HAVING COUNT(*) > 1
) combinations;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS mv_tag_combinations_user_usage_idx ON public.mv_tag_combinations (user_id, usage_count DESC);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_tag_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_tag_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_tag_combinations;
END;
$$;

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

-- Create function for tag suggestion precomputation
CREATE OR REPLACE FUNCTION public.precompute_tag_suggestions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This could be called periodically to precompute common tag suggestions
  -- For now, just refresh the materialized views
  PERFORM public.refresh_tag_materialized_views();
END;
$$;

-- Optimize RLS policies with better indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tag_analytics_user_usage ON public.tag_analytics (user_id, total_usage_count DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tag_relationships_user_strength ON public.tag_relationships (user_id, relationship_strength DESC);

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