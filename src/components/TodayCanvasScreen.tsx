import React, { useState, useEffect, useRef } from 'react';
import { RichNoteEditor } from './RichNoteEditor';
import { db, Note } from '../lib/db';
import { SearchBar } from './SearchBar';
import { RecallCards } from './RecallCards';
import { liveQuery } from 'dexie';

// App.tsx에서 가져온 useLiveNotes 훅
function useLiveNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    const sub = liveQuery(() => db.notes.orderBy("updatedAt").reverse().toArray()).subscribe({
      next: setNotes, error: (e) => console.error("liveQuery error", e)
    });
    return () => sub.unsubscribe();
  }, []);
  return notes;
}


const NOTE_ID = 'today-canvas';

export function TodayCanvasScreen() {
  const [note, setNote] = useState<Note | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  
  const allNotes = useLiveNotes();
  const [q, setQ] = useState("");

  // 검색 기능은 아직 완전히 구현되지 않았으므로, 필터링된 노트는 allNotes를 그대로 사용합니다.
  const filteredNotes = allNotes.filter(n => n.id !== NOTE_ID);

  useEffect(() => {
    const loadNote = async () => {
      let todayNote = await db.notes.get(NOTE_ID);
      if (!todayNote) {
        todayNote = {
          id: NOTE_ID,
          content: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tags: ['today'],
        };
        await db.notes.put(todayNote);
      }
      setNote(todayNote);
    };

    loadNote();
  }, []);

  const editorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      // 에디터 내용이 스크롤될 게 없거나, 이미 최상단에 있을 때 위로 스크롤하면 검색창 열기
      if (container.scrollTop === 0 && event.deltaY < 0) {
        setIsSearchVisible(true);
      }
    };

    container.addEventListener('wheel', handleWheel);
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [note]); // note가 로드된 후 ref가 설정되므로 의존성 배열에 추가

  const handleNoteChange = (content: string) => {
    if (note) {
      const updatedNote = { ...note, content, updatedAt: Date.now() };
      setNote(updatedNote);
      db.notes.put(updatedNote);
    }
  };

  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  if (showAllNotes) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">전체 노트</h1>
          <button className="btn" onClick={() => setShowAllNotes(false)}>오늘의 캔버스 돌아가기</button>
        </div>
        <SearchBar q={q} setQ={setQ} />
        <div className="mt-4">
          <RecallCards notes={filteredNotes} onClickTag={(t) => setQ(`tag:${t}`)} setQuery={setQ} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen p-4">
      <header className="flex justify-between items-center text-center mb-4">
        <div className="w-10"></div> {/* For spacing */}
        <h1 className="text-lg font-semibold">{dateFormatter.format(today)}</h1>
        <button onClick={() => setIsSearchVisible(!isSearchVisible)} className="p-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </header>

      {/* Animated SearchBar */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isSearchVisible ? 'max-h-40 mb-4' : 'max-h-0'}`}>
        <SearchBar q={q} setQ={setQ} />
      </div>

      <div ref={editorContainerRef} className="flex-grow flex flex-col overflow-y-auto" style={{ display: note ? 'flex' : 'none' }}>
        {note && (
          <RichNoteEditor
            note={note}
            onSave={handleNoteChange}
            autoFocus={true}
            hideSaveButton={true}
          />
        )}
      </div>
      {!note && <div className="flex-grow text-center">Loading...</div>}

      {/* FAB */}
      <button 
        onClick={() => setIsMenuOpen(true)}
        className="fixed bottom-8 right-8 bg-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* BottomSheet */}
      <div 
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ease-in-out ${isMenuOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      >
        <div 
          className={`fixed bottom-0 left-0 right-0 bg-slate-800 p-4 rounded-t-lg z-50 transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-y-0' : 'translate-y-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
            <ul className="space-y-2">
              <li>
                <button className="w-full text-left p-2 rounded hover:bg-slate-700">새 노트 작성</button>
              </li>
              <li>
                <button className="w-full text-left p-2 rounded hover:bg-slate-700">이미지/파일 첨부</button>
              </li>
              <li>
                <button 
                  onClick={() => {
                    setShowAllNotes(true);
                    setIsMenuOpen(false);
                  }} 
                  className="w-full text-left p-2 rounded hover:bg-slate-700"
                >
                  전체 노트 목록 보기
                </button>
              </li>
            </ul>
          </div>
        </div>
    </div>
  );
}
