type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | null;
interface UseJobStatusProps {
    jobId: string | null;
    onSuccess?: () => void;
    onError?: (error: string) => void;
    interval?: number;
}
export declare const useJobStatus: ({ jobId, onSuccess, onError, interval }: UseJobStatusProps) => JobStatus;
export {};
//# sourceMappingURL=useJobStatus.d.ts.map