-- === Reset (안전 재실행용) =========================================
DROP FUNCTION IF EXISTS search_chunks(vector, uuid, integer);
DROP POLICY IF EXISTS "delete own notes" ON notes;
DROP POLICY IF EXISTS "update own notes" ON notes;
DROP POLICY IF EXISTS "insert own notes" ON notes;
DROP POLICY IF EXISTS "select own notes" ON notes;
DROP POLICY IF EXISTS "select chunks by owner" ON note_chunks;
DROP TABLE IF EXISTS note_chunks CASCADE;
DROP TABLE IF EXISTS notes CASCADE;

-- === Extensions ====================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- === Tables ========================================================
CREATE TABLE IF NOT EXISTS notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  title      text,
  body       text,
  created_at timestamptz DEFAULT now()
);

-- 임베딩: Gemini 기준 768차원
CREATE TABLE IF NOT EXISTS note_chunks (
  id          bigserial PRIMARY KEY,
  note_id     uuid REFERENCES notes(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content     text NOT NULL,
  embedding   vector(768),
  lang        text,
  created_at  timestamptz DEFAULT now()
);

-- === Index (HNSW, cosine) =========================================
CREATE INDEX IF NOT EXISTS note_chunks_embedding_hnsw
  ON note_chunks USING hnsw (embedding vector_cosine_ops);

-- === RLS (자기 데이터만) ===========================================
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE note_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select chunks by owner" ON note_chunks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM notes n WHERE n.id = note_id AND n.user_id = auth.uid())
  );

-- === RPC: 벡터 검색 ================================================
CREATE OR REPLACE FUNCTION search_chunks(
  q_emb   vector(768),
  uid     uuid,
  limit_k int DEFAULT 8
)
RETURNS TABLE (
  note_id     uuid,
  chunk_index int,
  content     text,
  distance    float4
)
LANGUAGE sql STABLE AS $$
  SELECT
    note_id,
    chunk_index,
    content,
    (embedding <=> q_emb) AS distance
  FROM note_chunks
  WHERE note_id IN (SELECT id FROM notes WHERE user_id = uid)
  ORDER BY embedding <=> q_emb
  LIMIT limit_k
$$;
/////////   create policy "insert chunks by owner" on note_chunks
    for insert with check (
      exists (select 1 from notes n where n.id = note_id and n.user_id = auth.uid())
    );////////CREATE OR REPLACE FUNCTION get_notes_by_ids(note_ids uuid[])
RETURNS SETOF notes
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.notes
  WHERE id = ANY(note_ids)
  -- RLS (행 수준 보안)가 user_id를 기반으로 적용된다고 가정합니다.
  -- 이 함수를 호출하는 사용자는 자신의 노트만 볼 수 있습니다.
  AND auth.uid() = user_id;
END;
$$;
DROP FUNCTION match_notes(vector,double precision,integer);

CREATE OR REPLACE FUNCTION match_notes (
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    1 - (nc.embedding <=> query_embedding) as similarity
  FROM public.note_chunks AS nc
  JOIN public.notes AS n ON n.id = nc.note_id
  WHERE n.user_id = auth.uid()
  AND 1 - (nc.embedding <=> query_embedding) > match_threshold
  ORDER BY nc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;////  SELECT
      parameter_name,
      parameter_mode,
      data_type
    FROM information_schema.parameters
    WHERE specific_name LIKE '''match_notes%''';
//////-- 1) 캐시 테이블 (이미 있으면 건너뜀)
create table if not exists public.insight_threads_cache (
  user_id uuid primary key references auth.users(id) on delete cascade,
  threads_data jsonb not null,
  last_updated_at timestamptz not null default now()
);

-- 2) RLS 활성화
alter table public.insight_threads_cache enable row level security;

-- 3) 기존 정책이 있으면 제거 (데이터는 삭제되지 않습니다)
drop policy if exists "insight_threads_cache_select_own" on public.insight_threads_cache;
drop policy if exists "insight_threads_cache_insert_own" on public.insight_threads_cache;
drop policy if exists "insight_threads_cache_update_own" on public.insight_threads_cache;
drop policy if exists "insight_threads_cache_delete_own" on public.insight_threads_cache;

-- 4) 정책 재생성 (권장: 동작별 명시적 정책)
create policy "insight_threads_cache_select_own"
on public.insight_threads_cache
for select
using (auth.uid() = user_id);

create policy "insight_threads_cache_insert_own"
on public.insight_threads_cache
for insert
with check (auth.uid() = user_id);

create policy "insight_threads_cache_update_own"
on public.insight_threads_cache
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "insight_threads_cache_delete_own"
on public.insight_threads_cache
for delete
using (auth.uid() = user_id);
/////-- 노트 간 링크(인용)
create table if not exists public.note_links (
  from_note_id uuid not null references public.notes(id) on delete cascade,
  to_note_id   uuid not null references public.notes(id) on delete cascade,
  constraint note_links_pk primary key (from_note_id, to_note_id),
  constraint note_links_no_self check (from_note_id <> to_note_id)
);

-- RLS
alter table public.note_links enable row level security;

drop policy if exists "links_select_own" on public.note_links;
drop policy if exists "links_mutate_own" on public.note_links;

create policy "links_select_own"
on public.note_links for select
using (
  exists (select 1 from public.notes n where n.id = from_note_id and n.user_id = auth.uid())
  and
  exists (select 1 from public.notes n where n.id = to_note_id and n.user_id = auth.uid())
);

create policy "links_mutate_own"
on public.note_links for all
using (
  exists (select 1 from public.notes n where n.id = from_note_id and n.user_id = auth.uid())
  and
  exists (select 1 from public.notes n where n.id = to_note_id and n.user_id = auth.uid())
)
with check (
  exists (select 1 from public.notes n where n.id = from_note_id and n.user_id = auth.uid())
  and
  exists (select 1 from public.notes n where n.id = to_note_id and n.user_id = auth.uid())
);

CREATE TABLE "public"."thread_generation_jobs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "status" text NOT NULL DEFAULT 'pending'::text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT thread_generation_jobs_pkey PRIMARY KEY (id),
    CONSTRAINT thread_generation_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE "public"."thread_generation_jobs" OWNER TO "postgres";

GRANT ALL ON TABLE "public"."thread_generation_jobs" TO "anon";
GRANT ALL ON TABLE "public"."thread_generation_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."thread_generation_jobs" TO "service_role";

-- Add RLS policies
ALTER TABLE "public"."thread_generation_jobs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to manage their own jobs" ON "public"."thread_generation_jobs" FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
SELECT
    c.table_name,
    c.column_name,
    c.data_type
  FROM
    information_schema.columns c
  WHERE
    c.table_schema = 'public' AND
    c.table_name IN ('note_chunks', 'note_embeddings')
  ORDER BY
    c.table_name,
    c.ordinal_position;