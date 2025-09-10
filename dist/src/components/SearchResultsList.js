import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import Highlight from './Highlight';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/solid';
import { HandThumbUpIcon as ThumbUpIconOutline, HandThumbDownIcon as ThumbDownIconOutline } from '@heroicons/react/24/outline';
const SearchResultsList = ({ results, loading, noteTitlesMap, query, onNoteClick }) => {
    const [feedback, setFeedback] = useState({});
    if (loading) {
        return _jsx("div", { className: "p-4 text-muted-foreground text-center bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-lg shadow-lg", children: "\uAC80\uC0C9 \uC911..." });
    }
    if (results.length === 0) {
        return _jsx("div", { className: "p-4 text-muted-foreground text-center bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-lg shadow-lg", children: "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    const handleFeedback = (result, newFeedback) => {
        const key = `${result.note_id}_${result.chunk_index}`;
        setFeedback(prev => ({
            ...prev,
            [key]: prev[key] === newFeedback ? null : newFeedback
        }));
        // Here you would typically store this feedback, e.g., in your database
        console.log(`Feedback for note ${result.note_id}: ${newFeedback}`);
    };
    return (_jsx("ul", { className: "space-y-4", children: results.map(result => {
            const key = `${result.note_id}_${result.chunk_index}`;
            const currentFeedback = feedback[key];
            return (_jsx("li", { children: _jsxs("div", { className: "block w-full text-left border border-slate-700/50 bg-slate-900/60 backdrop-blur-lg rounded-lg p-4 transition-all duration-300 hover:bg-slate-800/70 hover:shadow-xl", children: [_jsxs("div", { className: "flex justify-between items-start gap-4", children: [_jsxs("button", { onClick: () => onNoteClick(result.note_id), className: "flex-grow text-left", children: [_jsx("h3", { className: "text-lg font-semibold text-primary hover:underline", children: noteTitlesMap[result.note_id] || '제목 없는 노트' }), _jsx("div", { className: "text-sm text-slate-300 mt-2 snippet", children: _jsx(Highlight, { text: result.content, query: query }) })] }), _jsxs("div", { className: "flex flex-col space-y-2 flex-shrink-0", children: [_jsx("button", { onClick: () => handleFeedback(result, 'like'), className: `p-1.5 rounded-full transition-colors ${currentFeedback === 'like' ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground hover:bg-green-500/10 hover:text-green-500'}`, children: currentFeedback === 'like' ? _jsx(HandThumbUpIcon, { className: "h-5 w-5" }) : _jsx(ThumbUpIconOutline, { className: "h-5 w-5" }) }), _jsx("button", { onClick: () => handleFeedback(result, 'dislike'), className: `p-1.5 rounded-full transition-colors ${currentFeedback === 'dislike' ? 'bg-red-500/20 text-red-400' : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-500'}`, children: currentFeedback === 'dislike' ? _jsx(HandThumbDownIcon, { className: "h-5 w-5" }) : _jsx(ThumbDownIconOutline, { className: "h-5 w-5" }) })] })] }), _jsxs("div", { className: "text-xs text-muted-foreground/80 mt-3 pt-2 border-t border-slate-800", children: ["\uC720\uC0AC\uB3C4: ", result.similarity.toFixed(3)] })] }) }, key));
        }) }));
};
export default SearchResultsList;
