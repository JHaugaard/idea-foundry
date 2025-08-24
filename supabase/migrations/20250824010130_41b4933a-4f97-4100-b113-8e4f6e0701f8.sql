-- Fix security warnings by adding search_path to functions

-- Update match_notes function with proper search_path
CREATE OR REPLACE FUNCTION public.match_notes(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  note_id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ne.note_id,
    (1 - (ne.embedding <=> query_embedding)) as similarity
  FROM public.note_embeddings ne
  INNER JOIN public.notes n ON ne.note_id = n.id
  WHERE 
    ne.user_id = auth.uid()
    AND n.user_id = auth.uid() -- Double check for security
    AND (1 - (ne.embedding <=> query_embedding)) > match_threshold
  ORDER BY ne.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Update log_search_analytics function with proper search_path
CREATE OR REPLACE FUNCTION public.log_search_analytics(
  p_query_text text,
  p_query_type text,
  p_results_count int,
  p_search_duration_ms int,
  p_clicked_result_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.search_analytics (
    user_id,
    query_text,
    query_type,
    results_count,
    search_duration_ms,
    clicked_result_id
  ) VALUES (
    auth.uid(),
    p_query_text,
    p_query_type,
    p_results_count,
    p_search_duration_ms,
    p_clicked_result_id
  );
END;
$$;