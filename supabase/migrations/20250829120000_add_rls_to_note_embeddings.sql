
-- 1. Enable RLS on the note_embeddings table
ALTER TABLE public.note_embeddings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist, to prevent errors on re-run
DROP POLICY IF EXISTS "Users can select their own note embeddings" ON public.note_embeddings;

-- 3. Create a policy that allows users to select their own embeddings
CREATE POLICY "Users can select their own note embeddings"
ON public.note_embeddings
FOR SELECT
USING (auth.uid() = user_id);
