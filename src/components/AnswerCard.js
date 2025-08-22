import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
export function AnswerCard({ kp, cites, onJump }) {
    const grouped = useMemo(() => {
        const m = new Map();
        for (const c of cites) {
            const g = m.get(c.noteId) || { noteId: c.noteId, snippets: [], tags: c.tags, createdAt: c.createdAt };
            g.snippets.push(c.text);
            m.set(c.noteId, g);
        }
        return Array.from(m.values());
    }, [cites]);
    return (_jsxs("div", { className: "card", children: [_jsx("div", { className: "small", children: "\uCD94\uCD9C\uD615 \uB2F5 \u00B7 \uCD9C\uCC98 \uD3EC\uD568" }), _jsx("ul", { className: "list-disc pl-5", children: kp.map((s, i) => _jsx("li", { children: s }, i)) }), _jsx("div", { className: "small", style: { marginTop: 8 }, children: "\uC778\uC6A9/\uCD9C\uCC98" }), _jsx("div", { className: "grid", children: grouped.map(g => (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "small", children: ["\uB178\uD2B8 ", g.noteId.slice(0, 8), " \u00B7 ", new Date(g.createdAt || 0).toLocaleDateString()] }), _jsx("ul", { className: "list-disc pl-5", children: g.snippets.slice(0, 3).map((s, i) => _jsx("li", { children: s }, i)) }), onJump && _jsx("button", { className: "btn", onClick: () => onJump(g.noteId), style: { marginTop: 6 }, children: "\uB178\uD2B8 \uC5F4\uAE30" })] }, g.noteId))) }), grouped.length === 0 && _jsx("div", { className: "small", children: "\uBA85\uD655\uD55C \uADFC\uAC70 \uC5C6\uC74C \u2014 \uC720\uC0AC \uD56D\uBAA9\uB9CC." })] }));
}
