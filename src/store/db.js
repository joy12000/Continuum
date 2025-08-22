import Dexie from "dexie";
export class AppDB extends Dexie {
    notes;
    attachments;
    embeddings;
    dedup_logs;
    snapshots;
    constructor() {
        super("continuum");
        this.version(1).stores({
            notes: "id, createdAt, updatedAt, *tags",
            attachments: "id, noteId, createdAt",
            embeddings: "++id, noteId",
            dedup_logs: "++id, ts, sim, accepted",
            snapshots: 'id, createdAt'
        });
    }
    async mergeNotes(keepId, removeIds) {
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
    }
}
export const db = new AppDB();
