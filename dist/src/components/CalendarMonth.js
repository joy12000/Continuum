import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
function ymd(d) { const y = d.getFullYear(); const m = (d.getMonth() + 1).toString().padStart(2, "0"); const dd = d.getDate().toString().padStart(2, "0"); return `${y}-${m}-${dd}`; }
const CalendarMonth = ({ year, month, weekLabels, notesByDate, selectedDate, onSelectDate }) => {
    const cells = useMemo(() => {
        const first = new Date(year, month, 1);
        const startWeekday = first.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevDays = startWeekday;
        const total = Math.ceil((prevDays + daysInMonth) / 7) * 7;
        const arr = [];
        const startDate = new Date(year, month, 1 - prevDays);
        for (let i = 0; i < total; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            arr.push({ key: ymd(d), inMonth: d.getMonth() === month, date: d.getDate() });
        }
        return arr;
    }, [year, month]);
    const todayKey = ymd(new Date());
    return (_jsxs("div", { className: "cal-grid", children: [_jsx("div", { className: "cal-weekhead", children: weekLabels.map((w, i) => (_jsx("div", { className: `wcell ${i === 0 ? "sun" : ""} ${i === 6 ? "sat" : ""}`, children: w }, i))) }), _jsx("div", { className: "cal-cells", children: cells.map((c) => {
                    const list = notesByDate[c.key] || [];
                    const active = c.key === selectedDate;
                    const today = c.key === todayKey;
                    return (_jsxs("button", { className: `ccell ${active ? "active" : ""} ${today ? "today" : ""} ${c.inMonth ? "" : "dim"}`, onClick: () => onSelectDate(c.key), "aria-current": active ? "date" : undefined, "aria-label": `${year}년 ${month + 1}월 ${c.date}일, 노트 ${list.length}개`, children: [_jsx("span", { className: "date", children: c.date }), _jsxs("span", { className: "dots", "aria-hidden": "true", children: [list.slice(0, 3).map((_, i) => _jsx("i", { className: "dot" }, i)), list.length > 3 && _jsxs("i", { className: "more", children: ["+", list.length - 3] })] })] }, c.key));
                }) })] }));
};
export default CalendarMonth;
