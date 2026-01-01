import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Input limits for cost protection
const MAX_RECOMMENDED_CHARS = 100000; // ~25K tokens, ~50 pages - warn but allow
const ABSOLUTE_MAX_CHARS = 500000;    // ~125K tokens - reject

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry helper for OpenAI calls
async function callOpenAIWithRetry(
  payload: Record<string, unknown>,
  apiKey: string,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) return response;

      // Retry on server errors (5xx)
      if (response.status >= 500 && attempt < maxRetries) {
        console.warn(`OpenAI server error (attempt ${attempt}/${maxRetries}), retrying...`);
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }

      return response;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`OpenAI request failed (attempt ${attempt}/${maxRetries}), retrying...`);
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error('OpenAI request failed after all retries');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication check ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // --- End authentication check ---

    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      throw new Error('Query text is required');
    }

    // Input length validation
    if (query.length > ABSOLUTE_MAX_CHARS) {
      return new Response(JSON.stringify({
        error: 'Query too large. Please use a shorter search query (max 500K characters).'
      }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (query.length > MAX_RECOMMENDED_CHARS) {
      console.warn(`Large query input: ${query.length} chars from user ${user.id}`);
    }

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log('Generating OpenAI embedding for query:', query.substring(0, 100));

    // Generate embedding with OpenAI (text-embedding-3-small produces 1536 dimensions)
    const response = await callOpenAIWithRetry({
      model: 'text-embedding-3-small',
      input: query,
    }, OPENAI_API_KEY);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;

    if (!Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from OpenAI');
    }

    console.log('Generated embedding with dimensions:', embedding.length);

    return new Response(JSON.stringify({
      embedding,
      dimensions: embedding.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in query-embed function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Failed to generate query embedding'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});