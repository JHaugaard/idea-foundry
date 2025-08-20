-- Create user tag preferences table
CREATE TABLE public.user_tag_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  max_tags_per_note INTEGER NOT NULL DEFAULT 10,
  max_total_tags INTEGER NOT NULL DEFAULT 500,
  enforce_naming_conventions BOOLEAN NOT NULL DEFAULT true,
  auto_format_tags BOOLEAN NOT NULL DEFAULT true,
  suggest_similar_tags BOOLEAN NOT NULL DEFAULT true,
  reserved_words TEXT[] DEFAULT ARRAY['system', 'admin', 'root', 'null', 'undefined', 'delete', 'new', 'edit', 'create', 'update'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_tag_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tag preferences" 
ON public.user_tag_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tag preferences" 
ON public.user_tag_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tag preferences" 
ON public.user_tag_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create tag analytics table for tracking usage and relationships
CREATE TABLE public.tag_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tag_name TEXT NOT NULL,
  total_usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag_name)
);

-- Enable RLS
ALTER TABLE public.tag_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tag analytics" 
ON public.tag_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tag analytics" 
ON public.tag_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tag analytics" 
ON public.tag_analytics 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tag analytics" 
ON public.tag_analytics 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create tag relationships table for co-occurrence tracking
CREATE TABLE public.tag_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tag_a TEXT NOT NULL,
  tag_b TEXT NOT NULL,
  co_occurrence_count INTEGER NOT NULL DEFAULT 1,
  relationship_strength DECIMAL(3,2) NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tag_a, tag_b),
  CHECK (tag_a < tag_b) -- Ensure consistent ordering
);

-- Enable RLS
ALTER TABLE public.tag_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tag relationships" 
ON public.tag_relationships 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tag relationships" 
ON public.tag_relationships 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tag relationships" 
ON public.tag_relationships 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tag relationships" 
ON public.tag_relationships 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create tag backups table
CREATE TABLE public.tag_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  backup_name TEXT NOT NULL,
  backup_data JSONB NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'auto', 'export'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tag_backups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tag backups" 
ON public.tag_backups 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tag backups" 
ON public.tag_backups 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tag backups" 
ON public.tag_backups 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create triggers for updating timestamps
CREATE TRIGGER update_user_tag_preferences_updated_at
BEFORE UPDATE ON public.user_tag_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tag_analytics_updated_at
BEFORE UPDATE ON public.tag_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tag_relationships_updated_at
BEFORE UPDATE ON public.tag_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to validate tag names
CREATE OR REPLACE FUNCTION public.validate_tag_name(tag_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check length (2-30 characters)
  IF LENGTH(tag_name) < 2 OR LENGTH(tag_name) > 30 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if lowercase and hyphen-separated (no spaces, special chars except hyphens)
  IF tag_name !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RETURN FALSE;
  END IF;
  
  -- Cannot start or end with hyphen
  IF LEFT(tag_name, 1) = '-' OR RIGHT(tag_name, 1) = '-' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create function to format tag names
CREATE OR REPLACE FUNCTION public.format_tag_name(tag_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Convert to lowercase, replace spaces and underscores with hyphens
  tag_name := LOWER(TRIM(tag_name));
  tag_name := REGEXP_REPLACE(tag_name, '[_\s]+', '-', 'g');
  
  -- Remove special characters except hyphens and alphanumeric
  tag_name := REGEXP_REPLACE(tag_name, '[^a-z0-9-]', '', 'g');
  
  -- Remove multiple consecutive hyphens
  tag_name := REGEXP_REPLACE(tag_name, '-+', '-', 'g');
  
  -- Remove leading and trailing hyphens
  tag_name := TRIM(tag_name, '-');
  
  RETURN tag_name;
END;
$$;