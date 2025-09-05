-- 1. Add 'tags' and 'updated_at' columns to 'notes' table if they don't exist
ALTER TABLE public.notes
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
DECLARE
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_notes_updated_at ON public.notes;
CREATE TRIGGER set_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 2. Create the RPC function to update a note and its links
CREATE OR REPLACE FUNCTION public.update_note_details(
  p_note_id uuid,
  p_title text,
  p_body text,
  p_tags text[],
  p_links_to_add uuid[],
  p_links_to_remove uuid[]
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  link_to_add uuid;
BEGIN
  -- Update the note's main fields
  UPDATE public.notes
  SET
    title = p_title,
    body = p_body,
    tags = p_tags
  WHERE id = p_note_id AND user_id = auth.uid();

  -- Remove specified links
  IF array_length(p_links_to_remove, 1) > 0 THEN
    DELETE FROM public.note_links
    WHERE from_note_id = p_note_id AND to_note_id = ANY(p_links_to_remove);
  END IF;

  -- Add new links
  IF array_length(p_links_to_add, 1) > 0 THEN
    FOREACH link_to_add IN ARRAY p_links_to_add
    LOOP
      INSERT INTO public.note_links (from_note_id, to_note_id)
      VALUES (p_note_id, link_to_add)
      ON CONFLICT (from_note_id, to_note_id) DO NOTHING;
    END LOOP;
  END IF;

END;
$$;
