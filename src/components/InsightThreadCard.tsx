
import React from 'react';
import { Link } from 'react-router-dom';
import type { InsightThread, Note } from '@lib/types';

interface InsightThreadCardProps {
  thread: InsightThread;
  onNoteClick: (note: Note) => void;
}

const InsightThreadCard: React.FC<InsightThreadCardProps> = ({ thread, onNoteClick }) => {
  return (
    <div className="p-4 border rounded-lg shadow-md bg-slate-800/50 border-slate-700 flex flex-col h-full">
      <h3 className="text-lg font-bold text-sky-400">{thread.title}</h3>
      <p className="mt-2 text-gray-300 flex-grow">{thread.summary}</p>
      
      <div className="mt-4 pt-3 border-t border-slate-700">
        <h4 className="text-sm font-semibold text-gray-400 mb-2">포함된 노트</h4>
        <ul className="space-y-1">
          {thread.notes.map((note: Note) => (
            <li key={note.id}>
              <button 
                onClick={() => onNoteClick(note)}
                className="text-left text-sm text-gray-300 hover:underline hover:text-white transition-colors w-full truncate block"
              >
                📝 {note.title || '제목 없는 노트'}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 text-xs text-right text-gray-500">
        <span>관련성 점수: {thread.relevanceScore.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default InsightThreadCard;
