import React, { useEffect, useRef } from 'react';
import type { DailySummary } from '../types/tasks';

export default function SummaryModal({ open, summary, onClose }: {
  open: boolean;
  summary: DailySummary | null | undefined;
  onClose: () => void;
}) {
  const firstRef = useRef<HTMLButtonElement | null>(null);
  const lastRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && cardRef.current) {
        const focusables = cardRef.current.querySelectorAll<HTMLElement>('[tabindex],button,a,textarea,input,select');
        if (focusables.length >= 2) {
          const first = focusables[0], last = focusables[focusables.length-1];
          if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
          else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
        }
      }
    }
    if (open) {
      document.addEventListener('keydown', onKey);
      setTimeout(() => firstRef.current?.focus(), 0);
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !summary) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      <div
        ref={cardRef}
        className="absolute left-1/2 -translate-x-1/2 w-[min(760px,92vw)] top-[max(56px,calc(env(safe-area-inset-top,0px)+56px))] bg-white rounded-2xl shadow-2xl p-5"
        onClick={(e)=>e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">{summary.title || '오늘의 요약'}</h2>
          <button ref={firstRef} onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm">닫기</button>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-slate-800 leading-relaxed">{summary.summary}</p>
        {Array.isArray(summary.bullets) && summary.bullets.length > 0 && (
          <ul className="mt-4 list-disc pl-5 text-slate-800">
            {summary.bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
          </ul>
        )}
        {summary.tomorrow && (
          <div className="mt-4 p-3 rounded-xl bg-sky-50 text-slate-800">
            <div className="text-sm font-medium text-sky-700">내일 한 줄</div>
            <div className="mt-1">{summary.tomorrow}</div>
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <button ref={lastRef} onClick={onClose} className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm">확인</button>
        </div>
      </div>
    </div>
  );
}
