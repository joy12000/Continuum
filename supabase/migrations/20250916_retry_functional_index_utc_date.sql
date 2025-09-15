
-- Drop any previous incorrect functional index attempts
DROP INDEX IF EXISTS idx_notes_user_user_id_created_at_date;
DROP INDEX IF EXISTS idx_notes_user_id_created_at_date_fixed;

-- Create the functional index using UTC conversion for immutability
CREATE INDEX IF NOT EXISTS idx_notes_user_id_created_at_utc_date
ON public.notes (user_id, (created_at AT TIME ZONE 'UTC')::date);
