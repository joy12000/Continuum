'use client';
import React, { useEffect, useRef } from 'react';

/**
 * AnswerCardsModal
 * - 域밸챶源?域??癒?봺?癒?퐣 疫꿸퀣??AnswerCard/GeneratedAnswer ?뚮똾猷??곕뱜??children??곗쨮 ???쐭??몃빍??
 * - ?臾롫젏?? role="dialog", aria-modal, ??鍮???紐껋삫, ESC ??る┛
 */
export default function AnswerCardsModal({
  open,
  onClose,
  children
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const firstRef = useRef<HTMLButtonElement | null>(null);
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/80" />
      <div
        ref={cardRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(920px,94vw)]"
        onClick={(e)=>e.stopPropagation()}
      >
        <button 
          ref={firstRef} 
          onClick={onClose} 
          className="absolute top-0 right-0 z-10 m-2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white"
          aria-label="??る┛"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div className="max-h-[80vh] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
