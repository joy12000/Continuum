import { useEffect } from 'react';

export const useAppLifecycle = () => {
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // 백그라운드로 갈 때
                console.log('App going to background');
                // 중요한 상태는 이미 localStorage에 자동 저장되고 있음
            } else {
                // 포그라운드로 돌아올 때
                console.log('App returning to foreground');
                // React Query가 자동으로 stale 데이터 refetch
            }
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // 작성 중인 글이 있으면 경고
            const draft = localStorage.getItem('momentum:draft');
            if (draft && draft.trim()) {
                e.preventDefault();
                e.returnValue = '작성 중인 내용이 있습니다. 정말 나가시겠습니까?';
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);
};
