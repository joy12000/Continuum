import React from "react";
import { XMarkIcon } from '@heroicons/react/24/outline';

type Props = { isOpen: boolean; title?: string; body?: string; onClose: () => void };

export default function SourceNoteModal({ isOpen, title, body, onClose }: Props){
  if(!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl p-6 animate-zoomIn" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <h2 className="text-xl font-semibold text-primary-foreground">{title || "Source Note"}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <XMarkIcon className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>
        <div className="prose prose-invert max-h-[70vh] overflow-auto whitespace-pre-wrap pr-4">
          {body}
        </div>
      </div>
    </div>
  );
}