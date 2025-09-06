import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabase';
import type { Note, NoteAttachment } from '../types/common';
import PageLayout from '../components/PageLayout';
import { Loader, AlertCircle, Tag, Link as LinkIcon, Edit, ArrowLeft, Trash2, Save, X, Paperclip } from 'lucide-react';
import { toast } from '../lib/toast';

// --- Type Definitions ---
type Backlink = { from_note_id: string; title: string | null; };
type Connection = { id: string; title: string | null; score: number; };

// --- API Fetching Functions ---
const fetchNoteData = async (noteId: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('인증이 필요합니다.');

  const notePromise = fetch(`/api/v1?action=get-note&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
  const attachmentsPromise = supabase.from('note_attachments').select('*').eq('note_id', noteId);
  const backlinksPromise = fetch(`/api/v1?action=get-backlinks&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
  const connectionsPromise = fetch(`/api/v1?action=get-connections&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });

  const [noteRes, { data: attachments, error: attachmentsError }, backlinksRes, connectionsRes] = await Promise.all([notePromise, attachmentsPromise, backlinksPromise, connectionsPromise]);

  if (!noteRes.ok) {
    if (noteRes.status === 404) throw new Error('노트를 찾을 수 없습니다.');
    const errorData = await noteRes.json();
    throw new Error(errorData.error || '노트를 불러오는 데 실패했습니다.');
  }
  if (attachmentsError) throw new Error('첨부파일을 불러오는 데 실패했습니다.');

  const note: Note = await noteRes.json();
  const backlinks: { backlinks: Backlink[] } = await backlinksRes.json();
  const connections: { connections: Connection[] } = await connectionsRes.json();

  return {
    note,
    attachments: (attachments || []) as NoteAttachment[],
    backlinks: backlinks.backlinks || [],
    connections: connections.connections || [],
  };
};

// --- Main Component ---
const NoteDetailPage = () => {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // --- Edit State ---
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');

  // --- Link Management State ---
  const [linksToAdd, setLinksToAdd] = useState<string[]>([]);
  const [linksToRemove, setLinksToRemove] = useState<string[]>([]);

  // --- Data Fetching with React Query ---
  const { data, isLoading, error } = useQuery({
    queryKey: ['noteDetail', noteId],
    queryFn: () => fetchNoteData(noteId!),
    enabled: !!noteId,
  });

  const { note, attachments, backlinks, connections } = data || {};

  useEffect(() => {
    if (!note) return;
    if (isEditing) {
      setEditTitle(note.title || '');
      setEditBody(note.body || '');
      setEditTags((note.tags || []).join(', '));
    }
  }, [isEditing, note]);

  // --- Mutations ---
  const updateNoteMutation = useMutation({
    mutationFn: async () => {
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      const { error } = await supabase.rpc('update_note_details', {
        p_note_id: noteId,
        p_title: editTitle,
        p_body: editBody,
        p_tags: tagsArray,
        p_links_to_add: linksToAdd, // Add this
        p_links_to_remove: linksToRemove, // Add this
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("노트가 업데이트되었습니다.");
      queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
      window.dispatchEvent(new CustomEvent('notes:updated'));
      setIsEditing(false);
    },
    onError: (err: any) => toast.error(`업데이트 실패: ${err.message}`),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async () => {
      if (attachments && attachments.length > 0) {
        const paths = attachments.map(a => a.storage_path);
        await supabase.storage.from('notes-attachments').remove(paths);
      }
      const { error } = await supabase.from('notes').delete().eq('id', noteId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('노트가 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // For any note list
      window.dispatchEvent(new CustomEvent('notes:updated'));
      navigate('/');
    },
    onError: (err: any) => toast.error(`삭제 실패: ${err.message}`),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachment: NoteAttachment) => {
      await supabase.storage.from('notes-attachments').remove([attachment.storage_path]);
      const { error } = await supabase.from('note_attachments').delete().eq('id', attachment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("첨부파일이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
    },
    onError: (err: any) => toast.error(`첨부파일 삭제 실패: ${err.message}`),
  });

  // --- Render Logic ---
  if (isLoading) {
    return <PageLayout title="로딩 중..."><div className="loading-container"><Loader className="w-12 h-12 animate-spin text-sky-400" /></div></PageLayout>;
  }

  if (error) {
    return <PageLayout title="오류"><div className="error-container"><AlertCircle className="w-12 h-12 text-red-500" /><p className="mt-4 text-xl">{error.message}</p></div></PageLayout>;
  }

  if (!note) {
    return <PageLayout title="오류"><div className="error-container"><AlertCircle className="w-12 h-12 text-red-500" /><p className="mt-4 text-xl">노트를 찾을 수 없습니다.</p></div></PageLayout>;
  }

  const getPublicUrl = (path: string) => supabase.storage.from('notes-attachments').getPublicUrl(path).data.publicUrl;

  return (
    <PageLayout title={isEditing ? '노트 수정' : (note.title || '노트 상세')}>
      <div className="note-detail-grid">
        <main className="note-content-area">
          {/* Header */}
          <div className="note-header">
            <button onClick={() => navigate(-1)} className="back-button" aria-label="뒤로 가기"><ArrowLeft size={20} /></button>
            {isEditing ? (
              <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="edit-title-input" placeholder="제목" />
            ) : (
              <h1 className="note-title">{note.title || '제목 없음'}</h1>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {isEditing ? (
                <>
                  <button onClick={() => updateNoteMutation.mutate()} className="edit-button" disabled={updateNoteMutation.isPending}><Save size={16} /><span>저장</span></button>
                  <button onClick={() => setIsEditing(false)} className="cancel-button"><X size={16} /><span>취소</span></button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="edit-button"><Edit size={16} /><span>수정</span></button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="note-body">
            {isEditing ? (
              <textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                className="edit-body-textarea"
                placeholder="노트 내용 (마크다운 지원)"
              />
            ) : (
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.body || ''}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </main>

        <aside className="note-sidebar">
          {isEditing ? (
            <div className="sidebar-section">
              <h3 className="sidebar-title">태그 수정</h3>
              <input
                type="text"
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                className="edit-tags-input"
                placeholder="쉼표로 태그 구분"
              />
            </div>
          ) : (
            <>
              <div className="sidebar-section">
                <h3 className="sidebar-title">세부 정보</h3>
                <ul className="metadata-list">
                  <li><strong>생성일</strong><span>{new Date(note.createdAt).toLocaleString('ko-KR')}</span></li>
                  <li><strong>수정일</strong><span>{new Date(note.updatedAt).toLocaleString('ko-KR')}</span></li>
                </ul>
              </div>

              {note.tags && note.tags.length > 0 && (
                <div className="sidebar-section">
                  <h3 className="sidebar-title">태그</h3>
                  <div className="tags-container">
                    {note.tags.map(tag => <span key={tag} className="tag-item"><Tag size={14} /> {tag}</span>)}
                  </div>
                </div>
              )}
            </>
          )}

          {attachments && attachments.length > 0 && (
            <div className="sidebar-section">
              <h3 className="sidebar-title">첨부파일</h3>
              <ul className="links-list">
                {attachments.map(att => (
                  <li key={att.id} className="attachment-item">
                    <a href={getPublicUrl(att.storage_path)} target="_blank" rel="noopener noreferrer" className="link-item">
                      <Paperclip size={14} /><span>{att.file_name}</span>
                    </a>
                    {isEditing && (
                      <button onClick={() => deleteAttachmentMutation.mutate(att)} className="delete-attachment-button" aria-label="첨부파일 삭제">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!isEditing && (
            <>
              {connections && connections.length > 0 && (
                <div className="sidebar-section">
                  <h3 className="sidebar-title">연결된 노트</h3>
                  <ul className="links-list">
                    {connections.map(conn => <li key={conn.id}><Link to={`/notes/${conn.id}`} className="link-item"><LinkIcon size={14} /><span>{conn.title || '제목 없음'}</span></Link></li>)}
                  </ul>
                </div>
              )}

              {backlinks && backlinks.length > 0 && (
                <div className="sidebar-section">
                  <h3 className="sidebar-title">이 노트를 언급한 노트 (백링크)</h3>
                  <ul className="links-list">
                    {backlinks.map(link => <li key={link.from_note_id}><Link to={`/notes/${link.from_note_id}`} className="link-item"><LinkIcon size={14} /><span>{link.title || '제목 없음'}</span></Link></li>)}
                  </ul>
                </div>
              )}

              <div className="sidebar-section">
                <button onClick={() => { if(window.confirm('정말로 이 노트를 삭제하시겠습니까?')) deleteNoteMutation.mutate() }} className="delete-note-button" disabled={deleteNoteMutation.isPending}>
                  <Trash2 size={16} />
                  <span>노트 삭제</span>
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </PageLayout>
  );
};

export default NoteDetailPage;