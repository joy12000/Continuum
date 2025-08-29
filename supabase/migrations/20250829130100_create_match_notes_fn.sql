
-- Creates a function to find matching notes using vector similarity search
CREATE OR REPLACE FUNCTION match_notes ( 
  query_embedding vector(384),
  match_threshold float,
  match_count int
)
RETURNS TABLE ( 
  id text,
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
    1 - (ne.embedding <=> query_embedding) as similarity
  FROM public.note_embeddings AS ne
  JOIN public.notes AS n ON n.id = ne.id
  WHERE n.user_id = auth.uid()
  AND 1 - (ne.embedding <=> query_embedding) > match_threshold
  ORDER BY ne.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
