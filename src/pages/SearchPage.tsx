import { Session } from '@supabase/supabase-js';
import React, { useState, useEffect, useCallback } from 'react';
import { SearchBar } from '../components/SearchBar';
import { useSearch } from '../hooks/useSearch';
import PageLayout from '../components/PageLayout';
import { GeneratedAnswer } from '../components/GeneratedAnswer';
import { getNotesByIds } from '../lib/supabaseService';
import { AnswerData, Note } from '../types/common';
import { NoteDetailModal } from '../components/NoteDetailModal';
import SkyCanvasAnimation from '../components/SkyCanvasAnimation';
import SearchResultsList from '../components/SearchResultsList';

// Main Search Page Component
const SearchPage = ({ session }: { session: Session | null }) => {
  const [query, setQuery] = useState('');
  const token = session?.access_token;
  const { results, loading, search } = useSearch(token);
  const [generatedAnswer, setGeneratedAnswer] = useState<{ data: AnswerData | null; isLoading: boolean; error: string | null }>({
    data: null,
    isLoading: false,
    error: null,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteTitlesMap, setNoteTitlesMap] = useState<Record<string, string>>({});

  const handleNoteClick = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
    setIsModalOpen(true);
  }, []);

  const generateAnswer = useCallback(async (currentQuery: string, currentResults: any[]) => {
    if (!currentResults || currentResults.length === 0 || currentQuery.trim().length < 2) {
      setGeneratedAnswer({ data: null, isLoading: false, error: null });
      setNoteTitlesMap({});
      return;
    }

    try {
      setGeneratedAnswer({ data: null, isLoading: true, error: null });

      const filteredResults = currentResults.filter(r => r.similarity >= 0.7);
      const topNoteIds = [...new Set(filteredResults.map(r => r.note_id))].slice(0, 5);
      const contextNotes = await getNotesByIds(topNoteIds);

      if (!contextNotes || contextNotes.length === 0) {
        throw new Error("Could not fetch context notes.");
      }

      const newNoteTitlesMap: Record<string, string> = {};
      contextNotes.forEach((n: Note) => {
        newNoteTitlesMap[n.id] = n.title || '제목 없는 노트';
      });
      setNoteTitlesMap(newNoteTitlesMap);

      const generateRes = await fetch('/api/v1?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rag',
          input: { query: currentQuery },
          context: contextNotes.map((n: Note) => ({ id: n.id, body: n.body }))
        })
      });

      if (!generateRes.ok || !generateRes.body) {
        const errorText = await generateRes.text();
        throw new Error(`요약 생성 실패: ${errorText}`);
      }

      const result = await generateRes.json();
      const summaryText = result?.data?.summary;
      if (!summaryText) throw new Error("AI response did not contain a valid summary.");

      const finalAnswerData: AnswerData = {
        answerSegments: [{ sentence: summaryText, sourceNoteId: '' }],
        sourceNotes: contextNotes.map((n: Note) => n.id),
      };

      setGeneratedAnswer({ data: finalAnswerData, isLoading: false, error: null });

    } catch (error) {
      console.error("Failed to generate search answer:", error);
      setGeneratedAnswer({ data: null, isLoading: false, error: (error as Error).message });
    }
  }, []);

  const handleSearch = async () => {
    const searchResults = await search(query);
    await generateAnswer(query, searchResults);
  };

  const GeneratedAnswerCard = () => (
    <div className="bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-lg p-4 shadow-lg">
      {generatedAnswer.isLoading && <div className="p-4 text-center text-muted-foreground">답변 생성 중...</div>}
      {generatedAnswer.error && <div className="p-4 text-center text-destructive">오류: {generatedAnswer.error}</div>}
      {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} noteTitlesMap={noteTitlesMap} onNoteClick={handleNoteClick} />} 
    </div>
  );

  return (
    <PageLayout title="노트 검색" hideBackButton={true}>
      <SkyCanvasAnimation />
      <div className="relative z-10">
        <SearchBar 
          q={query} 
          setQ={setQuery} 
          onSearch={handleSearch}
          onFocus={() => {}} // Placeholder
          suggestedQuestions={[]}
          isLoadingSuggestions={false}
          suggestionError={null}
          isModelReady={true}
          modelStatus="Ready"
          className="bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 text-primary placeholder-muted-foreground focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/80"
        />
        <div className="mt-6">
          {query.trim() !== '' ? (
            <>
              {/* Mobile layout: Generated answer first */}
              <div className="lg:hidden">
                {(generatedAnswer.data || generatedAnswer.isLoading || generatedAnswer.error) && (
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-4">생성된 답변</h2>
                    <GeneratedAnswerCard />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold mb-4">검색 결과</h2>
                  <SearchResultsList results={results} loading={loading} noteTitlesMap={noteTitlesMap} query={query} onNoteClick={handleNoteClick} />
                </div>
              </div>

              {/* Desktop layout: Two columns */}
              <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
                <div className="lg:col-span-2">
                  <h2 className="text-xl font-semibold mb-4">검색 결과</h2>
                  <SearchResultsList results={results} loading={loading} noteTitlesMap={noteTitlesMap} query={query} onNoteClick={handleNoteClick} />
                </div>
                <div className="lg:col-span-1">
                  <h2 className="text-xl font-semibold mb-4">생성된 답변</h2>
                  <GeneratedAnswerCard />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center p-12 text-muted-foreground">
              <h2 className="text-2xl font-semibold mb-2">무엇이든 물어보세요.</h2>
              <p>당신의 기억 속에서 답을 찾아드립니다.</p>
            </div>
          )}
        </div>
      </div>
      {selectedNoteId && <NoteDetailModal noteId={selectedNoteId} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
    </PageLayout>
  );
};

export default SearchPage;
