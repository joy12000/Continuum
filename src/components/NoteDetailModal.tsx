import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabase';
import type { Note, NoteAttachment } from '../types/common';
import { TagIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// --- Skeleton Loader Component ---
const SkeletonLoader = ({ className = 'h-8' }: { className?: string }) => (
  <div className={`bg-secondary/50 animate-pulse rounded ${className}`} />
);

// --- API Fetching Functions ---
const fetchBasicNoteData = async (noteId: string): Promise<Note> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('인증이 필요합니다.');

  const response = await fetch(`/api/v1?action=get-note&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) {
    if (response.status === 404) throw new Error('노트를 찾을 수 없습니다.');
    const errorData = await response.json();
    throw new Error(errorData.error || '노트의 기본 정보를 불러오는데 실패했습니다.');
  }
  return await response.json();
};

const fetchAttachmentsData = async (noteId: string): Promise<{ attachments: NoteAttachment[] }> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('인증이 필요합니다.');

  const response = await fetch(`/api/v1?action=get-note-attachments&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) {
    console.error("첨부파일 로딩 실패");
    return { attachments: [] };
  }
  return await response.json();
};

// --- Main Component ---
export const NoteDetailModal = ({ noteId, isOpen, onClose }: { noteId: string, isOpen: boolean, onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // --- Edit State ---
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');

  // --- Data Fetching with React Query ---
  const { data: note, isLoading: isNoteLoading, error: noteError } = useQuery<Note>({
    queryKey: ['noteBasicDetail', noteId],
    queryFn: () => fetchBasicNoteData(noteId!),
    enabled: !!noteId && isOpen,
  });

  const { data: attachmentsData, isLoading: isAttachmentsLoading } = useQuery({
    queryKey: ['noteAttachments', noteId],
    queryFn: () => fetchAttachmentsData(noteId!),
    enabled: !!note && isOpen,
  });

  const attachments = attachmentsData?.attachments;

  useEffect(() => {
    if (note && isEditing) {
      setEditTitle(note.title || '');
      setEditBody(note.body || '');
      setEditTags((note.tags || []).join(', '));
    }
  }, [isEditing, note]);

  // --- Mutations ---
  const updateNoteMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('인증이 필요합니다.');
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      const response = await fetch(`/api/v1?action=update-note&noteId=${noteId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, body: editBody, tags: tagsArray }),
      });
      if (!response.ok) throw new Error((await response.json()).error || '노트 업데이트에 실패했습니다.');
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
      if (attachments && attachments.length > 0) {
        const paths = attachments.map((a) => a.storage_path);
        await supabase.storage.from('notes-attachments').remove(paths);
      }
      const { error } = await supabase.from('notes').delete().eq('id', noteId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('노트가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      window.dispatchEvent(new CustomEvent('notes:updated'));
      onClose();
    },
    onError: (err: any) => toast.error(`삭제 실패: ${err.message}`),
  });

  if (!isOpen) return null;

  const getPublicUrl = (path: string) => supabase.storage.from('notes-attachments').getPublicUrl(path).data.publicUrl;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-lg shadow-lg max-h-[90vh] overflow-y-auto w-[95%] max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <main className="lg:col-span-2 bg-card border border-border rounded-lg p-4 shadow-lg">
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-border">
              <div className="flex items-center w-full">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors" aria-label="닫기"><XMarkIcon className="w-6 h-6 text-muted-foreground" /></button>
                {isNoteLoading ? (
                  <SkeletonLoader className="h-8 w-3/4 mx-2" />
                ) : isEditing ? (
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="flex-grow bg-transparent text-2xl font-bold text-gray-200 focus:outline-none focus:ring-0 border-b-2 border-transparent focus:border-accent transition-colors mx-2" placeholder="제목 (선택 사항)" />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-200 mx-2">{note?.title || '제목 없는 노트'}</h1>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button onClick={() => updateNoteMutation.mutate()} className="flex items-center gap-2 px-3 py-1 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors" disabled={updateNoteMutation.isPending}><CheckIcon className="w-4 h-4" /><span>저장</span></button>
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"><XMarkIcon className="w-4 h-4" /><span>취소</span></button>
                  </>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-primary-foreground bg-accent rounded-lg hover:bg-accent/80 transition-colors"><PencilIcon className="w-4 h-4" /></button>
                )}
              </div>
            </div>

            <div className="prose prose-invert max-w-none prose-base prose-p:text-white prose-headings:text-primary-foreground prose-a:text-accent prose-strong:text-primary-foreground">
              {isNoteLoading ? (
                <div className="space-y-2">
                  <SkeletonLoader className="h-4 w-full" />
                  <SkeletonLoader className="h-4 w-5/6" />
                  <SkeletonLoader className="h-4 w-full" />
                </div>
              ) : isEditing ? (
                <textarea value={editBody} onChange={e => setEditBody(e.target.value)} className="w-full h-96 bg-background border border-border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-accent transition-colors" placeholder="노트 내용 (마크다운 지원)" />
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{note?.body || ''}</ReactMarkdown>
              )}
            </div>
          </main>

          <aside className="lg:col-span-1 bg-card border border-border rounded-lg p-4 shadow-lg flex flex-col">
            {/* Details Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-primary-foreground">상세 정보</h3>
              {isNoteLoading ? (
                <div className="space-y-3"><SkeletonLoader className="h-5 w-full" /><SkeletonLoader className="h-5 w-full" /></div>
              ) : (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex justify-between"><strong>생성일</strong><span>{note?.createdAt ? new Date(note.createdAt).toLocaleString('ko-KR') : ''}</span></li>
                  <li className="flex justify-between"><strong>수정일</strong><span>{note?.updatedAt ? new Date(note.updatedAt).toLocaleString('ko-KR') : ''}</span></li>
                </ul>
              )}
            </div>

            <hr className="border-border/60 my-4" />

            {/* Tags Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-primary-foreground">태그</h3>
              {isNoteLoading ? (
                <div className="flex flex-wrap gap-2"><SkeletonLoader className="h-6 w-20" /><SkeletonLoader className="h-6 w-24" /></div>
              ) : note?.tags && note.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {note.tags.map((tag: string) => <span key={tag} className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs font-medium px-3 py-1 rounded-full"><TagIcon className="w-4 h-4" /> {tag}</span>)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">태그 없음.</p>
              )}
            </div>

            <hr className="border-border/60 my-4" />

            {/* Attachments Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-primary-foreground">첨부파일</h3>
              {isAttachmentsLoading ? (
                <div className="space-y-2"><SkeletonLoader className="h-10 w-full" /><SkeletonLoader className="h-10 w-full" /></div>
              ) : attachments && attachments.length > 0 ? (
                <ul className="space-y-2">
                  {attachments.map((att: NoteAttachment) => (
                    <li key={att.id} className="flex items-center justify-between bg-secondary p-2 rounded-lg">
                      <a href={getPublicUrl(att.storage_path)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary-foreground hover:underline">
                        <PaperClipIcon className="w-5 h-5" /><span>{att.file_name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">첨부파일 없음.</p>
              )}
            </div>

            {/* Spacer to push delete button to the bottom */}
            <div className="flex-grow"></div>

            {/* Delete Button Section */}
            {!isEditing && (
              <div className="mt-6">
                <button onClick={() => { if(window.confirm('정말로 이 노트를 삭제하시겠습니까?')) deleteNoteMutation.mutate() }} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-destructive-foreground bg-destructive rounded-lg hover:bg-destructive/80 disabled:opacity-50 transition-colors" disabled={deleteNoteMutation.isPending}>
                  <TrashIcon className="w-5 h-5" />
                  <span>노트 삭제</span>
                </button>
              </div>
            )}
          </aside>
        </div>
      </motion.div>
    </div>
  );
};
