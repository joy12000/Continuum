
import { useEffect, useState, useMemo, useRef } from "react";
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

/**
 * A rich text editor component for creating and editing notes.
 * It can suggest related notes in real-time based on the content being typed.
 * @param {object} props - The component props.
 * @param {Note} [props.note] - The note to be edited. If not provided, a new note will be created.
 * @param {(noteId: string) => void} [props.onNoteLinkClick] - Callback for when a suggested note is clicked.
 * @param {() => void} [props.onSaved] - Callback function to be executed after a note is saved.
 * @param {(content: string) => void} [props.onSave] - Callback for autosaving.
 * @param {boolean} [props.autoFocus] - Whether to autofocus the editor.
 */
export function RichNoteEditor({ note: initialNote, onNoteLinkClick, onSaved, onSave, autoFocus, hideSaveButton }: { note?: Note, onNoteLinkClick?: (noteId: string) => void, onSaved?: () => void, onSave?: (content: string) => void, autoFocus?: boolean, hideSaveButton?: boolean }) {
  const [tags, setTags] = useState(initialNote?.tags?.join(", ") || "");
  const [suggestedNotes, setSuggestedNotes] = useState<Note[] | null>(null);
  const debounceTimeout = useRef<number | null>(null);

  const searchWorker = useMemo(() => 
    new Worker(new URL('../workers/searchWorker.ts', import.meta.url), { type: 'module' })
  , []);

  useEffect(() => {
    const handleWorkerMessage = (e: MessageEvent) => {
      if (e.data.type === 'SIMILAR_FOUND') {
        setSuggestedNotes(e.data.payload.notes);
      }
    };
    searchWorker.addEventListener('message', handleWorkerMessage);
    return () => {
      searchWorker.removeEventListener('message', handleWorkerMessage);
    };
  }, [searchWorker]);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialNote?.content || "",
    autofocus: autoFocus,
    editorProps: { attributes: { class: "prose prose-invert max-w-none min-h-[96px] focus:outline-none" } },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onSave?.(html);

      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = window.setTimeout(() => {
        const editorContent = editor.getText();
        if (editorContent.length > 20 && initialNote?.id) {
          searchWorker.postMessage({
            type: 'FIND_SIMILAR',
            payload: { text: editorContent, currentNoteId: initialNote.id, engine: 'auto' }
          });
        } else {
          setSuggestedNotes(null);
        }
      }, 500);
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
    const now = Date.now();
    
    const noteToSave: Note = {
      id: initialNote?.id || crypto.randomUUID(),
      content: html,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      createdAt: initialNote?.createdAt || now,
      updatedAt: now
    };

    await db.notes.put(noteToSave);

    if (!initialNote) {
      editor.commands.clearContent();
      setTags("");
    }
    onSaved?.();
  }

  return (
    <div className="card space-y-3">
      <div className="text-sm opacity-80">{initialNote ? "노트 편집" : "리치 텍스트 입력"}</div>
      <Toolbar editor={editor} />
      <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3">
        <EditorContent editor={editor} />
      </div>
      {suggestedNotes && suggestedNotes.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-semibold text-slate-400">관련 생각:</h3>
          <ul className="list-disc list-inside space-y-1">
            {suggestedNotes.map(note => (
              <li 
                key={note.id} 
                className="text-sm text-indigo-400 hover:underline cursor-pointer"
                onClick={() => onNoteLinkClick?.(note.id)}
              >
                {note.content.replace(/<[^>]+>/g, '').substring(0, 40)}...
              </li>
            ))}
          </ul>
        </div>
      )}
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
