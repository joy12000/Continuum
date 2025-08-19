export type Chunk = { id: string; noteId: string; pos: number; text: string; tags: string[]; createdAt: number; tokens: string[]; vec?: number[]; };
export type AskRequest = { q: string; engine: "auto"|"remote"; lambdaMMR: number; alphaSem: number; topK: number; topN: number; notes?: any[]; };
export type AskResult = { keypoints: string[]; citations: Array<{ text: string; noteId: string; pos: number; tags: string[]; createdAt: number; }>; };
