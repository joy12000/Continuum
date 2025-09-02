import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '../components/PageLayout';
import InsightThreadCard from '../components/InsightThreadCard';
import { ConnectionsWeights } from '../components/ConnectionsWeights';
import { ConnectionsGraph } from '../components/ConnectionsGraph';
import Modal from '../components/Modal';

// --- 타입 정의 ---
interface Note {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

interface InsightThread {
  threadId: string;
  title: string;
  summary: string;
  notes: Note[];
  relevanceScore: number;
}

interface Weights {
  citation: number;
  sim: number;
  tag: number;
}

const LinksPage = () => {
  // --- 상태 관리 ---
  const [threads, setThreads] = useState<InsightThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weights, setWeights] = useState<Weights>({ citation: 1.0, sim: 0.6, tag: 0.2 });
  const [isGraphModalOpen, setGraphModalOpen] = useState(false);

  // --- API 호출 ---
  useEffect(() => {
    const fetchInsightThreads = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          citation_weight: weights.citation.toString(),
          sim_weight: weights.sim.toString(),
          tag_weight: weights.tag.toString(),
        });
        const response = await fetch(`/api/v1/threads?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setThreads(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsightThreads();
  }, [weights]); // 가중치가 변경될 때마다 API를 다시 호출

  // --- 전체 연결망 데이터 계산 ---
  const fullGraphData = useMemo(() => {
    const allNotes = new Map<string, Note>();
    threads.forEach(thread => {
      thread.notes.forEach(note => {
        if (!allNotes.has(note.id)) {
          allNotes.set(note.id, note);
        }
      });
    });

    const nodes = Array.from(allNotes.values()).map(n => ({ id: n.id, title: n.title || n.id }));
    const links: { source: string; target: string; }[] = [];

    threads.forEach(thread => {
      for (let i = 0; i < thread.notes.length; i++) {
        for (let j = i + 1; j < thread.notes.length; j++) {
          links.push({ source: thread.notes[i].id, target: thread.notes[j].id });
        }
      }
    });

    return { nodes, links };
  }, [threads]);

  // --- 렌더링 로직 ---
  const renderContent = () => {
    if (error) {
      return <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>;
    }

    // 로딩 상태와 스레드 없음을 통합하여 표시
    if (isLoading) {
      return <div className="flex items-center justify-center h-full text-gray-400">인사이트를 분석하는 중...</div>;
    }

    if (threads.length === 0) {
      return <div className="flex items-center justify-center h-full text-gray-400">생성된 인사이트 스레드가 없습니다.</div>;
    }

    return (
      <div className="p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {threads.map((thread) => (
          <InsightThreadCard key={thread.threadId} thread={thread} />
        ))}
      </div>
    );
  };

  return (
    <PageLayout title="인사이트 스레드">
      {/* 1. 연결 가중치 조절 UI */}
      <div className="p-4 sticky top-0 bg-background z-10">
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <ConnectionsWeights value={weights} onChange={setWeights} />
          <div className="mt-4">
            {/* 2. 전체 연결망 시각화 버튼 */}
            <button onClick={() => setGraphModalOpen(true)} className="text-sm text-sky-400 hover:underline">
                전체 노트 연결망 보기
            </button>
          </div>
        </div>
      </div>

      {renderContent()}

      {/* 전체 연결망 모달 */}
      {isGraphModalOpen && (
        <Modal title="전체 노트 연결망" onClose={() => setGraphModalOpen(false)} actions={<></>}>
            <ConnectionsGraph nodes={fullGraphData.nodes} links={fullGraphData.links} onSelect={(id) => console.log('Node selected:', id)} />
        </Modal>
      )}
    </PageLayout>
  );
};

export default LinksPage;