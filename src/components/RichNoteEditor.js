import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useMemo, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { db } from "../lib/db";
function Toolbar({ editor }) {
    if (!editor)
        return null;
    const btn = (active) => active ? "bg-indigo-600" : "bg-slate-700";
    return (_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { className: `px-3 py-1 rounded-lg ${btn(editor.isActive('bold'))}`, onClick: () => editor.chain().focus().toggleBold().run(), children: _jsx("b", { children: "B" }) }), _jsx("button", { className: `px-3 py-1 rounded-lg ${btn(editor.isActive('italic'))}`, onClick: () => editor.chain().focus().toggleItalic().run(), children: _jsx("i", { children: "I" }) }), _jsx("button", { className: `px-3 py-1 rounded-lg ${btn(editor.isActive('bulletList'))}`, onClick: () => editor.chain().focus().toggleBulletList().run(), children: "\u2022 List" }), _jsx("button", { className: `px-3 py-1 rounded-lg ${btn(editor.isActive('orderedList'))}`, onClick: () => editor.chain().focus().toggleOrderedList().run(), children: "1. List" })] }));
}
/**
 * A rich text editor component for creating and editing notes.
 * It can suggest related notes in real-time based on the content being typed.
 * @param {object} props - The component props.
 * @param {Note} [props.note] - The note to be edited. If not provided, a new note will be created.
 * @param {(noteId: string) => void} [props.onNoteLinkClick] - Callback for when a suggested note is clicked.
 * @param {() => void} [props.onSaved] - Callback function to be executed after a note is saved.
 * @param {(content: string) => void} [props.onSave] - Callback for autosaving.
 * @param {boolean} [props.autoFocus] - Whether to autofocus the editor.
 */
export function RichNoteEditor({ note: initialNote, onNoteLinkClick, onSaved, onSave, autoFocus, hideSaveButton }) {
    const [tags, setTags] = useState(initialNote?.tags?.join(", ") || "");
    const [suggestedNotes, setSuggestedNotes] = useState(null);
    const debounceTimeout = useRef(null);
    const searchWorker = useMemo(() => new Worker(new URL('../workers/searchWorker.ts', import.meta.url), { type: 'module' }), []);
    useEffect(() => {
        const handleWorkerMessage = (e) => {
            if (e.data.type === 'SIMILAR_FOUND') {
                setSuggestedNotes(e.data.payload.notes);
            }
        };
        searchWorker.addEventListener('message', handleWorkerMessage);
        return () => {
            searchWorker.removeEventListener('message', handleWorkerMessage);
        };
    }, [searchWorker]);
    const editor = useEditor({
        extensions: [StarterKit],
        content: initialNote?.content || "",
        autofocus: autoFocus,
        editorProps: { attributes: { class: "prose prose-invert max-w-none min-h-[96px] focus:outline-none" } },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onSave?.(html);
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
            debounceTimeout.current = window.setTimeout(() => {
                const editorContent = editor.getText();
                if (editorContent.length > 20 && initialNote?.id) {
                    searchWorker.postMessage({
                        type: 'FIND_SIMILAR',
                        payload: { text: editorContent, currentNoteId: initialNote.id, engine: 'auto' }
                    });
                }
                else {
                    setSuggestedNotes(null);
                }
            }, 500);
        }
    });
    useEffect(() => {
        editor?.commands.setContent(initialNote?.content || "");
        setTags(initialNote?.tags?.join(", ") || "");
        editor?.commands.focus("end");
    }, [initialNote, editor]);
    async function save() {
        if (!editor)
            return;
        const html = editor.getHTML().trim();
        const text = editor.getText().trim();
        if (!text)
            return;
        const now = Date.now();
        const noteToSave = {
            id: initialNote?.id || crypto.randomUUID(),
            content: html,
            tags: tags.split(",").map(t => t.trim()).filter(Boolean),
            createdAt: initialNote?.createdAt || now,
            updatedAt: now
        };
        await db.notes.put(noteToSave);
        if (!initialNote) {
            editor.commands.clearContent();
            setTags("");
        }
        onSaved?.();
    }
    return (_jsxs("div", { className: "card space-y-3 h-full flex flex-col", children: [_jsx("div", { className: "text-sm opacity-80", children: initialNote ? "노트 편집" : "리치 텍스트 입력" }), _jsx(Toolbar, { editor: editor }), _jsx("div", { className: "rounded-xl bg-slate-800/50 border border-slate-700 p-3 flex-grow overflow-y-auto", children: _jsx(EditorContent, { editor: editor }) }), suggestedNotes && suggestedNotes.length > 0 && (_jsxs("div", { className: "space-y-2 pt-2", children: [_jsx("h3", { className: "text-sm font-semibold text-slate-400", children: "\uAD00\uB828 \uC0DD\uAC01:" }), _jsx("ul", { className: "list-disc list-inside space-y-1", children: suggestedNotes.map(note => (_jsxs("li", { className: "text-sm text-indigo-400 hover:underline cursor-pointer", onClick: () => onNoteLinkClick?.(note.id), children: [note.content.replace(/<[^>]+>/g, '').substring(0, 40), "..."] }, note.id))) })] })), !hideSaveButton && (_jsxs(_Fragment, { children: [_jsx("input", { className: "input", placeholder: "\uD0DC\uADF8: \uC27C\uD45C\uB85C \uAD6C\uBD84", value: tags, onChange: e => setTags(e.target.value) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "btn", onClick: save, children: "\uC800\uC7A5" }), _jsx("span", { className: "text-sm text-slate-400 self-center", children: "Tip: \uBCFC\uB4DC, \uB9AC\uC2A4\uD2B8 \uB4F1 \uC11C\uC2DD \uC0AC\uC6A9 \uAC00\uB2A5" })] })] }))] }));
}
