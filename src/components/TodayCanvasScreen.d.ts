import { Note } from '../lib/db';
import { AnswerData } from '../types/common';
type View = 'today' | 'settings' | 'diagnostics';
interface TodayCanvasScreenProps {
    notes: Note[];
    query: string;
    onQueryChange: (q: string) => void;
    onSearchFocus: () => void;
    suggestedQuestions: string[];
    isLoadingSuggestions: boolean;
    suggestionError: string | null;
    generatedAnswer: {
        data: AnswerData | null;
        isLoading: boolean;
        error: string | null;
    };
    onNewNote: () => void;
    onNavigate: (view: View) => void;
    activeNote: Note | undefined;
    onNoteSelect: (id: string) => void;
    isModelReady: boolean;
    modelStatus: string;
}
export default function TodayCanvasScreen({ notes, query, onQueryChange, onSearchFocus, suggestedQuestions, isLoadingSuggestions, suggestionError, generatedAnswer, onNewNote, onNavigate, activeNote, onNoteSelect, isModelReady, modelStatus, }: TodayCanvasScreenProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=TodayCanvasScreen.d.ts.map