import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Renders the AI-generated answer with source highlighting and a reference section.
 * Each sentence includes a clickable anchor `[number]` that links to the source note.
 * @param {GeneratedAnswerProps} props - The props containing the answer data.
 */
export function GeneratedAnswer({ data }) {
    // Create a mapping from sourceNoteId to a display number (e.g., "note123" -> 1)
    const sourceIdToNumberMap = new Map();
    let currentSourceNumber = 1;
    data.sourceNotes.forEach(noteId => {
        if (!sourceIdToNumberMap.has(noteId)) {
            sourceIdToNumberMap.set(noteId, currentSourceNumber++);
        }
    });
    return (_jsxs("div", { className: "bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md animate-fadeIn", children: [_jsx("h3", { className: "text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3", children: "AI \uB2F5\uBCC0" }), _jsx("div", { className: "text-slate-700 dark:text-slate-300 space-y-2", children: data.answerSegments.map((segment, index) => {
                    const sourceNumber = sourceIdToNumberMap.get(segment.sourceNoteId);
                    return (_jsxs("p", { children: [segment.sentence, sourceNumber && (_jsxs("a", { href: `#source-${sourceNumber}`, className: "ml-1 text-indigo-400 font-bold no-underline hover:underline", title: `출처 ${sourceNumber}로 이동`, children: ["[", sourceNumber, "]"] }))] }, index));
                }) }), data.sourceNotes.length > 0 && (_jsxs("div", { className: "mt-6 border-t border-slate-200 dark:border-slate-700 pt-4", children: [_jsx("h4", { className: "text-md font-semibold text-slate-600 dark:text-slate-300 mb-2", children: "\uCC38\uACE0 \uC790\uB8CC" }), _jsx("ul", { className: "space-y-3", children: data.sourceNotes.map((noteId) => {
                            const sourceNumber = sourceIdToNumberMap.get(noteId);
                            // In a real app, we would fetch the note content from the DB using the noteId.
                            // For now, we'll just display the ID as a placeholder.
                            const noteContentPreview = `노트 내용 (ID: ${noteId.substring(0, 8)}...)`;
                            return (_jsxs("li", { id: `source-${sourceNumber}`, className: "text-sm text-slate-500 dark:text-slate-400 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md", children: [_jsxs("span", { className: "font-bold text-indigo-500 dark:text-indigo-400 mr-2", children: ["[", sourceNumber, "]"] }), noteContentPreview] }, noteId));
                        }) })] }))] }));
}
