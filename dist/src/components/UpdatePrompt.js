import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
const UpdatePrompt = () => {
    const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker, } = useRegisterSW();
    useEffect(() => {
        if (needRefresh) {
            updateServiceWorker(true);
        }
    }, [needRefresh, updateServiceWorker]);
    return null;
};
export default UpdatePrompt;
