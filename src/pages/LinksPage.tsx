import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/PageLayout';
import InsightThreadCard from '@/components/InsightThreadCard';

// --- 타입 정의 (OpenAPI 명세 기반) ---
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

// --- 임시 목 데이터 --- 
const mockThreads: InsightThread[] = [
  {
    threadId: 'thread-ai-art',
    title: 'AI 예술에 대한 나의 생각 변천사',
    summary: '초기에는 AI 예술에 회의적이었지만, 최근 Midjourney를 경험하며 창의적 도구로서의 가능성을 탐색하기 시작했습니다. 기술의 발전이 예술의 정의를 어떻게 바꾸고 있는지 고찰합니다.',
    notes: [
      { id: 'note-1', title: 'AI는 예술을 만들 수 있는가?', body: '...', created_at: '2024-08-15T10:00:00Z' },
      { id: 'note-2', title: 'Midjourney 첫 경험과 충격', body: '...', created_at: '2024-08-20T14:30:00Z' },
      { id: 'note-3', title: '창의적 영감을 주는 AI 활용법', body: '...', created_at: '2024-08-22T18:00:00Z' },
    ],
    relevanceScore: 0.91,
  },
  {
    threadId: 'thread-productivity',
    title: '생산성 도구 파편화 문제와 해결책 탐구',
    summary: '여러 앱에 분산된 정보 때문에 오히려 생산성이 저하되는 문제를 겪고 있습니다. 모든 정보를 한 곳에 모으려는 시도와 그 과정에서 발견한 새로운 방법론에 대해 다룹니다.',
    notes: [
      { id: 'note-4', title: '노트 앱 유목민 생활', body: '...', created_at: '2024-07-30T09:00:00Z' },
      { id: 'note-5', title: 'Obsidian과 Logseq 비교 분석', body: '...', created_at: '2024-08-05T11:00:00Z' },
    ],
    relevanceScore: 0.85,
  },
];

const LinksPage = () => {
  const [threads, setThreads] = useState<InsightThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsightThreads = async () => {
      setIsLoading(true);
      // 백엔드 구현 전까지 임시 목 데이터를 사용합니다.
      // 1초의 로딩 딜레이를 시뮬레이션합니다.
      setTimeout(() => {
        setThreads(mockThreads);
        setIsLoading(false);
      }, 1000);

      /*
      // TODO: 백엔드 구현 후 아래 코드로 복원하세요.
      try {
        const response = await fetch('/api/v1/threads');
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, body: ${errText}`);
        }
        const data = await response.json();
        setThreads(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
      */
    };

    fetchInsightThreads();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-full text-gray-400">인사이트를 분석하는 중...</div>;
    }

    if (error) {
      return <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>;
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
      {renderContent()}
    </PageLayout>
  );
};

export default LinksPage;