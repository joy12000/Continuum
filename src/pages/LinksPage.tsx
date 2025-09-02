import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import InsightThreadCard from '../components/InsightThreadCard';

// 수정된 OpenAPI 명세에 따른 타입 정의
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
  notes: Note[]; // noteIds에서 변경됨
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

    // 스레드 데이터를 InsightThreadCard 컴포넌트를 사용해 렌더링
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
