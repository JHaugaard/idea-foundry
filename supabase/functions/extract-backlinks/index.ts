import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Input limits for cost protection
const MAX_RECOMMENDED_CHARS = 100000; // ~25K tokens, ~50 pages - warn but allow
const ABSOLUTE_MAX_CHARS = 500000;    // ~125K tokens - reject

// Retry helper for OpenAI calls
async function callOpenAIWithRetry(
  payload: Record<string, unknown>,
  apiKey: string,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
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

    // Input length validation
    const totalLength = note_title.length + note_text.length;
    if (totalLength > ABSOLUTE_MAX_CHARS) {
      return new Response(JSON.stringify({
        error: 'Document too large for backlink extraction. Please split into sections (max 500K characters).'
      }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (totalLength > MAX_RECOMMENDED_CHARS) {
      console.warn(`Large backlink input: ${totalLength} chars from user ${user.id}`);
    }

    const systemMessage =
      'You are an assistant that extracts candidate backlink entities from note text for a personal knowledge base. Do not rewrite the text. Identify only likely entities worth cross-linking.';

    const developerMessage = `Return a pure JSON object and nothing else. Use this schema: { "note_title": string, "entities": [ { "text": string, "start": number, "end": number, "type": "Person" | "Org" | "Project" | "Place" | "Work" | "LegalTerm" | "Other", "confidence": number, "canonical": { "title": string, "slug": string } } ] }
Normalization rules for slug:
* Lowercase the canonical title.
* Replace any sequence of non-alphanumeric characters with a single hyphen.
* Trim leading/trailing hyphens.
* Unicode NFC normalize.
* Examples: "John Smith" -> "john-smith"; "R&D Co., Inc." -> "r-d-co-inc"
Extraction instructions:
* Goal: People, Organizations, Projects, Places, Named Works (papers, policies), and key domain terms worth linking.
* Prefer high-precision over recall. Exclude generic words and verbs even if capitalized.
* DO NOT propose entities solely because a word is capitalized at the beginning of a sentence.
* Exclude: days/months, common modal verbs (May, Will), pronouns, stopwords, section headings like “Introduction”, standalone years unless part of a named item.
* In university research-contracts context, include: sponsors (NIH, NSF), institutions, companies, principal investigator names, project names, agreement types (if specific, e.g., “Master Research Agreement with Acme Biotech”), sponsors’ program names, compliance bodies (IRB, IACUC).
* For ambiguous capitalizations (e.g., “Agreement”), only include if it refers to a specific named document in this note.
* If multiple mentions of the same canonical entity appear, return each mention as a separate entity with its own start/end, but ensure the same canonical.slug.
* Provide helpful type labels and calibrated confidence.
Output strictly valid JSON.`;

    const userMessage = `User: Title: ${note_title} Text: ${note_text}`;

    const response = await callOpenAIWithRetry({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'developer', content: developerMessage },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
    }, OPENAI_API_KEY);

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'OpenAI error' }));
      throw new Error(err.error?.message || JSON.stringify(err));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content from OpenAI');

    // Ensure valid JSON
    const json = typeof content === 'string' ? JSON.parse(content) : content;

    return new Response(JSON.stringify(json), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('extract-backlinks error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
