import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';

import toast from 'react-hot-toast';
// Lazy load pages
const HomeSky = lazy(() => import('./pages/HomeSky'));
const Settings = lazy(() => import('./pages/Settings'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const LinksPage = lazy(() => import('./pages/LinksPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DeveloperPage = lazy(() => import('./pages/DeveloperPage'));

import NoteDetailPage from './pages/NoteDetailPage'; // Not lazy
const Diagnostics = lazy(() => import('./components/Diagnostics'));

import { Toasts } from './components/Toasts';

import NewBottomNav from './components/NewBottomNav';
import { supabase } from './lib/supabase';
import AnswerCardsModal from './components/AnswerCardsModal';
import { GeneratedAnswer } from './components/GeneratedAnswer';
import { addNoteAndChunks, getNotesByIds } from './lib/supabaseService';
import type { AnswerData, Note } from './types/common';
import GlobalStatusMoon, { NotificationStatus } from './components/GlobalStatusMoon';

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
  const [noteTitlesMap, setNoteTitlesMap] = useState<Record<string, string>>({});
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('idle');

  async function generateSummaryAfterSave(newNoteId: string, noteText: string, userId: string) {
    setNotificationStatus('loading');
    toast.loading("과거 노트와 연결하는 중...", { id: 'ai-summary-toast' });
    try {
      setGeneratedAnswer({ data: null, isLoading: true, error: null });
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const clusterRes = await fetch(`/api/v1?action=find-context-cluster&noteId=${newNoteId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
      });
      if (!clusterRes.ok) throw new Error("Failed to find context cluster.");
      
      const { contextNoteIds } = await clusterRes.json();
      // If the cluster only contains the new note itself (or is empty),
      // it means no other relevant notes were found to form a meaningful context.
      if (!contextNoteIds || contextNoteIds.length <= 1) {
        setNotificationStatus('idle');
        toast.dismiss('ai-summary-toast');
        setGeneratedAnswer({ data: null, isLoading: false, error: "연결할 만한 과거 노트를 찾지 못했습니다." });
        setAnswerOpen(true);
        return;
      }

      const contextNotes = await getNotesByIds(contextNoteIds);
      if (!contextNotes) throw new Error("Failed to fetch context notes.");

      // Exclude the newly created note itself from the context for the AI
      const finalContextNotes = contextNotes.filter((n: Note) => n.id !== newNoteId);

      // If no other notes are left in the context, inform the user.
      if (finalContextNotes.length === 0) {
        setNotificationStatus('idle');
        toast.dismiss('ai-summary-toast');
        setGeneratedAnswer({ data: null, isLoading: false, error: "새 노트를 제외하고 연결된 다른 노트가 없습니다." });
        setAnswerOpen(true);
        return;
      }

      const newNoteTitlesMap: Record<string, string> = {};
      contextNotes.forEach((n: Note) => {
        newNoteTitlesMap[n.id] = n.title || 'Untitled Note';
      });
      setNoteTitlesMap(newNoteTitlesMap);

      const generateRes = await fetch('/api/v1?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rag',
          input: { query: noteText },
          context: finalContextNotes.map((n: Note) => ({ id: n.id, body: n.body })),
        }),
      });
      if (!generateRes.ok || !generateRes.body) throw new Error("Failed to generate summary.");
      
      // The API now returns a structured JSON object, not a stream.
      const result = await generateRes.json();
      const summaryText = result?.data?.summary;      
      if (!summaryText) throw new Error("AI response did not contain a valid summary.");

      const finalAnswerData: AnswerData = {
        answerSegments: [{ sentence: summaryText, sourceNoteId: '' }], // Display the whole summary as one segment
        sourceNotes: finalContextNotes.map((n: Note) => n.id),
      };

      setNotificationStatus('success');
      toast.success("생각 연결이 완료되었습니다!", { id: 'ai-summary-toast' });
      setGeneratedAnswer({ data: finalAnswerData, isLoading: false, error: null });
      setAnswerSignal(s => s + 1);
      setAnswerOpen(true);
      setTimeout(() => setNotificationStatus('idle'), 4000); // Reset after 4s
    } catch (error: any) {
      console.error("Failed to generate summary after save:", error);
      setNotificationStatus('error');
      toast.error(`연결 실패: ${error.message}`, { id: 'ai-summary-toast' });
      setGeneratedAnswer({ data: null, isLoading: false, error: `오류가 발생했습니다: ${error.message}` });
      setAnswerOpen(true);
      setTimeout(() => setNotificationStatus('idle'), 4000); // Reset after 4s
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

  useEffect(() => {
    const handleSave = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.text) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        console.error("User not logged in, cannot save note.");
        return;
      }
      try {
        // Step 1: Create the note with a null title.
        const newNote = await addNoteAndChunks({ title: undefined, body: detail.text, user_id: user.id });

        // Step 2: Immediately call the update-note endpoint.
        // This reuses the existing backend logic to generate a title and tags.
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        await fetch(`/api/v1?action=update-note&noteId=${newNote.id}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` })
            },
            // The backend `update-note` handler will see the body but no title,
            // and trigger the `generateTitleAndTags` function.
            body: JSON.stringify({ body: detail.text }) 
        });

        // Step 3: Now that the note is fully set up, start the AI connection process.
        // The delay is kept to allow vector indexes to propagate.
        setTimeout(() => {
          generateSummaryAfterSave(newNote.id, detail.text, user.id);
        }, 2000);
      } catch (error) {
        console.error("Failed to save note and generate title:", error);
        toast.error("노트 저장 중 오류가 발생했습니다.");
      }
    };
    window.addEventListener('sky:save', handleSave);
    return () => window.removeEventListener('sky:save', handleSave);
  }, []); // Empty dependency array ensures this runs only once and cleans up on unmount

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>; // Or a splash screen
  }

  const noNavPaths = ['/settings', '/diagnostics', '/login'];
  const showNav = !noNavPaths.includes(location.pathname) && session;

  return (
    <div className="flex flex-col h-screen bg-surface text-text-primary">
      <Toasts />
      {session && <GlobalStatusMoon status={notificationStatus} />}
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
                <Route path="/notes/:noteId" element={<NoteDetailPage />} />
                <Route path="/developer" element={<DeveloperPage />} />
                <Route path="/diagnostics" element={<Diagnostics onBack={() => window.history.back()} />} />
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
        {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} noteTitlesMap={noteTitlesMap} />} 
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