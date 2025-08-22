import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { db } from "../lib/db";
export function NoteEditor({ onSaved }) {
    const [content, setContent] = useState("");
    const [tags, setTags] = useState("");
    const textareaRef = useRef(null);
    useEffect(() => {
        textareaRef.current?.focus();
    }, []);
    async function save() {
        const now = Date.now();
        const note = {
            id: crypto.randomUUID(),
            content: content.trim(),
            tags: tags.split(",").map(t => t.trim()).filter(Boolean),
            createdAt: now,
            updatedAt: now
        };
        if (!note.content)
            return;
        await db.notes.add(note);
        setContent("");
        setTags("");
        onSaved?.();
    }
    return (_jsxs("div", { className: "card space-y-3", children: [_jsx("div", { className: "text-sm opacity-80", children: "\uBE60\uB978 \uC785\uB825" }), _jsx("textarea", { ref: textareaRef, className: "input h-28", placeholder: "\uBB34\uC5C7\uC774\uB4E0 \uC801\uC73C\uC138\uC694\u2026 (Shift+Enter \uC904\uBC14\uAFC8)", value: content, onChange: e => setContent(e.target.value), onKeyDown: (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        save();
                    }
                } }), _jsx("input", { className: "input", placeholder: "\uD0DC\uADF8: \uC608) \uC77C\uAE30, \uD504\uB85C\uC81D\uD2B8 (\uC27C\uD45C\uB85C \uAD6C\uBD84)", value: tags, onChange: e => setTags(e.target.value) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "btn", onClick: save, children: "\uC800\uC7A5 (Enter)" }), _jsxs("span", { className: "text-sm text-slate-400 self-center", children: ["Tip: ", _jsx("span", { className: "kbd", children: "Enter" }), " \uC800\uC7A5, ", _jsx("span", { className: "kbd", children: "Shift" }), "+", _jsx("span", { className: "kbd", children: "Enter" }), " \uC904\uBC14\uAFC8"] })] })] }));
}
