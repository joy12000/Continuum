import React, { useState } from 'react';
import { SearchResult } from '../hooks/useSearch';
import Highlight from './Highlight';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/solid';
import { HandThumbUpIcon as ThumbUpIconOutline, HandThumbDownIcon as ThumbDownIconOutline } from '@heroicons/react/24/outline';

interface SearchResultsListProps {
  results: SearchResult[];
  loading: boolean;
  noteTitlesMap: Record<string, string>;
  query: string;
  onNoteClick: (noteId: string) => void;
}

const SearchResultsList: React.FC<SearchResultsListProps> = ({ results, loading, noteTitlesMap, query, onNoteClick }) => {
  const [feedback, setFeedback] = useState<Record<string, 'like' | 'dislike' | null>>({});

  if (loading) {
    return <div className="p-4 text-muted-foreground text-center bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-3xl shadow-lg">검색 중...</div>;
  }

  if (results.length === 0) {
    return <div className="p-4 text-muted-foreground text-center bg-slate-900/60 backdrop-blur-lg border border-slate-700/50 rounded-3xl shadow-lg">검색 결과가 없습니다.</div>;
  }

  const handleFeedback = (result: SearchResult, newFeedback: 'like' | 'dislike') => {
    const key = `${result.note_id}_${result.chunk_index}`;
    setFeedback(prev => ({
      ...prev,
      [key]: prev[key] === newFeedback ? null : newFeedback
    }));
    // Here you would typically store this feedback, e.g., in your database
    console.log(`Feedback for note ${result.note_id}: ${newFeedback}`);
  };

  return (
    <ul className="space-y-4">
      {results.map(result => {
        const key = `${result.note_id}_${result.chunk_index}`;
        const currentFeedback = feedback[key];

        return (
          <li key={key}>
            <div className="block w-full text-left border border-slate-700/50 bg-slate-900/60 backdrop-blur-lg rounded-3xl p-4 transition-all duration-300 hover:bg-slate-800/70 hover:shadow-xl">
              <div className="flex justify-between items-start gap-4">
                <button onClick={() => onNoteClick(result.note_id)} className="flex-grow text-left">
                  <h3 className="text-lg font-semibold text-primary hover:underline">{noteTitlesMap[result.note_id] || '제목 없는 노트'}</h3>
                  <div className="text-sm text-slate-300 mt-2 snippet">
                    <Highlight text={result.content} query={query} />
                  </div>
                </button>
                <div className="flex flex-col space-y-2 flex-shrink-0">
                  <button onClick={() => handleFeedback(result, 'like')} className={`p-1.5 rounded-full transition-colors ${currentFeedback === 'like' ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground hover:bg-green-500/10 hover:text-green-500'}`}>
                    {currentFeedback === 'like' ? <HandThumbUpIcon className="h-5 w-5" /> : <ThumbUpIconOutline className="h-5 w-5" />}
                  </button>
                  <button onClick={() => handleFeedback(result, 'dislike')} className={`p-1.5 rounded-full transition-colors ${currentFeedback === 'dislike' ? 'bg-red-500/20 text-red-400' : 'text-muted-foreground hover:bg-red-500/10 hover:text-red-500'}`}>
                    {currentFeedback === 'dislike' ? <HandThumbDownIcon className="h-5 w-5" /> : <ThumbDownIconOutline className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground/80 mt-3 pt-2 border-t border-slate-800">유사도: {result.similarity.toFixed(3)}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default SearchResultsList;
