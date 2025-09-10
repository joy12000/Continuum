import React from 'react';
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
export declare const SkySettingsProvider: ({ children }: {
    children: React.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const useSkySettings: () => SkySettingsContextType;
export {};
//# sourceMappingURL=SkySettingsContext.d.ts.map