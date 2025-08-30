import React, { useState, useEffect } from 'react';
import { SearchBar } from '../components/SearchBar';
import { useSearch, SearchResult } from '../hooks/useSearch';
import PageLayout from '../components/PageLayout';
import { GeneratedAnswer } from '../components/GeneratedAnswer';
import { getNotesByIds } from '../lib/supabaseService';
import { AnswerData, Note } from '../types/common';

// Component to render the search results
const SearchResultsList = ({ results, loading }: { results: SearchResult[], loading: boolean }) => {
  if (loading) {
    return <div className="p-4 text-gray-400 text-center">Searching...</div>;
  }

  if (results.length === 0) {
    return <div className="p-4 text-gray-400 text-center">No results found.</div>;
  }

  return (
    <ul className="space-y-4">
      {results.map(result => (
        <li 
          key={result.note_id} 
          className="border border-white/10 bg-[#0b1830]/50 rounded-lg p-4 backdrop-blur-sm hover:bg-white/5 transition-colors duration-300"
        >
          <h3 
            className="text-lg font-semibold text-sky-300"
            style={{ textShadow: '0 0 0.5rem rgba(125, 211, 252, 0.3)' }}
          >
            {result.title}
          </h3>
          <div 
            className="text-sm text-gray-300 mt-2 snippet"
            dangerouslySetInnerHTML={{ __html: result.snippet_html }}
            style={{ textShadow: '0 0 0.3rem rgba(200, 220, 255, 0.2)' }}
          />
          <div className="text-xs text-gray-500 mt-2">Score: {result.score.toFixed(3)}</div>
        </li>
      ))}
    </ul>
  );
};

// Main Search Page Component
const SearchPage = () => {
  const [query, setQuery] = useState('');
  const { results, loading } = useSearch(query);
  const [generatedAnswer, setGeneratedAnswer] = useState<{ data: AnswerData | null; isLoading: boolean; error: string | null }>({
    data: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const generateAnswer = async () => {
      if (!results || results.length === 0 || query.trim().length < 2) {
        setGeneratedAnswer({ data: null, isLoading: false, error: null });
        return;
      }

      try {
        setGeneratedAnswer({ data: null, isLoading: true, error: null });

        const topNoteIds = [...new Set(results.map(r => r.note_id))].slice(0, 5);
        const contextNotes = await getNotesByIds(topNoteIds);

        if (!contextNotes || contextNotes.length === 0) {
          throw new Error("Could not fetch context notes.");
        }

        const generateRes = await fetch('/api/remote/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'rag',
            input: { query },
            context: contextNotes.map((n: Note) => ({ id: n.id, body: n.content }))
          })
        });

        if (!generateRes.ok || !generateRes.body) {
          const errorText = await generateRes.text();
          throw new Error(`Failed to generate summary: ${errorText}`);
        }

        const reader = generateRes.body.getReader();
        const decoder = new TextDecoder();
        let fullAnswer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullAnswer += decoder.decode(value, { stream: true });
        }

        const finalAnswerData: AnswerData = {
          answerSegments: [{ sentence: fullAnswer, sourceNoteId: '' }],
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
    <PageLayout title="Search Notes">
      <SearchBar 
        q={query} 
        setQ={setQuery} 
        onFocus={() => {}} // Placeholder
        suggestedQuestions={[]}
        isLoadingSuggestions={false}
        suggestionError={null}
        isModelReady={true}
        modelStatus="Ready"
        // Custom styles to match the new theme
        className="bg-[#0b1830]/50 border-white/10 text-gray-200 placeholder-gray-500 focus:ring-sky-400 focus:border-sky-400"
      />
      <div className="my-6">
        {generatedAnswer.isLoading && <div className="p-4 text-center">답변 생성 중...</div>}
        {generatedAnswer.error && <div className="p-4 text-center text-red-500">오류: {generatedAnswer.error}</div>}
        {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} />} 
      </div>
      <div className="mt-6">
        <SearchResultsList results={results} loading={loading} />
      </div>
    </PageLayout>
  );
};

export default SearchPage;
