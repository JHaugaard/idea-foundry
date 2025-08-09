-- Enable pgvector for embeddings
create extension if not exists vector;

-- Add a flag to notes to mark semantic readiness
alter table public.notes
  add column if not exists semantic_enabled boolean not null default false;

-- Table to store note embeddings
create table if not exists public.note_embeddings (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null,
  user_id uuid not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (note_id),
  constraint fk_note_embeddings_note foreign key (note_id)
    references public.notes(id) on delete cascade
);

-- Enable RLS and policies
alter table public.note_embeddings enable row level security;

-- Drop existing policies if they exist to avoid duplicates during re-runs
drop policy if exists "Users can view their own note embeddings" on public.note_embeddings;
drop policy if exists "Users can insert their own note embeddings" on public.note_embeddings;
drop policy if exists "Users can update their own note embeddings" on public.note_embeddings;
drop policy if exists "Users can delete their own note embeddings" on public.note_embeddings;

create policy "Users can view their own note embeddings"
  on public.note_embeddings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own note embeddings"
  on public.note_embeddings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own note embeddings"
  on public.note_embeddings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own note embeddings"
  on public.note_embeddings for delete
  using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists note_embeddings_user_id_idx on public.note_embeddings(user_id);
create index if not exists note_embeddings_note_id_idx on public.note_embeddings(note_id);
-- Vector index (cosine distance)
create index if not exists note_embeddings_embedding_idx
  on public.note_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- updated_at trigger
drop trigger if exists update_note_embeddings_updated_at on public.note_embeddings;
create trigger update_note_embeddings_updated_at
before update on public.note_embeddings
for each row execute function public.update_updated_at_column();

-- RPC for matching notes using cosine similarity
-- Recreate to ensure latest signature
drop function if exists public.match_notes(vector(1536), float, int);
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
as $$
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
$$;