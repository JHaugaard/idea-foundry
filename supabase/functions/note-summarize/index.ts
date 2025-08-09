import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY is not set' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { note_title, note_text } = await req.json();
    if (typeof note_title !== 'string' || typeof note_text !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid payload: note_title and note_text are required strings.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemMessage = 'You are an assistant that summarizes notes and suggests concise, relevant tags.';

    const developerMessage = `Return ONLY a JSON object with this schema: { "summary": string, "tags": string[] }
Rules:
- Summary: 1-2 sentences, crisp and neutral, no markdown.
- Tags: 3-6 short tags, lowercase, hyphenated if multiword, no duplicates, no generic words like "note" or "general".
- If the note is extremely short, infer tags from the title.
- Output strictly valid JSON.`;

    const userMessage = `Title: ${note_title}\nText: ${note_text}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'developer', content: developerMessage },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'OpenAI error' }));
      throw new Error(err.error?.message || JSON.stringify(err));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content from OpenAI');

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
