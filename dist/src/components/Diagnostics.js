import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/Diagnostics.tsx
import { useState } from 'react';
const BENCHMARK_QUERIES = [
    "AI", "PWA", "React", "IndexedDB", "Web Worker",
    "semantic search", "RAG", "offline first", "Gemini API", "performance"
];
const RAG_TEST_CASES = [
    {
        id: 1,
        question: "What is the primary data storage method?",
        context: [
            { id: 'rag-test-1', content: 'Momentum uses IndexedDB via Dexie.js for local storage.' },
            { id: 'rag-test-2', content: 'The UI is built with React and Vite.' }
        ],
        expectedSourceId: 'rag-test-1',
        expectedAnswerSubstring: 'IndexedDB'
    },
    {
        id: 2,
        question: "What is the UI framework?",
        context: [
            { id: 'rag-test-3', content: 'The backend uses Netlify functions.' },
            { id: 'rag-test-4', content: 'The UI is built with React and Vite.' }
        ],
        expectedSourceId: 'rag-test-4',
        expectedAnswerSubstring: 'React'
    },
    {
        id: 3,
        question: "Does the app work offline?",
        context: [
            { id: 'rag-test-5', content: 'It is a PWA with offline-first design using service workers.' },
        ],
        expectedSourceId: 'rag-test-5',
        expectedAnswerSubstring: 'offline'
    }
];
async function postJSON(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const t = await r.text();
    try {
        return { ok: r.ok, status: r.status, data: JSON.parse(t) };
    }
    catch {
        return { ok: r.ok, status: r.status, data: t };
    }
}
export default function Diagnostics({ onBack }) {
    const [bench, setBench] = useState(null);
    const [rag, setRag] = useState(null);
    const [log, setLog] = useState('');
    const append = (m) => setLog(prev => (prev ? prev + '\n' : '') + m);
    async function runBenchmark() {
        setBench(null);
        setLog('');
        append('Starting remote embedding benchmark (calls /api/embed)...');
        const results = [];
        for (const q of BENCHMARK_QUERIES) {
            const N = 5;
            const times = [];
            for (let i = 0; i < N; i++) {
                const t0 = performance.now();
                const res = await postJSON('/api/embed', { texts: [q] });
                const t1 = performance.now();
                times.push(t1 - t0);
                if (!res.ok)
                    append(`  ${q} -> HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 140)}`);
            }
            const avg = Math.round(times.reduce((a, b) => a + b, 0) / N);
            results.push({ query: q, avgMs: avg });
        }
        setBench(results);
        append('Benchmark done.');
    }
    async function runRagTests() {
        setRag(null);
        setLog('');
        append('Starting RAG tests (calls /api/remote/generate)...');
        const rows = [];
        for (const tc of RAG_TEST_CASES) {
            const res = await postJSON('/api/v1?action=generate', { type: 'rag', input: { query: tc.question }, context: tc.context });
            let answerPass = false, sourcePass = false;
            let detail = '';
            if (res.ok && res.data) {
                const answer = res.data.answer ?? '';
                answerPass = typeof answer === 'string' && answer.toLowerCase().includes(tc.expectedAnswerSubstring.toLowerCase());
                const sentences = Array.isArray(res.data.sentences) ? res.data.sentences : [];
                sourcePass = sentences.some(s => s?.sourceNoteId === tc.expectedSourceId);
                detail = `ans:${answerPass ? '✓' : '✗'} src:${sourcePass ? '✓' : '✗'}`;
            }
            else {
                detail = `HTTP ${res.status}`;
            }
            rows.push({
                id: tc.id,
                question: tc.question,
                answerPass: answerPass ? 'Pass' : 'Fail',
                sourcePass: sourcePass ? 'Pass' : 'Fail',
                final: (answerPass && sourcePass) ? 'Pass' : 'Fail',
                detail
            });
        }
        setRag(rows);
        append('RAG tests done.');
    }
    return (_jsxs("div", { className: "p-4 max-w-5xl mx-auto", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h1", { className: "text-2xl font-bold", children: "Diagnostics" }), onBack && (_jsx("button", { onClick: onBack, className: "px-3 py-1 rounded-lg border", children: "\u2190 \uB4A4\uB85C" }))] }), _jsxs("section", { className: "mb-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-2", children: "\uAC80\uC0C9 \uC18D\uB3C4 \uBCA4\uCE58\uB9C8\uD06C" }), _jsx("p", { className: "text-sm text-gray-600 mb-2", children: "/api/embed \uC5D4\uB4DC\uD3EC\uC778\uD2B8\uB97C 10\uAC1C \uCFFC\uB9AC\u00D75\uD68C \uD638\uCD9C\uD558\uC5EC \uD3C9\uADE0 \uC2DC\uAC04\uC744 \uCE21\uC815\uD569\uB2C8\uB2E4." }), _jsx("button", { className: "px-3 py-1 rounded-lg bg-black text-white", onClick: runBenchmark, children: "\uBCA4\uCE58\uB9C8\uD06C \uC2DC\uC791" }), bench && (_jsxs("table", { className: "mt-3 w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "text-left p-1 border-b", children: "\uAC80\uC0C9\uC5B4" }), _jsx("th", { className: "text-right p-1 border-b", children: "\uD3C9\uADE0 \uC751\uB2F5 \uC2DC\uAC04 (ms)" })] }) }), _jsx("tbody", { children: bench.map(r => (_jsxs("tr", { children: [_jsx("td", { className: "p-1 border-b", children: r.query }), _jsx("td", { className: "p-1 border-b text-right", children: r.avgMs })] }, r.query))) })] }))] }), _jsxs("section", { className: "mb-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-2", children: "RAG \uD488\uC9C8 \uD14C\uC2A4\uD2B8" }), _jsx("p", { className: "text-sm text-gray-600 mb-2", children: "\uAC01 \uD14C\uC2A4\uD2B8 \uCF00\uC774\uC2A4\uC5D0 \uB300\uD574 /api/remote/generate\uB97C \uD638\uCD9C\uD558\uACE0, \uB2F5\uBCC0/\uCD9C\uCC98 \uC815\uD655\uB3C4\uB97C \uAC80\uC99D\uD569\uB2C8\uB2E4." }), _jsx("button", { className: "px-3 py-1 rounded-lg bg-black text-white", onClick: runRagTests, children: "RAG \uD14C\uC2A4\uD2B8 \uC2DC\uC791" }), rag && (_jsxs("table", { className: "mt-3 w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "text-left p-1 border-b", children: "ID" }), _jsx("th", { className: "text-left p-1 border-b", children: "\uC9C8\uBB38" }), _jsx("th", { className: "text-center p-1 border-b", children: "\uB2F5\uBCC0 \uC815\uD655\uB3C4" }), _jsx("th", { className: "text-center p-1 border-b", children: "\uCD9C\uCC98 \uC815\uD655\uB3C4" }), _jsx("th", { className: "text-center p-1 border-b", children: "\uCD5C\uC885" }), _jsx("th", { className: "text-left p-1 border-b", children: "\uBE44\uACE0" })] }) }), _jsx("tbody", { children: rag.map((r) => (_jsxs("tr", { children: [_jsx("td", { className: "p-1 border-b", children: r.id }), _jsx("td", { className: "p-1 border-b", children: r.question }), _jsx("td", { className: "p-1 border-b text-center", children: r.answerPass }), _jsx("td", { className: "p-1 border-b text-center", children: r.sourcePass }), _jsx("td", { className: "p-1 border-b text-center font-semibold", children: r.final }), _jsx("td", { className: "p-1 border-b", children: r.detail })] }, r.id))) })] }))] }), _jsxs("section", { className: "mb-6", children: [_jsx("h2", { className: "text-lg font-semibold mb-2", children: "API \uB514\uBC84\uADF8" }), _jsxs("p", { className: "text-sm text-gray-600 mb-2", children: [_jsx("a", { className: "underline", href: "/debug/api2.html", children: "/debug/api2.html" }), "\uC5D0\uC11C ping/embed/generate\uB97C \uC218\uB3D9\uC73C\uB85C \uD638\uCD9C\uD574 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."] })] }), _jsx("pre", { className: "bg-gray-900 text-gray-100 p-3 rounded-xl whitespace-pre-wrap text-xs", children: log })] }));
}
