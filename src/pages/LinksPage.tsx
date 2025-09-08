
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/PageLayout';
import InsightThreadCard from '@/components/InsightThreadCard';
import GenerationProgress from '@/components/GenerationProgress';
import SourceNoteModal from '@/components/SourceNoteModal'; // Import the modal component
import { useJobStatus } from '@/hooks/useJobStatus';
import { supabase } from '@/lib/supabase';
import SkyBackground from '@/components/SkyBackground';

import type { InsightThread, Note } from '@lib/types';

// --- Type Definitions ---
interface CachedThreadsResponse {
  threads: InsightThread[];
  lastUpdatedAt: string | null;
}

// --- Time Formatting Helper ---
const formatTimeAgo = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
};

// --- API Call Functions ---
const fetchCachedThreads = async (): Promise<CachedThreadsResponse> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const response = await fetch('/api/v1?action=get-threads', {
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
  });
  if (!response.ok) {
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return { threads: [], lastUpdatedAt: null };
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const startGenerationJob = async (excludeSingletons: boolean): Promise<{ jobId: string }> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const response = await fetch('/api/v1?action=generate-thread', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }) 
        },
        body: JSON.stringify({ excludeSingletons })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred." }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

const LinksPage = () => {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(localStorage.getItem('continuum_job_id'));
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [excludeSingletons, setExcludeSingletons] = useState<boolean>(true);

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note);
    setModalOpen(true);
  };

  const { data: cachedData, error: queryError, isLoading: isLoadingInitial } = useQuery<CachedThreadsResponse, Error>({
    queryKey: ['cachedThreads'],
    queryFn: fetchCachedThreads,
  });

  const handleJobSuccess = () => {
    console.log("Job completed successfully!");
    alert("인사이트 스레드 분석이 완료되었습니다!");
    localStorage.removeItem('continuum_job_id');
    setJobId(null);
    queryClient.invalidateQueries({ queryKey: ['cachedThreads'] });
  };

  const handleJobError = (error: string) => {
    console.error("Job failed:", error);
    alert(`오류가 발생했습니다: ${error}`);
    localStorage.removeItem('continuum_job_id');
    setJobId(null);
  };

  const jobStatus = useJobStatus({
    jobId,
    onSuccess: handleJobSuccess,
    onError: handleJobError,
  });

  const handleGenerateClick = async () => {
    try {
      const data = await startGenerationJob(excludeSingletons);
      localStorage.setItem('continuum_job_id', data.jobId);
      setJobId(data.jobId);
    } catch (error: any) {
      alert(`분석 시작에 실패했습니다: ${error.message}`);
    }
  };
  
  useEffect(() => {
    // Check for running jobs on page load
    const runningJobId = localStorage.getItem('continuum_job_id');
    if (runningJobId) {
      setJobId(runningJobId);
    }
  }, []);

  const renderContent = () => {
    if (jobStatus === 'pending' || jobStatus === 'processing') {
        return <GenerationProgress />;
    }

    if (isLoadingInitial) {
      return <div className="flex items-center justify-center h-full text-gray-400">캐시된 데이터 확인 중...</div>;
    }

    if (queryError) {
      return <div className="flex items-center justify-center h-full text-red-500">Error: {queryError.message}</div>;
    }

    const threads = cachedData?.threads;

    if (!threads || threads.length === 0) {
      return (
        <div className="text-center p-8">
          <h3 className="text-xl font-bold mb-4">아직 연결된 생각이 없어요</h3>
          <p className="text-gray-400 mb-6">내 노트들을 분석해서 새로운 인사이트를 발견해보세요.</p>
          <div className="flex flex-col items-center gap-4">
            <button
                onClick={handleGenerateClick}
                className="px-6 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
            >
                내 생각 연결하기
            </button>
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="exclude-singletons-initial"
                    checked={excludeSingletons}
                    onChange={(e) => setExcludeSingletons(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label htmlFor="exclude-singletons-initial" className="ml-2 text-sm text-gray-400">
                    단일 노트 스레드 제외
                </label>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-400">
            마지막 분석: {formatTimeAgo(cachedData.lastUpdatedAt)}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="exclude-singletons"
                checked={excludeSingletons}
                onChange={(e) => setExcludeSingletons(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              <label htmlFor="exclude-singletons" className="ml-2 text-sm text-gray-300">
                단일 노트 제외
              </label>
            </div>
            <button
              onClick={handleGenerateClick}
              className="px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-500"
            >
              새로 분석하기
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {threads.map((thread: InsightThread) => (
            <InsightThreadCard key={thread.threadId} thread={thread} onNoteClick={handleNoteClick} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <PageLayout title="인사이트 스레드" transparent>
      <SkyBackground />
      <div className="bg-black/30 backdrop-blur-sm p-4 sm:p-6 rounded-xl">
      {renderContent()}
      <SourceNoteModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        title={selectedNote?.title || '제목 없음'}
        body={selectedNote?.body || ''}
      />
    </div>
    </PageLayout>
  );
};

export default LinksPage;
