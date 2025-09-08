
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/PageLayout';
import InsightThreadCard from '@/components/InsightThreadCard';
import GenerationProgress from '@/components/GenerationProgress';
import SourceNoteModal from '@/components/SourceNoteModal';
import { useJobStatus } from '@/hooks/useJobStatus';
import { supabase } from '@/lib/supabase';
import type { InsightThread, Note } from '@lib/types';
import { BeakerIcon, CpuChipIcon } from '@heroicons/react/24/outline';

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

  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
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
    alert("Insight thread analysis complete!");
    localStorage.removeItem('continuum_job_id');
    setJobId(null);
    queryClient.invalidateQueries({ queryKey: ['cachedThreads'] });
  };

  const handleJobError = (error: string) => {
    console.error("Job failed:", error);
    alert(`An error occurred: ${error}`);
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
      alert(`Failed to start analysis: ${error.message}`);
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
      return <div className="flex items-center justify-center h-full text-muted-foreground">Checking for cached data...</div>;
    }

    if (queryError) {
      return <div className="flex items-center justify-center h-full text-destructive">Error: {queryError.message}</div>;
    }

    const threads = cachedData?.threads;

    if (!threads || threads.length === 0) {
      return (
        <div className="text-center p-8 bg-card border border-border rounded-lg shadow-lg">
          <BeakerIcon className="w-16 h-16 mx-auto text-accent mb-4" />
          <h3 className="text-xl font-bold mb-4">No connected thoughts yet</h3>
          <p className="text-muted-foreground mb-6">Analyze your notes to discover new insights.</p>
          <div className="flex flex-col items-center gap-4">
            <button
                onClick={handleGenerateClick}
                className="px-6 py-3 font-bold text-white bg-accent rounded-lg hover:bg-accent/80 transition-colors disabled:bg-muted"
            >
                Connect My Thoughts
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
                    Exclude threads with a single note
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
            Last analyzed: {formatTimeAgo(cachedData.lastUpdatedAt)}
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
                Exclude single notes
              </label>
            </div>
            <button
              onClick={handleGenerateClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-muted transition-colors"
            >
              <CpuChipIcon className="w-5 h-5" />
              Analyze Again
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
    <PageLayout title="Insight Threads">
      <div className="p-4 sm:p-6">
        {renderContent()}
      </div>
      <SourceNoteModal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        title={selectedNote?.title || 'Untitled Note'}
        body={selectedNote?.body || ''}
      />
    </PageLayout>
  );
};

export default LinksPage;
