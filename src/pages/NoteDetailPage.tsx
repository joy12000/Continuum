import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { deleteNote } from '../lib/supabaseService';
import type { Note, NoteAttachment } from '../types/common';
import { RichNoteEditor } from '../components/RichNoteEditor';
import ConfirmModal from '../components/ConfirmModal';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

// Helper to get public URL from storage path
const getPublicUrl = (path: string): string => {
  const { data } = supabase.storage.from('notes-attachments').getPublicUrl(path);
  return data?.publicUrl || '';
};

// Attachment rendering component
function AttachmentItem({ attachment, onDelete }: { attachment: NoteAttachment, onDelete: (attachment: NoteAttachment) => void }) {
  const isImage = attachment.mime_type.startsWith('image/');
  const url = getPublicUrl(attachment.storage_path);

  return (
    <li className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
      <a href={url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
        {isImage ? '🖼️' : '📄'} {attachment.file_name}
      </a>
      <button onClick={() => onDelete(attachment)} className="btn btn-xs btn-ghost text-red-500">삭제</button>
    </li>
  )
}

export function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchNoteAndAttachments = useCallback(async () => {
    if (!noteId) return;
    setIsLoading(true);
    try {
      // Fetch note and attachments in parallel
      const notePromise = supabase.from('notes').select('*').eq('id', noteId).single();
      const attachmentsPromise = supabase.from('note_attachments').select('*').eq('note_id', noteId);

      const [{ data: noteData, error: noteError }, { data: attachmentData, error: attachmentError }] = await Promise.all([notePromise, attachmentsPromise]);

      if (noteError) throw noteError;
      if (attachmentError) throw attachmentError;

      setNote(noteData);
      setAttachments(attachmentData || []);

    } catch (error: any) {
      console.error('Failed to fetch note and attachments:', error);
      toast.error(`데이터를 불러오는 데 실패했습니다: ${error.message}`);
      setNote(null);
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchNoteAndAttachments();
  }, [fetchNoteAndAttachments]);

  const handleNoteSaved = () => {
    setIsEditing(false);
    fetchNoteAndAttachments(); // Refetch everything to show updated state
    window.dispatchEvent(new CustomEvent('notes:updated'));
  };

  const handleDeleteNote = async () => {
    if (!noteId) return;
    // Note: Supabase cascade delete should handle attachments in DB.
    // We still need to delete files from storage.
    try {
      const { data: attachmentsToDelete } = await supabase.from('note_attachments').select('storage_path').eq('note_id', noteId);
      if (attachmentsToDelete && attachmentsToDelete.length > 0) {
        const paths = attachmentsToDelete.map(a => a.storage_path);
        await supabase.storage.from('notes-attachments').remove(paths);
      }
      await deleteNote(noteId);
      toast.success('노트가 삭제되었습니다.');
      setShowDeleteModal(false);
      window.dispatchEvent(new CustomEvent('notes:updated'));
      navigate('/');
    } catch (error: any) {
      console.error('Failed to delete note:', error);
      toast.error(`노트 삭제에 실패했습니다: ${error.message}`);
    }
  };

  const handleDeleteAttachment = async (attachment: NoteAttachment) => {
    if (!window.confirm(`${attachment.file_name} 파일을 삭제하시겠습니까?`)) return;

    try {
      // 1. Delete from storage
      const { error: storageError } = await supabase.storage.from('notes-attachments').remove([attachment.storage_path]);
      if (storageError) throw storageError;

      // 2. Delete from database
      const { error: dbError } = await supabase.from('note_attachments').delete().eq('id', attachment.id);
      if (dbError) throw dbError;

      // 3. Update local state
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
      toast.success("첨부파일이 삭제되었습니다.");

    } catch (error: any) {
      console.error("Failed to delete attachment:", error);
      toast.error(`첨부파일 삭제에 실패했습니다: ${error.message}`);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><p className="text-white">로딩 중...</p></div>;
  }

  if (!note) {
    return <div className="flex justify-center items-center h-full"><p className="text-red-500">노트를 찾을 수 없습니다.</p></div>;
  }

  return (
    <div className="p-4 md:p-6 text-white max-w-4xl mx-auto">
      {isEditing ? (
        <RichNoteEditor
          note={note}
          onSaved={handleNoteSaved}
        />
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold text-sky-300">{note.title}</h1>
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(true)} className="btn btn-outline btn-info">수정</button>
              <button onClick={() => setShowDeleteModal(true)} className="btn btn-outline btn-error">삭제</button>
            </div>
          </div>
          <div 
            className="prose prose-invert max-w-none p-4 bg-gray-800 rounded-lg"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {note.body} 
          </div>
          
          {attachments.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">첨부파일</h3>
              <ul className="space-y-2">
                {attachments.map(att => (
                  <AttachmentItem key={att.id} attachment={att} onDelete={handleDeleteAttachment} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showDeleteModal && (
        <ConfirmModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteNote}
          title="노트 삭제"
        >
          정말로 이 노트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
    </div>
  );
}

export default NoteDetailPage;