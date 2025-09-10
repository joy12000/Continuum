import React from 'react';
import { AnswerData } from '../types/common';

interface GeneratedAnswerProps {
  data: AnswerData;
  noteTitlesMap: Record<string, string>;
  onNoteClick: (noteId: string) => void;
}

/**
 * Renders the AI-generated answer with a design that complements the sky/space theme.
 * Features a glassmorphism background, improved text visibility, and clear source references.
 * @param {GeneratedAnswerProps} props - The props containing the answer data.
 */
export function GeneratedAnswer({ data, noteTitlesMap, onNoteClick }: GeneratedAnswerProps) {
  const sourceIdToNumberMap = new Map<string, number>();
  let currentSourceNumber = 1;

  data.sourceNotes.forEach(noteId => {
    if (!sourceIdToNumberMap.has(noteId)) {
      sourceIdToNumberMap.set(noteId, currentSourceNumber++);
    }
  });

  return (
    <div className="bg-slate-800/50 dark:bg-slate-900/50 backdrop-blur-lg border border-slate-700/50 rounded-2xl p-5 shadow-lg animate-fadeIn">
      <h3 className="text-xl font-bold text-white/90 mb-4">AI 요약</h3>
      
      <div className="text-sky-50/90 text-base leading-relaxed space-y-3">
        <p>
          {data.answerSegments.map((segment, index) => {
            const sourceNumber = sourceIdToNumberMap.get(segment.sourceNoteId);
            return (
              <React.Fragment key={index}>
                {segment.sentence}
                {sourceNumber && (
                  <a 
                    href={`#source-${sourceNumber}`}
                    className="ml-1.5 text-cyan-300 font-semibold no-underline hover:text-cyan-100 hover:underline transition-colors duration-200"
                    title={`출처 ${sourceNumber}로 이동`}
                  >
                    [{sourceNumber}]
                  </a>
                )}
                {' '}
              </React.Fragment>
            );
          })}
        </p>
      </div>

      {data.sourceNotes.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <h4 className="text-lg font-semibold text-white/80 mb-3">참고 자료</h4>
          <ul className="space-y-2">
            {data.sourceNotes.map((noteId) => {
              const sourceNumber = sourceIdToNumberMap.get(noteId);
              const noteTitle = noteTitlesMap[noteId] || `노트 (ID: ${noteId.substring(0, 8)}...)`;

              return (
                <li 
                  key={noteId} 
                  id={`source-${sourceNumber}`}
                  className="text-sm text-sky-100/80 p-2.5 bg-black/20 dark:bg-white/5 rounded-lg flex items-center transition-all duration-200 hover:bg-black/30 hover:text-sky-50 cursor-pointer"
                  onClick={() => onNoteClick(noteId)}
                >
                  <span className="flex-shrink-0 h-5 w-5 bg-cyan-400/20 text-cyan-200 font-bold text-xs flex items-center justify-center rounded-full mr-3">
                    {sourceNumber}
                  </span>
                  <span className="truncate">{noteTitle}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}