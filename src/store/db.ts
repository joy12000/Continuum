import Dexie, { Table } from "dexie";
export interface Note { id: string; content: string; createdAt: number; updatedAt: number; tags: string[]; }
export interface Attachment { id: string; noteId: string; name: string; type: string; blob?: Blob; url?: string; createdAt: number; }
export interface Embedding { id?: number; noteId: string; vec: number[]; updatedAt?: number; }
export interface DedupLog { id?: number; ts: number; sim: number; accepted: boolean; }
export interface Snapshot {
  id?: number;
  timestamp: number;
  notes: Note[];
  attachments: Attachment[]; // 첨부파일도 스냅샷에 포함
}
export class AppDB extends Dexie {
  notes!: Table<Note, string>;
  attachments!: Table<Attachment, string>;
  embeddings!: Table<Embedding, number>;
  dedup_logs!: Table<DedupLog, number>;
  snapshots!: Table<Snapshot>; // 이 라인 추가

  constructor(){ super("continuum");
    this.version(1).stores({
      notes: "id, createdAt, updatedAt, *tags",
      attachments: "id, noteId, createdAt",
      embeddings: "++id, noteId",
      dedup_logs: "++id, ts, sim, accepted",
      snapshots: '++id, timestamp' // 이 라인 추가
    });
  }
}
export const db = new AppDB();