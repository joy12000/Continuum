'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageLayout from '../../components/PageLayout';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { LinkEditorModal } from '../../components/LinkEditorModal';

import { useNoteDetail } from './hooks/useNoteDetail';
import { useNoteMutations } from './hooks/useNoteMutations';
import { NoteHeader } from './components/NoteHeader';
import { NoteBody } from './components/NoteBody';
import { NoteSidebar } from './components/NoteSidebar';

const NoteDetailPage = () => {
    const params = useParams();
    const noteId = params?.noteId as string;
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(false);

    // Edit State
    const [editTitle, setEditTitle] = useState('');
    const [editBody, setEditBody] = useState('');
    const [editTags, setEditTags] = useState('');

    // Hooks
    const { data, isLoading, error } = useNoteDetail(noteId);
    const {
        updateNoteMutation,
        updateNoteLinksMutation,
        deleteNoteMutation,
        deleteAttachmentMutation
    } = useNoteMutations(noteId);

    const { note, attachments } = data || {};

    // Sync edit state with fetched data
    useEffect(() => {
        if (!note) return;
        if (isEditing) {
            setEditTitle(note.title || '');
            setEditBody(note.body || '');
            setEditTags((note.tags || []).join(', '));
        }
    }, [isEditing, note]);

    const handleSave = () => {
        const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
        updateNoteMutation.mutate({
            title: editTitle,
            body: editBody,
            tags: tagsArray
        }, {
            onSuccess: () => setIsEditing(false)
        });
    };

    if (isLoading) {
        return (
            <PageLayout title="濡쒕뵫 以?..">
                <div className="flex justify-center items-center h-full">
                    <ArrowPathIcon className="w-12 h-12 animate-spin text-accent" />
                </div>
            </PageLayout>
        );
    }

    if (error) {
        return (
            <PageLayout title="?ㅻ쪟">
                <div className="flex flex-col justify-center items-center h-full text-destructive">
                    <ExclamationTriangleIcon className="w-12 h-12" />
                    <p className="mt-4 text-xl">{error.message}</p>
                </div>
            </PageLayout>
        );
    }

    if (!note) {
        return (
            <PageLayout title="?ㅻ쪟">
                <div className="flex flex-col justify-center items-center h-full text-destructive">
                    <ExclamationTriangleIcon className="w-12 h-12" />
                    <p className="mt-4 text-xl">?명듃瑜?李얠쓣 ???놁뒿?덈떎.</p>
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout title={isEditing ? '?명듃 ?섏젙' : ''}>
            <div className="p-2 sm:p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <main className="lg:col-span-2 bg-card border border-border rounded-lg p-4 shadow-lg">
                        <NoteHeader
                            isEditing={isEditing}
                            title={note.title || ''}
                            editTitle={editTitle}
                            onEditTitleChange={setEditTitle}
                            onBack={() => router.back()}
                            onEdit={() => setIsEditing(true)}
                            onSave={handleSave}
                            onCancel={() => setIsEditing(false)}
                            isSaving={updateNoteMutation.isPending}
                        />

                        <NoteBody
                            isEditing={isEditing}
                            body={note.body || ''}
                            editBody={editBody}
                            onEditBodyChange={setEditBody}
                        />
                    </main>

                    <NoteSidebar
                        isEditing={isEditing}
                        note={note}
                        attachments={attachments || []}
                        onDeleteNote={() => deleteNoteMutation.mutate(attachments || [])}
                        onDeleteAttachment={(att) => deleteAttachmentMutation.mutate(att)}
                        onOpenLinkEditor={() => setIsLinkEditorOpen(true)}
                        isDeletingNote={deleteNoteMutation.isPending}
                    />
                </div>
            </div>

            {isLinkEditorOpen && (
                <LinkEditorModal
                    noteId={noteId!}
                    onClose={() => setIsLinkEditorOpen(false)}
                    onSave={(linksToAdd, linksToRemove) => {
                        updateNoteLinksMutation.mutate({ linksToAdd, linksToRemove });
                        setIsLinkEditorOpen(false);
                    }}
                />
            )}
        </PageLayout>
    );
};

export default NoteDetailPage;
