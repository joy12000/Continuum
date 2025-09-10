import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { db } from "../lib/db";
export function AttachmentGallery({ noteId }) {
    const [items, setItems] = useState([]);
    useEffect(() => {
        if (!noteId) {
            setItems([]);
            return;
        }
        let alive = true;
        (async () => {
            const arr = await db.attachments.where("noteId").equals(noteId).toArray();
            if (alive)
                setItems(arr);
        })();
        return () => { alive = false; };
    }, [noteId]);
    if (items.length === 0)
        return null;
    return (_jsx("div", { className: "mt-3 grid grid-cols-3 gap-2", children: items.filter(a => a.blob).map(a => {
            const url = URL.createObjectURL(a.blob);
            const isImage = a.type.startsWith("image/");
            return (_jsx("a", { href: url, target: "_blank", rel: "noreferrer", className: "block", children: isImage ? (_jsx("img", { src: url, alt: a.name, className: "rounded-xl w-full h-24 object-cover" })) : (_jsx("div", { className: "rounded-xl border border-slate-600 p-3 text-xs break-all", children: a.name })) }, a.id));
        }) }));
}
