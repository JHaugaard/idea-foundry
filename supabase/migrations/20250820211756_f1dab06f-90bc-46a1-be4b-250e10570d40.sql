-- Create enhanced AI tag preferences and learning data tables

-- Table for user AI tag preferences and settings
CREATE TABLE IF NOT EXISTS public.ai_tag_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- AI Generation Settings
  auto_suggest_enabled BOOLEAN NOT NULL DEFAULT true,
  confidence_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.6,
  max_suggestions_per_note INTEGER NOT NULL DEFAULT 5,
  manual_review_required BOOLEAN NOT NULL DEFAULT false,
  
  -- Multi-language Settings
  primary_language TEXT NOT NULL DEFAULT 'en',
  auto_translate_tags BOOLEAN NOT NULL DEFAULT false,
  normalize_tags BOOLEAN NOT NULL DEFAULT true,
  
  -- Quality and Cleanup Settings
  duplicate_detection_enabled BOOLEAN NOT NULL DEFAULT true,
  quality_scoring_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_cleanup_suggestions BOOLEAN NOT NULL DEFAULT true,
  
  -- Learning Settings
  learn_from_rejections BOOLEAN NOT NULL DEFAULT true,
  learn_from_acceptances BOOLEAN NOT NULL DEFAULT true,
  personalization_level TEXT NOT NULL DEFAULT 'medium' CHECK (personalization_level IN ('low', 'medium', 'high')),
  
  -- Blacklist/Whitelist
  blacklisted_tags TEXT[] DEFAULT '{}',
  whitelisted_patterns TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tracking user tag interaction patterns
CREATE TABLE IF NOT EXISTS public.tag_interaction_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Interaction Details
  suggested_tag TEXT NOT NULL,
  note_id UUID NOT NULL,
  suggestion_source TEXT NOT NULL CHECK (suggestion_source IN ('content_ai', 'similarity', 'pattern', 'quality')),
  suggestion_confidence DECIMAL(3,2) NOT NULL,
  
  -- User Action
  action TEXT NOT NULL CHECK (action IN ('accepted', 'rejected', 'modified')),
  modified_to TEXT, -- If action was 'modified', what did they change it to
  
  -- Context
  note_content_snippet TEXT,
  other_note_tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for tag quality analysis and suggestions
CREATE TABLE IF NOT EXISTS public.tag_quality_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Tag Analysis
  tag_name TEXT NOT NULL,
  quality_score DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0
  
  -- Issues Detected
  issues TEXT[] DEFAULT '{}', -- 'duplicate', 'misspelled', 'too_generic', 'inconsistent_format', etc.
  suggestions TEXT[] DEFAULT '{}', -- Suggested improvements
  
  -- Usage Patterns
  usage_frequency INTEGER NOT NULL DEFAULT 0,
  co_occurrence_tags TEXT[] DEFAULT '{}',
  
  -- Improvement Recommendations
  merge_candidates TEXT[] DEFAULT '{}',
  replacement_suggestions TEXT[] DEFAULT '{}',
  
  last_analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.ai_tag_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_interaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_quality_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_tag_preferences
CREATE POLICY "Users can view their own AI tag preferences"
ON public.ai_tag_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI tag preferences"
ON public.ai_tag_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI tag preferences"
ON public.ai_tag_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for tag_interaction_history
CREATE POLICY "Users can view their own tag interaction history"
ON public.tag_interaction_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tag interaction history"
ON public.tag_interaction_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for tag_quality_analysis
CREATE POLICY "Users can view their own tag quality analysis"
ON public.tag_quality_analysis FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tag quality analysis"
ON public.tag_quality_analysis FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tag quality analysis"
ON public.tag_quality_analysis FOR UPDATE
USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_tag_preferences_user_id ON public.ai_tag_preferences (user_id);
CREATE INDEX IF NOT EXISTS idx_tag_interaction_history_user_id ON public.tag_interaction_history (user_id);
CREATE INDEX IF NOT EXISTS idx_tag_interaction_history_tag ON public.tag_interaction_history (user_id, suggested_tag);
CREATE INDEX IF NOT EXISTS idx_tag_quality_analysis_user_tag ON public.tag_quality_analysis (user_id, tag_name);
CREATE INDEX IF NOT EXISTS idx_tag_quality_analysis_quality_score ON public.tag_quality_analysis (user_id, quality_score DESC);

-- Triggers for updated_at
CREATE TRIGGER update_ai_tag_preferences_updated_at
  BEFORE UPDATE ON public.ai_tag_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tag_quality_analysis_updated_at
  BEFORE UPDATE ON public.tag_quality_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();