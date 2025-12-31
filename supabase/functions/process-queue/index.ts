import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

// We use the Service Role key because this is a background administrative task
// that needs to bypass RLS to read the queue and update any user's data.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
    try {
        // 1. Fetch pending jobs (Limit 5 to prevent timeouts)
        // We lock them by updating status to 'processing' immediately? 
        // Ideally use FOR UPDATE SKIP LOCKED but simple update is fine for single worker.

        // Simple approach: Get IDs first
        const { data: jobs, error: fetchError } = await supabase
            .from("embedding_queue")
            .select("id, note_id")
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(5);

        if (fetchError) throw fetchError;
        if (!jobs || jobs.length === 0) {
            return new Response(JSON.stringify({ message: "No pending jobs" }), {
                headers: { "Content-Type": "application/json" },
            });
        }

        const { error: markError } = await supabase
            .from("embedding_queue")
            .update({ status: "processing", updated_at: new Date().toISOString() })
            .in("id", jobs.map(j => j.id));

        if (markError) throw markError;

        const results = [];

        // 2. Process each job
        for (const job of jobs) {
            try {
                // Fetch note content
                const { data: note, error: noteError } = await supabase
                    .from("notes")
                    .select("id, user_id, title, content")
                    .eq("id", job.note_id)
                    .single();

                if (noteError || !note) {
                    throw new Error("Note not found or deleted");
                }

                const text = `${note.title}\n\n${note.content || ""}`.trim();
                if (!text) {
                    throw new Error("Note content is empty");
                }

                // Generate Embedding
                const openAiResp = await fetch("https://api.openai.com/v1/embeddings", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: "text-embedding-3-small",
                        input: text,
                    }),
                });

                if (!openAiResp.ok) {
                    const errText = await openAiResp.text();
                    throw new Error(`OpenAI error: ${errText}`);
                }

                const openAiData = await openAiResp.json();
                const embedding = openAiData?.data?.[0]?.embedding;

                // Save Embedding
                const { error: upsertError } = await supabase
                    .from("note_embeddings")
                    .upsert({
                        note_id: note.id,
                        user_id: note.user_id,
                        embedding
                    }, { onConflict: "note_id" });

                if (upsertError) throw upsertError;

                // Mark Job Completed
                await supabase
                    .from("embedding_queue")
                    .update({ status: "completed", updated_at: new Date().toISOString() })
                    .eq("id", job.id);

                // Update Note to ensure semantic_enabled is true
                await supabase.from("notes").update({ semantic_enabled: true }).eq("id", note.id);

                results.push({ job_id: job.id, status: "success" });

            } catch (err: any) {
                console.error(`Job ${job.id} failed:`, err);
                // Mark Failed
                await supabase
                    .from("embedding_queue")
                    .update({
                        status: "failed",
                        error_message: err.message,
                        attempts: 1, // Simple increment logic could go here
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", job.id);

                results.push({ job_id: job.id, status: "failed", error: err.message });
            }
        }

        return new Response(JSON.stringify({ processed: results.length, details: results }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
