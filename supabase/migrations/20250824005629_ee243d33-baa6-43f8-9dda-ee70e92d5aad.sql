-- Drop existing function and recreate with improved performance
DROP FUNCTION IF EXISTS public.match_notes(vector, double precision, integer);

-- Optimize semantic search performance with better indexing and function improvements

-- Add indexes for frequently filtered columns to optimize search queries
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON public.notes (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_category_type ON public.notes (category_type);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes (pinned);
CREATE INDEX IF NOT EXISTS idx_notes_user_semantic ON public.notes (user_id, semantic_enabled);

-- Add index for note embeddings for faster similarity searches
CREATE INDEX IF NOT EXISTS idx_note_embeddings_user_id ON public.note_embeddings (user_id);

-- Create search analytics table to track search performance and usage
CREATE TABLE IF NOT EXISTS public.search_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    query_type TEXT NOT NULL CHECK (query_type IN ('fuzzy', 'semantic', 'hybrid')),
    results_count INTEGER NOT NULL DEFAULT 0,
    search_duration_ms INTEGER NOT NULL DEFAULT 0,
    clicked_result_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on search analytics
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for search analytics
CREATE POLICY "Users can view their own search analytics" 
ON public.search_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search analytics" 
ON public.search_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add indexes for search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_created ON public.search_analytics (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query_type ON public.search_analytics (query_type);

-- Create embedding generation status table for tracking bulk operations
CREATE TABLE IF NOT EXISTS public.embedding_generation_status (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
    total_notes INTEGER NOT NULL DEFAULT 0,
    processed_notes INTEGER NOT NULL DEFAULT 0,
    failed_notes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    cost_estimate_usd DECIMAL(10,4) DEFAULT 0.0000
);

-- Enable RLS on embedding generation status
ALTER TABLE public.embedding_generation_status ENABLE ROW LEVEL SECURITY;

-- Create policies for embedding generation status
CREATE POLICY "Users can view their own embedding status" 
ON public.embedding_generation_status 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own embedding status" 
ON public.embedding_generation_status 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own embedding status" 
ON public.embedding_generation_status 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add indexes for embedding generation status
CREATE INDEX IF NOT EXISTS idx_embedding_status_user_batch ON public.embedding_generation_status (user_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_embedding_status_created ON public.embedding_generation_status (started_at DESC);

-- Enable realtime for live progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.embedding_generation_status;

-- Improved match_notes function with better performance and caching
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

-- Create function to track search analytics
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