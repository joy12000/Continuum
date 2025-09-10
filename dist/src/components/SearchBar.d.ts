interface SearchBarProps {
    q: string;
    setQ: (v: string) => void;
    onFocus: () => void;
    suggestedQuestions: string[];
    isLoadingSuggestions: boolean;
    suggestionError: string | null;
    isModelReady: boolean;
    modelStatus: string;
    className?: string;
}
export declare function SearchBar({ q, setQ, onFocus, suggestedQuestions, isLoadingSuggestions, suggestionError, isModelReady, modelStatus, className }: SearchBarProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SearchBar.d.ts.map