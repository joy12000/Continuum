'use client';
import React, { useState } from 'react';

type Props = {
  onBack?: () => void;
};

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

async function postJSON(url: string, body: any){
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const t = await r.text();
  try { return { ok: r.ok, status: r.status, data: JSON.parse(t) }; }
  catch { return { ok: r.ok, status: r.status, data: t }; }
}

export default function Diagnostics({ onBack }: Props){
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
        const res = await postJSON('/api/v1?action=create-embedding', { texts:[q] });
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
    append('Starting RAG tests (calls /api/v1?action=generate)...');
    const rows:any[] = [];
    for (const tc of RAG_TEST_CASES){
      const res = await postJSON('/api/v1?action=generate', { type: 'rag', input: { query: tc.question }, context: tc.context });
      let answerPass = false, sourcePass = false;
      let detail = '';
      if (res.ok && res.data){
        const answer: string = res.data.answer ?? '';
        answerPass = typeof answer === 'string' && answer.toLowerCase().includes(tc.expectedAnswerSubstring.toLowerCase());
        const sentences: any[] = Array.isArray(res.data.sentences) ? res.data.sentences : [];
        sourcePass = sentences.some(s => s?.sourceNoteId === tc.expectedSourceId);
        detail = `ans:${answerPass?'성공':'실패'} src:${sourcePass?'성공':'실패'}`;
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-sky-400">Diagnostics</h1>
        {onBack && (
          <button onClick={onBack} className="px-3 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition-colors">
            뒤로 가기
          </button>
        )}
      </div>

      <section className="mb-8 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
        <h2 className="text-lg font-semibold mb-2">검색 임베딩 벤치마크</h2>
        <p className="text-sm text-gray-400 mb-4">/api/v1?action=create-embedding 엔드포인트를 통해 10개의 검색어 x 5번씩 테스트하여 평균 속도를 측정합니다.</p>
        <button className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white transition-colors" onClick={runBenchmark}>벤치마크 시작</button>
        {bench && (
          <table className="mt-4 w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left p-2 text-gray-400">검색어</th>
                <th className="text-right p-2 text-gray-400">평균 응답 시간 (ms)</th>
              </tr>
            </thead>
            <tbody>
              {bench.map(r => (
                <tr key={r.query} className="border-b border-slate-800 last:border-0">
                  <td className="p-2">{r.query}</td>
                  <td className="p-2 text-right font-mono text-sky-400">{r.avgMs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mb-8 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
        <h2 className="text-lg font-semibold mb-2">RAG 성능 테스트</h2>
        <p className="text-sm text-gray-400 mb-4">미리 정의된 질문과 컨텍스트로 /api/v1?action=generate 엔드포인트를 호출하여 정답 및 출처 정확도를 검증합니다.</p>
        <button className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white transition-colors" onClick={runRagTests}>RAG 테스트 시작</button>
        {rag && (
          <div className="overflow-x-auto">
            <table className="mt-4 w-full text-sm border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left p-2 text-gray-400">ID</th>
                  <th className="text-left p-2 text-gray-400">질문</th>
                  <th className="text-center p-2 text-gray-400">정답 정확도</th>
                  <th className="text-center p-2 text-gray-400">출처 정확도</th>
                  <th className="text-center p-2 text-gray-400">결과</th>
                </tr>
              </thead>
              <tbody>
                {rag.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30">
                    <td className="p-2">{r.id}</td>
                    <td className="p-2">{r.question}</td>
                    <td className="p-2 text-center">
                      <span className={r.answerPass === 'Pass' ? 'text-emerald-400' : 'text-rose-400'}>{r.answerPass}</span>
                    </td>
                    <td className="p-2 text-center">
                      <span className={r.sourcePass === 'Pass' ? 'text-emerald-400' : 'text-rose-400'}>{r.sourcePass}</span>
                    </td>
                    <td className="p-2 text-center font-bold">
                      <span className={r.final === 'Pass' ? 'text-emerald-400' : 'text-rose-400'}>{r.final}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-8 p-4 rounded-xl border border-slate-800 bg-slate-900/50">
        <h2 className="text-lg font-semibold mb-2">실행 로그</h2>
        <pre className="bg-black/50 text-sky-300 p-4 rounded-lg whitespace-pre-wrap text-xs font-mono max-h-60 overflow-y-auto">{log || '벤치마크 혹은 RAG 수행 시 로그가 여기에 표시됩니다...'}</pre>
      </section>
    </div>
  );
}
