import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { liveQuery } from 'dexie';
import { db, Note } from './lib/db';
import { SemWorkerClient } from './lib/semWorkerClient';
import { BM25 } from './lib/search/bm25';
import { rrfFuse } from './lib/search/rrf';
import { cosineSim } from './lib/search/cosine';
import TodayCanvasScreen from './components/TodayCanvasScreen';
import { Settings } from './components/Settings'; // 명명된 가져오기로 변경
import Diagnostics from './components/Diagnostics'; // 기본 가져오기 유지
import { Toasts } from './components/Toasts';
import { AnswerData, SearchResult } from './types/common';

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
async function callGenerateApi(payload: object): Promise<any> {
  const response = await fetch('/.netlify/functions/generate', {
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
  // --- 상태 관리 (State Management) ---
  const [view, setView] = useState<View>('today');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [engine, setEngine] = useState<'auto' | 'remote'>((localStorage.getItem('semanticEngine') as any) || 'auto');
  
  // 제안 질문 관련 상태
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  // AI 요약 답변 관련 상태 (명시적 타입 지정)
  const [generatedAnswer, setGeneratedAnswer] = useState<{
    data: AnswerData | null;
    isLoading: boolean;
    error: string | null;
  }>({ data: null, isLoading: false, error: null } as { data: AnswerData | null; isLoading: boolean; error: string | null });

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

  // 검색어 디바운스 처리
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(handler);
  }, [q]);

  // 온디바이스 임베딩 생성
  useEffect(() => {
    (async () => {
      if (notes.length === 0) return;
      await semWorker.ensure(engine);
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
      if (!debouncedQ.trim()) {
        setSemanticResults([]);
        return;
      }

      try {
        const queryVec = (await semWorker.embed(engine, [debouncedQ]))[0];
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
  }, [debouncedQ, engine, semWorker, notes]);

  // 검색 결과 계산 (BM25와 시맨틱 결과 융합)
  const finalResults = useMemo(() => {
    if (!debouncedQ.trim()) return notes;
    
    const bm25Results = bm25Index.search(debouncedQ, 50).map(x => ({ id: x.id, score: x.score, text: notes.find(n => n.id === x.id)?.content || '', noteId: x.id }));
    
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
        
        const result: AnswerData = await callGenerateApi({
          context: notesContent,
          question: debouncedQ
        });
        setGeneratedAnswer({ data: result, isLoading: false, error: null });

      } catch (error: any) {
        console.error("Failed to generate answer:", error);
        setGeneratedAnswer({ data: null, isLoading: false, error: `답변을 생성하는 데 실패했습니다: ${error.message}` });
      }
    };

    generateAnswer();
  }, [debouncedQ, finalResults]);

  // --- 핸들러 함수 ---
  // 제안 질문 생성 로직 (callGenerateApi 사용)
  const handleSearchFocus = useCallback(async () => {
    if (suggestedQuestions.length > 0 || isLoadingSuggestions) return;
    
    setIsLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      const recentNotes = notes.slice(0, 5);
      const notesContent = recentNotes.map(n => n.content.replace(/<[^>]+>/g, '')).join('\n\n');
      
      const result = await callGenerateApi({
        context: notesContent,
        question: "Suggest 3 interesting questions based on the notes above."
      });
      setSuggestedQuestions(result.questions || []);

    } catch (error: any) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestionError(`질문 제안에 실패했습니다: ${error.message}`);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [notes, suggestedQuestions, isLoadingSuggestions]);

  const handleNewNote = useCallback(() => {
    const now = Date.now();
    db.notes.add({
      id: crypto.randomUUID(),
      content: '',
      createdAt: now,
      updatedAt: now,
      tags: [],
    });
    setQ('');
  }, []);

  // --- 렌더링 ---
  const renderView = () => {
    switch (view) {
      case 'settings':
        return <Settings onNavigateToDiagnostics={() => setView('diagnostics')} />; 
      case 'diagnostics':
        return <Diagnostics onBack={() => setView('settings')} />; 
      case 'today':
      default:
        return (
          <TodayCanvasScreen
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
          />
        );
    }
  };

  return (
    <div>
      <Toasts />
      {renderView()}
    </div>
  );
}