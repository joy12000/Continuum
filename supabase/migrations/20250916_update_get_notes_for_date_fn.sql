
CREATE OR REPLACE FUNCTION public.get_notes_for_date(
    target_date_str TEXT
)
RETURNS TABLE(
    id uuid,
    title text,
    body text,
    tags text[],
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
    target_date DATE := target_date_str::DATE;
BEGIN
  RETURN QUERY
  SELECT
    n.id, n.title, n.body, n.tags, n.created_at, n.updated_at
  FROM public.notes AS n
  WHERE
    n.user_id = auth.uid() AND
    n.created_at >= target_date::TIMESTAMP AND
    n.created_at < (target_date::TIMESTAMP + INTERVAL '1 day')
  ORDER BY
    n.created_at DESC;
END;
$$;
