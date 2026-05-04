'use client';
import React, { Suspense, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAnswerStore } from '@/store/answerStore';
import NewBottomNav from './NewBottomNav';
import AnswerCardsModal from './AnswerCardsModal';
import { NoteDetailModal } from './NoteDetailModal';
import { GeneratedAnswer } from './GeneratedAnswer';
import UpdatePrompt from './UpdatePrompt';
import QuickSettingsPanel from './QuickSettingsPanel';
import { useAppLifecycle } from '@/hooks/useAppLifecycle';
import { useGeneratedAnswer } from '@/hooks/useGeneratedAnswer';


export default function GlobalLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    if (session && pathname === '/login') {
      router.push('/');
    } else if (!session && pathname !== '/login') {
      router.push('/login');
    }
  }, [session, loading, pathname, mounted, router]);

  useAppLifecycle();
  useGeneratedAnswer();

  
  const {
    isOpen: answerOpen,
    data: answerData,
    isLoading: answerIsLoading,
    error: answerError,
    noteTitlesMap,
    detailNoteId,
    closeAnswer,
    setDetailNoteId
  } = useAnswerStore();

  if (!mounted || loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  const noNavPaths = ['/login', '/']; // Hide on home page as requested
  const showNav = !noNavPaths.includes(pathname || ""); // Temporarily allow without session for navigation check

  return (
    <>
      <UpdatePrompt />
      <QuickSettingsPanel />
      <main className="flex-grow overflow-y-auto hide-scrollbar overflow-x-hidden">
        {children}
      </main>
      {showNav && <NewBottomNav />}
      
      <AnswerCardsModal open={answerOpen} onClose={closeAnswer}>
        {answerIsLoading && <div className="p-4 text-center">답변을 생성하는 중입니다...</div>}
        {answerError && <div className="p-4 text-center text-red-500">오류 발생: {answerError}</div>}
        {answerData && (
          <GeneratedAnswer 
            data={answerData} 
            noteTitlesMap={noteTitlesMap} 
            onNoteClick={(noteId) => setDetailNoteId(noteId)} 
          />
        )}
      </AnswerCardsModal>

      {detailNoteId && (
        <NoteDetailModal
          noteId={detailNoteId}
          isOpen={!!detailNoteId}
          onClose={() => setDetailNoteId(null)}
        />
      )}
    </>
  );
}
