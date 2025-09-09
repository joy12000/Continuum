
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/PageLayout';
import InsightThreadCard from '@/components/InsightThreadCard';
import GenerationProgress from '@/components/GenerationProgress';
import { NoteDetailModal } from '@/components/NoteDetailModal';
import { useJobStatus } from '@/hooks/useJobStatus';
import { supabase } from '@/lib/supabase';
import type { InsightThread, Note } from '@lib/types';
import { BeakerIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import SkyCanvasAnimation from '@/components/SkyCanvasAnimation';

// --- Type Definitions ---
interface CachedThreadsResponse {
  threads: InsightThread[];
  lastUpdatedAt: string | null;
}

// --- Time Formatting Helper ---
const formatTimeAgo = (dateString: string | null): string => {
  if (!dateString) return '해당 없음';
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
    throw new Error(`HTTP 오류! 상태: ${response.status}`);
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
        const errorData = await response.json().catch(() => ({ message: "알 수 없는 오류가 발생했습니다." }));
        throw new Error(errorData.message || `HTTP 오류! 상태: ${response.status}`);
    }
    return response.json();
};

const LinksPage = () => {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(localStorage.getItem('continuum_job_id'));
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [excludeSingletons, setExcludeSingletons] = useState<boolean>(true);

  const handleNoteClick = (note: Note) => {
    setSelectedNoteId(note.id);
    setModalOpen(true);
  };

  const { data: cachedData, error: queryError, isLoading: isLoadingInitial } = useQuery<CachedThreadsResponse, Error>({
    queryKey: ['cachedThreads'],
    queryFn: fetchCachedThreads,
  });

  const handleJobSuccess = () => {
    console.log("Job completed successfully!");
    alert("인사이트 스레드 분석 완료!");
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
      alert(`분석 시작 실패: ${error.message}`);
    }
  };
  
  useEffect(() => {
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
      return <div className="flex items-center justify-center h-full text-muted-foreground">캐시된 데이터 확인 중...</div>;
    }

    if (queryError) {
      return <div className="flex items-center justify-center h-full text-destructive">오류: {queryError.message}</div>;
    }

    const threads = cachedData?.threads;

    if (!threads || threads.length === 0) {
      return (
        <div className="text-center p-8 bg-card border border-border rounded-lg shadow-lg">
          <BeakerIcon className="w-16 h-16 mx-auto text-accent mb-4" />
          <h3 className="text-xl font-bold mb-4">아직 연결된 생각 없음</h3>
          <p className="text-muted-foreground mb-6">노트를 분석하여 새로운 인사이트를 발견하세요.</p>
          <div className="flex flex-col items-center gap-4">
            <button
                onClick={handleGenerateClick}
                className="px-6 py-3 font-bold text-white bg-accent rounded-lg hover:bg-accent/80 transition-colors disabled:bg-muted"
            >
                생각 연결하기
            </button>
            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="exclude-singletons-initial"
                    checked={excludeSingletons}
                    onChange={(e) => setExcludeSingletons(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="exclude-singletons-initial" className="ml-2 text-sm text-muted-foreground">
                    단일 노트 스레드 제외
                </label>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm text-muted-foreground">
            마지막 분석: {formatTimeAgo(cachedData.lastUpdatedAt)}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="exclude-singletons"
                checked={excludeSingletons}
                onChange={(e) => setExcludeSingletons(e.target.checked)}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              <label htmlFor="exclude-singletons" className="ml-2 text-sm text-muted-foreground">
                단일 노트 제외
              </label>
            </div>
            <button
              onClick={handleGenerateClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-muted transition-colors"
            >
              <CpuChipIcon className="w-5 h-5" />
              다시 분석
            </button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {threads.map((thread: InsightThread) => (
            <InsightThreadCard key={thread.threadId} thread={thread} onNoteClick={handleNoteClick} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <PageLayout title="인사이트 스레드">
      <SkyCanvasAnimation />
      <div className="relative z-10">
        {renderContent()}
      </div>
      {selectedNoteId && <NoteDetailModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        noteId={selectedNoteId}
      />}
    </PageLayout>
  );
};

export default LinksPage;
