import Dexie, { Table } from "dexie";
export interface Note {
    id: string;
    body: string;
    createdAt: number;
    updatedAt: number;
    tags: string[];
}
export declare class AppDB extends Dexie {
    notes: Table<Note, string>;
    constructor();
}
//# sourceMappingURL=sw.d.ts.map