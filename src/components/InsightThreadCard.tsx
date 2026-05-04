'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { InsightThread, Note } from '@server/types';
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
      className={`border border-border bg-card rounded-[20px] p-6 shadow-[0_1px_3px_rgba(25,31,40,0.04)] flex flex-col transition-[max-height] duration-700 ease-in-out ${isExpanded ? 'max-h-full overflow-y-auto' : 'max-h-64 overflow-hidden'}`}
      onClick={() => onToggleExpand(thread.threadId)}
    >
      <h3 className="text-[18px] font-bold text-foreground break-words tracking-tight">{thread.title}</h3>
      <p className={`mt-2 text-secondary-text flex-grow text-[15px] leading-relaxed ${!isExpanded ? 'line-clamp-3' : ''}`}>{thread.summary}</p>
      
      <div className="mt-4 pt-4 border-t border-border">
        <h4 className="text-[14px] font-semibold text-muted mb-2">Included Notes ({thread.notes.length})</h4>
        <ul className="space-y-2">
          {displayedNotes.map((note: Note) => (
            <li key={note.id}>
              <button 
                onClick={(e) => { e.stopPropagation(); onNoteClick(note); }}
                className="flex items-center gap-2 text-left text-[14px] font-medium text-primary hover:underline hover:text-primary-hover transition-colors w-full truncate"
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
            className="text-[13px] font-medium text-secondary-text hover:text-foreground hover:underline mt-3"
          >
            {showAllNotes ? 'Show less' : `Show ${thread.notes.length - 3} more`}
          </button>
        )}
      </div>

      <div className="mt-4 pt-2 text-[12px] text-right text-dim-text">
        <span>Relevance Score: {(thread.relevanceScore ?? 0).toFixed(2)}</span>
      </div>
    </div>
  );
};

export default InsightThreadCard;
