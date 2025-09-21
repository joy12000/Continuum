
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { InsightThread, Note } from '@lib/types';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface InsightThreadCardProps {
  thread: InsightThread;
  onNoteClick: (note: Note) => void;
  isExpanded: boolean;
  onToggleExpand: (threadId: string | number) => void;
}

const InsightThreadCard: React.FC<InsightThreadCardProps> = ({ thread, onNoteClick, isExpanded, onToggleExpand }) => {
  const [showAllNotes, setShowAllNotes] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const displayedNotes = showAllNotes ? thread.notes : thread.notes.slice(0, 3);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.maxHeight = isExpanded ? `${cardRef.current.scrollHeight}px` : '24rem'; // 96 * 0.25rem
    }
  }, [isExpanded]);

  return (
    <div 
      ref={cardRef}
      className={`border border-slate-700/50 bg-slate-900/60 backdrop-blur-lg rounded-3xl p-4 shadow-lg flex flex-col h-full transition-max-height duration-700 ease-in-out overflow-hidden ${isExpanded ? 'max-h-full' : 'max-h-64'}`}
      onClick={() => onToggleExpand(thread.threadId)}
    >
      <h3 className="text-lg font-bold text-primary break-words">{thread.title}</h3>
      <p className={`mt-2 text-muted-foreground flex-grow text-base ${!isExpanded ? 'line-clamp-3' : ''}`}>{thread.summary}</p>
      
      <div className="mt-4 pt-3 border-t border-slate-700/50">
        <h4 className="text-base font-semibold text-muted-foreground mb-2">Included Notes ({thread.notes.length})</h4>
        <ul className="space-y-2">
          {displayedNotes.map((note: Note) => (
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
        {thread.notes.length > 3 && (
          <button 
            onClick={(e) => { e.stopPropagation(); setShowAllNotes(!showAllNotes); }}
            className="text-sm text-accent hover:underline mt-2"
          >
            {showAllNotes ? 'Show less' : `Show ${thread.notes.length - 3} more`}
          </button>
        )}
      </div>

      <div className="mt-3 text-sm text-right text-muted-foreground/80">
        <span>Relevance Score: {(thread.relevanceScore ?? 0).toFixed(2)}</span>
      </div>
    </div>
  );
};

export default InsightThreadCard;
