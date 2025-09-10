import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Modal from './Modal';
import { toast } from '../lib/toast';
export function LinkEditorModal({ noteId, onClose, onSave }) {
    const [allNotes, setAllNotes] = useState([]);
    const [initialConnections, setInitialConnections] = useState([]);
    const [selectedLinks, setSelectedLinks] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                // Fetch all notes (just id and title) and current connections in parallel
                const allNotesPromise = supabase.from('notes').select('id, title, created_at').neq('id', noteId).order('created_at', { ascending: false });
                const connectionsPromise = supabase.rpc('get_connections_for_note', { target_note_id: noteId });
                const [allNotesRes, connectionsRes] = await Promise.all([allNotesPromise, connectionsPromise]);
                if (allNotesRes.error)
                    throw allNotesRes.error;
                if (connectionsRes.error)
                    throw connectionsRes.error;
                const connectionsData = connectionsRes.data || [];
                const currentConnectionIds = [];
                for (const item of connectionsData) {
                    if (item && typeof item.id === 'string') {
                        currentConnectionIds.push(item.id);
                    }
                }
                const initialSet = new Set(currentConnectionIds);
                setInitialConnections(currentConnectionIds);
                setSelectedLinks(initialSet);
                setAllNotes(allNotesRes.data || []);
            }
            catch (error) {
                toast.error(`데이터 로딩 실패: ${error.message}`);
                console.error(error);
            }
            finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [noteId]);
    const handleToggleLink = (targetNoteId) => {
        setSelectedLinks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(targetNoteId)) {
                newSet.delete(targetNoteId);
            }
            else {
                newSet.add(targetNoteId);
            }
            return newSet;
        });
    };
    const handleConfirmSave = () => {
        const initialSet = new Set(initialConnections);
        const linksToAdd = [...selectedLinks].filter(id => !initialSet.has(id));
        const linksToRemove = [...initialSet].filter(id => !selectedLinks.has(id));
        onSave(linksToAdd, linksToRemove);
        onClose();
    };
    const modalActions = (_jsxs(_Fragment, { children: [_jsx("button", { className: "btn", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx("button", { className: "btn btn-primary", onClick: handleConfirmSave, children: "\uC800\uC7A5" })] }));
    return (_jsx(Modal, { title: "\uB178\uD2B8 \uC5F0\uACB0 \uAD00\uB9AC", onClose: onClose, actions: modalActions, children: isLoading ? (_jsx("p", { children: "\uB178\uD2B8 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uB294 \uC911..." })) : (_jsx("div", { className: "max-h-96 overflow-y-auto", children: _jsx("ul", { children: allNotes.map(note => (_jsxs("li", { className: "flex items-center justify-between p-2 hover:bg-slate-700 rounded-md", children: [_jsx("label", { htmlFor: `note-link-${note.id}`, className: "truncate flex-grow cursor-pointer", children: note.title }), _jsx("input", { id: `note-link-${note.id}`, type: "checkbox", className: "checkbox checkbox-primary", checked: selectedLinks.has(note.id), onChange: () => handleToggleLink(note.id) })] }, note.id))) }) })) }));
}
