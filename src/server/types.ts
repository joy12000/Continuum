export type UUID = string;

export interface Note {
  id: UUID;
  title: string | null;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface NoteChunk {
  note_id: UUID;
  embedding: number[];
}

export interface NoteLink {
  from_note_id: UUID;
  to_note_id: UUID;
}

// Unified InsightThread type for the entire application
export interface InsightThread {
  threadId: string;
  title: string;
  summary: string;
  notes: Note[];
  relevanceScore: number;
  size: number;
}

export interface PreparedNote {
  note: Note;
  embedding: number[]; // averaged
  tags: string[];
}
