import { Session } from '@supabase/supabase-js';
import React, { useState, useEffect } from 'react';
import { SearchBar } from '../components/SearchBar';
import { useSearch, SearchResult } from '../hooks/useSearch';
import PageLayout from '../components/PageLayout';
import { GeneratedAnswer } from '../components/GeneratedAnswer';
import { getNotesByIds } from '../lib/supabaseService';
import { AnswerData, Note } from '../types/common';
import { HandThumbUpIcon as ThumbUpIcon, HandThumbDownIcon as ThumbDownIcon } from '@heroicons/react/24/solid';

// Component to render the search results
const SearchResultsList = ({ results, loading, noteTitlesMap }: { results: SearchResult[], loading: boolean, noteTitlesMap: Record<string, string> }) => {
  if (loading) {
    return <div className="p-4 text-gray-400 text-center">Searching...</div>;
  }

  if (results.length === 0) {
    return <div className="p-4 text-gray-400 text-center">No results found.</div>;
  }

  const handleFeedback = (result: SearchResult, feedback: 'like' | 'dislike') => {
    console.log(`Feedback for note ${result.note_id}: ${feedback}`);
    // Here you would typically store this feedback, e.g., in your database
  };

  return (
    <ul className="space-y-4">
      {results.map(result => (
        <li 
          key={result.note_id} 
          className="border border-white/10 bg-[#0b1830]/50 rounded-lg p-4 backdrop-blur-sm hover:bg-white/5 transition-colors duration-300"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 
                className="text-lg font-semibold text-sky-300"
                style={{ textShadow: '0 0 0.5rem rgba(125, 211, 252, 0.3)' }}
              >
                {noteTitlesMap[result.note_id] || 'Untitled Note'}
              </h3>
              <div 
                className="text-sm text-gray-300 mt-2 snippet"
                dangerouslySetInnerHTML={{ __html: result.content }}
                style={{ textShadow: '0 0 0.3rem rgba(200, 220, 255, 0.2)' }}
              />
            </div>
            <div className="flex space-x-2 ml-4">
              <button onClick={() => handleFeedback(result, 'like')} className="text-gray-400 hover:text-green-400 transition-colors">
                <ThumbUpIcon className="h-5 w-5" />
              </button>
              <button onClick={() => handleFeedback(result, 'dislike')} className="text-gray-400 hover:text-red-400 transition-colors">
                <ThumbDownIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">Score: {result.distance.toFixed(3)}</div>
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

  // New state for note titles map
  const [noteTitlesMap, setNoteTitlesMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const generateAnswer = async () => {
      if (!results || results.length === 0 || query.trim().length < 2) {
        setGeneratedAnswer({ data: null, isLoading: false, error: null });
        setNoteTitlesMap({}); // Clear map when no results
        return;
      }

      try {
        setGeneratedAnswer({ data: null, isLoading: true, error: null });

        const topNoteIds = [...new Set(results.map(r => r.note_id))].slice(0, 5);
        const contextNotes = await getNotesByIds(topNoteIds);

        if (!contextNotes || contextNotes.length === 0) {
          throw new Error("Could not fetch context notes.");
        }

        // Populate noteTitlesMap
        const newNoteTitlesMap: Record<string, string> = {};
        contextNotes.forEach((n: Note) => {
          newNoteTitlesMap[n.id] = n.title || 'Untitled Note';
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

        let parsedAnswerText = fullAnswer;
        try {
          const parsed = JSON.parse(fullAnswer);
          if (parsed && typeof parsed.text === 'string') {
            parsedAnswerText = parsed.text;
          }
        } catch (e) {
          console.warn("Failed to parse AI answer as JSON, using raw text:", e);
        }

        const finalAnswerData: AnswerData = {
          answerSegments: [{ sentence: parsedAnswerText, sourceNoteId: '' }],
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
        {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} noteTitlesMap={noteTitlesMap} />} 
      </div>
      <div className="mt-6">
        <SearchResultsList results={results} loading={loading} noteTitlesMap={noteTitlesMap} />
      </div>
    </PageLayout>
  );
};

export default SearchPage;