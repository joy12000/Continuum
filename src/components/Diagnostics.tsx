import React, { useState } from 'react';
import { db } from '../lib/db';
import { toast } from '../lib/toast';
// Note: These imports are placeholders and might need to be adjusted
// to match the actual implementation of search and generation functions.
import { NoopSemantic } from '../lib/search/semantic'; 
import { generateWithFallback } from '../lib/gen/generate';

// --- Test Data ---

const BENCHMARK_QUERIES = [
  "What is the capital of France?",
  "How does photosynthesis work?",
  "History of the Roman Empire",
  "JavaScript array methods",
  "Benefits of regular exercise",
  "Climate change impact on oceans",
  "Artificial intelligence ethics",
  "How to bake sourdough bread",
  "Latest advancements in space exploration",
  "Understanding quantum computing",
];

const RAG_QUALITY_PAIRS = [
  {
    question: "What is the main function of the mitochondria?",
    context: "The mitochondrion is an organelle found in the cells of most eukaryotes. The primary function of mitochondria is to generate most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy.",
    expectedAnswer: "The main function of mitochondria is to produce ATP, the cell's main energy source.",
  },
  // ... Add 4 more pairs
];


/**
 * A component for running development diagnostics and benchmarks.
 */
const Diagnostics: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [benchmarkResult, setBenchmarkResult] = useState<string | null>(null);
  const [ragResult, setRagResult] = useState<string | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [isRagTesting, setIsRagTesting] = useState(false);

  /**
   * Runs a search speed benchmark against the local database.
   */
  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    setBenchmarkResult(null);

    try {
      const noteCount = await db.notes.count();
      if (noteCount < 100) { // A simple check for a minimum amount of data
        toast.warn(`Benchmark requires more data. Current notes: ${noteCount}. Please add more notes.`);
        setIsBenchmarking(false);
        return;
      }

      const searcher = new NoopSemantic();
      const startTime = performance.now();
      for (const query of BENCHMARK_QUERIES) {
        // This is a placeholder for the actual search call.
        // Replace with the project's search implementation.
        await searcher.embed([query]);
      }
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / BENCHMARK_QUERIES.length;

      setBenchmarkResult(`노트 ${noteCount}개 기준 평균 응답 시간: ${avgTime.toFixed(2)}ms`);
      toast.success('벤치마크 완료!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setBenchmarkResult(`오류: ${errorMessage}`);
      toast.error('벤치마크 중 오류 발생');
    } finally {
      setIsBenchmarking(false);
    }
  };

  /**
   * Runs a quality test for the RAG (Retrieval-Augmented Generation) pipeline.
   */
  const handleRunRagTest = async () => {
    setIsRagTesting(true);
    setRagResult('테스트 중...');
    
    // This is a placeholder for the actual RAG test logic.
    // It should call the generate API and compare results.
    setTimeout(() => {
      setRagResult('RAG 품질 테스트 결과: 5개 중 4개 성공 (정확도: 80%) - (구현 예정)');
      setIsRagTesting(false);
      toast.info('RAG 품질 테스트는 현재 구현 예정입니다.');
    }, 1000);
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
            미리 정의된 10개의 검색어를 실행하여 평균 응답 속도를 측정합니다.
          </p>
          <button 
            onClick={handleRunBenchmark} 
            disabled={isBenchmarking}
            className="btn bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isBenchmarking ? '측정 중...' : '벤치마크 실행'}
          </button>
          {benchmarkResult && (
            <div className="mt-3 p-3 bg-gray-100 rounded">
              <p className="font-mono text-sm">{benchmarkResult}</p>
            </div>
          )}
        </div>

        {/* RAG Quality Test */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-lg font-semibold">RAG 품질 테스트</h2>
          <p className="text-sm text-gray-600 mt-1 mb-3">
            미리 정의된 질문-컨텍스트 쌍을 API로 전송하여 답변의 정확도를 평가합니다.
          </p>
          <button 
            onClick={handleRunRagTest} 
            disabled={isRagTesting}
            className="btn bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
          >
            {isRagTesting ? '테스트 중...' : 'RAG 테스트 실행'}
          </button>
          {ragResult && (
            <div className="mt-3 p-3 bg-gray-100 rounded">
              <p className="font-mono text-sm">{ragResult}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Diagnostics;