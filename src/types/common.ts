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
  tags: string[];
  createdAt: number;
  updatedAt: number;
}