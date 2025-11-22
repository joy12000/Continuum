import { useEffect, useState } from 'react';

const DRAFT_KEY = 'momentum:draft';
const AUTOSAVE_INTERVAL = 1000; // 1초마다 자동 저장

export const useDraftPersistence = () => {
    const [draft, setDraft] = useState<string>(() => {
        // 초기 로드 시 저장된 draft 복원
        try {
            return localStorage.getItem(DRAFT_KEY) || '';
        } catch {
            return '';
        }
    });

    // draft 변경 시 자동 저장 (debounce)
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                if (draft) {
                    localStorage.setItem(DRAFT_KEY, draft);
                } else {
                    localStorage.removeItem(DRAFT_KEY);
                }
            } catch (error) {
                console.error('Failed to save draft:', error);
            }
        }, AUTOSAVE_INTERVAL);

        return () => clearTimeout(timer);
    }, [draft]);

    const clearDraft = () => {
        setDraft('');
        localStorage.removeItem(DRAFT_KEY);
    };

    return { draft, setDraft, clearDraft };
};
