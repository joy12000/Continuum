'use client';
import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

// A helper function to strip HTML tags
function stripHtml(html: string){
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

export function RichNoteEditor({ content, onContentChange, autoFocus }: { content: string, onContentChange: (content: string) => void, autoFocus?: boolean }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    content: stripHtml(content),
    autofocus: autoFocus,
    editorProps: { attributes: { class: "prose prose-invert max-w-none min-h-[200px] focus:outline-none" } },
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML());
    }
  });

  // Effect to update editor when external content changes, but only if different.
  useEffect(() => {
    if (editor && stripHtml(editor.getHTML()) !== stripHtml(content)) {
      editor.commands.setContent(stripHtml(content), false); // false to avoid re-triggering onUpdate
    }
  }, [content, editor]);


  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3 flex-grow overflow-y-auto">
      <EditorContent editor={editor} />
    </div>
  );
}
