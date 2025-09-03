import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

// Lazy load pages
const HomeSky = lazy(() => import('./pages/HomeSky'));
const Settings = lazy(() => import('./pages/Settings'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const LinksPage = lazy(() => import('./pages/LinksPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DeveloperPage = lazy(() => import('./pages/DeveloperPage'));

import Diagnostics from './components/Diagnostics';
import { Toasts } from './components/Toasts';

import NewBottomNav from './components/NewBottomNav';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import AnswerCardsModal from './components/AnswerCardsModal';
import { GeneratedAnswer } from './components/GeneratedAnswer';
import { useGeneratedAnswer } from './hooks/useGeneratedAnswer';

// Main layout component to handle conditional nav bar and protected routes
const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { answerOpen, setAnswerOpen, generatedAnswer, answerSignal } = useGeneratedAnswer();

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

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>; // Or a splash screen
  }

  const noNavPaths = ['/settings', '/diagnostics', '/login'];
  const showNav = !noNavPaths.includes(location.pathname) && session;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Toasts />
      <main className="flex-grow overflow-y-auto">
        <Suspense fallback={<div className="flex justify-center items-center h-full">Loading Page...</div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            {session ? (
              <>
                <Route path="/" element={<HomeSky onOpenAnswer={() => setAnswerOpen(true)} answerSignal={answerSignal} />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/search" element={<SearchPage session={session} />} />
                <Route path="/threads" element={<LinksPage />} />
                
                <Route path="/diagnostics" element={<Diagnostics onBack={() => window.history.back()} />} />
                <Route path="/developer" element={<DeveloperPage />} />
              </>
            ) : (
              <Route path="*" element={<LoginPage />} />
            )}
          </Routes>
        </Suspense>
      </main>
      {showNav && <NewBottomNav />}
      <AnswerCardsModal open={answerOpen} onClose={() => setAnswerOpen(false)}>
        {generatedAnswer.isLoading && <div className="p-4 text-center">답변 생성 중...</div>}
        {generatedAnswer.error && <div className="p-4 text-center text-red-500">오류: {generatedAnswer.error}</div>}
        {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} />} 
      </AnswerCardsModal>
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