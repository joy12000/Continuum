import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';

// openapi.yaml에 정의된 InsightThread 스키마를 기반으로 타입 정의
interface InsightThread {
  threadId: string;
  title: string;
  summary: string;
  noteIds: string[];
  relevanceScore: number;
}

const LinksPage = () => {
  const [threads, setThreads] = useState<InsightThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsightThreads = async () => {
      try {
        // OpenAPI 명세에 따라 /api/v1/threads 엔드포인트 호출
        const response = await fetch('/api/v1/threads');
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
  }, []); // 컴포넌트가 마운트될 때 한 번만 실행

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

    // 스레드 데이터를 화면에 렌더링 (기본 목록 형태)
    return (
      <div className="p-4 space-y-4">
        {threads.map((thread) => (
          <div key={thread.threadId} className="p-4 border rounded-lg shadow-md bg-slate-800/50 border-slate-700">
            <h3 className="text-lg font-bold">{thread.title}</h3>
            <p className="mt-2 text-gray-300">{thread.summary}</p>
            <div className="mt-3 text-xs text-gray-400">
              <p>관련 노트 수: {thread.noteIds.length}</p>
              <p>관련성 점수: {thread.relevanceScore.toFixed(2)}</p>
            </div>
          </div>
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
