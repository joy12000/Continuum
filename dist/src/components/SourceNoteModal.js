import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { XMarkIcon } from '@heroicons/react/24/outline';
export default function SourceNoteModal({ isOpen, title, body, onClose }) {
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4", onClick: onClose, children: _jsxs("div", { className: "bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl p-6 animate-zoomIn", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between mb-4 pb-4 border-b border-border", children: [_jsx("h2", { className: "text-xl font-semibold text-primary", children: title || "Source Note" }), _jsx("button", { onClick: onClose, className: "p-2 rounded-full hover:bg-secondary transition-colors", children: _jsx(XMarkIcon, { className: "w-6 h-6 text-muted-foreground" }) })] }), _jsx("div", { className: "prose prose-invert max-h-[70vh] overflow-auto whitespace-pre-wrap pr-4", children: body })] }) }));
}
