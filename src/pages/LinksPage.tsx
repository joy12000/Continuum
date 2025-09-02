import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import InsightThreadCard from '@/components/InsightThreadCard';

// Define the types based on the OpenAPI spec
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

const LinksPage = () => {
  const [threads, setThreads] = useState<InsightThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsightThreads = async () => {
      setIsLoading(true);
      try {
        // Fetch without weight parameters as the UI has been removed
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
