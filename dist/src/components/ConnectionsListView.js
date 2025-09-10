import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
// A custom hook to fetch connections (encapsulated within the component for simplicity)
function useConnections(noteId) {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!noteId)
            return;
        const fetchConnections = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session)
                    throw new Error('Not authenticated');
                const res = await fetch(`/api/v1?action=get-connections&noteId=${noteId}`, {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                    }
                });
                if (!res.ok) {
                    throw new Error(`Failed to fetch connections: ${res.statusText}`);
                }
                const data = await res.json();
                setConnections(data.connections || []);
            }
            catch (err) {
                setError(err.message);
                console.error(err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchConnections();
    }, [noteId]);
    return { connections, loading, error };
}
export default function ConnectionsListView({ noteId }) {
    const { connections, loading, error } = useConnections(noteId);
    if (loading) {
        return _jsx("div", { className: "p-4 text-center text-white", children: "Loading connections..." });
    }
    if (error) {
        return _jsxs("div", { className: "p-4 text-center text-red-500", children: ["Error: ", error] });
    }
    return (_jsxs("div", { className: "p-1", children: [_jsx("h2", { className: "text-xl font-bold text-sky-300 mb-4", children: "Connected Notes" }), connections.length === 0 ? (_jsx("p", { className: "text-gray-400", children: "No connections found for this note." })) : (_jsx("ul", { className: "space-y-2 max-h-[60vh] overflow-y-auto", children: connections.map(conn => (_jsx("li", { children: _jsxs(Link, { to: `/notes/${conn.note_id}`, className: "block border border-white/10 bg-[#0b1830]/60 p-3 rounded-md hover:bg-white/20 transition-colors duration-200", children: [_jsx("h3", { className: "font-semibold text-sky-400 truncate", children: conn.title || 'Untitled Note' }), _jsxs("p", { className: "text-xs text-gray-400 mt-1", children: ["Relevance: ", conn.score.toFixed(3)] })] }) }, conn.note_id))) }))] }));
}
