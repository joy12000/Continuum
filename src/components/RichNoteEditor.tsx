import { useEffect, useState, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Note } from "../types/common";
import { supabase } from "../lib/supabase";
import { toast } from "../lib/toast";

// Define the structure for a new attachment
interface NewAttachment {
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  file: File;
}

// A helper function to strip HTML tags from old notes
function stripHtml(html: string){
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

export function RichNoteEditor({ note: initialNote, onSaved, onSave, autoFocus, hideSaveButton }: { note?: Note, onSaved?: () => void, onSave?: (content: string) => void, autoFocus?: boolean, hideSaveButton?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newAttachments, setNewAttachments] = useState<NewAttachment[]>([]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable extensions that produce complex HTML
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
    ],
    // For existing notes, strip any old HTML from the body for a clean text experience.
    content: initialNote ? stripHtml(initialNote.body) : "",
    autofocus: autoFocus,
    editorProps: { attributes: { class: "prose prose-invert max-w-none min-h-[96px] focus:outline-none" } },
    onUpdate: ({ editor }) => {
      // onSave prop might be used for auto-saving drafts, providing plain text.
      onSave?.(editor.getText());
    }
  });

  useEffect(() => {
    // When the initialNote changes, update the editor content.
    editor?.commands.setContent(initialNote ? stripHtml(initialNote.body) : "");
    setNewAttachments([]); // Clear any pending attachments when note changes
    editor?.commands.focus("end");
  }, [initialNote, editor]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    const fileExt = file.name.split('.').pop();
    const storagePath = `${user.id}/${Date.now()}.${fileExt}`;

    // Add to local state for UI feedback, upload will happen on save.
    const newAttachment: NewAttachment = {
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      file: file, // Keep the file object for upload
    };

    setNewAttachments(prev => [...prev, newAttachment]);

    // Reset file input for next selection
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeNewAttachment = (storagePath: string) => {
    setNewAttachments(prev => prev.filter(att => att.storage_path !== storagePath));
  }

  async function save() {
    if (!editor) return;
    const text = editor.getText().trim();
    if (!text && newAttachments.length === 0) return; // Nothing to save

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    toast.info("저장 중...");

    try {
      // Step 1: Save the note text and get the note ID.
      const { data: savedNote, error: noteError } = await supabase
        .from('notes')
        .upsert({
          id: initialNote?.id, // Update existing or create new
          user_id: user.id,
          title: text.slice(0, 50) || "제목 없음",
          body: text, // Save plain text
        })
        .select()
        .single();

      if (noteError) throw noteError;
      if (!savedNote) throw new Error("Failed to save note.");

      // Step 2: Upload and link attachments if there are any.
      if (newAttachments.length > 0) {
        for (const attachment of newAttachments) {
          // Upload file to storage
          const { error: uploadError } = await supabase.storage
            .from('notes-attachments')
            .upload(attachment.storage_path, attachment.file);
          if (uploadError) throw uploadError;

          // Insert metadata into the new table
          const { error: insertError } = await supabase
            .from('note_attachments')
            .insert({
              note_id: savedNote.id,
              user_id: user.id,
              storage_path: attachment.storage_path,
              file_name: attachment.file_name,
              mime_type: attachment.mime_type,
              file_size: attachment.file_size,
            });
          if (insertError) throw insertError;
        }
      }

      toast.success("저장했습니다.");
      // Cleanup
      if (!initialNote) {
        editor.commands.clearContent();
      }
      setNewAttachments([]);
      onSaved?.();

    } catch (error: any) {
      console.error("Failed to save note:", error);
      toast.error(`저장에 실패했습니다: ${error.message}`);
    }
  }

  return (
    <div className="card space-y-3 h-full flex flex-col">
      <div className="text-sm opacity-80">{initialNote ? "노트 편집" : "새 노트"}</div>
      <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-3 flex-grow overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      
      {/* Display newly added attachments */}
      {newAttachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-400">첨부될 파일:</h4>
          <ul className="space-y-1">
            {newAttachments.map(att => (
              <li key={att.storage_path} className="text-xs flex justify-between items-center bg-slate-700/50 p-1 rounded">
                <span>{att.file_name}</span>
                <button onClick={() => removeNewAttachment(att.storage_path)} className="text-red-400 hover:text-red-600">X</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!hideSaveButton && (
        <div className="flex gap-2 justify-between items-center">
          <div>
            <button className="btn" onClick={() => fileInputRef.current?.click()}>파일 첨부</button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          </div>
          <button className="btn btn-primary" onClick={save}>저장</button>
        </div>
      )}
    </div>
  );
}
