import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Note, NoteAttachment } from '../types/common';
import { RichNoteEditor } from '../components/RichNoteEditor';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';
import ConnectionsListView from '../components/ConnectionsListView';
import { LinkEditorModal } from '../components/LinkEditorModal';
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

// Helper to convert HTML to plain text for saving
function htmlToPlainText(html: string) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

export function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);
  const [isLinkEditorModalOpen, setIsLinkEditorModalOpen] = useState(false);

  // --- State for editing ---
  const [editTitle, setEditTitle] = useState<string | null>('');
  const [editBody, setEditBody] = useState<string | null>('');
  const [editTags, setEditTags] = useState(''); // Stored as comma-separated string
  const [linksToAdd, setLinksToAdd] = useState<string[]>([]);
  const [linksToRemove, setLinksToRemove] = useState<string[]>([]);

  const fetchNoteAndAttachments = useCallback(async () => {
    if (!noteId) return;
    setIsLoading(true);
    try {
      const notePromise = supabase.from('notes').select('*').eq('id', noteId).single();
      const attachmentsPromise = supabase.from('note_attachments').select('*').eq('note_id', noteId);

      const [{ data: noteData, error: noteError }, { data: attachmentData, error: attachmentError }] = await Promise.all([notePromise, attachmentsPromise]);

      if (noteError) throw noteError;
      if (attachmentError) throw attachmentError;

      if (noteData) {
        const typedNote = noteData as Note;
        setNote(typedNote);
        setAttachments(attachmentData || []);

        // Set initial state for editing
        setEditTitle(typedNote.title ?? null);
        setEditBody(typedNote.body ?? null);
        setEditTags((typedNote.tags || []).join(', '));
      } else {
        setNote(null);
      }

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

  const handleEnterEditMode = () => {
    if (!note) return;
    setEditTitle(note.title ?? null);
    setEditBody(note.body ?? null);
    setEditTags((note.tags || []).join(', '));
    setLinksToAdd([]);
    setLinksToRemove([]);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!noteId) return;
    toast.info("저장 중...");

    const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
    const plainTextBody = htmlToPlainText(editBody || '');

    try {
        const { error } = await supabase.rpc('update_note_details', {
            p_note_id: noteId,
            p_title: editTitle,
            p_body: plainTextBody,
            p_tags: tagsArray,
            p_links_to_add: linksToAdd,
            p_links_to_remove: linksToRemove,
        });

        if (error) throw error;

        toast.success("노트가 성공적으로 업데이트되었습니다.");
        setIsEditing(false);
        fetchNoteAndAttachments(); // Refresh data
        window.dispatchEvent(new CustomEvent('notes:updated'));

    } catch (error: any) {
        toast.error(`업데이트 실패: ${error.message}`);
    }
  };
  
  const handleLinkModalSave = (toAdd: string[], toRemove: string[]) => {
    setLinksToAdd(toAdd);
    setLinksToRemove(toRemove);
    toast.info(`연결이 수정되었습니다. 저장 버튼을 눌러 반영하세요.`);
  };

  const handleDeleteNote = async () => {
    if (!noteId) return;
    try {
      const { data: attachmentsToDelete } = await supabase.from('note_attachments').select('storage_path').eq('note_id', noteId);
      if (attachmentsToDelete && attachmentsToDelete.length > 0) {
        const paths = attachmentsToDelete.map(a => a.storage_path);
        await supabase.storage.from('notes-attachments').remove(paths);
      }
      await supabase.from('notes').delete().eq('id', noteId);
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
      await supabase.storage.from('notes-attachments').remove([attachment.storage_path]);
      await supabase.from('note_attachments').delete().eq('id', attachment.id);
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
        <div className="space-y-4">
          <input
            type="text"
            value={editTitle || ''}
            onChange={(e) => setEditTitle(e.target.value)}
            className="input input-bordered w-full text-2xl bg-slate-800"
            placeholder="제목"
          />
          <RichNoteEditor
            content={editBody || ''}
            onContentChange={setEditBody}
          />
          <input
            type="text"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            className="input input-bordered w-full bg-slate-800"
            placeholder="태그 (쉼표로 구분)"
          />
          <div className="flex justify-between items-center">
            <button onClick={() => setIsLinkEditorModalOpen(true)} className="btn btn-outline">
              인용/링크 관리
            </button>
            <div className="flex gap-2">
              <button onClick={() => setIsEditing(false)} className="btn">취소</button>
              <button onClick={handleSave} className="btn btn-primary">저장</button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold text-sky-300">{note.title}</h1>
            <div className="flex gap-2">
              <button onClick={() => setIsConnectionsModalOpen(true)} className="btn btn-outline">연결 보기</button>
              <button onClick={handleEnterEditMode} className="btn btn-outline btn-info">수정</button>
              <button onClick={() => setShowDeleteModal(true)} className="btn btn-outline btn-error">삭제</button>
            </div>
          </div>
          <div className="prose prose-invert max-w-none p-4 bg-gray-800 rounded-lg" dangerouslySetInnerHTML={{ __html: note.body || '' }} />
          
          {note.tags && note.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {note.tags.map(tag => <div key={tag} className="badge badge-info badge-outline">{tag}</div>)}
            </div>
          )}

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

      {isConnectionsModalOpen && noteId && (
        <Modal
          title="연결된 노트"
          onClose={() => setIsConnectionsModalOpen(false)}
          actions={<button className="btn" onClick={() => setIsConnectionsModalOpen(false)}>닫기</button>}
        >
          <ConnectionsListView noteId={noteId} />
        </Modal>
      )}

      {isLinkEditorModalOpen && noteId && (
        <LinkEditorModal
          noteId={noteId}
          onClose={() => setIsLinkEditorModalOpen(false)}
          onSave={handleLinkModalSave}
        />
      )}
    </div>
  );
}

export default NoteDetailPage;