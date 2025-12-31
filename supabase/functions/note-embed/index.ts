import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
// Note: We use OPENAI_API_KEY from environment variables
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
      console.error("Missing config:", {
        url: !!SUPABASE_URL,
        key: !!SUPABASE_ANON_KEY,
        openai: !!OPENAI_API_KEY
      });
      return new Response(
        JSON.stringify({ error: "Configuration invalid (Supabase or OpenAI keys missing)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    // Check user auth
    const { data: authRes } = await userClient.auth.getUser();
    const user = authRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { note_id } = await req.json();
    if (!note_id || typeof note_id !== "string") {
      return new Response(JSON.stringify({ error: "note_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch note
    const { data: note, error: noteErr } = await userClient
      .from("notes")
      .select("id, user_id, title, content")
      .eq("id", note_id)
      .maybeSingle();

    if (noteErr || !note || note.user_id !== user.id) {
      console.error("fetch note error", noteErr);
      return new Response(JSON.stringify({ error: "Note not found or access denied" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const text = `${note.title}\n\n${note.content || ""}`.trim();
    if (!text) {
      return new Response(JSON.stringify({ error: "Note is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call OpenAI for Embedding
    const openAiResp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "text-embedding-3-small", // Switched to small (1536 dims) for DB index compatibility
        input: text,
      }),
      // Removed 'dimensions' parameter as it is optional and defaults to 1536 for small
    });

    if (!openAiResp.ok) {
      const errText = await openAiResp.text();
      console.error("OpenAI Error:", errText);
      return new Response(JSON.stringify({ error: `OpenAI embedding failed: ${errText}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const openAiData = await openAiResp.json();
    const embedding = openAiData?.data?.[0]?.embedding;

    if (!Array.isArray(embedding)) {
      return new Response(JSON.stringify({ error: "Invalid response format from OpenAI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Upsert to DB
    const upsertRes = await userClient
      .from("note_embeddings")
      .upsert({
        note_id: note.id,
        user_id: user.id,
        embedding
      }, { onConflict: "note_id" });

    if (upsertRes.error) {
      console.error("upsert error", upsertRes.error);
      return new Response(JSON.stringify({ error: upsertRes.error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update flag
    await userClient.from("notes")
      .update({ semantic_enabled: true })
      .eq("id", note.id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("note-embed: unexpected error", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
