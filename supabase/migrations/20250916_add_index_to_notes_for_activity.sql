
CREATE INDEX IF NOT EXISTS idx_notes_user_id_created_at ON public.notes (user_id, created_at);
