
CREATE OR REPLACE FUNCTION get_notes_activity(start_date_str TEXT, end_date_str TEXT)
RETURNS TABLE(activity_date DATE, count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as activity_date,
    COUNT(id)::BIGINT as count
  FROM public.notes
  WHERE
    user_id = auth.uid() AND
    created_at >= start_date_str::DATE AND
    created_at < (end_date_str::DATE + INTERVAL '1 day')
  GROUP BY
    DATE(created_at)
  ORDER BY
    activity_date;
END;
$$;
