import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getNoteById, recalculateChunksAndEmbeddings } from '../lib/supabaseService';
import { Note } from '../types/common'; // Using the Supabase-compatible Note type
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

export default function OverlayEditor() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  // Global event listener to open the editor
  useEffect(() => {
    const handleOpen = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.id) {
        setIsLoading(true);
        setIsOpen(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");
          const note = await getNoteById(detail.id, user.id);
          if (note) {
            setEditingNote(note as Note);
            setContent(note.body || '');
            setTitle(note.title || '');
          } else {
            throw new Error("Note not found.");
          }
        } catch (error: any) {
          toast.error(`노트를 불러오는 데 실패했습니다: ${error.message}`);
          setIsOpen(false);
        } finally {
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('open:note', handleOpen);
    return () => {
      window.removeEventListener('open:note', handleOpen);
    };
  }, []);

  // Focus textarea when editor opens
  useEffect(() => {
    if (isOpen && !isLoading) {
      setTimeout(() => areaRef.current?.focus(), 100);
    }
  }, [isOpen, isLoading]);

  const handleClose = () => {
    setIsOpen(false);
    setEditingNote(null);
    setContent('');
    setTitle('');
  };

  const handleSave = async () => {
    if (!editingNote) return;
    setIsLoading(true);
    try {
      // 1. Update the note content
      const { error: updateError } = await supabase.rpc('update_note', {
        note_id_to_update: editingNote.id,
        new_title: title,
        new_body: content,
      });
      if (updateError) throw updateError;

      // 2. Recalculate chunks and embeddings
      await recalculateChunksAndEmbeddings(editingNote.id, content);

      toast.success('노트가 저장되었습니다.');
      handleClose();
      // Optional: dispatch a global event to notify other components to refresh data
      window.dispatchEvent(new CustomEvent('notes:updated'));
    } catch (error: any) {
      toast.error(`저장에 실패했습니다: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingNote) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('delete_note', { note_id_to_delete: editingNote.id });
      if (error) throw error;

      toast.success('노트가 삭제되었습니다.');
      setShowDeleteConfirm(false);
      handleClose();
      // Optional: dispatch a global event to notify other components to refresh data
      window.dispatchEvent(new CustomEvent('notes:updated'));
    } catch (error: any) {
      toast.error(`삭제에 실패했습니다: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]" onClick={handleClose} aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,92vw)] bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-4"
      >
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">로딩 중...</div>
        ) : (
          <>
            <input
              type="text"
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-xl font-bold border-b border-slate-700 p-2 focus:ring-0 focus:outline-none mb-2"
            />
            <textarea
              ref={areaRef}
              rows={12}
              placeholder="내용을 입력하세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full resize-y border-0 focus:ring-0 bg-transparent text-slate-300 placeholder-slate-500 text-base leading-relaxed p-2"
            />
            <div className="mt-4 flex gap-2 justify-between items-center">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm"
              >
                삭제
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={handleClose} className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm">닫기</button>
                <button type="button" onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm">저장</button>
              </div>
            </div>
          </>
        )}
      </div>
      {showDeleteConfirm && (
        <ConfirmModal
          title="노트를 삭제하시겠습니까?"
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
        >
          <p className="text-sm text-slate-300">이 작업은 되돌릴 수 없습니다. 정말로 이 노트를 삭제하시겠습니까?</p>
        </ConfirmModal>
      )}
    </div>
  );
}