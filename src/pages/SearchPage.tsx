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

// Enhanced highlight function
const highlight = (text: string, query: string) => {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-accent text-accent-foreground rounded px-1">$1</mark>');
};

// Component to render the search results
const SearchResultsList = ({ results, loading, noteTitlesMap, query }: { results: SearchResult[], loading: boolean, noteTitlesMap: Record<string, string>, query: string }) => {
  if (loading) {
    return <div className="p-4 text-muted-foreground text-center">Searching...</div>;
  }

  if (results.length === 0) {
    return <div className="p-4 text-muted-foreground text-center">No results found.</div>;
  }

  const handleFeedback = (result: SearchResult, feedback: 'like' | 'dislike') => {
    console.log(`Feedback for note ${result.note_id}: ${feedback}`);
    // Here you would typically store this feedback, e.g., in your database
  };

  return (
    <ul className="space-y-4">
      {results.map(result => (
        <li key={`${result.note_id}_${result.chunk_index}`}>
          <Link to={`/notes/${result.note_id}`} className="block border border-border bg-card rounded-lg p-4 transition-all duration-300 hover:bg-secondary hover:shadow-md">
            <div className="flex justify-between items-start">
              <div className="flex-grow">
                <h3 className="text-lg font-semibold text-primary">{noteTitlesMap[result.note_id] || 'Untitled Note'}</h3>
                <div 
                  className="text-sm text-muted-foreground mt-2 snippet"
                  dangerouslySetInnerHTML={{ __html: highlight(result.content, query) }}
                />
              </div>
              <div className="flex flex-col space-y-2 ml-4">
                <button onClick={(e) => { e.preventDefault(); handleFeedback(result, 'like'); }} className="text-muted-foreground hover:text-green-500 transition-colors p-1 rounded-full hover:bg-secondary">
                  <ThumbUpIcon className="h-6 w-6" />
                </button>
                <button onClick={(e) => { e.preventDefault(); handleFeedback(result, 'dislike'); }} className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-full hover:bg-secondary">
                  <ThumbDownIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground/80 mt-2">Similarity: {result.similarity.toFixed(3)}</div>
          </Link>
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
    <PageLayout title="Search Notes">
      <div className="p-4 sm:p-6">
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
            <h2 className="text-xl font-semibold mb-4">Search Results</h2>
            <SearchResultsList results={results} loading={loading} noteTitlesMap={noteTitlesMap} query={query} />
          </div>
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold mb-4">Generated Answer</h2>
            <div className="bg-card border border-border rounded-lg p-4">
              {generatedAnswer.isLoading && <div className="p-4 text-center text-muted-foreground">Generating answer...</div>}
              {generatedAnswer.error && <div className="p-4 text-center text-destructive">Error: {generatedAnswer.error}</div>}
              {generatedAnswer.data && <GeneratedAnswer data={generatedAnswer.data} noteTitlesMap={noteTitlesMap} />} 
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default SearchPage;