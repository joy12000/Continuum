import { Session } from '@supabase/supabase-js';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { useSearch, SearchResult } from '../hooks/useSearch';
import PageLayout from '../components/PageLayout';
import { GeneratedAnswer } from '../components/GeneratedAnswer';
import { getNotesByIds } from '../lib/supabaseService';
import { AnswerData, Note } from '../types/common';
import { HandThumbUpIcon as ThumbUpIcon, HandThumbDownIcon as ThumbDownIcon } from '@heroicons/react/24/outline';
import { NoteDetailModal } from '../components/NoteDetailModal';
import SkyCanvasAnimation from '../components/SkyCanvasAnimation';

// Enhanced highlight function
const highlight = (text: string, query: string) => {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-accent text-accent-foreground rounded px-1">$1</mark>');
};

// Component to render the search results
const SearchResultsList = ({ results, loading, noteTitlesMap, query, onNoteClick }: { results: SearchResult[], loading: boolean, noteTitlesMap: Record<string, string>, query: string, onNoteClick: (noteId: string) => void }) => {
  if (loading) {
    return <div className="p-4 text-muted-foreground text-center">검색 중...</div>;
  }

  if (results.length === 0) {
    return <div className="p-4 text-muted-foreground text-center">검색 결과가 없습니다.</div>;
  }

  const handleFeedback = (result: SearchResult, feedback: 'like' | 'dislike') => {
    console.log(`Feedback for note ${result.note_id}: ${feedback}`);
    // Here you would typically store this feedback, e.g., in your database
  };

  return (
    <ul className="space-y-4">
      {results.map(result => (
        <li key={`${result.note_id}_${result.chunk_index}`}>
          <button onClick={() => onNoteClick(result.note_id)} className="block w-full text-left border border-slate-700/50 bg-slate-900/60 backdrop-blur-lg rounded-lg p-4 transition-all duration-300 hover:bg-slate-800/70 hover:shadow-md">
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-primary">{noteTitlesMap[result.note_id] || '제목 없는 노트'}</h3>
                <div 
                  className="text-sm text-muted-foreground mt-2 snippet"
                  dangerouslySetInnerHTML={{ __html: highlight(result.content, query) }}
                />
              </div>
              <div className="flex flex-col space-y-2 ml-4">
                <button onClick={(e) => { e.stopPropagation(); handleFeedback(result, 'like'); }} className="text-muted-foreground hover:text-green-500 transition-colors p-1 rounded-full hover:bg-secondary">
                  <ThumbUpIcon className="h-6 w-6" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleFeedback(result, 'dislike'); }} className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-full hover:bg-secondary">
                  <ThumbDownIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground/80 mt-2">유사도: {result.similarity.toFixed(3)}</div>
          </button>
        </li>
      ))}
    </ul>
  );
};

// Main Search Page Component
const SearchPage = ({ session }: { session: Session | null }) => {
  const [query, setQuery] = useState('');
  const token = session?.access_token;
  const { results, loading } = useSearch(query, token);
  const [generatedAnswer, setGeneratedAnswer] = useState<{ data: AnswerData | null; isLoading: boolean; error: string | null }>({
    data: null,
    isLoading: false,
    error: null,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const handleNoteClick = (noteId: string) => {
    setSelectedNoteId(noteId);
    setIsModalOpen(true);
  };

  const [noteTitlesMap, setNoteTitlesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const generateAnswer = async () => {
      if (!results || results.length === 0 || query.trim().length < 2) {
        setGeneratedAnswer({ data: null, isLoading: false, error: null });
        setNoteTitlesMap({});
        return;
      }

      try {
        setGeneratedAnswer({ data: null, isLoading: true, error: null });

        const topNoteIds = [...new Set(results.map(r => r.note_id))].slice(0, 5);
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
            input: { query },
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
    };

    generateAnswer();
  }, [results, query]);

  return (
    <PageLayout title="노트 검색">
      <SkyCanvasAnimation />
      <div className="relative z-10">
        <SearchBar 
          q={query} 
          setQ={setQuery} 
          onFocus={() => {}} // Placeholder
          suggestedQuestions={[]}
          isLoadingSuggestions={false}
          suggestionError={null}
          isModelReady={true}
          modelStatus="Ready"
          className="bg-card border-border text-primary placeholder-muted-foreground focus:ring-ring focus:border-ring"
        />
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">검색 결과</h2>
            <SearchResultsList results={results} loading={loading} noteTitlesMap={noteTitlesMap} query={query} onNoteClick={handleNoteClick} />
          </div>
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">생성된 답변</h2>
            <div className="bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-lg p-4">
              {generatedAnswer.isLoading && <div className="p-4 text-center text-muted-foreground">답변 생성 중...</div>}
              {generatedAnswer.error && <div className="p-4 text-center text-destructive">오류: {generatedAnswer.error}</div>}
              {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} noteTitlesMap={noteTitlesMap} />} 
            </div>
          </div>
        </div>
      </div>
      {selectedNoteId && <NoteDetailModal noteId={selectedNoteId} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />}
    </PageLayout>
  );
};

export default SearchPage;