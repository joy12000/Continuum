-- 특정 날짜에 작성된 노트 목록을 가져오는 함수
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
    DATE(n.created_at) = target_date
  ORDER BY
    n.created_at DESC;
END;
$$;

-- 성능 향상을 위해 user_id와 created_at에 대한 인덱스 생성을 권장합니다.
CREATE INDEX IF NOT EXISTS idx_notes_user_id_created_at ON public.notes (user_id, created_at DESC);
