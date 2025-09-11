
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { InsightThread, Note } from '@lib/types';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface InsightThreadCardProps {
  thread: InsightThread;
  onNoteClick: (note: Note) => void;
}

const InsightThreadCard: React.FC<InsightThreadCardProps> = ({ thread, onNoteClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      className="border border-slate-700/50 bg-slate-900/60 backdrop-blur-lg rounded-3xl p-4 shadow-lg flex flex-col h-full transition-all duration-300 hover:bg-slate-800/70 hover:shadow-xl cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <h3 className="text-lg font-bold text-primary break-words">{thread.title}</h3>
      <p className={`mt-2 text-muted-foreground flex-grow text-base ${!isExpanded ? 'line-clamp-3' : ''}`}>{thread.summary}</p>
      
      <div className="mt-4 pt-3 border-t border-slate-700/50">
        <h4 className="text-base font-semibold text-muted-foreground mb-2">Included Notes</h4>
        <ul className="space-y-2">
          {thread.notes.map((note: Note) => (
            <li key={note.id}>
              <button 
                onClick={(e) => { e.stopPropagation(); onNoteClick(note); }}
                className="flex items-center gap-2 text-left text-base text-primary hover:underline hover:text-accent transition-colors w-full truncate"
              >
                <DocumentTextIcon className="w-5 h-5 flex-shrink-0" />
                <span>{note.title || 'Untitled Note'}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 text-sm text-right text-muted-foreground/80">
        <span>Relevance Score: {(thread.relevanceScore ?? 0).toFixed(2)}</span>
      </div>
    </div>
  );
};

export default React.memo(InsightThreadCard);
