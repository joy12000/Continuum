
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Assuming you have this client

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | null;

interface UseJobStatusProps {
  jobId: string | null;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  interval?: number;
}

export const useJobStatus = ({ jobId, onSuccess, onError, interval = 3000 }: UseJobStatusProps) => {
  const [status, setStatus] = useState<JobStatus>(null);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      return;
    }

    setStatus('pending'); // Initial status

    const pollStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(`/api/v1?action=generate-thread&jobId=${jobId}`, {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch job status: ${response.statusText}`);
        }

        const data = await response.json();
        setStatus(data.status);

        if (data.status === 'completed') {
          onSuccess?.();
          return true; // Stop polling
        }

        if (data.status === 'failed') {
          onError?.('Job failed to complete.');
          return true; // Stop polling
        }
      } catch (error: any) {
        console.error(error);
        onError?.(error.message);
        return true; // Stop polling on error
      }
      return false; // Continue polling
    };

    // Initial check
    let stopped = false;
    setTimeout(() => {
        if(stopped) return;
        pollStatus().then(s => stopped = s);
    }, 1000);

    const intervalId = setInterval(async () => {
      if (stopped) {
        clearInterval(intervalId);
        return;
      }
      stopped = await pollStatus();
      if (stopped) {
        clearInterval(intervalId);
      }
    }, interval);

    return () => {
      stopped = true;
      clearInterval(intervalId);
    }; 

  }, [jobId, onSuccess, onError, interval]);

  return status;
};
