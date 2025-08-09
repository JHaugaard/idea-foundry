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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.1,
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
