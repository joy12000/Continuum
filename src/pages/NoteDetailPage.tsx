import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '../lib/supabase';
import type { Note, NoteAttachment } from '../types/common';
import PageLayout from '../components/PageLayout';
import { DocumentTextIcon, TagIcon, LinkIcon, PencilIcon, ArrowLeftIcon, TrashIcon, CheckIcon, XMarkIcon, PaperClipIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { LinkEditorModal } from '../components/LinkEditorModal';

// --- API Fetching Functions ---
const fetchNoteData = async (noteId: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Authentication required.');

  const notePromise = fetch(`/api/v1?action=get-note&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
  const attachmentsPromise = supabase.from('note_attachments').select('*').eq('note_id', noteId);
  const backlinksPromise = fetch(`/api/v1?action=get-backlinks&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
  const connectionsPromise = fetch(`/api/v1?action=get-connections&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });

  const [noteRes, { data: attachments, error: attachmentsError }, backlinksRes, connectionsRes] = await Promise.all([notePromise, attachmentsPromise, backlinksPromise, connectionsPromise]);

  if (!noteRes.ok) {
    if (noteRes.status === 404) throw new Error('Note not found.');
    const errorData = await noteRes.json();
    throw new Error(errorData.error || 'Failed to load the note.');
  }
  if (attachmentsError) throw new Error('Failed to load attachments.');

  const note: Note = await noteRes.json();
  const backlinks: { backlinks: { from_note_id: string; title: string | null; }[] } = await backlinksRes.json();
  const connections: { connections: { note_id: string; title: string | null; score: number; }[] } = await connectionsRes.json();

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
  const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(false);

  // --- Edit State ---
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editTags, setEditTags] = useState('');

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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Authentication required.');

      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);

      const response = await fetch(`/api/v1?action=update-note&noteId=${noteId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle,
          body: editBody,
          tags: tagsArray,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update note.');
      }
    },
    onSuccess: () => {
      toast.success("Note updated successfully.");
      queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
      queryClient.invalidateQueries({ queryKey: ['noteActivity'] });
      window.dispatchEvent(new CustomEvent('notes:updated'));
      setIsEditing(false);
    },
    onError: (err: any) => toast.error(`Update failed: ${err.message}`),
  });

  const updateNoteLinksMutation = useMutation({
    mutationFn: async ({ linksToAdd, linksToRemove }: { linksToAdd: string[], linksToRemove: string[] }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Authentication required.');

      const response = await fetch(`/api/v1?action=update-note&noteId=${noteId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          links_to_add: linksToAdd,
          links_to_remove: linksToRemove,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update note links.');
      }
    },
    onSuccess: () => {
      toast.success("Note links updated.");
      queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
      setIsLinkEditorOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Link update failed: ${err.message}`);
    },
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
      toast.success('Note deleted.');
      queryClient.invalidateQueries({ queryKey: ['notes'] }); // For any note list
      window.dispatchEvent(new CustomEvent('notes:updated'));
      navigate('/');
    },
    onError: (err: any) => toast.error(`Deletion failed: ${err.message}`),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachment: NoteAttachment) => {
      await supabase.storage.from('notes-attachments').remove([attachment.storage_path]);
      const { error } = await supabase.from('note_attachments').delete().eq('id', attachment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Attachment deleted.");
      queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
    },
    onError: (err: any) => toast.error(`Attachment deletion failed: ${err.message}`),
  });

  // --- Render Logic ---
  if (isLoading) {
    return <PageLayout title="Loading..."><div className="flex justify-center items-center h-full"><ArrowPathIcon className="w-12 h-12 animate-spin text-accent" /></div></PageLayout>;
  }

  if (error) {
    return <PageLayout title="Error"><div className="flex flex-col justify-center items-center h-full text-destructive"><ExclamationTriangleIcon className="w-12 h-12" /><p className="mt-4 text-xl">{error.message}</p></div></PageLayout>;
  }

  if (!note) {
    return <PageLayout title="Error"><div className="flex flex-col justify-center items-center h-full text-destructive"><ExclamationTriangleIcon className="w-12 h-12" /><p className="mt-4 text-xl">Note not found.</p></div></PageLayout>;
  }

  const getPublicUrl = (path: string) => supabase.storage.from('notes-attachments').getPublicUrl(path).data.publicUrl;

  return (
    <PageLayout title={isEditing ? 'Edit Note' : (note.title || 'Note Detail')}>
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <main className="lg:col-span-2 bg-card border border-border rounded-lg p-6 shadow-lg">
            {/* Header */}
            <div className="flex items-center mb-6 pb-4 border-b border-border">
              <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary transition-colors" aria-label="Go back"><ArrowLeftIcon className="w-6 h-6 text-muted-foreground" /></button>
              {isEditing ? (
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="flex-grow bg-transparent text-3xl font-bold text-primary-foreground focus:outline-none focus:ring-0 border-b-2 border-transparent focus:border-accent transition-colors mx-4" placeholder="Title (optional)" />
              ) : (
                <h1 className="text-3xl font-bold text-primary-foreground flex-grow mx-4">{note.title || 'Untitled Note'}</h1>
              )}
              <div className="flex items-center gap-2 ml-auto">
                {isEditing ? (
                  <>
                    <button onClick={() => updateNoteMutation.mutate()} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors" disabled={updateNoteMutation.isPending}><CheckIcon className="w-5 h-5" /><span>Save</span></button>
                    <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"><XMarkIcon className="w-5 h-5" /><span>Cancel</span></button>
                  </>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-accent rounded-lg hover:bg-accent/80 transition-colors"><PencilIcon className="w-5 h-5" /><span>Edit</span></button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="prose prose-invert max-w-none prose-lg prose-p:text-muted-foreground prose-headings:text-primary-foreground prose-a:text-accent prose-strong:text-primary-foreground">
              {isEditing ? (
                <textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  className="w-full h-96 bg-background border border-border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                  placeholder="Note content (Markdown supported)"
                />
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {note.body || ''}
                </ReactMarkdown>
              )}
            </div>
          </main>

          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
              <h3 className="text-xl font-semibold mb-4 border-b border-border pb-2">Details</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex justify-between"><strong>Created</strong><span>{new Date(note.createdAt).toLocaleString('en-US')}</span></li>
                <li className="flex justify-between"><strong>Modified</strong><span>{new Date(note.updatedAt).toLocaleString('en-US')}</span></li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
              <h3 className="text-xl font-semibold mb-4 border-b border-border pb-2">Tags</h3>
              {note.tags && note.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {note.tags.map(tag => <span key={tag} className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs font-medium px-3 py-1 rounded-full"><TagIcon className="w-4 h-4" /> {tag}</span>)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tags.</p>
              )}
            </div>

            {attachments && attachments.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                <h3 className="text-xl font-semibold mb-4 border-b border-border pb-2">Attachments</h3>
                <ul className="space-y-2">
                  {attachments.map(att => (
                    <li key={att.id} className="flex items-center justify-between bg-secondary p-2 rounded-lg">
                      <a href={getPublicUrl(att.storage_path)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary-foreground hover:underline">
                        <PaperClipIcon className="w-5 h-5" /><span>{att.file_name}</span>
                      </a>
                      {isEditing && (
                        <button onClick={() => deleteAttachmentMutation.mutate(att)} className="p-1 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 transition-colors" aria-label="Delete attachment">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!isEditing && (
              <>
                <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                  <h3 className="text-xl font-semibold mb-4 border-b border-border pb-2">Linked Notes</h3>
                  {connections && connections.length > 0 ? (
                    <ul className="space-y-2">
                      {connections.map(conn => <li key={conn.note_id}><Link to={`/notes/${conn.note_id}`} className="flex items-center gap-2 text-sm text-primary-foreground hover:underline"><LinkIcon className="w-5 h-5" /><span>{conn.title || 'Untitled Note'}</span></Link></li>)}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No linked notes.</p>
                  )}
                </div>

                <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                  <h3 className="text-xl font-semibold mb-4 border-b border-border pb-2">Backlinks</h3>
                  {backlinks && backlinks.length > 0 ? (
                    <ul className="space-y-2">
                      {backlinks.map(link => <li key={link.from_note_id}><Link to={`/notes/${link.from_note_id}`} className="flex items-center gap-2 text-sm text-primary-foreground hover:underline"><LinkIcon className="w-5 h-5" /><span>{link.title || 'Untitled Note'}</span></Link></li>)}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No backlinks.</p>
                  )}
                </div>

                <div className="bg-card border border-border rounded-lg p-4 shadow-lg mt-6">
                  <button onClick={() => { if(window.confirm('Are you sure you want to delete this note?')) deleteNoteMutation.mutate() }} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-destructive-foreground bg-destructive rounded-lg hover:bg-destructive/80 disabled:opacity-50 transition-colors" disabled={deleteNoteMutation.isPending}>
                    <TrashIcon className="w-5 h-5" />
                    <span>Delete Note</span>
                  </button>
                </div>
              </>
            )}
             {isEditing && (
                <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                  <h3 className="text-xl font-semibold mb-4 border-b border-border pb-2">Manage Links</h3>
                  <button onClick={() => setIsLinkEditorOpen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                    <LinkIcon className="w-5 h-5" />
                    <span>Edit Links</span>
                  </button>
                </div>
              )}
          </aside>
        </div>
      </div>
      {isLinkEditorOpen && (
        <LinkEditorModal
            noteId={noteId!}
            onClose={() => setIsLinkEditorOpen(false)}
            onSave={(linksToAdd, linksToRemove) => {
                updateNoteLinksMutation.mutate({ linksToAdd, linksToRemove });
            }}
        />
      )}
    </PageLayout>
  );
};

export default NoteDetailPage;