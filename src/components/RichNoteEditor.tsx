import { addNoteAndChunks } from "../lib/supabaseService";
import { useEffect, useState, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Note } from "../types/common";
import { supabase } from "../lib/supabase";

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

export function RichNoteEditor({ note: initialNote, onSaved, onSave, autoFocus, hideSaveButton }: { note?: Note, onSaved?: () => void, onSave?: (content: string) => void, autoFocus?: boolean, hideSaveButton?: boolean }) {
  const [tags, setTags] = useState(initialNote?.tags?.join(", ") || "");

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialNote?.content || "",
    autofocus: autoFocus,
    editorProps: { attributes: { class: "prose prose-invert max-w-none min-h-[96px] focus:outline-none" } },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onSave?.(html);
    }
  });

  useEffect(() => {
    editor?.commands.setContent(initialNote?.content || "");
    setTags(initialNote?.tags?.join(", ") || "");
    editor?.commands.focus("end");
  }, [initialNote, editor]);

  async function save() {
    if (!editor) return;
    const html = editor.getHTML().trim();
    const text = editor.getText().trim();
    if (!text) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("User is not logged in.");
      return;
    }

    try {
      await addNoteAndChunks({
        title: text.slice(0, 50),
        body: html,
        user_id: user.id,
      });

      if (!initialNote) {
        editor.commands.clearContent();
        setTags("");
      }
      onSaved?.();
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  }

  return (
    <div className="card space-y-3 h-full flex flex-col">
      <div className="text-sm opacity-80">{initialNote ? "노트 편집" : "리치 텍스트 입력"}</div>
      <Toolbar editor={editor} />
      <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3 flex-grow overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      {!hideSaveButton && (
        <>
          <input className="input" placeholder="태그: 쉼표로 구분" value={tags} onChange={e => setTags(e.target.value)} />
          <div className="flex gap-2">
            <button className="btn" onClick={save}>저장</button>
            <span className="text-sm text-slate-400 self-center">Tip: 볼드, 리스트 등 서식 사용 가능</span>
          </div>
        </>
      )}
    </div>
  );
}