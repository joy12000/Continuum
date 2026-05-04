'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabase';
import type { Note } from '../types/common';
import { PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

const SkeletonLoader = ({ className = 'h-8' }: { className?: string }) => (
  <div className={`bg-border/40 animate-pulse rounded-[8px] ${className}`} />
);

// --- API Fetching Functions ---
const fetchBasicNoteData = async (noteId: string): Promise<Note> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('로그인이 필요합니다.');

  const response = await fetch(`/api/v1?action=get-note&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) {
    if (response.status === 404) throw new Error('노트를 찾을 수 없습니다.');
    const errorData = await response.json();
    throw new Error(errorData.error || '노트 정보를 불러오는 중 오류가 발생했습니다.');
  }
  return await response.json();
};

// --- Main Component ---
export const NoteDetailModal = ({ noteId, isOpen, onClose }: { noteId: string, isOpen: boolean, onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const dragControls = useDragControls();

  // --- Edit State ---
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  // --- Data Fetching with React Query ---
  const { data: note, isLoading: isNoteLoading } = useQuery<Note>({
    queryKey: ['noteBasicDetail', noteId],
    queryFn: () => fetchBasicNoteData(noteId!),
    enabled: !!noteId && isOpen,
  });

  useEffect(() => {
    if (note && isEditing) {
      setEditTitle(note.title || '');
      setEditBody(note.body || '');
    }
  }, [isEditing, note]);

  // --- Mutations ---
  const updateNoteMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('로그인이 필요합니다.');
      
      const response = await fetch(`/api/v1?action=update-note&noteId=${noteId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, body: editBody }),
      });
      if (!response.ok) throw new Error((await response.json()).error || '노트 업데이트 중 오류가 발생했습니다.');
    },
    onSuccess: () => {
      toast.success("노트가 성공적으로 업데이트되었습니다.");
      queryClient.invalidateQueries({ queryKey: ['noteBasicDetail', noteId] });
      queryClient.invalidateQueries({ queryKey: ['noteActivity'] });
      window.dispatchEvent(new CustomEvent('notes:updated'));
      setIsEditing(false);
    },
    onError: (err: any) => toast.error(`업데이트 실패: ${err.message}`),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      // 첨부파일 삭제 로직은 백엔드 트리거나 별도 처리로 위임(UI 컴팩트화 위해 제거)
      const { error } = await supabase.from('notes').delete().eq('id', noteId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('노트가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['noteActivity'] });
      window.dispatchEvent(new CustomEvent('notes:updated'));
      onClose();
    },
    onError: (err: any) => toast.error(`삭제 실패: ${err.message}`),
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end items-center sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Bottom Drawer / Modal */}
          <motion.div
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 300) {
                onClose();
              }
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 250 }}
            className="relative w-full max-w-2xl bg-card sm:rounded-[24px] rounded-t-[24px] rounded-b-none shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle (Visual) */}
            <div 
              className="w-full flex justify-center pt-3 pb-3 cursor-grab active:cursor-grabbing touch-none" 
              onPointerDown={(e) => dragControls.start(e)}
              onClick={onClose}
            >
              <div className="w-10 h-1.5 bg-border/80 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 flex items-center justify-between border-b border-border">
              <div className="flex-1 min-w-0 mr-4">
                {isNoteLoading ? (
                  <SkeletonLoader className="h-7 w-2/3" />
                ) : isEditing ? (
                  <input 
                    type="text" 
                    value={editTitle} 
                    onChange={e => setEditTitle(e.target.value)} 
                    className="w-full text-[20px] font-bold bg-transparent border-none focus:ring-0 p-0 placeholder-muted text-foreground outline-none" 
                    placeholder="제목 없음" 
                    autoFocus
                  />
                ) : (
                  <h1 className="text-[22px] font-bold text-foreground truncate tracking-tight leading-tight">{note?.title || '제목 없음'}</h1>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isEditing ? (
                  <>
                    <button onClick={() => updateNoteMutation.mutate()} className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover transition-all active:scale-95 shadow-sm" disabled={updateNoteMutation.isPending} title="저장"><CheckIcon className="w-5 h-5 stroke-[2.5]" /></button>
                    <button onClick={() => setIsEditing(false)} className="p-2.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all active:scale-95" title="취소"><XMarkIcon className="w-5 h-5 stroke-[2.5]" /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setIsEditing(true)} className="p-2.5 rounded-full bg-secondary/60 text-secondary-foreground hover:bg-secondary transition-all active:scale-95" aria-label="수정"><PencilIcon className="w-5 h-5 stroke-[2]" /></button>
                    <button onClick={() => { if(window.confirm('정말로 이 노트를 삭제하시겠습니까?')) deleteNoteMutation.mutate() }} className="p-2.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all active:scale-95" aria-label="삭제" disabled={deleteNoteMutation.isPending}><TrashIcon className="w-5 h-5 stroke-[2]" /></button>
                  </>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pt-6 pb-12 overflow-y-auto flex-1 overscroll-contain hide-scrollbar">
              {isNoteLoading ? (
                <div className="space-y-4">
                  <SkeletonLoader className="h-4 w-full" />
                  <SkeletonLoader className="h-4 w-5/6" />
                  <SkeletonLoader className="h-4 w-full" />
                </div>
              ) : isEditing ? (
                <textarea 
                  value={editBody} 
                  onChange={e => setEditBody(e.target.value)} 
                  className="w-full min-h-[40vh] resize-none bg-transparent border-none focus:ring-0 p-0 text-[16px] leading-relaxed text-foreground placeholder-muted focus:outline-none outline-none font-medium" 
                  placeholder="내용을 입력하세요..." 
                />
              ) : (
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-secondary-text leading-relaxed font-medium">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{note?.body || ''}</ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
