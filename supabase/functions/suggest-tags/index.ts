import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OLLAMA_URL = Deno.env.get('OLLAMA_URL') || 'https://ollama.haugaard.dev';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      content,
      title,
      existingTags = [],
      noteId,
      mode = 'suggestions', // 'suggestions', 'quality_analysis', 'cleanup', 'translation'
      targetLanguage = 'en',
      analysisType = 'content'
    } = await req.json();

    // Get Supabase client for user's existing tags
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader! } }
    });

    // Get user preferences
    const { data: preferences } = await supabase
      .from('ai_tag_preferences')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    // Get user's existing tags and interaction history for context
    const { data: userNotes } = await supabase
      .from('notes')
      .select('tags')
      .not('tags', 'is', null);

    const allUserTags = Array.from(new Set(
      userNotes?.flatMap(note => note.tags || []) || []
    ));

    // Get user's tag interaction history for learning
    const { data: interactionHistory } = await supabase
      .from('tag_interaction_history')
      .select('suggested_tag, action, modified_to')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })
      .limit(100);

    const rejectedTags = interactionHistory
      ?.filter(h => h.action === 'rejected')
      .map(h => h.suggested_tag) || [];
      
    const acceptedTags = interactionHistory
      ?.filter(h => h.action === 'accepted')
      .map(h => h.suggested_tag) || [];

    // Handle different modes
    let prompt = '';
    let systemMessage = '';

    switch (mode) {
      case 'suggestions':
        systemMessage = 'You are an expert tagging assistant that suggests relevant, specific tags. Return only valid JSON arrays with tag confidence scores.';
        prompt = buildSuggestionsPrompt(title, content, existingTags, allUserTags, rejectedTags, acceptedTags, preferences);
        break;

      case 'quality_analysis':
        systemMessage = 'You are a tag quality analyzer. Assess tag quality and suggest improvements. Return detailed analysis in JSON format.';
        prompt = buildQualityAnalysisPrompt(existingTags, allUserTags);
        break;

      case 'cleanup':
        systemMessage = 'You are a tag cleanup specialist. Identify duplicates, inconsistencies, and merge opportunities. Return structured JSON.';
        prompt = buildCleanupPrompt(allUserTags);
        break;

      case 'translation':
        systemMessage = 'You are a multilingual tag translator. Translate and normalize tags while preserving meaning.';
        prompt = buildTranslationPrompt(existingTags, targetLanguage);
        break;
    }

    // Use Ollama with llama3.2:3b for chat completions
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const resultText = data.message?.content?.trim() || '';
    
    let result: any;
    try {
      result = JSON.parse(resultText);
    } catch {
      console.error('Failed to parse AI response:', resultText);
      throw new Error('Invalid AI response format');
    }

    // Process based on mode
    switch (mode) {
      case 'suggestions':
        return handleSuggestions(result, existingTags, preferences, supabase, noteId);
        
      case 'quality_analysis':
        return handleQualityAnalysis(result, supabase);
        
      case 'cleanup':
        return handleCleanup(result, supabase);
        
      case 'translation':
        return handleTranslation(result);
        
      default:
        throw new Error(`Unknown mode: ${mode}`);
    }

  } catch (error) {
    console.error('Error in enhanced suggest-tags function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      suggestions: [],
      mode
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper Functions

function buildSuggestionsPrompt(title: string, content: string, existingTags: string[], allUserTags: string[], rejectedTags: string[], acceptedTags: string[], preferences: any) {
  const maxSuggestions = preferences?.max_suggestions_per_note || 5;
  const confidenceThreshold = preferences?.confidence_threshold || 0.6;
  
  return `Analyze this note and suggest ${maxSuggestions} highly relevant tags with confidence scores.

CONTEXT:
- Note Title: ${title}
- Note Content: ${content}
- Current tags: ${existingTags.join(', ') || 'none'}
- User's tag vocabulary: ${allUserTags.slice(0, 30).join(', ')}
- Previously rejected suggestions: ${rejectedTags.slice(0, 10).join(', ') || 'none'}
- Previously accepted suggestions: ${acceptedTags.slice(0, 10).join(', ') || 'none'}

REQUIREMENTS:
- Minimum confidence threshold: ${confidenceThreshold}
- Focus on specific, actionable tags over generic ones
- Maintain consistency with user's existing vocabulary when possible
- Consider semantic relationships and context
- Avoid previously rejected tags unless context strongly suggests relevance

Return JSON array of objects with format:
[
  {
    "tag": "specific-tag-name",
    "confidence": 0.85,
    "reason": "Content analysis shows strong focus on this topic",
    "category": "topic|action|context|meta"
  }
]`;
}

function buildQualityAnalysisPrompt(existingTags: string[], allUserTags: string[]) {
  return `Analyze the quality of these tags and provide improvement suggestions.

TAGS TO ANALYZE: ${existingTags.join(', ')}
USER'S FULL TAG VOCABULARY: ${allUserTags.join(', ')}

Return JSON with format:
{
  "overall_quality": 0.75,
  "tag_analysis": [
    {
      "tag": "tag-name",
      "quality_score": 0.8,
      "issues": ["too_generic", "inconsistent_format"],
      "suggestions": ["more-specific-alternative", "better-formatted-version"],
      "merge_candidates": ["similar-tag-1", "similar-tag-2"]
    }
  ],
  "duplicates": [
    {
      "group": ["tag1", "tag2", "tag3"],
      "suggested_merge": "unified-tag-name",
      "confidence": 0.9
    }
  ],
  "recommendations": [
    "Consolidate similar tags",
    "Use more specific terminology"
  ]
}`;
}

function buildCleanupPrompt(allUserTags: string[]) {
  return `Analyze this tag collection for cleanup opportunities.

ALL USER TAGS: ${allUserTags.join(', ')}

Return JSON with format:
{
  "duplicates": [
    {
      "group": ["similar-tag-1", "similar-tag-2"],
      "suggested_merge": "best-unified-name",
      "confidence": 0.9,
      "reason": "Semantic similarity"
    }
  ],
  "inconsistencies": [
    {
      "tags": ["inconsistent-format-tag"],
      "issue": "formatting",
      "suggested_fix": "consistent-format-tag"
    }
  ],
  "underused": [
    {
      "tag": "rarely-used-tag",
      "usage_count": 1,
      "suggested_action": "merge_with_popular_equivalent"
    }
  ],
  "recommendations": {
    "priority": "high|medium|low",
    "summary": "Brief description of recommended actions"
  }
}`;
}

function buildTranslationPrompt(tags: string[], targetLanguage: string) {
  return `Translate and normalize these tags to ${targetLanguage} while preserving semantic meaning.

TAGS: ${tags.join(', ')}
TARGET LANGUAGE: ${targetLanguage}

Return JSON with format:
{
  "translations": [
    {
      "original": "original-tag",
      "translated": "translated-tag", 
      "confidence": 0.95,
      "notes": "Additional context if needed"
    }
  ]
}`;
}

async function handleSuggestions(result: any, existingTags: string[], preferences: any, supabase: any, noteId?: string) {
  const suggestions = result
    .filter((item: any) => !existingTags.includes(item.tag))
    .filter((item: any) => !preferences?.blacklisted_tags?.includes(item.tag));

  // Log suggestions for learning (if noteId provided)
  if (noteId && suggestions.length > 0) {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    for (const suggestion of suggestions) {
      await supabase.from('tag_interaction_history').insert({
        user_id: userId,
        suggested_tag: suggestion.tag,
        note_id: noteId,
        suggestion_source: 'content_ai',
        suggestion_confidence: suggestion.confidence,
        note_content_snippet: null,
        other_note_tags: existingTags
      });
    }
  }

  return new Response(JSON.stringify({ 
    suggestions,
    mode: 'suggestions',
    count: suggestions.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleQualityAnalysis(result: any, supabase: any) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  
  // Store quality analysis results
  for (const tagAnalysis of result.tag_analysis) {
    await supabase.from('tag_quality_analysis').upsert({
      user_id: userId,
      tag_name: tagAnalysis.tag,
      quality_score: tagAnalysis.quality_score,
      issues: tagAnalysis.issues,
      suggestions: tagAnalysis.suggestions,
      merge_candidates: tagAnalysis.merge_candidates,
      last_analyzed_at: new Date().toISOString()
    }, { 
      onConflict: 'user_id,tag_name' 
    });
  }

  return new Response(JSON.stringify({ 
    ...result,
    mode: 'quality_analysis'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleCleanup(result: any, supabase: any) {
  return new Response(JSON.stringify({ 
    ...result,
    mode: 'cleanup'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleTranslation(result: any) {
  return new Response(JSON.stringify({ 
    ...result,
    mode: 'translation'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}