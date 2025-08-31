import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(
        JSON.stringify({ error: "Supabase URL/Anon key not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader || "" } },
    });

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

    // Fetch note (RLS-enforced) and verify ownership
    const { data: note, error: noteErr } = await userClient
      .from("notes")
      .select("id, user_id, title, content")
      .eq("id", note_id)
      .maybeSingle();

    if (noteErr) {
      console.error("note-embed: fetch note error", noteErr);
      return new Response(JSON.stringify({ error: noteErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!note || note.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = `${note.title}\n\n${note.content || ""}`.trim();
    if (!text) {
      return new Response(JSON.stringify({ error: "Note is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate embedding with OpenAI
    const embedResp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
        dimensions: 384,
      }),
    });

    if (!embedResp.ok) {
      const err = await embedResp.json().catch(() => ({ error: "OpenAI error" }));
      console.error("note-embed: OpenAI error", err);
      return new Response(JSON.stringify({ error: err.error || "OpenAI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embedJson = await embedResp.json();
    const embedding = embedJson?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) {
      return new Response(JSON.stringify({ error: "Invalid embedding response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert embedding and enable semantic flag (RLS-enforced via user client)
    const upsertRes = await userClient
      .from("note_embeddings")
      .upsert({ note_id: note.id, user_id: user.id, embedding }, { onConflict: "note_id" })
      .select("id")
      .maybeSingle();

    if (upsertRes.error) {
      console.error("note-embed: upsert error", upsertRes.error);
      return new Response(JSON.stringify({ error: upsertRes.error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updateRes = await userClient
      .from("notes")
      .update({ semantic_enabled: true })
      .eq("id", note.id)
      .eq("user_id", user.id);

    if (updateRes.error) {
      console.error("note-embed: update note flag error", updateRes.error);
      return new Response(JSON.stringify({ error: updateRes.error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
