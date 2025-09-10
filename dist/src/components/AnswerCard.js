import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { memo, useMemo } from "react";
function renderAnchoredSentences(answerObj, onClickRef) {
    const sentences = answerObj?.sentences;
    if (!Array.isArray(sentences) || sentences.length === 0)
        return null;
    const elems = [];
    let idx = 1;
    for (const s of sentences) {
        const t = (s?.text ?? "").trim();
        const sid = s?.sourceNoteId;
        if (!t)
            continue;
        elems.push(_jsxs("span", { className: "leading-relaxed", children: [t, " ", sid ? _jsxs("a", { href: `#source-${sid}`, onClick: (e) => { e.preventDefault(); onClickRef(sid); }, className: "text-blue-600 hover:underline align-super text-xs", children: ["[", idx, "]"] }) : null, " "] }, `s-${idx}`));
        idx++;
    }
    return _jsx("p", { className: "whitespace-pre-wrap", children: elems });
}
const AnswerCardMemo = memo(function AnswerCard({ kp, cites, onJump }) {
    const grouped = useMemo(() => {
        const m = new Map();
        for (const c of cites) {
            const g = m.get(c.noteId) || { noteId: c.noteId, snippets: [], tags: c.tags, createdAt: c.createdAt };
            g.snippets.push(c.text);
            m.set(c.noteId, g);
        }
        return Array.from(m.values());
    }, [cites]);
    return (_jsxs("div", { className: "bg-slate-900/95 border border-slate-700/50 rounded-lg p-4 mt-4", children: [_jsx("div", { className: "text-sm text-sky-300 mb-2", children: "\uCD94\uCD9C\uD615 \uB2F5 \u00B7 \uCD9C\uCC98 \uD3EC\uD568" }), _jsx("ul", { className: "space-y-2", children: kp.map((s, i) => _jsxs("li", { className: "flex items-start", children: [_jsx("span", { className: "text-sky-400 mr-2", children: "\u2726" }), _jsx("span", { className: "text-slate-200", children: s })] }, i)) }), _jsx("div", { className: "text-sm text-sky-300 mt-4 mb-2", children: "\uC778\uC6A9/\uCD9C\uCC98" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-2", children: grouped.map(g => (_jsxs("div", { className: "bg-slate-800/90 border border-slate-700/50 rounded-lg p-3", children: [_jsxs("div", { className: "text-xs text-slate-400 mb-2", children: ["\uB178\uD2B8 ", g.noteId.slice(0, 8), " \u00B7 ", new Date(g.createdAt || 0).toLocaleDateString()] }), _jsx("ul", { className: "space-y-1", children: g.snippets.slice(0, 3).map((s, i) => _jsxs("li", { className: "text-sm text-slate-300 truncate", children: ["- ", s] }, i)) }), onJump && _jsx("button", { className: "text-xs text-sky-400 hover:text-sky-200 transition-colors mt-2", onClick: () => onJump(g.noteId), children: "\uB178\uD2B8 \uC5F4\uAE30" })] }, g.noteId))) }), grouped.length === 0 && _jsx("div", { className: "text-sm text-slate-400 mt-2", children: "\uBA85\uD655\uD55C \uADFC\uAC70 \uC5C6\uC74C \u2014 \uC720\uC0AC \uD56D\uBAA9\uB9CC." })] }));
});
export { AnswerCardMemo as AnswerCard };
