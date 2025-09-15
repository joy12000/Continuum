
-- Drop all custom indexes to ensure a clean state
DROP INDEX IF EXISTS idx_notes_user_id_created_at;
DROP INDEX IF EXISTS idx_notes_user_id_created_at_final_date;

-- Re-create the composite index for user_id and created_at (for WHERE clauses and ORDER BY)
CREATE INDEX IF NOT EXISTS idx_notes_user_id_created_at ON public.notes USING btree (user_id, created_at DESC);

-- Re-create the functional index for user_id and the date part of created_at (for GROUP BY DATE(created_at))
CREATE INDEX IF NOT EXISTS idx_notes_user_id_created_at_final_date
ON public.notes USING btree (user_id, (timezone('UTC'::text, created_at)::date));
