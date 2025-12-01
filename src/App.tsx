import React, { useEffect, Suspense, lazy, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient

import toast, { Toaster } from 'react-hot-toast';
// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const HomeChat = lazy(() => import('./pages/HomeChat'));
const Settings = lazy(() => import('./pages/Settings'));
const CalendarPage = lazy(() => import('./features/calendar/CalendarPage'));
const SearchPage = lazy(() => import('./features/search/SearchPage'));
const LinksPage = lazy(() => import('./features/links/LinksPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DeveloperPage = lazy(() => import('./pages/DeveloperPage'));
const NoteDetailPage = lazy(() => import('./features/notes/NoteDetailPage'));
const Diagnostics = lazy(() => import('./components/Diagnostics'));

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
import { fetchNoteActivity } from './features/calendar/services/calendarService'; // Import fetchNoteActivity
import { useAppLifecycle } from './hooks/useAppLifecycle'; // PWA 라이프사이클 훅
import { useAuth } from './contexts/AuthContext'; // Auth context
import { useAnswerStore } from './store/answerStore'; // Zustand store
import { syncChatBundle } from './services/chatBundleService';
import { CHAT_BUNDLE_EVENT, CHAT_SUMMARY_EVENT } from './lib/events';

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

// Helper function for YYYY-MM-DD format
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Main layout component to handle conditional nav bar and protected routes
const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const lastNavigationRef = useRef(0);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  useAppLifecycle(); // PWA 라이프사이클 이벤트 처리

  // Use AuthContext instead of local state
  const { session, loading } = useAuth();

  // Use Zustand store instead of local state
  const {
    isOpen: answerOpen,
    signal: answerSignal,
    data: answerData,
    isLoading: answerIsLoading,
    error: answerError,
    noteTitlesMap,
    detailNoteId,
    openAnswer,
    closeAnswer,
    incrementSignal,
    setAnswer,
    setLoading,
    setError,
    setDetailNoteId
  } = useAnswerStore();

  async function generateSummaryAfterSave(newNoteId: string, noteText: string, userId: string, createdAt?: number) {
    try {
      setLoading(true);
      const syncResult = await syncChatBundle({
        noteId: newNoteId,
        body: noteText,
        createdAt: createdAt ?? Date.now(),
      });

      const summaryText = syncResult.summary?.trim() || 'AI 요약을 생성하지 못했습니다.';
      const answerData: AnswerData = {
        answerSegments: [{ sentence: summaryText, sourceNoteId: newNoteId }],
        sourceNotes: [newNoteId],
      };
      const fallbackTitle = noteText.slice(0, 40) || '새 노트';
      const titles = {
        [newNoteId]: syncResult.fileMetadata?.display_name || fallbackTitle,
      };
      setAnswer(answerData, titles);
      incrementSignal();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CHAT_SUMMARY_EVENT, {
          detail: {
            summary: summaryText,
            noteId: newNoteId,
            createdAt: createdAt ?? Date.now(),
          },
        }));
      }
    } catch (error: any) {
      setError(error.message);
      openAnswer();
    }
  }

  useEffect(() => {
    // Pre-fetch calendar data for the current month if authenticated
    if (session) {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth(); // 0-indexed

      const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

      queryClient.prefetchQuery({
        queryKey: ['noteActivity', year, month],
        queryFn: () => fetchNoteActivity(firstDayOfMonth, lastDayOfMonth),
      });
    }
  }, [session, queryClient]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
          generateSummaryAfterSave(newNote.id, detail.text, user.id, detail.createdAt);
        }, 2000);
      } catch (error) {
        console.error("Failed to save note and generate title:", error);
        toast.error("노트 저장 중 오류가 발생했습니다.");
      }
    };
    window.addEventListener(CHAT_BUNDLE_EVENT, handleSave);
    return () => window.removeEventListener(CHAT_BUNDLE_EVENT, handleSave);
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

  useEffect(() => {
    const navigationOrder = ['/chat', '/calendar', '/search', '/threads'];

    const navigateByDelta = (direction: 'next' | 'prev') => {
      const currentIndex = navigationOrder.indexOf(location.pathname);
      if (currentIndex === -1) return;
      const nextPath = direction === 'next' ? navigationOrder[currentIndex + 1] : navigationOrder[currentIndex - 1];
      if (nextPath) {
        navigate(nextPath);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      const now = Date.now();
      if (now - lastNavigationRef.current < 700) return;
      if (Math.abs(event.deltaX) < 35 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      if (!session || !navigationOrder.includes(location.pathname)) return;
      lastNavigationRef.current = now;
      navigateByDelta(event.deltaX > 0 ? 'next' : 'prev');
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const elapsed = Date.now() - touchStartRef.current.time;

      if (elapsed > 500 || Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      if (!session || !navigationOrder.includes(location.pathname)) return;

      lastNavigationRef.current = Date.now();
      navigateByDelta(deltaX < 0 ? 'next' : 'prev');
    };

    const node = mainContentRef.current;
    if (!node) return;

    node.addEventListener('wheel', handleWheel, { passive: true });
    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      node.removeEventListener('wheel', handleWheel);
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchend', handleTouchEnd);
    };
  }, [location.pathname, navigate, session]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>; // Or a splash screen
  }

  return (
    <div className="flex flex-col h-screen bg-[#f6f7fb] text-slate-900">
      <Toaster
        position="top-center"
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
      <main ref={mainContentRef} className="flex-grow overflow-y-auto hide-scrollbar overflow-x-hidden">
        <Suspense fallback={<div className="flex justify-center items-center h-full">Loading Page...</div>}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              {session ? (
                <>
                  <Route
                    path="/"
                    element={
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <Home />
                      </motion.div>
                    }
                  />
                  <Route
                    path="/chat"
                    element={
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <HomeChat resetKey={location.key} onOpenAnswer={openAnswer} answerSignal={answerSignal} />
                      </motion.div>
                    }
                  />
                  <Route path="/settings" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><Settings /></motion.div>} />
                  <Route path="/calendar" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><CalendarPage /></motion.div>} />
                  <Route path="/search" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><SearchPage /></motion.div>} />
                  <Route path="/threads" element={<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><LinksPage /></motion.div>} />
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
      <AnswerCardsModal open={answerOpen} onClose={closeAnswer}>
        {answerIsLoading && <div className="p-4 text-center">답변 생성 중...</div>}
        {answerError && <div className="p-4 text-center text-red-500">오류: {answerError}</div>}
        {answerData && <GeneratedAnswer data={answerData} noteTitlesMap={noteTitlesMap} onNoteClick={(noteId) => setDetailNoteId(noteId)} />}
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
      <AuthProvider>
        <SkySettingsProvider>
          <MainLayout />
        </SkySettingsProvider>
      </AuthProvider>
    </Router>
  );
}
