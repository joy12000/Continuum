import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { liveQuery } from 'dexie';
import { db, Note } from './lib/db';
import { SemWorkerClient } from './lib/semWorkerClient';
import { BM25 } from './lib/search/bm25';
import { rrfFuse } from './lib/search/rrf';
import { cosineSim } from './lib/search/cosine';
import Today from './components/Today';
import { Settings } from './components/Settings';
import Diagnostics from './components/Diagnostics';
import { Toasts } from './components/Toasts';
import { AnswerData, SearchResult } from './types/common';
import { getConfig } from './lib/config';
import { getSemanticAdapter } from "./lib/semantic";
import HomeSky from './components/HomeSky';
import OverlayEditor from './components/OverlayEditor';
import AnswerCardsModal from './components/AnswerCardsModal';
import { GeneratedAnswer } from './components/GeneratedAnswer';

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

// --- 메인 앱 컴포넌트 ---
export default function App() {
  
  // --- 상태 관리 (State Management) ---
  const [view, setView] = useState<View>('today');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [engine, setEngine] = useState<'auto' | 'remote'>((localStorage.getItem('semanticEngine') as any) || 'auto');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState("확인 중…");
  const [isModelReady, setIsModelReady] = useState(false);
  
  // HomeSky 관련 상태
  const [editorOpen, setEditorOpen] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [answerSignal, setAnswerSignal] = useState(0);

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
    const result = await response.json();
    setAnswerSignal(s => s + 1); // 답변 도착 시그널
    return result;
  }

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
    
    const fusedResults = rrfFuse([bm25Results, semanticResults]);

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
        const settings = getConfig();
        const isGenerativeMode = settings.genEnabled;
        const apiUrl = settings.genEndpoint;

        if (isGenerativeMode && apiUrl && debouncedQ && finalResults.length > 0) {
          const result: AnswerData = await callGenerateApi({ question: debouncedQ, context: finalResults.map((n: Note) => ({ id: n.id, content: n.content })) }, apiUrl);
          setGeneratedAnswer({ data: result, isLoading: false, error: null });
        } else {
          setGeneratedAnswer({ data: null, isLoading: false, error: null });
        }

      } catch (error: any) {
        console.error("Failed to generate answer:", error);
        setGeneratedAnswer({ data: null, isLoading: false, error: `답변을 생성하는 데 실패했습니다: ${error.message}` });
      }
    };

    generateAnswer();
  }, [debouncedQ, finalResults]);

  // --- 핸들러 함수 ---
  const handleSearchFocus = useCallback(async () => {
    if (suggestedQuestions.length > 0 || isLoadingSuggestions) return;
    
    setIsLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      const recentNotes = notes.slice(0, 5);
      const settings = getConfig();
      const isGenerativeMode = settings.genEnabled;
      const apiUrl = settings.genEndpoint;

      if (isGenerativeMode && apiUrl) {
        const result = await callGenerateApi({ type: 'generate_questions', context: recentNotes.map(n => ({ id: n.id, title: (n.title||'').slice(0,160), content: n.content })), question: '위 노트들을 바탕으로 사용자가 던질 만한 흥미로운 질문 3개를 JSON으로만 반환해 주세요.' }, apiUrl);
        setSuggestedQuestions(result.questions || []);
      } else {
        setSuggestedQuestions([]);
      }

    } catch (error: any) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestionError(`질문 제안에 실패했습니다: ${error.message}`);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [notes, suggestedQuestions, isLoadingSuggestions]);

  const handleNewNote = useCallback((content: string = '') => {
    const now = Date.now();
    const newNoteId = crypto.randomUUID();
    db.notes.add({
      id: newNoteId,
      content,
      createdAt: now,
      updatedAt: now,
      tags: [],
    }).then(() => {
      window.dispatchEvent(new CustomEvent('sky:record-complete'));
    });
    setQ('');
    setActiveNoteId(newNoteId);
  }, []);

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
      {renderView()}
      <OverlayEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSubmit={(text) => {
          handleNewNote(text);
          setEditorOpen(false);
          window.dispatchEvent(new CustomEvent('sky:record-complete'));
        }}
      />
      <AnswerCardsModal
        open={answerOpen}
        onClose={() => setAnswerOpen(false)}
      >
        {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} />}
      </AnswerCardsModal>
    </div>
  );
}
