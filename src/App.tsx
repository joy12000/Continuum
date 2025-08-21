import React, { useState } from 'react';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Toasts } from "./components/Toasts";
import TodayCanvasScreen from "./components/TodayCanvasScreen";
import { Settings } from "./components/Settings";
import Diagnostics from "./components/Diagnostics";

type View = 'today' | 'settings' | 'diagnostics';
type Engine = "auto" | "remote";

export default function App() {
  const [view, setView] = useState<View>('today');
  const [engine, setEngine] = useState<Engine>(() => (localStorage.getItem("semanticEngine") as Engine) || "auto");

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-3 sm:p-6 flex flex-col gap-6">
        <TodayCanvasScreen onNavigate={setView} />
        <Toasts />
      </div>
    </ErrorBoundary>
  );
}