import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

interface CachedThreadsResponse {
  threads_data: InsightThread[];
  last_updated_at: string;
}

interface GenerateWeights {
  citation_weight: number;
  sim_weight: number;
  tag_weight: number;
}

// --- 시간 포맷팅 헬퍼 ---
const formatTimeAgo = (dateString: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "년 전";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "달 전";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "일 전";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "시간 전";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "분 전";
  return Math.floor(seconds) + "초 전";
};

// --- API 호출 함수 ---
const fetchCachedThreads = async (): Promise<CachedThreadsResponse> => {
  const response = await fetch('/api/v1/threads');
  if (!response.ok) {
    // 204 No Content와 같은 케이스를 고려하여, 데이터가 없을 경우 빈 응답을 반환할 수 있도록 처리
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return { threads_data: [], last_updated_at: '' };
    }
    const errText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errText}`);
  }
  return response.json();
};

const generateNewThreads = async (weights: GenerateWeights): Promise<InsightThread[]> => {
  const response = await fetch('/api/v1/threads/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(weights),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP error! status: ${response.status}, body: ${errText}`);
  }
  return response.json();
};


const LinksPage = () => {
  const queryClient = useQueryClient();
  
  // TODO: ConnectionsWeights 컴포넌트와 연동 필요
  const [weights, setWeights] = useState<GenerateWeights>({
    citation_weight: 1.0,
    sim_weight: 0.6,
    tag_weight: 0.2,
  });

  const { data: cachedData, error: queryError, isLoading: isLoadingInitial } = useQuery<CachedThreadsResponse, Error>({
    queryKey: ['cachedThreads'],
    queryFn: fetchCachedThreads,
  });

  const { mutate: generate, isPending: isGenerating, error: mutationError } = useMutation<InsightThread[], Error, GenerateWeights>({
    mutationFn: generateNewThreads,
    onSuccess: (newThreads: InsightThread[]) => {
      // POST 성공 시, GET 쿼리 캐시를 새로운 데이터로 업데이트
      const newData: CachedThreadsResponse = {
        threads_data: newThreads,
        last_updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData(['cachedThreads'], newData);
    },
  });

  const handleGenerateClick = () => {
    generate(weights);
  };

  const renderContent = () => {
    if (isLoadingInitial) {
      return <div className="flex items-center justify-center h-full text-gray-400">캐시된 데이터 확인 중...</div>;
    }

    const error = queryError || mutationError;
    if (error) {
      return <div className="flex items-center justify-center h-full text-red-500">Error: {error.message}</div>;
    }

    const threads = cachedData?.threads_data;

    if (!threads || threads.length === 0) {
      return (
        <div className="text-center p-8">
          <h3 className="text-xl font-bold mb-4">아직 연결된 생각이 없어요</h3>
          <p className="text-gray-400 mb-6">내 노트들을 분석해서 새로운 인사이트를 발견해보세요.</p>
          <button
            onClick={handleGenerateClick}
            disabled={isGenerating}
            className="px-6 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
          >
            {isGenerating ? '분석 중...' : '내 생각 연결하기'}
          </button>
        </div>
      );
    }

    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-400">
            마지막 분석: {formatTimeAgo(cachedData.last_updated_at)}
          </span>
          <button
            onClick={handleGenerateClick}
            disabled={isGenerating}
            className="px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-500"
          >
            {isGenerating ? '분석 중...' : '새로 분석하기'}
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {threads.map((thread: InsightThread) => (
            <InsightThreadCard key={thread.threadId} thread={thread} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <PageLayout title="인사이트 스레드">
      {/* TODO: 가중치 조절을 위한 ConnectionsWeights 컴포넌트 추가 위치 */}
      {renderContent()}
    </PageLayout>
  );
};

export default LinksPage;