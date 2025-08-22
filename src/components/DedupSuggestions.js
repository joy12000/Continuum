import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { toast } from "../lib/toast";
class RAGClient {
    w;
    p = new Map();
    constructor() { this.w = new Worker(new URL("../workers/ragWorker.ts", import.meta.url), { type: "module" }); this.w.onmessage = (e) => { const { id, ok, result, error } = e.data || {}; const h = this.p.get(id); if (!h)
        return; this.p.delete(id); ok ? h.resolve(result) : h.reject(new Error(error || "RAG worker error")); }; }
    call(type, payload) { const id = crypto.randomUUID(); return new Promise((resolve, reject) => { this.p.set(id, { resolve, reject }); this.w.postMessage({ id, type, payload }); }); }
    dedup(payload) { return this.call("dedup", payload); }
}
export function DedupSuggestions({ notes, engine, onMerge }) {
    const [busy, setBusy] = useState(false);
    const [groups, setGroups] = useState([]);
    const client = useMemo(() => new RAGClient(), []);
    async function scan() {
        setBusy(true);
        try {
            const res = await client.dedup({ notes, engine, threshold: 0.92, max: 500 });
            setGroups(res);
        }
        catch (e) {
            console.error(e);
            toast.error("중복 스캔 실패");
        }
        setBusy(false);
    }
    async function merge(g) {
        const [keep, ...remove] = g.ids;
        await onMerge(keep, remove);
        toast.success(`병합 완료: ${remove.length}개 → ${keep}`);
        setGroups(prev => prev.filter(x => x !== g));
    }
    return (_jsxs("div", { className: "card", children: [_jsx("div", { className: "small", children: "\uC911\uBCF5 \uBCD1\uD569 \uC81C\uC548(\uCF54\uC0AC\uC778\u22650.92, \uC0C1\uC704 500\uAC1C \uC2A4\uCE94)" }), _jsx("div", { className: "row", children: _jsx("button", { className: "btn", onClick: scan, disabled: busy, children: busy ? "스캔 중…" : "스캔 실행" }) }), groups.length > 0 && (_jsxs("div", { className: "small", style: { marginTop: 8 }, children: [groups.length, "\uAC1C \uADF8\uB8F9 \uBC1C\uACAC"] })), _jsx("ul", { className: "list-disc pl-5", children: groups.map((g, i) => (_jsxs("li", { children: [g.ids.slice(0, 3).join(", "), g.ids.length > 3 ? " 외" : "", _jsx("button", { className: "btn", style: { marginLeft: 8 }, onClick: () => merge(g), children: "\uCCAB \uBC88\uC9F8\uB85C \uBCD1\uD569" })] }, i))) })] }));
}
