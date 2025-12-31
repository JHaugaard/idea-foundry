# Idea Foundry: Action Plan (Rescue Mission)

## Situation Analysis
The project suffered from "Second System Effect"—too many analytics/management features, not enough core workflow. The "Capture -> Review -> Synthesize" loop was broken at the "Review" stage.

## Strategy
1.  **Simplify UI**: Hide analytics/graphs. Focus on Inbox.
2.  **Upgrade Intelligence**: Switch to SOTA models (`text-embedding-3-small` for retrieval, Gemini/Claude for synthesis).
3.  **Establish Workflow**: Force a "Review" habit via the Inbox.

## Completed Actions
- [x] **UI Cleanup**: Hidden "Link Explorer", "Analytics", "Tag Manager" from sidebar.
- [x] **Inbox Created**: Added `/inbox` route and interface for rapid processing.
- [x] **Strategy Refinement**: Downgraded to `text-embedding-3-small` (1536 dims) to comply with self-hosted vector indexing limits.
- [x] **Query Integrity**: Updated `query-embed` edge function to match the 1536-dimension OpenAI standard.
- [x] **Structural Wisdom**: Created migration to preserve AI learning history after note deletion.


## Project Status: v1.0 (Infrastructure Prime)
*Backend logic deployed. "Bouncer" trigger active (Fortress Secure). Branding updated. Magic Link auth verified.*

## Critical "Single User" Lockdown (Complete)
- [x] **Postgres Bouncer**: Active on `auth.users` to block unauthorized inserts.
- [x] **SMTP**: Resend.com configured for instant Magic Links.
- [x] **Housekeeping**: Pruned test users.

## Next Session Reminders
1.  **UI/UX Final Sweep**: Review "Inbox" and "Capture" flows for any lingering "brain-vault" text or glitches.
2.  **The "Go" Button**: Final Data Wipe & Frontend Deploy to vps2 (ideafoundry.net).

## Immediate Next Steps (Technical)

### 1. Database Migration (Critical)
**Update**: We use `text-embedding-3-small` (1536 dimensions) because your database version has a hard limit of 2000 dimensions for indexes.

Run this in your **Supabase SQL Editor** (available at your dashboard URL `https://supabase.haugaard.dev` -> SQL Editor):

```sql
-- Migration: Change embedding dimensions to 1536 (OpenAI Small)
-- Rationale: The previous attempt with 3072 (large) failed because your self-hosted pgvector version limits indexes to 2000 dimensions.

-- Step 1: Drop dependent functions and INDEXES first
drop function if exists public.match_notes(vector(768), float, int);
drop function if exists public.match_notes(vector(768), float, int, uuid);
drop function if exists public.match_notes(vector(3072), float, int, uuid);
drop function if exists public.match_notes(vector(1536), float, int, uuid); -- Safety drop
drop function if exists public.hybrid_search_notes(text, vector(768), float, float, int, uuid);
drop function if exists public.hybrid_search_notes(text, vector(3072), float, float, int, uuid);
drop function if exists public.hybrid_search_notes(text, vector(1536), float, float, int, uuid); -- Safety drop

-- DROP ANY EXISTING INDICES to release locks/constraints
DROP INDEX IF EXISTS idx_note_embeddings_embedding;
DROP INDEX IF EXISTS note_embeddings_embedding_idx;

-- Step 2: Clear existing embeddings
truncate table public.note_embeddings;

-- Step 3: Alter the embedding column dimension to 1536 (OpenAI Small)
alter table public.note_embeddings
  alter column embedding type vector(1536);

-- Step 4: Recreate the match_notes function with 1536 dimensions
create or replace function public.match_notes(
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 10,
  p_user_id uuid default null
)
returns table (
  id uuid,
  title text,
  content text,
  slug text,
  tags text[],
  similarity float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    n.id,
    n.title,
    n.content,
    n.slug,
    n.tags,
    1 - (ne.embedding <=> query_embedding) as similarity
  from public.notes n
  inner join public.note_embeddings ne on ne.note_id = n.id
  where
    (p_user_id is null or n.user_id = p_user_id)
    and 1 - (ne.embedding <=> query_embedding) > match_threshold
  order by ne.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Step 5: Recreate hybrid search function with 1536 dimensions
create or replace function public.hybrid_search_notes(
  search_query text,
  query_embedding vector(1536),
  semantic_weight float default 0.5,
  keyword_weight float default 0.5,
  match_count int default 10,
  p_user_id uuid default null
)
returns table (
  id uuid,
  title text,
  content text,
  slug text,
  tags text[],
  semantic_score float,
  keyword_score float,
  combined_score float
)
language plpgsql
security definer
as $$
begin
  return query
  with semantic_results as (
    select
      n.id,
      n.title,
      n.content,
      n.slug,
      n.tags,
      1 - (ne.embedding <=> query_embedding) as semantic_score
    from public.notes n
    inner join public.note_embeddings ne on ne.note_id = n.id
    where p_user_id is null or n.user_id = p_user_id
  ),
  keyword_results as (
    select
      n.id,
      ts_rank(
        to_tsvector('english', coalesce(n.title, '') || ' ' || coalesce(n.content, '') || ' ' || array_to_string(coalesce(n.tags, '{}'), ' ')),
        plainto_tsquery('english', search_query)
      ) as keyword_score
    from public.notes n
    where p_user_id is null or n.user_id = p_user_id
  )
  select
    sr.id,
    sr.title,
    sr.content,
    sr.slug,
    sr.tags,
    sr.semantic_score,
    coalesce(kr.keyword_score, 0) as keyword_score,
    (sr.semantic_score * semantic_weight + coalesce(kr.keyword_score, 0) * keyword_weight) as combined_score
  from semantic_results sr
  left join keyword_results kr on kr.id = sr.id
  where sr.semantic_score > 0.3 or coalesce(kr.keyword_score, 0) > 0
  order by combined_score desc
  limit match_count;
end;
$$;

-- Step 6: Recreate index using HNSW for 1536 dimensions (Fits safely under the 2000 limit)
create index idx_note_embeddings_embedding
  on public.note_embeddings
  using hnsw (embedding vector_cosine_ops);
```

### 1b. Database "Wisdom" Migration (New)
Run this (or the file `supabase/migrations/20251230074500_structural_wisdom.sql`) to ensure your AI doesn't forget lessons when you delete notes:

```sql
-- Make note_id nullable to preserve "lessons learned" tracking
ALTER TABLE public.tag_interaction_history 
  ALTER COLUMN note_id DROP NOT NULL;

ALTER TABLE public.tag_interaction_history
  DROP CONSTRAINT IF EXISTS fk_tag_interaction_history_note;

ALTER TABLE public.tag_interaction_history
  ADD CONSTRAINT fk_tag_interaction_history_note 
  FOREIGN KEY (note_id) 
  REFERENCES public.notes(id) 
  ON DELETE SET NULL;
```


### 1c. The "Curator" Queue (Robust Embedding)
This architecture ensures that only "Reviewed" notes get embedded, and it happens reliably even if you close your browser immediately.

1.  Run the migration `supabase/migrations/20251230085000_curator_queue.sql`.
2.  Enable the 'Worker' (Process Queue):
    - Created function `supabase/functions/process-queue/index.ts`.
    - To automate this, you must set up a cron job.
    - If your Supabase/Postgres supports `pg_cron`, run this in SQL Editor:
    
    ```sql
    -- (Skipped pg_cron in favor of Linux System Cron for reliability)
    ```
    - **Active Strategy**: Linux Crontab on vps8.
    - Command: `* * * * * curl -X POST -H "Authorization: Bearer KEY" ...`

### 2. Configure Secrets
Ensure your Supabase project has the OpenAI API Key.

Run via terminal (if you have CLI) or add in **Supabase Dashboard > Settings > Edge Functions > Secrets**:
- `OPENAI_API_KEY`: `sk-...`

### 3. Update Edge Function (`note-embed`)
(This has already been updated in the file `supabase/functions/note-embed/index.ts`. You just need to deploy it or serve it locally.)

If using self-hosted, ensure `OPENAI_API_KEY` is available to the container running the function.

### 4. Re-Process Notes
Once the function is updated, go to your Inbox and "Edit" -> "Save" (or just view) notes to trigger embedding generation (if you set up triggers), or use the "Batch Operations" (when we re-enable it) to re-embed everything.
