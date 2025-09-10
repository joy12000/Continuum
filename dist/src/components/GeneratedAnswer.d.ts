import { AnswerData } from '../types/common';
interface GeneratedAnswerProps {
    data: AnswerData;
    noteTitlesMap: Record<string, string>;
    onNoteClick: (noteId: string) => void;
}
/**
 * Renders the AI-generated answer with a design that complements the sky/space theme.
 * Features a glassmorphism background, improved text visibility, and clear source references.
 * @param {GeneratedAnswerProps} props - The props containing the answer data.
 */
export declare function GeneratedAnswer({ data, noteTitlesMap, onNoteClick }: GeneratedAnswerProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=GeneratedAnswer.d.ts.map