export interface AnswerData {
  answerSegments: {
    sentence: string;
    sourceNoteId: string;
  }[];
  sourceNotes: string[];
}

export interface Note {
  id: string;
  content: string;
  title?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  id: string;
  score: number;
  text: string;
  noteId: string;
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