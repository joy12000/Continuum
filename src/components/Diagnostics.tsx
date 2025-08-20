import React, { useState } from 'react';
import { db, Note } from '../lib/db';
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

const RAG_TEST_CASES: {
  id: number;
  question: string;
  context: Note[];
  expectedSourceId: string;
  expectedAnswerSubstring: string;
}[] = [
  {
    id: 1,
    question: "What is the primary data storage method?",
    context: [ // Test notes to be temporarily added to the DB for the test
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

type BenchmarkResult = {
  query: string;
  avgTime: number;
};

type RagTestResult = {
  id: number;
  question: string;
  answerAccuracy: 'Pass' | 'Fail';
  sourceAccuracy: 'Pass' | 'Fail';
  finalState: 'Pass' | 'Fail';
};

/**
 * A component for running development diagnostics and benchmarks.
 */
const Diagnostics: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[] | null>(null);
  const [benchmarkWarning, setBenchmarkWarning] = useState<string | null>(null);
  const [ragResults, setRagResults] = useState<RagTestResult[] | null>(null);
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
      const results: BenchmarkResult[] = [];

      for (const query of BENCHMARK_QUERIES) {
        const timings: number[] = [];
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`벤치마크 중 오류 발생: ${errorMessage}`);
    } finally {
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

    const results: RagTestResult[] = [];

    for (const testCase of RAG_TEST_CASES) {
      const tempNoteIds = testCase.context.map(note => note.id);
      
      try {
        await db.notes.bulkAdd(testCase.context);

        // This is a placeholder for the actual RAG call.
        // It should return a generated answer and the source note ID.
        const generated = await generateWithFallback(testCase.question);
        const answer = generated.answer.map(s => s.sentence).join(' ');
        const sourceNoteId = generated.answer[0]?.sourceNoteId;

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

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(`테스트 케이스 ${testCase.id} 실행 중 오류: ${errorMessage}`);
        results.push({
          id: testCase.id,
          question: testCase.question,
          answerAccuracy: 'Fail',
          sourceAccuracy: 'Fail',
          finalState: 'Fail',
        });
      } finally {
        await db.notes.bulkDelete(tempNoteIds);
      }
    }
    
    setRagResults(results);
    toast.success('RAG 품질 테스트 완료!');
    setIsRagTesting(false);
  };

  return (
    <div className="p-4 md:p-6">
      <button onClick={onBack} className="mb-4 text-blue-500 hover:underline">← 설정으로 돌아가기</button>
      <div className="card space-y-6">
        <h1 className="text-xl font-bold">개발자 진단 도구</h1>
        
        {/* Search Speed Benchmark */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold">검색 속도 벤치마크</h2>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            미리 정의된 검색어를 5회씩 실행하여 평균 응답 속도를 측정합니다.
          </p>
          <button 
            onClick={handleRunBenchmark} 
            disabled={isBenchmarking}
            className="btn bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isBenchmarking ? '측정 중...' : '벤치마크 시작'}
          </button>
          {benchmarkWarning && (
            <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
              <p className="font-mono text-sm text-yellow-800">{benchmarkWarning}</p>
            </div>
          )}
          {benchmarkResults && (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">검색어</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균 응답 시간(ms)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {benchmarkResults.map((result) => (
                    <tr key={result.query}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.query}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.avgTime.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RAG Quality Test */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold">RAG 품질 테스트</h2>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            미리 정의된 테스트 케이스를 실행하여 답변 및 출처의 정확도를 평가합니다.
          </p>
          <button 
            onClick={handleRunRagTest} 
            disabled={isRagTesting}
            className="btn bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
          >
            {isRagTesting ? '테스트 중...' : 'RAG 테스트 시작'}
          </button>
          {ragResults && (
             <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">질문</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">답변 정확도</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">출처 정확도</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">최종 상태</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ragResults.map((result) => (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.question}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${result.answerAccuracy === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>{result.answerAccuracy}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${result.sourceAccuracy === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>{result.sourceAccuracy}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${result.finalState === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>{result.finalState}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Diagnostics;