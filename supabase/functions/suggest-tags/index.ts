import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, title, existingTags = [] } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Get Supabase client for user's existing tags
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      global: { headers: { Authorization: authHeader! } }
    });

    // Get user's existing tags for context
    const { data: userNotes } = await supabase
      .from('notes')
      .select('tags')
      .not('tags', 'is', null);

    const allUserTags = Array.from(new Set(
      userNotes?.flatMap(note => note.tags || []) || []
    ));

    const prompt = `Analyze this note and suggest 3-5 relevant tags. Consider:
- Content themes and topics
- Writing style and intent  
- Key concepts and subjects
- Existing user tags for consistency: ${allUserTags.slice(0, 20).join(', ')}

Note Title: ${title}
Note Content: ${content}

Current tags: ${existingTags.join(', ')}

Return ONLY a JSON array of suggested tag strings, lowercase and hyphen-separated.
Example: ["productivity", "morning-routine", "health-habits"]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful tagging assistant. Respond only with valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const suggestedTagsText = data.choices[0].message.content.trim();
    
    let suggestedTags: string[];
    try {
      suggestedTags = JSON.parse(suggestedTagsText);
    } catch {
      // Fallback parsing if JSON is malformed
      const matches = suggestedTagsText.match(/\[([^\]]+)\]/);
      if (matches) {
        suggestedTags = matches[1]
          .split(',')
          .map(tag => tag.trim().replace(/['"]/g, ''))
          .filter(tag => tag.length > 0);
      } else {
        suggestedTags = [];
      }
    }

    // Filter out existing tags and format properly
    const newTags = suggestedTags
      .filter(tag => !existingTags.includes(tag))
      .map(tag => tag.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-'))
      .filter(tag => tag.length >= 2)
      .slice(0, 5);

    return new Response(JSON.stringify({ 
      suggestions: newTags,
      confidence: data.choices[0].finish_reason === 'stop' ? 'high' : 'medium'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-tags function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});