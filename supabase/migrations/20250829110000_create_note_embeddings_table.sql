-- 1. Create the note_embeddings table
CREATE TABLE public.note_embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    embedding vector(384),
    created_at timestamptz DEFAULT now()
);

-- 2. Create an index for efficient searching on the user_id column
CREATE INDEX IF NOT EXISTS idx_note_embeddings_user_id ON public.note_embeddings(user_id);

-- 3. Create an index for efficient vector similarity searches
CREATE INDEX IF NOT EXISTS idx_note_embeddings_embedding ON public.note_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
