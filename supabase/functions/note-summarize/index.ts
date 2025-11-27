import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OLLAMA_URL = Deno.env.get('OLLAMA_URL') || 'https://ollama.haugaard.dev';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { note_title, note_text } = await req.json();
    if (typeof note_title !== 'string' || typeof note_text !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid payload: note_title and note_text are required strings.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemMessage = 'You are an assistant that summarizes notes and suggests concise, relevant tags. Always respond with valid JSON only.';

    const userMessage = `Return ONLY a JSON object with this schema: { "summary": string, "tags": string[] }
Rules:
- Summary: 1-2 sentences, crisp and neutral, no markdown.
- Tags: 3-6 short tags, lowercase, hyphenated if multiword, no duplicates, no generic words like "note" or "general".
- If the note is extremely short, infer tags from the title.
- Output strictly valid JSON.

Title: ${note_title}
Text: ${note_text}`;

    // Use Ollama with llama3.2:3b
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2:3b',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        format: 'json',
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama error: ${err}`);
    }

    const data = await response.json();
    const content = data.message?.content;
    if (!content) throw new Error('No content from Ollama');

    const json = typeof content === 'string' ? JSON.parse(content) : content;

    return new Response(JSON.stringify(json), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('note-summarize error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
