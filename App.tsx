import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { liveQuery } from 'dexie';
import { db, Note } from './lib/db';
import { SemWorkerClient } from './lib/semWorkerClient';
import { BM25 } from './lib/search/bm25';
import { rrfFuse } from './lib/search/rrf';
import { cosineSim } from './lib/search/cosine';
import Today from './components/Today';
import TabBar from './components/TabBar';
import { Settings } from './components/Settings'; // 명명된 가져오기로 변경
import Diagnostics from './components/Diagnostics'; // 기본 가져오기 유지
import { Toasts } from './components/Toasts';
import { AnswerData, SearchResult } from './types/common';
import { getConfig } from './lib/config'; // getConfig 가져오기
import { getSemanticAdapter } from "./lib/semantic";
import HomeSky from './components/HomeSky';
import AnswerCardsModal from './components/AnswerCardsModal';
import OverlayEditor from './components/OverlayEditor';
import { GeneratedAnswer } from './components/GeneratedAnswer';
import { addNoteAndChunks } from './lib/supabaseService';
import { supabase } from './lib/supabase';

// --- 타입 정의 ---
type View = 'today' | 'settings' | 'diagnostics';

// --- 커스텀 훅 ---
function useLiveNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    const sub = liveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray())
      .subscribe({ next: setNotes, error: (e) => console.error("liveQuery error", e) });
    return () => sub.unsubscribe();
  }, []);
  return notes;
}

// [추가] API 호출 추상화 함수
async function callGenerateApi(payload: object, endpoint: string = '/.netlify/functions/generate'): Promise<any> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText || response.status}`);
  }
  return response.json();
}

// --- 메인 앱 컴포넌트 ---
export default function App() {
  
// --- Periodic Sync support check ---
const [supportsPeriodic, setSupportsPeriodic] = React.useState<boolean>(true);
React.useEffect(() => {
  const ok = 
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    // @ts-ignore experimental
    'periodicSync' in (navigator as any);
  setSupportsPeriodic(!!ok);
  (window as any).__SUPPORTS_PERIODIC_SYNC__ = !!ok;
}, []);
// --- 상태 관리 (State Management) ---
  const [view, setView] = useState<View>('today');
  const [editorOpen, setEditorOpen] = useState(false)
  const [answerOpen, setAnswerOpen] = useState(false)
  const [answerSignal, setAnswerSignal] = useState(0)
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [engine, setEngine] = useState<'auto' | 'remote'>((localStorage.getItem('semanticEngine') as any) || 'auto');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState("확인 중…");
  const [isModelReady, setIsModelReady] = useState(false);
  
  // 제안 질문 관련 상태
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // AI 요약 답변 관련 상태 (명시적 타입 지정)
  const [generatedAnswer, setGeneratedAnswer] = useState({
    data: null,
    isLoading: false,
    error: null
  } as { data: AnswerData | null; isLoading: boolean; error: string | null });

  // 시맨틱 검색 결과 상태
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);

  // --- 데이터 및 인스턴스 ---
  const notes = useLiveNotes();
  const semWorker = useMemo(() => new SemWorkerClient(), []);

  const bm25Index = useMemo(() => {
    const idx = new BM25();
    notes.forEach(n => idx.add({ id: n.id!, text: [n.content, n.tags.join(" ")].join(" ") }));
    idx.build();
    return idx;
  }, [notes]);

  // --- useEffect 훅 ---

  // 모델 상태 체크
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
        setIsModelReady(ok);

      } catch (error) {
        console.error("Failed to prepare local engine:", error);
        updateStatus("로컬 엔진 준비 실패. 원격 API 사용.");
        setIsModelReady(false);
      }
    };

    if (engine === "remote") {
      updateStatus("원격 API 사용");
      setIsModelReady(true); // Remote API is always ready
    } else {
      checkLocalEngine();
    }

    return () => { dead = true; };
  }, [engine]);

  // 검색어 디바운스 처리
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(handler);
  }, [q]);

  // 온디바이스 임베딩 생성
  useEffect(() => {
    (async () => {
      if (notes.length === 0) return;
      await semWorker.ensure();
      const existing = new Set((await db.embeddings.toArray()).map(e => e.noteId));
      const toEmbed = notes.filter(n => n.id && !existing.has(n.id));
      if (toEmbed.length === 0) return;
      const vecs = await semWorker.embed(engine, toEmbed.map(n => [n.content, n.tags.join(" ")].join(" ")));
      await db.embeddings.bulkPut(toEmbed.map((n, i) => ({ noteId: n.id!, vec: vecs[i] })));
    })();
  }, [notes, engine, semWorker]);

  // 시맨틱 검색 결과 계산 및 finalResults 융합
  useEffect(() => {
    const performSemanticSearch = async () => {
      if (!debouncedQ.trim() || !isModelReady) {
        setSemanticResults([]);
        return;
      }

      try {
        const queryVec = (await semWorker.embed([debouncedQ]))[0];
        const allEmbeddings = await db.embeddings.toArray();
        const semanticScores = allEmbeddings.map(e => ({
          id: e.noteId,
          score: cosineSim(queryVec, e.vec),
          text: notes.find(n => n.id === e.noteId)?.content || '', // Note content for context
          noteId: e.noteId
        }));
        semanticScores.sort((a, b) => b.score - a.score);
        setSemanticResults(semanticScores);

        // =================================================================
        // == ✅ 온디바이스 AI 작동 확인 코드 (START) ==
        // =================================================================
        console.log('%c[On-Device AI Check]', 'color: limegreen; font-weight: bold;', {
          query: debouncedQ,
          semanticSearchResults: semanticScores.slice(0, 5), // 상위 5개 결과만 표시
        });
        // =================================================================
        // == ✅ 온디바이스 AI 작동 확인 코드 (END) ==
        // =================================================================
      } catch (error) {
        console.error("Semantic search failed:", error);
        setSemanticResults([]);
      }
    };

    performSemanticSearch();
  }, [debouncedQ, engine, semWorker, notes, isModelReady]);

  // 검색 결과 계산 (BM25와 시맨틱 결과 융합)
  const finalResults = useMemo(() => {
    if (!debouncedQ.trim()) return notes;
    
    const bm25Results = bm25Index.search(debouncedQ, 50).map(x => ({ id: x.id, score: x.score }));
    
    // RRF 퓨전을 사용하여 BM25와 시맨틱 검색 결과 융합 (인수 수정)
    const fusedResults = rrfFuse([bm25Results, semanticResults]);

    // 융합된 결과의 순서에 따라 노트 정렬
    const order = new Map(fusedResults.map((x, i) => [x.id, i]));
    return [...notes].sort((a, b) => {
      const ra = order.get(a.id!) ?? Infinity;
      const rb = order.get(b.id!) ?? Infinity;
      return ra - rb;
    });
  }, [debouncedQ, notes, bm25Index, semanticResults]);

  // AI 요약 답변 생성 로직 (callGenerateApi 사용)
  useEffect(() => {
    if (!debouncedQ.trim()) {
      setGeneratedAnswer({ data: null, isLoading: false, error: null });
      return;
    }

    const generateAnswer = async () => {
      setGeneratedAnswer({ data: null, isLoading: true, error: null });
      try {
        const relevantNotes = finalResults.slice(0, 5); // 상위 5개 노트를 컨텍스트로 사용
        const notesContent = relevantNotes.map(n => n.content.replace(/<[^>]+>/g, '')).join('\n\n---\n\n');
        
        // =================================================================
        // == 🕵️‍♂️ 진단 코드 추가 (START) ==
        // =================================================================
        const settings = getConfig();
        const isGenerativeMode = settings.genEnabled; // Assuming genEnabled indicates generative mode
        const apiUrl = settings.genEndpoint; // Assuming genEndpoint is the API URL

        console.log('%c[API Call Diagnosis]', 'color: skyblue; font-weight: bold;', {
          isGenerativeMode: isGenerativeMode,
          isApiUrlSet: !!apiUrl,
          queryExists: !!debouncedQ,
          hasContextNotes: finalResults.length > 0
        });
        // =================================================================
        // == 🕵️‍♂️ 진단 코드 추가 (END) ==
        // =================================================================

        if (isGenerativeMode && apiUrl && debouncedQ && finalResults.length > 0) {
          const result: AnswerData = await callGenerateApi({ question: debouncedQ, context: finalResults.map((n: Note) => ({ id: n.id, content: n.content })) }, apiUrl);
          setGeneratedAnswer({ data: result, isLoading: false, error: null });
          setAnswerSignal(s => s + 1);
        } else {
          // API 호출 조건이 충족되지 않으면 로딩 상태를 해제하고 오류 메시지를 표시하지 않음
          setGeneratedAnswer({ data: null, isLoading: false, error: null });
        }

      } catch (error: any) {
        console.error("Failed to generate answer:", error);
        setGeneratedAnswer({ data: null, isLoading: false, error: `답변을 생성하는 데 실패했습니다: ${error.message}` });
      }
    };

    generateAnswer();
  }, [debouncedQ, finalResults]); // config.isGenerativeMode, config.apiUrl 대신 debouncedQ, finalResults만 의존성으로 유지

  // --- 핸들러 함수 ---
  // 제안 질문 생성 로직 (callGenerateApi 사용)
  const handleSearchFocus = useCallback(async () => {
    if (suggestedQuestions.length > 0 || isLoadingSuggestions) return;
    
    setIsLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      const recentNotes = notes.slice(0, 5);
      const notesContent = recentNotes.map((n: Note) => n.content.replace(/<[^>]+>/g, '')).join('\n\n');
      
      const settings = getConfig();
      const isGenerativeMode = settings.genEnabled; // Assuming genEnabled indicates generative mode
      const apiUrl = settings.genEndpoint; // Assuming genEndpoint is the API URL

      if (isGenerativeMode && apiUrl) {
        const result = await callGenerateApi({ type: 'generate_questions', context: recentNotes.map(n => ({ id: n.id, title: (n.title||'').slice(0,160), content: n.content })), question: '위 노트들을 바탕으로 사용자가 던질 만한 흥미로운 질문 3개를 JSON으로만 반환해 주세요.' }, apiUrl);
        setSuggestedQuestions(result.questions || []);
      } else {
        // API 호출 조건이 충족되지 않으면 로딩 상태를 해제하고 오류 메시지를 표시하지 않음
        setSuggestedQuestions([]);
      }

    } catch (error: any) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestionError(`질문 제안에 실패했습니다: ${error.message}`);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [notes, suggestedQuestions, isLoadingSuggestions]);

  const handleNewNote = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("User not logged in");
      return;
    }
    const noteData = await addNoteAndChunks({
      body: '',
      user_id: user.id,
    });
    setQ('');
    setActiveNoteId(noteData.id);
  }, [setQ, setActiveNoteId]);

  const activeNote = useMemo(() => {
    if (!activeNoteId) return undefined;
    return notes.find(n => n.id === activeNoteId) || undefined;
  }, [notes, activeNoteId]);

  // --- 렌더링 ---
  const renderView = () => {
    switch (view) {
      case 'settings':
        return <Settings engine={engine} setEngine={setEngine} onNavigateHome={() => setView('today')} onNavigateToDiagnostics={() => setView('diagnostics')} modelStatus={modelStatus} />;
      case 'diagnostics':
        return <Diagnostics onBack={() => setView('settings')} />;
      case 'today':
      default:
        return (
            <Today
              onNavigate={setView}
              query={q}
              onQueryChange={setQ}
              notes={finalResults}
              onSearchFocus={handleSearchFocus}
              suggestedQuestions={suggestedQuestions}
              isLoadingSuggestions={isLoadingSuggestions}
              suggestionError={suggestionError}
              generatedAnswer={generatedAnswer}
              onNewNote={handleNewNote}
              activeNote={activeNote}
              onNoteSelect={setActiveNoteId}
              isModelReady={isModelReady}
              modelStatus={modelStatus}
            />
        );
      case 'editor':
        return (
          <div className="h-screen w-screen bg-white">
            <button onClick={() => setView('today')}>Close Editor</button>
            {/* Add your editor component here */}
          </div>
        );
    }
  };

  return (
    <div>
      <Toasts />
      <HomeSky
        onOpenSettings={() => setView('settings')}
        onOpenEditor={() => setEditorOpen(true)}
        onOpenAnswer={() => setAnswerOpen(true)}
        answerSignal={answerSignal}
        bottomBarSelector="#tabbar"
      />
      <OverlayEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSubmit={async (text) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.error("User not logged in");
            return;
          }
          await addNoteAndChunks({
            title: text.slice(0, 50),
            body: text,
            user_id: user.id,
          });
          window.dispatchEvent(new CustomEvent('sky:record-complete'));
          setEditorOpen(false);
        }}
      />
      <AnswerCardsModal open={answerOpen} onClose={() => setAnswerOpen(false)}>
        <GeneratedAnswer data={generatedAnswer.data} />
      </AnswerCardsModal>
      {renderView()}
      <div id="tabbar">
        <TabBar view={view as any} onChange={setView as any} />
      </div>
    </div>
  );
}
