import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabase';
import { TagIcon, LinkIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, PaperClipIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
// --- API Fetching Functions ---
const fetchNoteData = async (noteId) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token)
        throw new Error('인증이 필요합니다.');
    const notePromise = fetch(`/api/v1?action=get-note&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const attachmentsPromise = supabase.from('note_attachments').select('*').eq('note_id', noteId);
    const backlinksPromise = fetch(`/api/v1?action=get-backlinks&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const connectionsPromise = fetch(`/api/v1?action=get-connections&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const [noteRes, { data: attachments, error: attachmentsError }, backlinksRes, connectionsRes] = await Promise.all([notePromise, attachmentsPromise, backlinksPromise, connectionsPromise]);
    if (!noteRes.ok) {
        if (noteRes.status === 404)
            throw new Error('노트를 찾을 수 없습니다.');
        const errorData = await noteRes.json();
        throw new Error(errorData.error || '노트를 불러오는데 실패했습니다.');
    }
    if (attachmentsError)
        throw new Error('첨부파일을 불러오는데 실패했습니다.');
    const note = await noteRes.json();
    const backlinks = await backlinksRes.json();
    const connections = await connectionsRes.json();
    return {
        note,
        attachments: (attachments || []),
        backlinks: backlinks.backlinks || [],
        connections: connections.connections || [],
    };
};
// --- Main Component ---
export const NoteDetailModal = ({ noteId, isOpen, onClose }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(false);
    // --- Edit State ---
    const [editTitle, setEditTitle] = useState('');
    const [editBody, setEditBody] = useState('');
    const [editTags, setEditTags] = useState('');
    // --- Data Fetching with React Query ---
    const { data, isLoading, error } = useQuery({
        queryKey: ['noteDetail', noteId],
        queryFn: () => fetchNoteData(noteId),
        enabled: !!noteId && isOpen,
    });
    const { note, attachments, backlinks, connections } = data || {};
    useEffect(() => {
        if (!note)
            return;
        if (isEditing) {
            setEditTitle(note.title || '');
            setEditBody(note.body || '');
            setEditTags((note.tags || []).join(', '));
        }
    }, [isEditing, note]);
    // --- Mutations ---
    const updateNoteMutation = useMutation({
        mutationFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token)
                throw new Error('인증이 필요합니다.');
            const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
            const response = await fetch(`/api/v1?action=update-note&noteId=${noteId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: editTitle,
                    body: editBody,
                    tags: tagsArray,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '노트 업데이트에 실패했습니다.');
            }
        },
        onSuccess: () => {
            toast.success("노트가 성공적으로 업데이트되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
            queryClient.invalidateQueries({ queryKey: ['noteActivity'] });
            window.dispatchEvent(new CustomEvent('notes:updated'));
            setIsEditing(false);
        },
        onError: (err) => toast.error(`업데이트 실패: ${err.message}`),
    });
    const updateNoteLinksMutation = useMutation({
        mutationFn: async ({ linksToAdd, linksToRemove }) => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token)
                throw new Error('인증이 필요합니다.');
            const response = await fetch(`/api/v1?action=update-note&noteId=${noteId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    links_to_add: linksToAdd,
                    links_to_remove: linksToRemove,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '노트 링크 업데이트에 실패했습니다.');
            }
        },
        onSuccess: () => {
            toast.success("노트 링크가 업데이트되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
            setIsLinkEditorOpen(false);
        },
        onError: (err) => {
            toast.error(`링크 업데이트 실패: ${err.message}`);
        },
    });
    const deleteNoteMutation = useMutation({
        mutationFn: async () => {
            if (attachments && attachments.length > 0) {
                const paths = attachments.map(a => a.storage_path);
                await supabase.storage.from('notes-attachments').remove(paths);
            }
            const { error } = await supabase.from('notes').delete().eq('id', noteId);
            if (error)
                throw error;
        },
        onSuccess: () => {
            toast.success('노트가 삭제되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['notes'] }); // For any note list
            window.dispatchEvent(new CustomEvent('notes:updated'));
            onClose();
        },
        onError: (err) => toast.error(`삭제 실패: ${err.message}`),
    });
    const deleteAttachmentMutation = useMutation({
        mutationFn: async (attachment) => {
            await supabase.storage.from('notes-attachments').remove([attachment.storage_path]);
            const { error } = await supabase.from('note_attachments').delete().eq('id', attachment.id);
            if (error)
                throw error;
        },
        onSuccess: () => {
            toast.success("첨부파일이 삭제되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
        },
        onError: (err) => toast.error(`첨부파일 삭제 실패: ${err.message}`),
    });
    if (!isOpen)
        return null;
    // --- Render Logic ---
    if (isLoading) {
        return _jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50", children: _jsx(ArrowPathIcon, { className: "w-12 h-12 animate-spin text-accent" }) });
    }
    if (error) {
        return _jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50", children: _jsxs("div", { className: "bg-card text-destructive p-8 rounded-lg", children: [_jsx(ExclamationTriangleIcon, { className: "w-12 h-12" }), _jsx("p", { className: "mt-4 text-xl", children: error.message }), _jsx("button", { onClick: onClose, className: "mt-4 btn", children: "\uB2EB\uAE30" })] }) });
    }
    if (!note) {
        return _jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50", children: _jsxs("div", { className: "bg-card text-destructive p-8 rounded-lg", children: [_jsx(ExclamationTriangleIcon, { className: "w-12 h-12" }), _jsx("p", { className: "mt-4 text-xl", children: "\uB178\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }), _jsx("button", { onClick: onClose, className: "mt-4 btn", children: "\uB2EB\uAE30" })] }) });
    }
    const getPublicUrl = (path) => supabase.storage.from('notes-attachments').getPublicUrl(path).data.publicUrl;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4", onClick: onClose, children: _jsx(motion.div, { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 }, transition: { duration: 0.2 }, className: "bg-card border border-border rounded-lg shadow-lg max-h-[90vh] overflow-y-auto w-[95%] max-w-5xl", onClick: (e) => e.stopPropagation(), children: _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("main", { className: "lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-lg", children: [_jsxs("div", { className: "flex items-center mb-6 pb-4 border-b border-border", children: [_jsx("button", { onClick: onClose, className: "p-2 rounded-full hover:bg-secondary transition-colors", "aria-label": "\uB2EB\uAE30", children: _jsx(XMarkIcon, { className: "w-6 h-6 text-muted-foreground" }) }), isEditing ? (_jsx("input", { type: "text", value: editTitle, onChange: e => setEditTitle(e.target.value), className: "flex-grow bg-transparent text-3xl font-bold text-gray-200 focus:outline-none focus:ring-0 border-b-2 border-transparent focus:border-accent transition-colors mx-4", placeholder: "\uC81C\uBAA9 (\uC120\uD0DD \uC0AC\uD56D)" })) : (_jsx("h1", { className: "text-3xl font-bold text-gray-200 flex-grow mx-4", children: note.title || '제목 없는 노트' })), _jsx("div", { className: "flex items-center gap-2 ml-auto", children: isEditing ? (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => updateNoteMutation.mutate(), className: "flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors", disabled: updateNoteMutation.isPending, children: [_jsx(CheckIcon, { className: "w-5 h-5" }), _jsx("span", { children: "\uC800\uC7A5" })] }), _jsxs("button", { onClick: () => setIsEditing(false), className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors", children: [_jsx(XMarkIcon, { className: "w-5 h-5" }), _jsx("span", { children: "\uCDE8\uC18C" })] })] })) : (_jsxs("button", { onClick: () => setIsEditing(true), className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-accent rounded-lg hover:bg-accent/80 transition-colors", children: [_jsx(PencilIcon, { className: "w-5 h-5" }), _jsx("span", { children: "\uC218\uC815" })] })) })] }), _jsx("div", { className: "prose prose-invert max-w-none prose-lg prose-p:text-muted-foreground prose-headings:text-primary-foreground prose-a:text-accent prose-strong:text-primary-foreground", children: isEditing ? (_jsx("textarea", { value: editBody, onChange: e => setEditBody(e.target.value), className: "w-full h-96 bg-background border border-border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-accent transition-colors", placeholder: "\uB178\uD2B8 \uB0B4\uC6A9 (\uB9C8\uD06C\uB2E4\uC6B4 \uC9C0\uC6D0)" })) : (_jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: note.body || '' })) })] }), _jsxs("aside", { className: "lg:col-span-1 space-y-6", children: [_jsxs("div", { className: "bg-card border border-border rounded-lg p-4 shadow-lg", children: [_jsx("h3", { className: "text-xl font-semibold mb-4 border-b border-border pb-2", children: "\uC0C1\uC138 \uC815\uBCF4" }), _jsxs("ul", { className: "space-y-2 text-sm text-muted-foreground", children: [_jsxs("li", { className: "flex justify-between", children: [_jsx("strong", { children: "\uC0DD\uC131\uC77C" }), _jsx("span", { children: new Date(note.createdAt).toLocaleString('ko-KR') })] }), _jsxs("li", { className: "flex justify-between", children: [_jsx("strong", { children: "\uC218\uC815\uC77C" }), _jsx("span", { children: new Date(note.updatedAt).toLocaleString('ko-KR') })] })] })] }), _jsxs("div", { className: "bg-card border border-border rounded-lg p-4 shadow-lg", children: [_jsx("h3", { className: "text-xl font-semibold mb-4 border-b border-border pb-2", children: "\uD0DC\uADF8" }), note.tags && note.tags.length > 0 ? (_jsx("div", { className: "flex flex-wrap gap-2", children: note.tags.map(tag => _jsxs("span", { className: "flex items-center gap-1 bg-secondary text-secondary-foreground text-xs font-medium px-3 py-1 rounded-full", children: [_jsx(TagIcon, { className: "w-4 h-4" }), " ", tag] }, tag)) })) : (_jsx("p", { className: "text-sm text-muted-foreground", children: "\uD0DC\uADF8 \uC5C6\uC74C." }))] }), attachments && attachments.length > 0 && (_jsxs("div", { className: "bg-card border border-border rounded-lg p-4 shadow-lg", children: [_jsx("h3", { className: "text-xl font-semibold mb-4 border-b border-border pb-2", children: "\uCCA8\uBD80\uD30C\uC77C" }), _jsx("ul", { className: "space-y-2", children: attachments.map(att => (_jsxs("li", { className: "flex items-center justify-between bg-secondary p-2 rounded-lg", children: [_jsxs("a", { href: getPublicUrl(att.storage_path), target: "_blank", rel: "noopener noreferrer", className: "flex items-center gap-2 text-sm text-primary-foreground hover:underline", children: [_jsx(PaperClipIcon, { className: "w-5 h-5" }), _jsx("span", { children: att.file_name })] }), isEditing && (_jsx("button", { onClick: () => deleteAttachmentMutation.mutate(att), className: "p-1 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 transition-colors", "aria-label": "\uCCA8\uBD80\uD30C\uC77C \uC0AD\uC81C", children: _jsx(TrashIcon, { className: "w-4 h-4" }) }))] }, att.id))) })] })), !isEditing && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "bg-card border border-border rounded-lg p-4 shadow-lg", children: [_jsx("h3", { className: "text-xl font-semibold mb-4 border-b border-border pb-2", children: "\uC5F0\uACB0\uB41C \uB178\uD2B8" }), connections && connections.length > 0 ? (_jsx("ul", { className: "space-y-2", children: connections.map(conn => _jsx("li", { children: _jsxs(Link, { to: `/notes/${conn.note_id}`, className: "flex items-center gap-2 text-sm text-primary-foreground hover:underline", children: [_jsx(LinkIcon, { className: "w-5 h-5" }), _jsx("span", { children: conn.title || '제목 없는 노트' })] }) }, conn.note_id)) })) : (_jsx("p", { className: "text-sm text-muted-foreground", children: "\uC5F0\uACB0\uB41C \uB178\uD2B8 \uC5C6\uC74C." }))] }), _jsxs("div", { className: "bg-card border border-border rounded-lg p-4 shadow-lg", children: [_jsx("h3", { className: "text-xl font-semibold mb-4 border-b border-border pb-2", children: "\uC5ED\uB9C1\uD06C" }), backlinks && backlinks.length > 0 ? (_jsx("ul", { className: "space-y-2", children: backlinks.map(link => _jsx("li", { children: _jsxs(Link, { to: `/notes/${link.from_note_id}`, className: "flex items-center gap-2 text-sm text-primary-foreground hover:underline", children: [_jsx(LinkIcon, { className: "w-5 h-5" }), _jsx("span", { children: link.title || '제목 없는 노트' })] }) }, link.from_note_id)) })) : (_jsx("p", { className: "text-sm text-muted-foreground", children: "\uC5ED\uB9C1\uD06C \uC5C6\uC74C." }))] }), _jsx("div", { className: "bg-card border border-border rounded-lg p-4 shadow-lg mt-6", children: _jsxs("button", { onClick: () => { if (window.confirm('정말로 이 노트를 삭제하시겠습니까?'))
                                                deleteNoteMutation.mutate(); }, className: "w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-destructive-foreground bg-destructive rounded-lg hover:bg-destructive/80 disabled:opacity-50 transition-colors", disabled: deleteNoteMutation.isPending, children: [_jsx(TrashIcon, { className: "w-5 h-5" }), _jsx("span", { children: "\uB178\uD2B8 \uC0AD\uC81C" })] }) })] })), isEditing && (_jsxs("div", { className: "bg-card border border-border rounded-lg p-4 shadow-lg", children: [_jsx("h3", { className: "text-xl font-semibold mb-4 border-b border-border pb-2", children: "\uB9C1\uD06C \uAD00\uB9AC" }), _jsxs("button", { onClick: () => setIsLinkEditorOpen(true), className: "w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors", children: [_jsx(LinkIcon, { className: "w-5 h-5" }), _jsx("span", { children: "\uB9C1\uD06C \uC218\uC815" })] })] }))] })] }) }) }));
};
