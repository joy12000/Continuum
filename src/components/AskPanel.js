import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from "react";
import { AnswerCard } from "./AnswerCard";
import { GeneratedAnswer } from "./GeneratedAnswer";
import { getConfig } from "../lib/config";
import { generateWithFallback } from "../lib/gen/generate";
class RAGClient {
    w;
    p = new Map();
    constructor() {
        this.w = new Worker(new URL("../workers/ragWorker.ts", import.meta.url), { type: "module" });
        this.w.onmessage = (e) => {
            const { id, ok, result, error } = e.data || {};
            const h = this.p.get(id);
            if (!h)
                return;
            this.p.delete(id);
            ok ? h.resolve(result) : h.reject(new Error(error || "RAG worker error"));
        };
    }
    call(type, payload) {
        const id = crypto.randomUUID();
        return new Promise((resolve, reject) => {
            this.p.set(id, { resolve, reject });
            this.w.postMessage({ id, type, payload });
        });
    }
    ask(payload) {
        return this.call("ask", payload);
    }
    reset() {
        return this.call("resetIndex", {});
    }
}
export function AskPanel({ engine, setQuery, notes }) {
    const rag = useMemo(() => new RAGClient(), []);
    const qRef = useRef(null);
    const [alpha, setAlpha] = useState(0.6);
    const [lambda, setLambda] = useState(0.4);
    // State for extractive RAG results
    const [res, setRes] = useState(null);
    // State for generative results
    const [isGenerating, setIsGenerating] = useState(false);
    const [genError, setGenError] = useState(null);
    const [resGen, setResGen] = useState(null);
    const settings = getConfig();
    async function onAsk() {
        const q = qRef.current?.value?.trim();
        if (!q)
            return;
        setIsGenerating(true);
        setGenError(null);
        setResGen(null);
        setRes(null);
        try {
            const out = await rag.ask({
                q,
                engine,
                lambdaMMR: lambda,
                alphaSem: alpha,
                topK: 8,
                topN: 50,
                notes: Array.isArray(notes) ? notes : undefined,
            });
            setRes({ kp: out.keypoints, cites: out.citations });
            if (settings.genEnabled) {
                const genResult = await generateWithFallback(q, settings.genEndpoint || "/api");
                setResGen(genResult);
            }
        }
        catch (e) {
            console.error(e);
            setGenError(e);
            setRes({ kp: [], cites: [] }); // Also clear extractive results on error
        }
        finally {
            setIsGenerating(false);
        }
    }
    const showGenAnswer = settings.genEnabled;
    return (_jsx("div", { className: "card bg-base-100 shadow-xl mt-4", children: _jsxs("div", { className: "card-body", children: [_jsxs("div", { className: "flex space-x-2", children: [_jsx("input", { ref: qRef, className: "input input-bordered w-full", placeholder: "Ask a question...", onKeyDown: (e) => {
                                if (e.key === "Enter")
                                    onAsk();
                            } }), _jsx("button", { className: "btn btn-primary", onClick: onAsk, disabled: isGenerating, children: isGenerating ? _jsx("span", { className: "loading loading-spinner" }) : "Ask" })] }), _jsxs("div", { className: "flex items-center space-x-4 text-sm mt-2", children: [_jsxs("label", { className: "label cursor-pointer flex-1", children: [_jsxs("span", { className: "label-text", children: ["Semantic Weight: ", alpha.toFixed(2)] }), _jsx("input", { type: "range", min: 0, max: 1, step: 0.05, value: alpha, onChange: (e) => setAlpha(parseFloat(e.target.value)), className: "range range-xs" })] }), _jsxs("label", { className: "label cursor-pointer flex-1", children: [_jsxs("span", { className: "label-text", children: ["MMR \u03BB: ", lambda.toFixed(2)] }), _jsx("input", { type: "range", min: 0, max: 1, step: 0.05, value: lambda, onChange: (e) => setLambda(parseFloat(e.target.value)), className: "range range-xs" })] })] }), showGenAnswer && resGen ? (_jsx(GeneratedAnswer, { data: resGen })) : showGenAnswer && isGenerating ? (_jsx("div", { className: "text-center text-slate-500 animate-pulse", children: "AI\uAC00 \uB2F5\uBCC0\uC744 \uC0DD\uC131 \uC911\uC785\uB2C8\uB2E4..." })) : showGenAnswer && genError ? (_jsx("div", { className: "text-center text-red-500", children: genError.message })) : (res && _jsx(AnswerCard, { kp: res.kp, cites: res.cites, onJump: (id) => setQuery("#" + id) }))] }) }));
}
