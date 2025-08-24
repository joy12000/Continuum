import Dexie, { Table } from "dexie";
export interface Note { id: string; title?: string; content: string; createdAt: number; updatedAt: number; tags: string[]; }
export interface Attachment { id: string; noteId: string; name: string; type: string; blob?: Blob; url?: string; createdAt: number; }
export interface Embedding { id?: number; noteId: string; vec: number[]; updatedAt?: number; }
export interface DedupLog { id?: number; ts: number; sim: number; accepted: boolean; }
export interface Snapshot {
  id: string;
  createdAt: number;
  noteCount: number;
}
export interface DayIndex { date: string; noteId: string; tomorrow?: string; }
export interface DayIndex { date: string; noteId: string; tomorrow?: string; }
export class AppDB
  id: string;
  createdAt: number;
  noteCount: number;
}
export class AppDB extends Dexie {
  notes!: Table<Note, string>;
  attachments!: Table<Attachment, string>;
  embeddings!: Table<Embedding, number>;
  dedup_logs!: Table<DedupLog, number>;
  snapshots!: Table<Snapshot, string>;
  day_index!: Table<DayIndex, string>;

  constructor(){ super("continuum");
    this.version(1).stores({
      notes: "id, createdAt, updatedAt, *tags",
      attachments: "id, noteId, createdAt",
      embeddings: "++id, noteId",
      dedup_logs: "++id, ts, sim, accepted",
      snapshots: 'id, createdAt'
    });
    this.version(2).stores({ day_index: 'date' });
  }

  async mergeNotes(keepId: string, removeIds: string[]) {
    return this.transaction('rw', this.notes, this.attachments, this.embeddings, async () => {
      const keepNote = await this.notes.get(keepId);
      if (!keepNote) {
        throw new Error(`Note to keep with id ${keepId} not found.`);
      }

      const removeNotes = await this.notes.bulkGet(removeIds);
      
      let mergedContent = keepNote.content;
      const mergedTags = new Set(keepNote.tags);

      for (const removeNote of removeNotes) {
        if (removeNote) {
          mergedContent += `\n\n---\n\n${removeNote.content}`;
          removeNote.tags.forEach(tag => mergedTags.add(tag));
        }
      }

      // Update the note to keep
      await this.notes.update(keepId, {
        content: mergedContent,
        tags: Array.from(mergedTags),
        updatedAt: Date.now(),
      });

      // Re-associate attachments and embeddings from removed notes
      await this.attachments.where('noteId').anyOf(removeIds).modify({ noteId: keepId });
      await this.embeddings.where('noteId').anyOf(removeIds).modify({ noteId: keepId });

      // Delete the removed notes
      await this.notes.bulkDelete(removeIds);
    });
    this.version(2).stores({ day_index: 'date' });
  }
}
export const db = new AppDB();
