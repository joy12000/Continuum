import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { searchChunks, getNotesByIds } from "../lib/supabaseService";
const Today = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [notesMap, setNotesMap] = useState(new Map());
    const [loading, setLoading] = useState(false);
    const handleSearch = useCallback(async (currentQuery) => {
        if (!currentQuery.trim()) {
            setResults([]);
            setNotesMap(new Map());
            return;
        }
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user)
                return;
            // 1. Fetch relevant chunks
            const rows = await searchChunks(currentQuery, user.id);
            const searchResults = rows || [];
            // Sort results by distance (lower is better)
            searchResults.sort((a, b) => a.distance - b.distance);
            setResults(searchResults);
            // 2. If chunks are found, fetch all their parent notes at once
            if (searchResults.length > 0) {
                const uniqueNoteIds = [...new Set(searchResults.map(r => r.note_id))];
                const notesData = await getNotesByIds(uniqueNoteIds);
                // 3. Create a Map for instant lookups
                const newNotesMap = new Map();
                (notesData || []).forEach((note) => {
                    newNotesMap.set(note.id, note);
                });
                setNotesMap(newNotesMap);
            }
        }
        catch (error) {
            console.error("Search failed:", error);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        const timer = setTimeout(() => handleSearch(query), 300);
        return () => clearTimeout(timer);
    }, [query, handleSearch]);
    useEffect(() => {
        const handleNotesUpdated = () => {
            handleSearch(query);
        };
        window.addEventListener('notes:updated', handleNotesUpdated);
        return () => {
            window.removeEventListener('notes:updated', handleNotesUpdated);
        };
    }, [query, handleSearch]);
    function handleSelectRow(row) {
        window.dispatchEvent(new CustomEvent('open:note', { detail: { id: row.note_id } }));
    }
    return (_jsxs("div", { className: "p-4 space-y-3", children: [_jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "\uAC80\uC0C9\uC5B4\uB97C \uC785\uB825\uD558\uC138\uC694", className: "input input-bordered w-full" }), loading && _jsx("div", { className: "text-center p-4", children: "\uAC80\uC0C9 \uC911..." }), _jsx("div", { className: "space-y-2", children: results.map((r, i) => (_jsxs("button", { onClick: () => handleSelectRow(r), className: "block w-full text-left p-2 hover:bg-gray-100 rounded", children: [_jsxs("div", { className: "text-xs opacity-60", children: ["score: ", typeof r.distance === "number" ? r.distance.toFixed(3) : "-"] }), _jsx("div", { className: "line-clamp-2", children: r.content })] }, `${r.note_id}-${i}`))) })] }));
};
export default Today;
