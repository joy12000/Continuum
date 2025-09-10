import type { Note } from "../lib/db";
export declare function DedupSuggestions({ notes, engine, onMerge }: {
    notes: Note[];
    engine: "auto" | "remote";
    onMerge: (keep: string, remove: string[]) => Promise<void>;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=DedupSuggestions.d.ts.map