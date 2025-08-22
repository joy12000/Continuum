import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { SearchBar } from './SearchBar';
import { RichNoteEditor } from './RichNoteEditor';
import { Plus, Sun, Moon, Search } from 'lucide-react';
import { GeneratedAnswer } from './GeneratedAnswer';
export default function TodayCanvasScreen({ notes, query, onQueryChange, onSearchFocus, suggestedQuestions, isLoadingSuggestions, suggestionError, generatedAnswer, onNewNote, onNavigate, }) {
    // --- UI 상태 관리 ---
    const [scrollY, setScrollY] = useState(0);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [editorContent, setEditorContent] = useState('');
    const [theme, setTheme] = useState('system');
    const [fontSize, setFontSize] = useState(16);
    const [viewMode, setViewMode] = useState('list');
    // --- 테마 처리 로직 ---
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme)
            setTheme(savedTheme);
    }, []);
    useEffect(() => {
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            document.documentElement.classList.toggle('dark', mediaQuery.matches);
            const handler = (e) => document.documentElement.classList.toggle('dark', e.matches);
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        }
        else {
            document.documentElement.classList.toggle('dark', theme === 'dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    // --- 이벤트 핸들러 ---
    const handleScroll = useCallback(() => {
        setScrollY(window.scrollY);
        // 스크롤을 내리면 검색창 숨기기 (임계값 50px)
        if (window.scrollY > 50 && isSearchVisible) {
            setIsSearchVisible(false);
        }
    }, [isSearchVisible]);
    const handleWheel = useCallback((e) => {
        // 최상단에서 위로 스와이프(휠을 아래로 굴림)하면 검색창 띄우기
        if (window.scrollY === 0 && e.deltaY < 0 && !isSearchVisible) {
            setIsSearchVisible(true);
        }
    }, [isSearchVisible]);
    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('wheel', handleWheel); // wheel 이벤트 리스너 다시 추가
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('wheel', handleWheel); // wheel 이벤트 리스너 제거 함수 다시 추가
        };
    }, [handleScroll, handleWheel]); // 의존성 배열에 handleWheel 추가
    // --- 렌더링 로직 ---
    const charCount = editorContent.length;
    const wordCount = editorContent.trim() ? editorContent.trim().split(/\s+/).length : 0;
    const showFab = charCount >= 1;
    const today = new Date();
    const formattedDate = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
    return (_jsxs("div", { className: "flex flex-col h-full", children: [isSearchVisible && (_jsx("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm z-10 animate-fadeIn", onClick: () => setIsSearchVisible(false) })), _jsxs("header", { className: "flex items-center justify-between p-4 sm:px-0", children: [_jsx("h1", { className: "text-xl font-bold text-slate-800 dark:text-slate-200 cursor-pointer", onClick: () => onNavigate('today'), children: "Continuum \uD83D\uDEE1\uFE0F" }), _jsxs("div", { className: "flex items-center gap-2", children: [" ", _jsx("button", { onClick: () => setFontSize(f => Math.max(12, f - 1)), className: "p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700", children: "-" }), _jsx("button", { onClick: () => setFontSize(f => Math.min(24, f + 1)), className: "p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700", children: "+" }), _jsxs("button", { onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark'), className: "p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700", children: [_jsx(Sun, { className: "h-5 w-5 dark:hidden" }), _jsx(Moon, { className: "h-5 w-5 hidden dark:block" })] }), _jsx("button", { onClick: () => setIsSearchVisible(true), className: "p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700", children: _jsx(Search, { className: "h-5 w-5" }) }), _jsx("button", { onClick: () => onNavigate('settings'), className: "p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors", "aria-label": "\uC124\uC815\uC73C\uB85C \uC774\uB3D9", children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", className: "h-6 w-6 text-slate-600 dark:text-slate-400", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: [_jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }), _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" })] }) })] })] }), _jsx("div", { className: `sticky top-0 z-20 transition-all duration-300 ease-out ${isSearchVisible ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`, children: _jsx(SearchBar, { q: query, setQ: onQueryChange, onFocus: onSearchFocus, suggestedQuestions: suggestedQuestions, isLoadingSuggestions: isLoadingSuggestions, suggestionError: suggestionError }) }), _jsxs("main", { className: "p-4 sm:px-6 pb-20", children: [" ", _jsxs("div", { className: "max-w-4xl mx-auto space-y-4", children: [" ", query.length > 0 && (_jsxs("div", { className: "card p-6", children: [" ", generatedAnswer.isLoading && _jsx("div", { className: "text-center text-slate-500 animate-pulse", children: "AI\uAC00 \uB2F5\uBCC0\uC744 \uC0DD\uC131 \uC911\uC785\uB2C8\uB2E4..." }), generatedAnswer.error && _jsx("div", { className: "text-center text-red-500", children: generatedAnswer.error }), generatedAnswer.data && !generatedAnswer.isLoading && _jsx(GeneratedAnswer, { data: generatedAnswer.data }), notes.length > 0 && (_jsxs("div", { className: "mt-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx("button", { onClick: () => setViewMode('list'), className: `px-3 py-1 text-sm font-semibold rounded-full ${viewMode === 'list' ? 'text-white bg-indigo-600' : 'text-slate-500 bg-slate-200'}`, children: "\uBAA9\uB85D \uBDF0" }), _jsx("button", { className: "px-3 py-1 text-sm font-semibold text-slate-400 bg-slate-100 rounded-full cursor-not-allowed", disabled: true, children: "\uD0C0\uC784\uB77C\uC778 \uBDF0 (\uC608\uC815)" }), _jsx("button", { className: "px-3 py-1 text-sm font-semibold text-slate-400 bg-slate-100 rounded-full cursor-not-allowed", disabled: true, children: "\uADF8\uB798\uD504 \uBDF0 (\uC608\uC815)" })] }), _jsx("section", { className: "space-y-2", children: notes.map(note => (_jsxs("article", { className: "card bg-white dark:bg-slate-800 p-4 rounded-lg shadow", children: [_jsx("div", { className: "text-xs text-slate-500 dark:text-slate-400 mb-2", children: new Date(note.updatedAt).toLocaleString() }), _jsx("div", { className: "whitespace-pre-wrap", dangerouslySetInnerHTML: { __html: note.content } })] }, note.id))) })] })), !generatedAnswer.isLoading && notes.length === 0 && (_jsx("div", { className: "text-center text-slate-400 py-8", children: "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }))] })), _jsxs("div", { className: "card p-6", children: [" ", _jsx(RichNoteEditor, { autoFocus: true, onSave: setEditorContent })] }), _jsxs("div", { className: "mt-2 px-2 flex justify-between text-xs text-slate-400 dark:text-slate-400", children: [_jsx("span", { children: "\uC790\uB3D9 \uC800\uC7A5\uB428" }), _jsxs("span", { children: [wordCount, " \uB2E8\uC5B4 / ", charCount, " \uAE00\uC790"] })] })] })] }), _jsx("button", { onClick: onNewNote, className: `fixed bottom-4 right-4 sm:bottom-14 sm:right-14 h-11 w-11 sm:h-14 sm:w-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-out ${showFab ? 'scale-100 animate-zoomIn' : 'scale-0'}`, children: _jsx(Plus, { className: "h-7 w-7" }) })] }));
}
