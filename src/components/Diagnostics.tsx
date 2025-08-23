// src/components/Diagnostics.tsx
import React, { useState } from 'react';

const BENCHMARK_QUERIES = [
  "AI", "PWA", "React", "IndexedDB", "Web Worker",
  "semantic search", "RAG", "offline first", "Gemini API", "performance"
];

type RagCase = {
  id: number;
  question: string;
  context: { id: string; content: string; }[];
  expectedSourceId: string;
  expectedAnswerSubstring: string;
};

const RAG_TEST_CASES: RagCase[] = [
  {
    id: 1,
    question: "What is the primary data storage method?",
    context: [
      { id: 'rag-test-1', content: 'Continuum uses IndexedDB via Dexie.js for local storage.' },
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

async function postJSON(url: string, body: any){
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const t = await r.text();
  try { return { ok: r.ok, status: r.status, data: JSON.parse(t) }; }
  catch { return { ok: r.ok, status: r.status, data: t }; }
}

export default function Diagnostics(){
  const [bench, setBench] = useState<{query:string, avgMs:number}[] | null>(null);
  const [rag, setRag] = useState<any[] | null>(null);
  const [log, setLog] = useState<string>('');

  const append = (m: string) => setLog(prev => (prev ? prev + '\n' : '') + m);

  async function runBenchmark(){
    setBench(null); setLog('');
    append('Starting remote embedding benchmark (calls /api/embed)...');
    const results:{query:string, avgMs:number}[] = [];
    for (const q of BENCHMARK_QUERIES){
      const N = 5;
      const times:number[] = [];
      for (let i=0;i<N;i++){
        const t0 = performance.now();
        const res = await postJSON('/api/embed', { texts:[q] });
        const t1 = performance.now();
        times.push(t1 - t0);
        if (!res.ok) append(`  ${q} -> HTTP ${res.status}: ${JSON.stringify(res.data).slice(0,140)}`);
      }
      const avg = Math.round(times.reduce((a,b)=>a+b,0)/N);
      results.push({ query: q, avgMs: avg });
    }
    setBench(results);
    append('Benchmark done.');
  }

  async function runRagTests(){
    setRag(null); setLog('');
    append('Starting RAG tests (calls /api/generate)...');
    const rows:any[] = [];
    for (const tc of RAG_TEST_CASES){
      const res = await postJSON('/api/generate', { question: tc.question, context: tc.context });
      let answerPass = false, sourcePass = false;
      let detail = '';
      if (res.ok && res.data){
        const answer: string = res.data.answer ?? '';
        answerPass = typeof answer === 'string' && answer.toLowerCase().includes(tc.expectedAnswerSubstring.toLowerCase());
        const sentences: any[] = Array.isArray(res.data.sentences) ? res.data.sentences : [];
        sourcePass = sentences.some(s => s?.sourceNoteId === tc.expectedSourceId);
        detail = `ans:${answerPass?'✓':'✗'} src:${sourcePass?'✓':'✗'}`;
      } else {
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

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Diagnostics</h1>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">검색 속도 벤치마크</h2>
        <p className="text-sm text-gray-600 mb-2">/api/embed 엔드포인트를 10개 쿼리×5회 호출하여 평균 시간을 측정합니다.</p>
        <button className="px-3 py-1 rounded-lg bg-black text-white" onClick={runBenchmark}>벤치마크 시작</button>
        {bench && (
          <table className="mt-3 w-full text-sm">
            <thead><tr><th className="text-left p-1 border-b">검색어</th><th className="text-right p-1 border-b">평균 응답 시간 (ms)</th></tr></thead>
            <tbody>
              {bench.map(r => (
                <tr key={r.query}>
                  <td className="p-1 border-b">{r.query}</td>
                  <td className="p-1 border-b text-right">{r.avgMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">RAG 품질 테스트</h2>
        <p className="text-sm text-gray-600 mb-2">각 테스트 케이스에 대해 /api/generate를 호출하고, 답변/출처 정확도를 검증합니다.</p>
        <button className="px-3 py-1 rounded-lg bg-black text-white" onClick={runRagTests}>RAG 테스트 시작</button>
        {rag && (
          <table className="mt-3 w-full text-sm">
            <thead><tr>
              <th className="text-left p-1 border-b">ID</th>
              <th className="text-left p-1 border-b">질문</th>
              <th className="text-center p-1 border-b">답변 정확도</th>
              <th className="text-center p-1 border-b">출처 정확도</th>
              <th className="text-center p-1 border-b">최종</th>
              <th className="text-left p-1 border-b">비고</th>
            </tr></thead>
            <tbody>
              {rag.map((r) => (
                <tr key={r.id}>
                  <td className="p-1 border-b">{r.id}</td>
                  <td className="p-1 border-b">{r.question}</td>
                  <td className="p-1 border-b text-center">{r.answerPass}</td>
                  <td className="p-1 border-b text-center">{r.sourcePass}</td>
                  <td className="p-1 border-b text-center font-semibold">{r.final}</td>
                  <td className="p-1 border-b">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">API 디버그</h2>
        <p className="text-sm text-gray-600 mb-2"><a className="underline" href="/debug/api2.html">/debug/api2.html</a>에서 ping/embed/generate를 수동으로 호출해 확인할 수 있습니다.</p>
      </section>

      <pre className="bg-gray-900 text-gray-100 p-3 rounded-xl whitespace-pre-wrap text-xs">{log}</pre>
    </div>
  );
}
