export interface AnswerData {
  answerSegments: {
    sentence: string;
    sourceNoteId: string;
  }[];
  sourceNotes: string[];
}

export interface Note {
  id: string;
  body: string | null;
  title?: string;
  tags: string[];
  citations?: { noteId: string }[];
  createdAt: number;
  updatedAt: number;
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  user_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface SearchResult {
  document_id?: string | null;
  note_id: string | null;
  chunk_index?: number | null;
  content: string;
  similarity?: number | null;
  score?: number | null;
  uri?: string;
  fileName?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  groundingMetadata?: Record<string, any>;
}

export interface SearchQuery {
  query: string;
  ts: number;
  results: SearchResult[];
}

export interface Embedding {
  text: string;
  vector: number[];
}

export interface Chunk {
  text: string;
  start: number;
  end: number;
}

export type Id = string;

export interface Sentence {
  text: string;
  sourceNoteId: Id | null;
}