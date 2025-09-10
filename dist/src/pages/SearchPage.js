import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { SearchBar } from '../components/SearchBar';
import { useSearch } from '../hooks/useSearch';
import PageLayout from '../components/PageLayout';
import { GeneratedAnswer } from '../components/GeneratedAnswer';
import { getNotesByIds } from '../lib/supabaseService';
import { NoteDetailModal } from '../components/NoteDetailModal';
import SkyCanvasAnimation from '../components/SkyCanvasAnimation';
import SearchResultsList from '../components/SearchResultsList';
// Main Search Page Component
const SearchPage = ({ session }) => {
    const [query, setQuery] = useState('');
    const token = session?.access_token;
    const { results, loading } = useSearch(query, token);
    const [generatedAnswer, setGeneratedAnswer] = useState({
        data: null,
        isLoading: false,
        error: null,
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState(null);
    const [noteTitlesMap, setNoteTitlesMap] = useState({});
    const handleNoteClick = useCallback((noteId) => {
        setSelectedNoteId(noteId);
        setIsModalOpen(true);
    }, []);
    useEffect(() => {
        const generateAnswer = async () => {
            if (!results || results.length === 0 || query.trim().length < 2) {
                setGeneratedAnswer({ data: null, isLoading: false, error: null });
                setNoteTitlesMap({});
                return;
            }
            try {
                setGeneratedAnswer({ data: null, isLoading: true, error: null });
                const topNoteIds = [...new Set(results.map(r => r.note_id))].slice(0, 5);
                const contextNotes = await getNotesByIds(topNoteIds);
                if (!contextNotes || contextNotes.length === 0) {
                    throw new Error("Could not fetch context notes.");
                }
                const newNoteTitlesMap = {};
                contextNotes.forEach((n) => {
                    newNoteTitlesMap[n.id] = n.title || '제목 없는 노트';
                });
                setNoteTitlesMap(newNoteTitlesMap);
                const generateRes = await fetch('/api/v1?action=generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'rag',
                        input: { query },
                        context: contextNotes.map((n) => ({ id: n.id, body: n.body }))
                    })
                });
                if (!generateRes.ok || !generateRes.body) {
                    const errorText = await generateRes.text();
                    throw new Error(`요약 생성 실패: ${errorText}`);
                }
                const result = await generateRes.json();
                const summaryText = result?.data?.summary;
                if (!summaryText)
                    throw new Error("AI response did not contain a valid summary.");
                const finalAnswerData = {
                    answerSegments: [{ sentence: summaryText, sourceNoteId: '' }],
                    sourceNotes: contextNotes.map((n) => n.id),
                };
                setGeneratedAnswer({ data: finalAnswerData, isLoading: false, error: null });
            }
            catch (error) {
                console.error("Failed to generate search answer:", error);
                setGeneratedAnswer({ data: null, isLoading: false, error: error.message });
            }
        };
        const handler = setTimeout(() => {
            generateAnswer();
        }, 500);
        return () => {
            clearTimeout(handler);
        };
    }, [results, query]);
    const GeneratedAnswerCard = () => (_jsxs("div", { className: "bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-lg p-4 shadow-lg", children: [generatedAnswer.isLoading && _jsx("div", { className: "p-4 text-center text-muted-foreground", children: "\uB2F5\uBCC0 \uC0DD\uC131 \uC911..." }), generatedAnswer.error && _jsxs("div", { className: "p-4 text-center text-destructive", children: ["\uC624\uB958: ", generatedAnswer.error] }), generatedAnswer.data && _jsx(GeneratedAnswer, { data: generatedAnswer.data, noteTitlesMap: noteTitlesMap, onNoteClick: handleNoteClick })] }));
    return (_jsxs(PageLayout, { title: "\uB178\uD2B8 \uAC80\uC0C9", hideBackButton: true, children: [_jsx(SkyCanvasAnimation, {}), _jsxs("div", { className: "relative z-10", children: [_jsx(SearchBar, { q: query, setQ: setQuery, onFocus: () => { }, suggestedQuestions: [], isLoadingSuggestions: false, suggestionError: null, isModelReady: true, modelStatus: "Ready", className: "bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 text-primary placeholder-muted-foreground focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/80" }), _jsx("div", { className: "mt-6", children: query.trim() !== '' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "lg:hidden", children: [(generatedAnswer.data || generatedAnswer.isLoading || generatedAnswer.error) && (_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "\uC0DD\uC131\uB41C \uB2F5\uBCC0" }), _jsx(GeneratedAnswerCard, {})] })), _jsxs("div", { children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "\uAC80\uC0C9 \uACB0\uACFC" }), _jsx(SearchResultsList, { results: results, loading: loading, noteTitlesMap: noteTitlesMap, query: query, onNoteClick: handleNoteClick })] })] }), _jsxs("div", { className: "hidden lg:grid lg:grid-cols-3 lg:gap-8", children: [_jsxs("div", { className: "lg:col-span-2", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "\uAC80\uC0C9 \uACB0\uACFC" }), _jsx(SearchResultsList, { results: results, loading: loading, noteTitlesMap: noteTitlesMap, query: query, onNoteClick: handleNoteClick })] }), _jsxs("div", { className: "lg:col-span-1", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: "\uC0DD\uC131\uB41C \uB2F5\uBCC0" }), _jsx(GeneratedAnswerCard, {})] })] })] })) : (_jsxs("div", { className: "text-center p-12 text-muted-foreground", children: [_jsx("h2", { className: "text-2xl font-semibold mb-2", children: "\uBB34\uC5C7\uC774\uB4E0 \uBB3C\uC5B4\uBCF4\uC138\uC694." }), _jsx("p", { children: "\uB2F9\uC2E0\uC758 \uAE30\uC5B5 \uC18D\uC5D0\uC11C \uB2F5\uC744 \uCC3E\uC544\uB4DC\uB9BD\uB2C8\uB2E4." })] })) })] }), selectedNoteId && _jsx(NoteDetailModal, { noteId: selectedNoteId, isOpen: isModalOpen, onClose: () => setIsModalOpen(false) })] }));
};
export default SearchPage;
