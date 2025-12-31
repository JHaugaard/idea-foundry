-- Migration: Change embedding dimensions to 1536 for OpenAI text-embedding-3-small
-- Rationale: The previous attempt with 3072 (large) failed because your self-hosted pgvector version limits indexes to 2000 dimensions.
-- 1536 is the standard size for OpenAI's "small" model, which is still excellent and fits under the limit.

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
