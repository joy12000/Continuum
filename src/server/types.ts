export type UUID = string;

export interface Note {
  id: UUID;
  user_id?: UUID;
  title: string | null;
  body: string;
  tags?: string[];
  embedding?: number[];
  created_at: string;
  updated_at: string;
  // UI compatibility fields
  createdAt?: string | number;
  updatedAt?: string | number;
  metadata?: Record<string, any>;
  is_archived?: boolean;
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
