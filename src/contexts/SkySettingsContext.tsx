import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

// 1. 타입 정의
interface QuickPrefs {
  starDensity: number;
  starBrightness: number;
}

interface SkySettingsContextType {
  prefs: QuickPrefs;
  setPrefs: React.Dispatch<React.SetStateAction<QuickPrefs>>;
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

const DEFAULT_PREFS: QuickPrefs = {
  starDensity: 1.0,
  starBrightness: 1.0,
};

// 2. Context 생성
const SkySettingsContext = createContext<SkySettingsContextType | undefined>(undefined);

// 3. Provider 컴포넌트 생성
export const SkySettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [prefs, setPrefs] = useState<QuickPrefs>(() => {
    try {
      const saved = localStorage.getItem("sky.prefs");
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
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

  return (
    <SkySettingsContext.Provider value={value}>
      {children}
    </SkySettingsContext.Provider>
  );
};

// 4. Custom Hook 생성
export const useSkySettings = () => {
  const context = useContext(SkySettingsContext);
  if (context === undefined) {
    throw new Error('useSkySettings must be used within a SkySettingsProvider');
  }
  return context;
};