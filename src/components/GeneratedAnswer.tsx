import React from 'react';
import { AnswerData } from '../types/common';

interface GeneratedAnswerProps {
  data: AnswerData;
}

/**
 * Renders the AI-generated answer with source highlighting and a reference section.
 * Each sentence includes a clickable anchor `[number]` that links to the source note.
 * @param {GeneratedAnswerProps} props - The props containing the answer data.
 */
export function GeneratedAnswer({ data }: GeneratedAnswerProps) {
  // Create a mapping from sourceNoteId to a display number (e.g., "note123" -> 1)
  const sourceIdToNumberMap = new Map<string, number>();
  let currentSourceNumber = 1;

  data.sourceNotes.forEach(noteId => {
    if (!sourceIdToNumberMap.has(noteId)) {
      sourceIdToNumberMap.set(noteId, currentSourceNumber++);
    }
  });

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md animate-fadeIn">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">AI 답변</h3>
      
      {/* Answer Sentences with Source Anchors */}
      <div className="text-slate-700 dark:text-slate-300 space-y-2">
        {data.answerSegments.map((segment, index) => {
          const sourceNumber = sourceIdToNumberMap.get(segment.sourceNoteId);
          return (
            <p key={index}>
              {segment.sentence}
              {sourceNumber && (
                <a 
                  href={`#source-${sourceNumber}`} 
                  className="ml-1 text-indigo-400 font-bold no-underline hover:underline"
                  title={`출처 ${sourceNumber}로 이동`}
                >
                  [{sourceNumber}]
                </a>
              )}
            </p>
          );
        })}
      </div>

      {/* Reference Notes Section */}
      {data.sourceNotes.length > 0 && (
        <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="text-md font-semibold text-slate-600 dark:text-slate-400 mb-2">참고 자료</h4>
          <ul className="space-y-3">
            {data.sourceNotes.map((noteId) => {
              const sourceNumber = sourceIdToNumberMap.get(noteId);
              // In a real app, we would fetch the note content from the DB using the noteId.
              // For now, we'll just display the ID as a placeholder.
              const noteContentPreview = `노트 내용 (ID: ${noteId.substring(0, 8)}...)`; 

              return (
                <li 
                  key={noteId} 
                  id={`source-${sourceNumber}`}
                  className="text-sm text-slate-500 dark:text-slate-400 p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md"
                >
                  <span className="font-bold text-indigo-500 dark:text-indigo-400 mr-2">
                    [{sourceNumber}]
                  </span>
                  {noteContentPreview}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}