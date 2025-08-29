
export type Id = number | string;

export interface Note {
  id: Id;
  title?: string;
  content: string;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
}

export interface QA {
  q: string;
  a: string;
}

export interface Sentence {
  text: string;
  sourceNoteId: Id | null;
}

export interface RagOptions {
  trim?: {
    maxNotes?: number;
    maxCharsPerNote?: number;
    maxTotalChars?: number;
  }
}

export class ApiError extends Error {
  statusCode: number;
  type: string;
  constructor(message: string, statusCode = 500, type = 'server') {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
  }
}
