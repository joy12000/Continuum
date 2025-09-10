import { useState, useEffect } from 'react';
export const usePWAInstall = () => {
    const [installPrompt, setInstallPrompt] = useState(null);
    useEffect(() => {
        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setInstallPrompt(event);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);
    const triggerInstall = async () => {
        if (!installPrompt)
            return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        else {
            console.log('User dismissed the install prompt');
        }
        setInstallPrompt(null);
    };
    return { canInstall: !!installPrompt, triggerInstall };
};
