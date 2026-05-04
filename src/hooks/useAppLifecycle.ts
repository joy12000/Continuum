import { useEffect } from 'react';

export const useAppLifecycle = () => {
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // App entering background
                console.log('App going to background');
            } else {
                // App entering foreground
                console.log('App returning to foreground');
            }
        };

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Check for unsaved changes before unload
            const draft = localStorage.getItem('momentum:draft');
            if (draft && draft.trim()) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
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
