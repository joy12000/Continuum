import React from 'react';

export interface AnswerData {
  answerSegments: {
    sentence: string;
    sourceNoteId: string;
  }[];
  sourceNotes: string[];
}

interface GeneratedAnswerProps {
  data: AnswerData;
}

export function GeneratedAnswer({ data }: GeneratedAnswerProps) {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">AI 답변</h3>
      <div className="text-slate-700 dark:text-slate-300">
        {data.answerSegments.map((segment, index) => (
          <p key={index} className="mb-1">{segment.sentence}</p>
        ))}
      </div>
      {data.sourceNotes.length > 0 && (
        <div className="mt-4">
          <h4 className="text-md font-semibold text-slate-600 dark:text-slate-400 mb-1">참고 노트:</h4>
          <ul className="list-disc list-inside text-sm text-slate-500 dark:text-slate-400">
            {data.sourceNotes.map((noteId, index) => (
              <li key={index}>{noteId}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}