import React, { useEffect, useRef, useState } from 'react';
import { Note } from '../lib/db';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void> | void;
  onGenerateSummary: () => void;
  onFocus: () => void;
  onDebouncedChange: (text: string) => void;
  similarNotes: Note[];
};

export default function OverlayEditor({ open, onClose, onSubmit, onGenerateSummary, onFocus, onDebouncedChange, similarNotes }: Props) {
  const [text, setText] = useState('');
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => areaRef.current?.focus(), 0);
      onFocus();
    }
    else {
      setText('');
    }
  }, [open, onFocus]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (text) {
        onDebouncedChange(text);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [text, onDebouncedChange]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return onClose();
    await onSubmit(t);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose} aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]" />
      <form
        onClick={(e)=>e.stopPropagation()}
        onSubmit={handleSubmit}
        className="absolute left-1/2 -translate-x-1/2 w-[min(800px,92vw)] bottom-[max(16px,env(safe-area-inset-bottom))] bg-white/95 rounded-2xl shadow-xl p-4"
      >
        <textarea
          ref={areaRef}
          rows={5}
          placeholder="오늘을 적어보세요…"
          value={text}
          onChange={e=>setText(e.target.value)}
          className="w-full resize-y border-0 focus:ring-0 bg-transparent text-slate-900 placeholder-slate-400 text-base md:text-lg leading-relaxed"
        />
        <div className="mt-3 flex gap-2 justify-end">
          <button type="button" onClick={onGenerateSummary} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">일기 만들기/요약</button>
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm">닫기</button>
          <button type="submit" className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm">저장</button>
        </div>
        {similarNotes.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-600">유사한 노트</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
              {similarNotes.map(note => (
                <div key={note.id} className="bg-slate-100 rounded-lg p-2">
                  <p className="text-xs text-slate-500">{new Date(note.updatedAt).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-800 line-clamp-2">{note.content}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="text-xs text-blue-600">열기</button>
                    <button type="button" className="text-xs text-blue-600">붙여넣기</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
