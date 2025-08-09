-- Revert pgvector extension back to public schema for stability
alter extension vector set schema public;

-- Recreate match_notes with fixed search_path in public
create or replace function public.match_notes(
  query_embedding vector(1536),
  match_threshold float default 0.78,
  match_count int default 10
)
returns table (
  note_id uuid,
  title text,
  slug text,
  similarity float
)
language sql
stable
set search_path = 'public'
as $func$
  select
    ne.note_id,
    n.title,
    n.slug,
    1 - (ne.embedding <=> query_embedding) as similarity
  from public.note_embeddings ne
  join public.notes n on n.id = ne.note_id
  where n.user_id = auth.uid()
    and n.semantic_enabled = true
    and (1 - (ne.embedding <=> query_embedding)) >= match_threshold
  order by ne.embedding <=> query_embedding asc
  limit match_count
$func$;