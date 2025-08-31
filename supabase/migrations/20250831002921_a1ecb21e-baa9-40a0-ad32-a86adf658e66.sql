-- Add embedding source preference to ai_tag_preferences
ALTER TABLE public.ai_tag_preferences 
ADD COLUMN embedding_source text NOT NULL DEFAULT 'auto';

-- Add check constraint for valid embedding sources
ALTER TABLE public.ai_tag_preferences 
ADD CONSTRAINT valid_embedding_source 
CHECK (embedding_source IN ('auto', 'local', 'openai'));