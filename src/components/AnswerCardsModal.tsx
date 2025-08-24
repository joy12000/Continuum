import React, { useEffect, useRef } from 'react';

/**
 * AnswerCardsModal
 * - 그냥 그 자리에서 기존 AnswerCard/GeneratedAnswer 컴포넌트를 children으로 렌더합니다.
 * - 접근성: role="dialog", aria-modal, 포커스 트랩, ESC 닫기
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      <div
        ref={cardRef}
        className="absolute left-1/2 -translate-x-1/2 w-[min(920px,94vw)] top-[max(56px,calc(env(safe-area-inset-top,0px)+56px))] bg-white rounded-2xl shadow-2xl p-0 overflow-hidden"
        onClick={(e)=>e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="text-sm text-slate-500">AI 요약 & 출처</div>
          <button ref={firstRef} onClick={onClose} className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm">닫기</button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
