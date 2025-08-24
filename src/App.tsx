import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import HomePageWithSky from './pages/HomePageWithSky';
import { Settings } from './components/Settings';
import Diagnostics from './components/Diagnostics';
import { Toasts } from './components/Toasts';
import { getSemanticAdapter } from "./lib/semantic";

export default function App() {
  const [engine, setEngine] = useState<'auto' | 'remote'>((localStorage.getItem('semanticEngine') as any) || 'auto');
  const [modelStatus, setModelStatus] = useState("확인 중…");

  useEffect(() => {
    let dead = false;

    const updateStatus = (message: string) => {
      if (!dead) setModelStatus(message);
    };

    const checkLocalEngine = async () => {
      updateStatus("로컬 엔진 준비 중…");
      try {
        const a = await getSemanticAdapter("auto");
        const ok = await a.ensureReady();
        
        if (dead) return;
        updateStatus(ok ? "로컬 임베딩 준비 완료(onnxruntime)" : "로컬 임베딩 없음(해시 사용)");

      } catch (error) {
        console.error("Failed to prepare local engine:", error);
        updateStatus("로컬 엔진 준비 실패. 원격 API 사용.");
      }
    };

    if (engine === "remote") {
      updateStatus("원격 API 사용");
    } else {
      checkLocalEngine();
    }

    return () => { dead = true; };
  }, [engine]);

  const SettingsWrapper = () => {
    const navigate = useNavigate();
    return (
      <Settings 
        engine={engine} 
        setEngine={setEngine} 
        onNavigateHome={() => navigate('/')} 
        onNavigateToDiagnostics={() => navigate('/diagnostics')} 
        modelStatus={modelStatus} 
      />
    );
  };

  return (
    <Router>
      <Toasts />
      <Routes>
        <Route path="/" element={<HomePageWithSky />} />
        <Route path="/settings" element={<SettingsWrapper />} />
        <Route path="/diagnostics" element={<Diagnostics onBack={() => window.history.back()} />} />
      </Routes>
    </Router>
  );
}

