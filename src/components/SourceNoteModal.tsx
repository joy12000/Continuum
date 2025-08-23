import React from "react";
type Props = { isOpen: boolean; title?: string; body?: string; onClose: () => void };
export default function SourceNoteModal({ isOpen, title, body, onClose }: Props){
  if(!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title || "원본 노트"}</h2>
          <button onClick={onClose} className="px-3 py-1 rounded-lg border">닫기</button>
        </div>
        <div className="prose dark:prose-invert max-h-[60vh] overflow-auto whitespace-pre-wrap">
          {body}
        </div>
      </div>
    </div>
  );
}