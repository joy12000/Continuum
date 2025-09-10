import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
const DEFAULT_PREFS = {
    starDensity: 1.0,
    starBrightness: 1.0,
};
// 2. Context 생성
const SkySettingsContext = createContext(undefined);
// 3. Provider 컴포넌트 생성
export const SkySettingsProvider = ({ children }) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [prefs, setPrefs] = useState(() => {
        try {
            const saved = localStorage.getItem("sky.prefs");
            return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
        }
        catch {
            return DEFAULT_PREFS;
        }
    });
    useEffect(() => {
        localStorage.setItem("sky.prefs", JSON.stringify(prefs));
    }, [prefs]);
    const value = useMemo(() => ({
        prefs,
        setPrefs,
        isPanelOpen,
        openPanel: () => setIsPanelOpen(true),
        closePanel: () => setIsPanelOpen(false),
        togglePanel: () => setIsPanelOpen(prev => !prev),
    }), [prefs, isPanelOpen]);
    return (_jsx(SkySettingsContext.Provider, { value: value, children: children }));
};
// 4. Custom Hook 생성
export const useSkySettings = () => {
    const context = useContext(SkySettingsContext);
    if (context === undefined) {
        throw new Error('useSkySettings must be used within a SkySettingsProvider');
    }
    return context;
};
