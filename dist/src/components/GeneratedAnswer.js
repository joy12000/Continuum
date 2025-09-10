import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
/**
 * Renders the AI-generated answer with a design that complements the sky/space theme.
 * Features a glassmorphism background, improved text visibility, and clear source references.
 * @param {GeneratedAnswerProps} props - The props containing the answer data.
 */
export function GeneratedAnswer({ data, noteTitlesMap, onNoteClick }) {
    const sourceIdToNumberMap = new Map();
    let currentSourceNumber = 1;
    data.sourceNotes.forEach(noteId => {
        if (!sourceIdToNumberMap.has(noteId)) {
            sourceIdToNumberMap.set(noteId, currentSourceNumber++);
        }
    });
    return (_jsxs("div", { className: "bg-slate-800/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-5 shadow-lg animate-fadeIn", children: [_jsx("h3", { className: "text-xl font-bold text-white/90 mb-4", children: "AI \uC694\uC57D" }), _jsx("div", { className: "text-sky-50/90 text-base leading-relaxed space-y-3", children: _jsx("p", { children: data.answerSegments.map((segment, index) => {
                        const sourceNumber = sourceIdToNumberMap.get(segment.sourceNoteId);
                        return (_jsxs(React.Fragment, { children: [segment.sentence, sourceNumber && (_jsxs("a", { href: `#source-${sourceNumber}`, className: "ml-1.5 text-cyan-300 font-semibold no-underline hover:text-cyan-100 hover:underline transition-colors duration-200", title: `출처 ${sourceNumber}로 이동`, children: ["[", sourceNumber, "]"] })), ' '] }, index));
                    }) }) }), data.sourceNotes.length > 0 && (_jsxs("div", { className: "mt-6 border-t border-white/10 pt-4", children: [_jsx("h4", { className: "text-lg font-semibold text-white/80 mb-3", children: "\uCC38\uACE0 \uC790\uB8CC" }), _jsx("ul", { className: "space-y-2", children: data.sourceNotes.map((noteId) => {
                            const sourceNumber = sourceIdToNumberMap.get(noteId);
                            const noteTitle = noteTitlesMap[noteId] || `노트 (ID: ${noteId.substring(0, 8)}...)`;
                            return (_jsxs("li", { id: `source-${sourceNumber}`, className: "text-sm text-sky-100/80 p-2.5 bg-black/20 dark:bg-white/5 rounded-lg flex items-center transition-all duration-200 hover:bg-black/30 hover:text-sky-50 cursor-pointer", onClick: () => onNoteClick(noteId), children: [_jsx("span", { className: "flex-shrink-0 h-5 w-5 bg-cyan-400/20 text-cyan-200 font-bold text-xs flex items-center justify-center rounded-full mr-3", children: sourceNumber }), _jsx("span", { className: "truncate", children: noteTitle })] }, noteId));
                        }) })] }))] }));
}
