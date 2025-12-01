
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
      if (isExpanded) {
        requestAnimationFrame(() => {
          if (cardRef.current) {
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight}px`;
          }
        });
      } else {
        cardRef.current.style.maxHeight = '16rem'; // 64 * 0.25rem
      }
    }
  }, [isExpanded]);

  return (
    <div 
      ref={cardRef}
      className={`border border-slate-200 bg-white rounded-3xl p-4 shadow-sm flex flex-col transition-[max-height] duration-700 ease-in-out ${isExpanded ? 'max-h-full overflow-y-auto' : 'max-h-64 overflow-hidden'}`}
      onClick={() => onToggleExpand(thread.threadId)}
    >
      <h3 className="text-lg font-bold text-slate-900 break-words">{thread.title}</h3>
      <p className={`mt-2 text-slate-600 flex-grow text-base ${!isExpanded ? 'line-clamp-3' : ''}`}>{thread.summary}</p>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <h4 className="text-base font-semibold text-slate-700 mb-2">Included Notes ({thread.notes.length})</h4>
        <ul className="space-y-2">
          {displayedNotes.map((note: Note) => (
            <li key={note.id}>
              <button
                onClick={(e) => { e.stopPropagation(); onNoteClick(note); }}
                className="flex items-center gap-2 text-left text-base text-slate-900 hover:underline hover:text-sky-600 transition-colors w-full truncate"
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
            className="text-sm text-sky-600 hover:underline mt-2"
          >
            {showAllNotes ? 'Show less' : `Show ${thread.notes.length - 3} more`}
          </button>
        )}
      </div>

      <div className="mt-3 text-sm text-right text-slate-500">
        <span>Relevance Score: {(thread.relevanceScore ?? 0).toFixed(2)}</span>
      </div>
    </div>
  );
};

export default InsightThreadCard;
