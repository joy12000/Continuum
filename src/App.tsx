import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import HomeSky from './pages/HomeSky'; // Corrected import path
import Settings from './pages/Settings';
import CalendarPage from './pages/CalendarPage';
import SearchPage from './pages/SearchPage';
import LinksPage from './pages/LinksPage';

import Diagnostics from './components/Diagnostics';
import { Toasts } from './components/Toasts';

import NewBottomNav from './components/NewBottomNav';
import { supabase } from './lib/supabase';
import { addNoteAndChunks, getNotesByIds } from './lib/supabaseService';
import LoginPage from './pages/LoginPage';
import { Session } from '@supabase/supabase-js';
import { AnswerData, Note } from './types/common';
import AnswerCardsModal from './components/AnswerCardsModal';
import { GeneratedAnswer } from './components/GeneratedAnswer';
import DeveloperPage from './pages/DeveloperPage';

// Main layout component to handle conditional nav bar and protected routes
const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [answerOpen, setAnswerOpen] = useState(false);
  const [answerSignal, setAnswerSignal] = useState(0);
  const [generatedAnswer, setGeneratedAnswer] = useState<{ data: AnswerData | null; isLoading: boolean; error: string | null }>({
    data: null,
    isLoading: false,
    error: null,
  });

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
        const newNote = await addNoteAndChunks({ title: detail.text.slice(0, 50), body: detail.text, user_id: user.id });
        // Add a 2-second delay to allow the database index to update
        setTimeout(() => {
          generateSummaryAfterSave(detail.text, user.id);
        }, 2000);
      } catch (error) {
        console.error("Failed to save note from HomeSky:", error);
      }
    };

    window.addEventListener('sky:save', handleSave);
    return () => window.removeEventListener('sky:save', handleSave);
  }, []);

  async function generateSummaryAfterSave(noteText: string, userId: string) {
    try {
      setGeneratedAnswer({ data: null, isLoading: true, error: null });
  
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1. Search for similar notes
      const searchRes = await fetch(`/api/v1?action=search&q=${encodeURIComponent(noteText)}&uid=${userId}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!searchRes.ok) throw new Error("Failed to search for similar notes.");
      const similarChunks = await searchRes.json();
  
      // 2. Get top 3 unique note IDs from chunks
      const uniqueNoteIds = [...new Set(similarChunks.map((c: any) => c.note_id))] as string[];
      if (uniqueNoteIds.length === 0) {
        setGeneratedAnswer({ data: null, isLoading: false, error: "유사한 노트를 찾지 못했습니다." });
        setAnswerOpen(true); // Open the modal to show this message
        return;
      }
      const top3NoteIds = uniqueNoteIds.slice(0, 3);
  
      if (uniqueNoteIds.length === 0) {
        setGeneratedAnswer({ data: null, isLoading: false, error: "유사한 노트를 찾지 못했습니다." });
        return;
      }
  
      // 3. Fetch full content of these notes
      const contextNotes = await getNotesByIds(uniqueNoteIds);
      if (!contextNotes) throw new Error("Failed to fetch context notes.");
  
      // 4. Call generate API
      const generateRes = await fetch('/api/v1?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rag',
          input: { query: noteText },
          context: contextNotes.map((n: Note) => ({ id: n.id, body: n.content }))
        })
      });
  
      if (!generateRes.ok || !generateRes.body) {
        throw new Error("Failed to generate summary.");
      }
  
      // 5. Handle streaming response
      const reader = generateRes.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullAnswer += decoder.decode(value, { stream: true });
      }
  
      const finalAnswerData: AnswerData = {
        answerSegments: [{ sentence: fullAnswer, sourceNoteId: '' }], // Simplified for now
        sourceNotes: contextNotes.map((n: Note) => n.id),
      };
  
      setGeneratedAnswer({ data: finalAnswerData, isLoading: false, error: null });
      setAnswerSignal(s => s + 1);
      setAnswerOpen(true); // Open the modal to show the result
  
    } catch (error) {
      console.error("Failed to generate summary after save:", error);
      setGeneratedAnswer({ data: null, isLoading: false, error: (error as Error).message });
      setAnswerOpen(true); // Open the modal to show the error
    }
  }

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
    <div className="flex flex-col h-screen bg-surface text-text-primary">
      <Toasts />
      <main className="flex-grow overflow-y-auto">
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