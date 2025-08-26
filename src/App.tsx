import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import HomeSky from './pages/HomeSky'; // Corrected import path
import Settings from './pages/Settings';
import CalendarPage from './pages/CalendarPage';
import SearchPage from './pages/SearchPage';
import LinksPage from './pages/LinksPage';
import Diagnostics from './components/Diagnostics';
import { Toasts } from './components/Toasts';
import { getSemanticAdapter } from "./lib/semantic";
import NewBottomNav from './components/NewBottomNav';
import { supabase } from './lib/supabase';
import { addNoteAndChunks } from './lib/supabaseService';
import LoginPage from './pages/LoginPage';
import { Session } from '@supabase/supabase-js';

// Main layout component to handle conditional nav bar and protected routes
const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [engine, setEngine] = useState<'auto' | 'remote'>((localStorage.getItem('semanticEngine') as any) || 'auto');
  const [modelStatus, setModelStatus] = useState("확인 중…");

  useEffect(() => {
    const handleSave = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.text) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("User not logged in, cannot save note.");
        return;
      }

      try {
        await addNoteAndChunks({ title: detail.text.slice(0, 50), body: detail.text, user_id: user.id });
      } catch (error) {
        console.error("Failed to save note from HomeSky:", error);
      }
    };

    window.addEventListener('sky:save', handleSave);
    return () => window.removeEventListener('sky:save', handleSave);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (_event === 'SIGNED_OUT') {
        navigate('/login');
      }
      if (_event === 'SIGNED_IN') {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    let dead = false;
    const updateStatus = (message: string) => { if (!dead) setModelStatus(message); };
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
    if (engine === "remote") { updateStatus("원격 API 사용"); } else { checkLocalEngine(); }
    return () => { dead = true; };
  }, [engine]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>; // Or a splash screen
  }

  const noNavPaths = ['/settings', '/diagnostics', '/login'];
  const showNav = !noNavPaths.includes(location.pathname) && session;

  return (
    <div className="flex flex-col h-screen bg-surface text-text-primary">
      <Toasts />
      <main className="flex-grow overflow-y-auto">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {session ? (
            <>
              <Route path="/" element={<HomeSky />} />
              <Route path="/settings" element={<Settings engine={engine} setEngine={setEngine} modelStatus={modelStatus} />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/recall" element={<LinksPage />} />
              <Route path="/diagnostics" element={<Diagnostics onBack={() => window.history.back()} />} />
            </>
          ) : (
            <Route path="*" element={<LoginPage />} />
          )}
        </Routes>
      </main>
      {showNav && <NewBottomNav />}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}
