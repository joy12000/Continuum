
CREATE INDEX IF NOT EXISTS idx_notes_user_user_id_created_at_date
ON public.notes (user_id, (DATE(created_at)));
