-- Creates a function to find matching notes using vector similarity search
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
$$;