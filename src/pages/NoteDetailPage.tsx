import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getNoteById, deleteNote, updateNote } from '../lib/supabaseService';
import type { Note } from '../types/common';
import { RichNoteEditor } from '../components/RichNoteEditor';
import ConfirmModal from '../components/ConfirmModal';
import { supabase } from '../lib/supabase';

export function NoteDetailPage() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editedTitle, setEditedTitle] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fetchNote = useCallback(async () => {
    if (!noteId) return;
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not logged in");
      const noteData = await getNoteById(noteId, user.id);
      setNote(noteData);
      setEditedTitle(noteData.title || '');
      setEditedBody(noteData.body || '');
    } catch (error: any) {
      console.error('Failed to fetch note:', error);
      alert(`노트를 불러오는 데 실패했습니다: ${error.message}`);
      setNote(null);
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  const handleSave = async () => {
    if (!noteId) return;
    setIsLoading(true);
    try {
      const updatedNote = await updateNote(noteId, { title: editedTitle, body: editedBody });
      setNote(updatedNote);
      setIsEditing(false);
      alert('노트가 성공적으로 저장되었습니다.');
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('notes:updated'));
    } catch (error: any) {
      console.error('Failed to save note:', error);
      alert(`노트 저장에 실패했습니다: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!noteId) return;
    setIsLoading(true);
    try {
      await deleteNote(noteId);
      alert('노트가 삭제되었습니다.');
      setShowDeleteModal(false);
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('notes:updated'));
      navigate('/'); // Navigate to home page after deletion
    } catch (error: any) {
      console.error('Failed to delete note:', error);
      alert(`노트 삭제에 실패했습니다: ${error.message}`);
      setIsLoading(false);
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
        <div>
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="w-full bg-gray-800 text-white text-3xl font-bold p-2 rounded mb-4"
            placeholder="노트 제목"
          />
          <RichNoteEditor
            note={note}
            onSave={(content) => setEditedBody(content)}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setIsEditing(false)} className="btn btn-ghost">취소</button>
            <button onClick={handleSave} className="btn btn-primary" disabled={isLoading}>
              {isLoading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
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
            dangerouslySetInnerHTML={{ __html: note.body }}
          />
        </div>
      )}

      {showDeleteModal && (
        <ConfirmModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="노트 삭제"
        >
          정말로 이 노트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </ConfirmModal>
      )}
    </div>
  );
}

export default NoteDetailPage;
