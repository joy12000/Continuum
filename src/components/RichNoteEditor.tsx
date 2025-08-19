
import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { db, Note } from "../lib/db";

function Toolbar({ editor }: { editor: any }) {
  if (!editor) return null;
  const btn = (active: boolean) => active ? "bg-indigo-600" : "bg-slate-700";
  return (
    <div className="flex flex-wrap gap-2">
      <button className={`px-3 py-1 rounded-lg ${btn(editor.isActive('bold'))}`} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
      <button className={`px-3 py-1 rounded-lg ${btn(editor.isActive('italic'))}`} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
      <button className={`px-3 py-1 rounded-lg ${btn(editor.isActive('bulletList'))}`} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
      <button className={`px-3 py-1 rounded-lg ${btn(editor.isActive('orderedList'))}`} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
    </div>
  );
}

export function RichNoteEditor({ onSaved }: { onSaved?: () => void }) {
  const [tags, setTags] = useState("");

  const editor = useEditor({
    extensions: [StarterKit],
    content: "",
    editorProps: { attributes: { class: "prose prose-invert max-w-none min-h-[96px] focus:outline-none" } }
  });

  useEffect(() => {
    editor?.commands.focus("end");
  }, [editor]);

  async function save() {
    if (!editor) return;
    const html = editor.getHTML().trim();
    const text = editor.getText().trim();
    if (!text) return;
    const now = Date.now();
    const note: Note = {
      id: crypto.randomUUID(),
      content: html,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      createdAt: now,
      updatedAt: now
    };
    await db.notes.add(note);
    editor.commands.clearContent();
    setTags("");
    onSaved?.();
  }

  return (
    <div className="card space-y-3">
      <div className="text-sm opacity-80">리치 텍스트 입력</div>
      <Toolbar editor={editor} />
      <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
        <EditorContent editor={editor} />
      </div>
      <input className="input" placeholder="태그: 쉼표로 구분" value={tags} onChange={e => setTags(e.target.value)} />
      <div className="flex gap-2">
        <button className="btn" onClick={save}>저장</button>
        <span className="text-sm text-slate-400 self-center">Tip: 볼드, 리스트 등 서식 사용 가능</span>
      </div>
    </div>
  );
}
