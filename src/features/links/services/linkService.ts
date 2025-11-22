import { supabase } from '../../../lib/supabase';
import type { InsightThread } from '@lib/types';

export interface CachedThreadsResponse {
    threads: InsightThread[];
    lastUpdatedAt: string | null;
}

export const fetchCachedThreads = async (): Promise<CachedThreadsResponse> => {
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

export const startGenerationJob = async (excludeSingletons: boolean): Promise<{ jobId: string }> => {
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
