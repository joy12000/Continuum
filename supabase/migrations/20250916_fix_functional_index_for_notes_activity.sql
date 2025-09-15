
-- Drop the incorrect index if it was created
DROP INDEX IF EXISTS idx_notes_user_user_id_created_at_date;

-- Create the corrected functional index
CREATE INDEX IF NOT EXISTS idx_notes_user_id_created_at_date_fixed
ON public.notes (user_id, (created_at::date));
