'use client';
import React, { memo, useMemo } from "react";
import SourceNoteModal from "./SourceNoteModal";
import { db } from "../lib/db";

function renderAnchoredSentences(answerObj: any, onClickRef: (id: string) => void){
  const sentences = answerObj?.sentences;
  if(!Array.isArray(sentences) || sentences.length === 0) return null;
  const elems: any[] = [];
  let idx = 1;
  for(const s of sentences){
    const t = (s?.text ?? "").trim();
    const sid = s?.sourceNoteId;
    if(!t) continue;
    elems.push(
      <span key={`s-${idx}`} className="leading-relaxed">
        {t}{" "}
        {sid ? <a href={`#source-${sid}`} onClick={(e)=>{e.preventDefault(); onClickRef(sid);}}
          className="text-blue-600 hover:underline align-super text-xs">[{idx}]</a> : null}{" "}
      </span>
    );
    idx++;
  }
  return <p className="whitespace-pre-wrap">{elems}</p>;
}

const AnswerCardMemo = memo(function AnswerCard({ kp, cites, onJump }: { kp: string[]; cites: { text: string; noteId: string; pos: number; tags: string[]; createdAt: number; }[]; onJump?: (id: string) => void; }) {
  const grouped = useMemo(() => {
    const m = new Map<string, { noteId: string; snippets: string[]; tags:string[]; createdAt: number; }>();
    for (const c of cites) {
      const g = m.get(c.noteId) || { noteId: c.noteId, snippets: [], tags: c.tags, createdAt: c.createdAt };
      g.snippets.push(c.text);
      m.set(c.noteId, g);
    }
    return Array.from(m.values());
  }, [cites]);

  return (
    <div className="bg-slate-900/95 border border-slate-700/50 rounded-lg p-4 mt-4">
      <div className="text-sm text-sky-300 mb-2">추출된 핵심 키워드</div>
      <ul className="space-y-2">
        {kp.map((s, i) => (
          <li key={i} className="flex items-start">
            <span className="text-sky-400 mr-2">•</span>
            <span className="text-slate-200">{s}</span>
          </li>
        ))}
      </ul>
      <div className="text-sm text-sky-300 mt-4 mb-2">참고된 메모</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {grouped.map(g => (
          <div key={g.noteId} className="bg-slate-800/90 border border-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-2">노트 {g.noteId.slice(0, 8)} | {new Date(g.createdAt || 0).toLocaleDateString()}</div>
            <ul className="space-y-1">
              {g.snippets.slice(0, 3).map((s, i) => (
                <li key={i} className="text-sm text-slate-300 truncate">- {s}</li>
              ))}
            </ul>
            {onJump && (
              <button 
                className="text-xs text-sky-400 hover:text-sky-200 transition-colors mt-2" 
                onClick={() => onJump(g.noteId)}
              >
                메모 바로가기
              </button>
            )}
          </div>
        ))}
      </div>
      {grouped.length === 0 && (
        <div className="text-sm text-slate-400 mt-2">연관된 참고 메모가 없습니다.</div>
      )}
    </div>
  );
});

export { AnswerCardMemo as AnswerCard };
