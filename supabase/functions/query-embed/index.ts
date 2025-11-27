import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OLLAMA_URL = Deno.env.get('OLLAMA_URL') || 'https://ollama.haugaard.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      throw new Error('Query text is required');
    }

    console.log('Generating embedding for query:', query.substring(0, 100));

    // Generate embedding with Ollama (nomic-embed-text produces 768 dimensions)
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: query,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Ollama API error:', response.status, errorData);
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const embedding = data.embedding;

    if (!Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from Ollama');
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