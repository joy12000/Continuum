import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Session } from '@supabase/supabase-js';

import toast, { Toaster } from 'react-hot-toast';
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

import NewBottomNav from './components/NewBottomNav';
import { supabase } from './lib/supabase';
import AnswerCardsModal from './components/AnswerCardsModal';
import { GeneratedAnswer } from './components/GeneratedAnswer';
import { NoteDetailModal } from './components/NoteDetailModal';
import { addNoteAndChunks, getNotesByIds } from './lib/supabaseService';
import type { AnswerData, Note } from './types/common';
import UpdatePrompt from './components/UpdatePrompt';

import { SkySettingsProvider } from './contexts/SkySettingsContext';
import QuickSettingsPanel from './components/QuickSettingsPanel';
import ChannelService, { BootOption } from './lib/channel';

async function generateMemberHash(memberId: string): Promise<string> {
  const accessSecret = "6f868414934daf9cbbd7a84eb713eae5";
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(accessSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(memberId));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
  const [detailNoteId, setDetailNoteId] = useState<string | null>(null);

  async function generateSummaryAfterSave(newNoteId: string, noteText: string, userId: string) {
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
        toast.dismiss('ai-summary-toast');
        setGeneratedAnswer({ data: null, isLoading: false, error: "관련된 과거가 없습니다." });
        setAnswerOpen(true);
        return;
      }

      const contextNotes = await getNotesByIds(contextNoteIds);
      if (!contextNotes) throw new Error("Failed to fetch context notes.");

      // Exclude the newly created note itself from the context for the AI
      const finalContextNotes = contextNotes.filter((n: Note) => n.id !== newNoteId);

      // If no other notes are left in the context, inform the user.
      if (finalContextNotes.length === 0) {
        toast.dismiss('ai-summary-toast');
        setGeneratedAnswer({ data: null, isLoading: false, error: "관련된 과거가 없습니다." });
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

      toast.success("생각 연결이 완료되었습니다!", { id: 'ai-summary-toast' });
      setGeneratedAnswer({ data: finalAnswerData, isLoading: false, error: null });
      setAnswerSignal(s => s + 1);
      setAnswerOpen(true);
    } catch (error: any) {
      console.error("Failed to generate summary after save:", error);
      toast.error(`연결 실패: ${error.message}`, { id: 'ai-summary-toast' });
      setGeneratedAnswer({ data: null, isLoading: false, error: `오류가 발생했습니다: ${error.message}` });
      setAnswerOpen(true);
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

  useEffect(() => {
    ChannelService.loadScript();
    const bootChannelIO = async () => {
      const bootOption: BootOption = {
        pluginKey: "e802db19-481f-45bc-9ebc-f126ef36a392",
      };
      if (session?.user) {
        bootOption.memberId = session.user.id;
        // WARNING: This is not recommended for production.
        // The memberHash should be generated on the server-side.
        bootOption.memberHash = await generateMemberHash(session.user.id);
        bootOption.profile = {
          name: session.user.user_metadata.full_name,
          email: session.user.email,
        };
      }
      ChannelService.boot(bootOption);
      ChannelService.track('pageView');
    };
    bootChannelIO();
  }, [session]);

  useEffect(() => {
    if (location.pathname) {
      ChannelService.setPage(location.pathname);
    }
  }, [location.pathname]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>; // Or a splash screen
  }

  const noNavPaths = ['/settings', '/diagnostics', '/login'];
  const showNav = !noNavPaths.includes(location.pathname) && session;

  return (
    <div className="flex flex-col h-screen bg-surface text-text-primary">
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#f3f4f6',
            border: '1px solid #374151',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#1f2937',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1f2937',
            },
          },
        }}
      />
      <UpdatePrompt />
      <QuickSettingsPanel />
      <main className="flex-grow overflow-y-auto hide-scrollbar overflow-x-hidden">
        <Suspense fallback={<div className="flex justify-center items-center h-full">Loading Page...</div>}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              {session ? (
                <>
                  <Route path="/" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><HomeSky onOpenAnswer={() => setAnswerOpen(true)} answerSignal={answerSignal} /></motion.div>} />
                  <Route path="/settings" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><Settings /></motion.div>} />
                  <Route path="/calendar" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><CalendarPage session={session} /></motion.div>} />
                  <Route path="/search" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><SearchPage session={session} /></motion.div>} />
                  <Route path="/threads" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><LinksPage session={session} /></motion.div>} />
                  <Route path="/notes/:noteId" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><NoteDetailPage /></motion.div>} />
                  <Route path="/developer" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><DeveloperPage /></motion.div>} />
                  <Route path="/diagnostics" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><Diagnostics onBack={() => window.history.back()} /></motion.div>} />
                </>
              ) : (
                <Route path="*" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><LoginPage /></motion.div>} />
              )}
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
      {showNav && <NewBottomNav />}
      <AnswerCardsModal open={answerOpen} onClose={() => setAnswerOpen(false)}>
        {generatedAnswer.isLoading && <div className="p-4 text-center">답변 생성 중...</div>}
        {generatedAnswer.error && <div className="p-4 text-center text-red-500">오류: {generatedAnswer.error}</div>}
        {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} noteTitlesMap={noteTitlesMap} onNoteClick={(noteId) => setDetailNoteId(noteId)} />} 
      </AnswerCardsModal>
      {detailNoteId && (
        <NoteDetailModal
          noteId={detailNoteId}
          isOpen={!!detailNoteId}
          onClose={() => setDetailNoteId(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <SkySettingsProvider>
        <MainLayout />
      </SkySettingsProvider>
    </Router>
  );
}
