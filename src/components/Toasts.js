import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { subscribe } from "../lib/toast";
export function Toasts() {
    const [items, setItems] = useState([]);
    useEffect(() => subscribe(setItems), []);
    return (_jsx("div", { style: { position: "fixed", right: 12, bottom: 12, display: "grid", gap: 8, zIndex: 50 }, children: items.map(t => (_jsx("div", { className: "card", style: { background: "#111827cc", borderColor: "#374151" }, children: t.text }, t.id))) }));
}
