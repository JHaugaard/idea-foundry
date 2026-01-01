import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

// Configuration
const MAX_RETRIES = 3;
const CLEANUP_DAYS = 7;  // Delete completed/failed jobs older than this
const MAX_RECOMMENDED_CHARS = 100000;
const ABSOLUTE_MAX_CHARS = 500000;

// We use the Service Role key because this is a background administrative task
// that needs to bypass RLS to read the queue and update any user's data.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Retry helper for OpenAI calls
async function callOpenAIWithRetry(
  text: string,
  maxRetries = 3
): Promise<{ embedding: number[] }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const embedding = data?.data?.[0]?.embedding;
        if (!embedding) throw new Error("No embedding in response");
        return { embedding };
      }

      // Retry on server errors (5xx)
      if (response.status >= 500 && attempt < maxRetries) {
        console.warn(`OpenAI server error (attempt ${attempt}/${maxRetries}), retrying...`);
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }

      const errText = await response.text();
      throw new Error(`OpenAI error: ${response.status} - ${errText}`);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`OpenAI request failed (attempt ${attempt}/${maxRetries}), retrying...`);
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error("OpenAI request failed after all retries");
}

serve(async (req) => {
    try {
        // 0. Cleanup old completed/failed jobs first
        const cleanupDate = new Date();
        cleanupDate.setDate(cleanupDate.getDate() - CLEANUP_DAYS);

        const { error: cleanupError } = await supabase
            .from("embedding_queue")
            .delete()
            .in("status", ["completed", "failed"])
            .lt("updated_at", cleanupDate.toISOString());

        if (cleanupError) {
            console.warn("Cleanup warning:", cleanupError.message);
        }

        // 1. Fetch pending jobs (Limit 5 to prevent timeouts)
        // Also fetch jobs that failed but haven't exceeded max retries
        const { data: jobs, error: fetchError } = await supabase
            .from("embedding_queue")
            .select("id, note_id, attempts")
            .or(`status.eq.pending,and(status.eq.failed,attempts.lt.${MAX_RETRIES})`)
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
            const currentAttempts = (job.attempts || 0) + 1;

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

                // Input length validation
                if (text.length > ABSOLUTE_MAX_CHARS) {
                    throw new Error(`Note too large (${text.length} chars). Max is ${ABSOLUTE_MAX_CHARS}.`);
                }

                if (text.length > MAX_RECOMMENDED_CHARS) {
                    console.warn(`Large note being processed: ${text.length} chars for note ${note.id}`);
                }

                // Generate Embedding with retry logic
                const { embedding } = await callOpenAIWithRetry(text);

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
                    .update({
                        status: "completed",
                        attempts: currentAttempts,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", job.id);

                // Update Note to ensure semantic_enabled is true
                await supabase.from("notes").update({ semantic_enabled: true }).eq("id", note.id);

                results.push({ job_id: job.id, status: "success", attempts: currentAttempts });

            } catch (err: any) {
                console.error(`Job ${job.id} failed (attempt ${currentAttempts}/${MAX_RETRIES}):`, err);

                // Determine final status based on attempts
                const isFinalFailure = currentAttempts >= MAX_RETRIES;

                await supabase
                    .from("embedding_queue")
                    .update({
                        status: isFinalFailure ? "failed" : "pending",  // Reset to pending for retry
                        error_message: err.message,
                        attempts: currentAttempts,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", job.id);

                results.push({
                    job_id: job.id,
                    status: isFinalFailure ? "failed" : "will_retry",
                    error: err.message,
                    attempts: currentAttempts
                });
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
