import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
function safeDate(v) {
    const n = typeof v === "number" ? v : Date.parse(String(v || 0));
    const d = new Date(isNaN(n) ? 0 : n);
    return d;
}
function sameMonthDay(a, b) {
    return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
export function RecallCards({ notes = [], onClickTag, setQuery }) {
    const today = new Date();
    const todayNotes = useMemo(() => (Array.isArray(notes) ? notes : []).filter(n => safeDate(n?.createdAt).toDateString() === today.toDateString()), [notes]);
    const lastYearToday = useMemo(() => {
        const ly = new Date(today);
        ly.setFullYear(today.getFullYear() - 1);
        return (Array.isArray(notes) ? notes : []).filter(n => sameMonthDay(safeDate(n?.createdAt), ly));
    }, [notes]);
    const threads = useMemo(() => {
        const map = new Map();
        for (const n of notes) {
            const t = n.tags[0];
            if (!t)
                continue;
            map.set(t, (map.get(t) || 0) + 1);
        }
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    }, [notes]);
    return (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [_jsxs("div", { className: "card", children: [_jsx("div", { className: "text-sm opacity-80 mb-1", children: "\uC624\uB298" }), _jsx("div", { className: "text-2xl font-bold", children: todayNotes.length }), _jsx("div", { className: "text-sm text-slate-400", children: "\uC624\uB298 \uC791\uC131\uD55C \uB178\uD2B8" }), _jsx("button", { className: "btn mt-3", onClick: () => setQuery(``), children: "\uBAA8\uB450 \uBCF4\uAE30" })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "text-sm opacity-80 mb-1", children: "\uC791\uB144 \uC624\uB298" }), _jsx("div", { className: "text-2xl font-bold", children: lastYearToday.length }), _jsx("div", { className: "text-sm text-slate-400", children: "\uC791\uB144 \uAC19\uC740 \uB0A0\uC758 \uAE30\uB85D" }), _jsx("button", { className: "btn mt-3", onClick: () => setQuery(``), children: "\uBAA8\uB450 \uBCF4\uAE30" })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "text-sm opacity-80 mb-2", children: "\uC778\uAE30 \uC2A4\uB808\uB4DC(\uD0DC\uADF8)" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [threads.map(([t, c]) => (_jsxs("button", { className: "px-2 py-1 rounded-lg bg-slate-700 text-xs", onClick: () => onClickTag(t), children: ["#", t, " ", _jsxs("span", { className: "opacity-60", children: ["(", c, ")"] })] }, t))), threads.length === 0 && _jsx("div", { className: "text-slate-400 text-sm", children: "\uD0DC\uADF8\uAC00 \uC544\uC9C1 \uC5C6\uC5B4\uC694" })] })] })] }));
}
