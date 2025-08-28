export interface NoteLite {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  citations?: { noteId: string }[];
  sourceNoteId?: string;
  sourceNoteIds?: string[];
}
