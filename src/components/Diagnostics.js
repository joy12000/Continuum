import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { db } from '../lib/db';
import { toast } from '../lib/toast';
// Note: These imports are placeholders and might need to be adjusted
// to match the actual implementation of search and generation functions.
import { NoopSemantic } from '../lib/search/semantic';
import { generateWithFallback } from '../lib/gen/generate';
// --- Test Data ---
const BENCHMARK_QUERIES = [
    "AI", "PWA", "React", "IndexedDB", "Web Worker",
    "semantic search", "RAG", "offline first", "Gemini API", "performance"
];
const RAG_TEST_CASES = [
    {
        id: 1,
        question: "What is the primary data storage method?",
        context: [
            { id: 'rag-test-1', content: 'Continuum uses IndexedDB via Dexie.js for local storage.', tags: [], createdAt: Date.now(), updatedAt: Date.now() },
            { id: 'rag-test-2', content: 'The UI is built with React and Vite.', tags: [], createdAt: Date.now(), updatedAt: Date.now() }
        ],
        expectedSourceId: 'rag-test-1',
        expectedAnswerSubstring: 'IndexedDB'
    },
    {
        id: 2,
        question: "What is the UI framework?",
        context: [
            { id: 'rag-test-3', content: 'The backend uses Netlify functions.', tags: [], createdAt: Date.now(), updatedAt: Date.now() },
            { id: 'rag-test-4', content: 'The UI is built with React and Vite.', tags: [], createdAt: Date.now(), updatedAt: Date.now() }
        ],
        expectedSourceId: 'rag-test-4',
        expectedAnswerSubstring: 'React'
    },
    {
        id: 3,
        question: "What is the state management solution?",
        context: [
            { id: 'rag-test-5', content: 'State management is handled via React hooks and Zustand.', tags: [], createdAt: Date.now(), updatedAt: Date.now() },
            { id: 'rag-test-6', content: 'The application is a Progressive Web App (PWA).', tags: [], createdAt: Date.now(), updatedAt: Date.now() }
        ],
        expectedSourceId: 'rag-test-5',
        expectedAnswerSubstring: 'Zustand'
    },
    {
        id: 4,
        question: "Can Continuum work without an internet connection?",
        context: [
            { id: 'rag-test-7', content: 'Continuum is designed as an offline-first application.', tags: [], createdAt: Date.now(), updatedAt: Date.now() },
            { id: 'rag-test-8', content: 'All data is stored locally in the browser using IndexedDB.', tags: [], createdAt: Date.now(), updatedAt: Date.now() }
        ],
        expectedSourceId: 'rag-test-7',
        expectedAnswerSubstring: 'offline-first'
    },
    {
        id: 5,
        question: "What technologies are used for the frontend?",
        context: [
            { id: 'rag-test-9', content: 'The UI is built with React and Vite. Tailwind CSS is used for styling.', tags: [], createdAt: Date.now(), updatedAt: Date.now() },
            { id: 'rag-test-10', content: 'Backend logic is handled by Netlify functions.', tags: [], createdAt: Date.now(), updatedAt: Date.now() }
        ],
        expectedSourceId: 'rag-test-9',
        expectedAnswerSubstring: 'React and Vite'
    }
];
/**
 * A component for running development diagnostics and benchmarks.
 */
const Diagnostics = ({ onBack }) => {
    const [benchmarkResults, setBenchmarkResults] = useState(null);
    const [benchmarkWarning, setBenchmarkWarning] = useState(null);
    const [ragResults, setRagResults] = useState(null);
    const [isBenchmarking, setIsBenchmarking] = useState(false);
    const [isRagTesting, setIsRagTesting] = useState(false);
    /**
     * Runs a search speed benchmark against the local database.
     * It runs each predefined query 5 times and calculates the average response time.
     */
    const handleRunBenchmark = async () => {
        setIsBenchmarking(true);
        setBenchmarkResults(null);
        setBenchmarkWarning(null);
        try {
            const noteCount = await db.notes.count();
            if (noteCount < 1000) {
                setBenchmarkWarning(`노트 수가 1000개 미만(${noteCount}개)입니다. 결과는 참고용입니다.`);
            }
            const searcher = new NoopSemantic(); // Placeholder for actual search implementation
            const results = [];
            for (const query of BENCHMARK_QUERIES) {
                const timings = [];
                for (let i = 0; i < 5; i++) {
                    const startTime = performance.now();
                    await searcher.embed([query]); // Replace with actual search call
                    const endTime = performance.now();
                    timings.push(endTime - startTime);
                }
                const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
                results.push({ query, avgTime });
            }
            setBenchmarkResults(results);
            toast.success('벤치마크 완료!');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            toast.error(`벤치마크 중 오류 발생: ${errorMessage}`);
        }
        finally {
            setIsBenchmarking(false);
        }
    };
    /**
     * Runs a quality test for the RAG pipeline.
     * For each test case, it temporarily adds context notes to the DB,
     * generates an answer, and checks it against expected outcomes.
     * It cleans up the temporary notes afterwards.
     */
    const handleRunRagTest = async () => {
        setIsRagTesting(true);
        setRagResults(null);
        toast.info('RAG 품질 테스트를 시작합니다...');
        const results = [];
        for (const testCase of RAG_TEST_CASES) {
            const tempNoteIds = testCase.context.map(note => note.id);
            try {
                await db.notes.bulkAdd(testCase.context);
                // This is a placeholder for the actual RAG call.
                // It should return a generated answer and the source note ID.
                const generated = await generateWithFallback(testCase.question);
                const answer = generated.answerSegments.map((s) => s.sentence).join(' ');
                const sourceNoteId = generated.answerSegments[0]?.sourceNoteId;
                const answerAccuracy = answer.includes(testCase.expectedAnswerSubstring) ? 'Pass' : 'Fail';
                const sourceAccuracy = sourceNoteId === testCase.expectedSourceId ? 'Pass' : 'Fail';
                const finalState = answerAccuracy === 'Pass' && sourceAccuracy === 'Pass' ? 'Pass' : 'Fail';
                results.push({
                    id: testCase.id,
                    question: testCase.question,
                    answerAccuracy,
                    sourceAccuracy,
                    finalState,
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                toast.error(`테스트 케이스 ${testCase.id} 실행 중 오류: ${errorMessage}`);
                results.push({
                    id: testCase.id,
                    question: testCase.question,
                    answerAccuracy: 'Fail',
                    sourceAccuracy: 'Fail',
                    finalState: 'Fail',
                });
            }
            finally {
                await db.notes.bulkDelete(tempNoteIds);
            }
        }
        setRagResults(results);
        toast.success('RAG 품질 테스트 완료!');
        setIsRagTesting(false);
    };
    return (_jsxs("div", { className: "p-4 md:p-6", children: [_jsx("button", { onClick: onBack, className: "mb-4 text-blue-500 hover:underline", children: "\u2190 \uC124\uC815\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30" }), _jsxs("div", { className: "card space-y-6", children: [_jsx("h1", { className: "text-xl font-bold", children: "\uAC1C\uBC1C\uC790 \uC9C4\uB2E8 \uB3C4\uAD6C" }), _jsxs("div", { className: "p-4 border rounded-lg", children: [_jsx("h2", { className: "text-lg font-semibold", children: "\uAC80\uC0C9 \uC18D\uB3C4 \uBCA4\uCE58\uB9C8\uD06C" }), _jsx("p", { className: "text-sm text-gray-600 mt-1 mb-3", children: "\uBBF8\uB9AC \uC815\uC758\uB41C \uAC80\uC0C9\uC5B4\uB97C 5\uD68C\uC529 \uC2E4\uD589\uD558\uC5EC \uD3C9\uADE0 \uC751\uB2F5 \uC18D\uB3C4\uB97C \uCE21\uC815\uD569\uB2C8\uB2E4." }), _jsx("button", { onClick: handleRunBenchmark, disabled: isBenchmarking, className: "btn bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400", children: isBenchmarking ? '측정 중...' : '벤치마크 시작' }), benchmarkWarning && (_jsx("div", { className: "mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded", children: _jsx("p", { className: "font-mono text-sm text-yellow-800", children: benchmarkWarning }) })), benchmarkResults && (_jsx("div", { className: "mt-3 overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "\uAC80\uC0C9\uC5B4" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "\uD3C9\uADE0 \uC751\uB2F5 \uC2DC\uAC04(ms)" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: benchmarkResults.map((result) => (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900", children: result.query }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: result.avgTime.toFixed(2) })] }, result.query))) })] }) }))] }), _jsxs("div", { className: "p-4 border rounded-lg", children: [_jsx("h2", { className: "text-lg font-semibold", children: "RAG \uD488\uC9C8 \uD14C\uC2A4\uD2B8" }), _jsx("p", { className: "text-sm text-gray-600 mt-1 mb-3", children: "\uBBF8\uB9AC \uC815\uC758\uB41C \uD14C\uC2A4\uD2B8 \uCF00\uC774\uC2A4\uB97C \uC2E4\uD589\uD558\uC5EC \uB2F5\uBCC0 \uBC0F \uCD9C\uCC98\uC758 \uC815\uD655\uB3C4\uB97C \uD3C9\uAC00\uD569\uB2C8\uB2E4." }), _jsx("button", { onClick: handleRunRagTest, disabled: isRagTesting, className: "btn bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400", children: isRagTesting ? '테스트 중...' : 'RAG 테스트 시작' }), ragResults && (_jsx("div", { className: "mt-3 overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "ID" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "\uC9C8\uBB38" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "\uB2F5\uBCC0 \uC815\uD655\uB3C4" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "\uCD9C\uCC98 \uC815\uD655\uB3C4" }), _jsx("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "\uCD5C\uC885 \uC0C1\uD0DC" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: ragResults.map((result) => (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900", children: result.id }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: result.question }), _jsx("td", { className: `px-6 py-4 whitespace-nowrap text-sm font-semibold ${result.answerAccuracy === 'Pass' ? 'text-green-600' : 'text-red-600'}`, children: result.answerAccuracy }), _jsx("td", { className: `px-6 py-4 whitespace-nowrap text-sm font-semibold ${result.sourceAccuracy === 'Pass' ? 'text-green-600' : 'text-red-600'}`, children: result.sourceAccuracy }), _jsx("td", { className: `px-6 py-4 whitespace-nowrap text-sm font-bold ${result.finalState === 'Pass' ? 'text-green-600' : 'text-red-600'}`, children: result.finalState })] }, result.id))) })] }) }))] })] })] }));
};
export default Diagnostics;
