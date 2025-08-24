import React, { useRef, useState, useCallback, useMemo } from 'react';
import HomeSky, { type HomeSkyHandle } from '@/components/HomeSky';
import SkyTypeOverlay from '@/components/SkyTypeOverlay';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, Note } from '@/lib/db';
import { SemWorkerClient } from '@/lib/semWorkerClient';
import { BM25 } from '@/lib/search/bm25';
import { rrfFuse } from '@/lib/search/rrf';
import { cosineSim } from '@/lib/search/cosine';
import { getConfig } from '@/lib/config';
import { AnswerData, SearchResult } from '@/types/common';
import OverlayEditor from '@/components/OverlayEditor';
import AnswerCardsModal from '@/components/AnswerCardsModal';
import { GeneratedAnswer } from '@/components/GeneratedAnswer';

export default function HomePageWithSky() {
  const skyRef = useRef<HomeSkyHandle | null>(null);
  const [answerSignal, setAnswerSignal] = useState(0);
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [generatedAnswer, setGeneratedAnswer] = useState<{ data: AnswerData | null; isLoading: boolean; error: string | null }>({ data: null, isLoading: false, error: null });
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const [similarNotes, setSimilarNotes] = useState<Note[]>([]);

  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []);
  const semWorker = useMemo(() => new SemWorkerClient(), []);

  const bm25Index = useMemo(() => {
    if (!notes) return null;
    const idx = new BM25();
    notes.forEach(n => idx.add({ id: n.id!, text: [n.content, n.tags.join(" ")].join(" ") }));
    idx.build();
    return idx;
  }, [notes]);

  async function callGenerateApi(payload: object, endpoint: string = '/.netlify/functions/generate'): Promise<any> {
    console.debug('[API Call] to', endpoint, payload);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText || response.status}`);
    }
    const result = await response.json();
    console.debug('[API Response]', result);
    setAnswerSignal(s => s + 1);
    return result;
  }

  const handleGenerateSummary = useCallback(async () => {
    const settings = getConfig();
    if (!settings.genEnabled || !settings.genEndpoint) return;
    const result = await callGenerateApi({ type: 'daily_summary' }, settings.genEndpoint);
    setGeneratedAnswer({ data: result, isLoading: false, error: null });
  }, []);

  const handleEditorFocus = useCallback(async () => {
    if (suggestedQuestions.length > 0 || isLoadingSuggestions) return;
    
    setIsLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      const recentNotes = notes?.slice(0, 5) || [];
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

  const handleDebouncedEditorChange = useCallback(async (text: string) => {
    const similar = await semWorker.similar(text, 3);
    setSimilarNotes(similar);
  }, [semWorker]);

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

  return (
    <div className="min-h-screen">
      <HomeSky ref={skyRef as any} answerSignal={answerSignal} />
      <SkyTypeOverlay onTextRectChange={(rects) => skyRef.current?.setExclusions(rects)} />
      <OverlayEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSubmit={(text) => {
          handleNewNote(text);
          setEditorOpen(false);
        }}
        onGenerateSummary={handleGenerateSummary}
        onFocus={handleEditorFocus}
        onDebouncedChange={handleDebouncedEditorChange}
        similarNotes={similarNotes}
      />
      <AnswerCardsModal
        open={answerOpen}
        onClose={() => setAnswerOpen(false)}
      >
        {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} />}
      </AnswerCardsModal>
      <button
        className="fixed right-6 top-6 z-[30] text-white/90 text-2xl"
        onClick={() => navigate('/settings')}
        aria-label="설정 열기"
        title="설정"
      >
        🌙
      </button>
      <button
        className="fixed left-6 top-6 z-[30] text-white/90 text-2xl"
        onClick={() => setEditorOpen(true)}
        aria-label="에디터 열기"
        title="에디터"
      >
        📝
      </button>
    </div>
  );
}
