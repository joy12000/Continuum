
-- Drop any previous incorrect functional index attempts
DROP INDEX IF EXISTS idx_notes_user_user_id_created_at_date;
DROP INDEX IF EXISTS idx_notes_user_id_created_at_date_fixed;
DROP INDEX IF EXISTS idx_notes_user_id_created_at_utc_date;

-- Create the functional index using timezone() for immutability
CREATE INDEX IF NOT EXISTS idx_notes_user_id_created_at_final_date
ON public.notes (user_id, (timezone('UTC', created_at)::date));
