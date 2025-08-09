-- Recreate match_notes avoiding operator resolution by using schema-qualified cosine_distance
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
set search_path = 'extensions,public'
as $func$
  select
    ne.note_id,
    n.title,
    n.slug,
    1 - extensions.cosine_distance(ne.embedding, query_embedding) as similarity
  from public.note_embeddings ne
  join public.notes n on n.id = ne.note_id
  where n.user_id = auth.uid()
    and n.semantic_enabled = true
    and (1 - extensions.cosine_distance(ne.embedding, query_embedding)) >= match_threshold
  order by extensions.cosine_distance(ne.embedding, query_embedding) asc
  limit match_count
$func$;