import { useEffect, useState } from 'react';

const DRAFT_KEY = 'momentum:draft';
const AUTOSAVE_INTERVAL = 1000; // 1초마다 자동 저장

export const useDraftPersistence = () => {
    const [draft, setDraft] = useState<string>(() => {
        // 초기 로드 시 로컬 스토리지에서 draft 가져오기
        try {
            if (typeof window !== 'undefined') {
                return localStorage.getItem(DRAFT_KEY) || '';
            }
            return '';
        } catch {
            return '';
        }
    });

    // draft 변경 시 자동 저장 (debounce 효과를 위해 setTimeout 사용)
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                if (typeof window !== 'undefined') {
                    if (draft) {
                        localStorage.setItem(DRAFT_KEY, draft);
                    } else {
                        localStorage.removeItem(DRAFT_KEY);
                    }
                }
            } catch (error) {
                console.error('Failed to save draft:', error);
            }
        }, AUTOSAVE_INTERVAL);

        return () => clearTimeout(timer);
    }, [draft]);

    const clearDraft = () => {
        setDraft('');
        if (typeof window !== 'undefined') {
            localStorage.removeItem(DRAFT_KEY);
        }
    };

    return { draft, setDraft, clearDraft };
};
