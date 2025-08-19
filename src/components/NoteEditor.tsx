
import { useEffect, useRef, useState } from "react";
import { db, Note } from "../lib/db";

export function NoteEditor({ onSaved }: { onSaved?: () => void }) {
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function save() {
    const now = Date.now();
    const note: Note = {
      id: crypto.randomUUID(),
      content: content.trim(),
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      createdAt: now,
      updatedAt: now
    };
    if (!note.content) return;
    await db.notes.add(note);
    setContent("");
    setTags("");
    onSaved?.();
  }

  return (
    <div className="card space-y-3">
      <div className="text-sm opacity-80">빠른 입력</div>
      <textarea
        ref={textareaRef}
        className="input h-28"
        placeholder="무엇이든 적으세요… (Shift+Enter 줄바꿈)"
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          }
        }}
      />
      <input
        className="input"
        placeholder="태그: 예) 일기, 프로젝트 (쉼표로 구분)"
        value={tags}
        onChange={e => setTags(e.target.value)}
      />
      <div className="flex gap-2">
        <button className="btn" onClick={save}>저장 (Enter)</button>
        <span className="text-sm text-slate-400 self-center">Tip: <span className="kbd">Enter</span> 저장, <span className="kbd">Shift</span>+<span className="kbd">Enter</span> 줄바꿈</span>
      </div>
    </div>
  );
}
