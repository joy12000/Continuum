import React from 'react';
import { TagIcon, TrashIcon, PaperClipIcon, LinkIcon } from '@heroicons/react/24/outline';
import type { Note, NoteAttachment } from '../../../types/common';

interface NoteSidebarProps {
    isEditing: boolean;
    note: Note;
    attachments: NoteAttachment[];
    onDeleteNote: () => void;
    onDeleteAttachment: (att: NoteAttachment) => void;
    onOpenLinkEditor: () => void;
    isDeletingNote: boolean;
}

export const NoteSidebar: React.FC<NoteSidebarProps> = ({
    isEditing,
    note,
    attachments,
    onDeleteNote,
    onDeleteAttachment,
    onOpenLinkEditor,
    isDeletingNote,
}) => {
    const getPublicUrl = (path: string) =>
        `https://snnpvxjidkxgrrkrvdbh.supabase.co/storage/v1/object/public/notes-attachments/${path}`;

    return (
        <aside className="lg:col-span-1 space-y-6">
            <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                <h3 className="text-xl font-semibold mb-4 border-b border-border pb-2">태그</h3>
                {note.tags && note.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {note.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 bg-secondary text-secondary-foreground text-xs font-medium px-3 py-1 rounded-full">
                                <TagIcon className="w-4 h-4" /> {tag}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">태그 없음.</p>
                )}
            </div>

            <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                <h3 className="text-xl font-semibold mb-4 border-b border-border pb-2">상세 정보</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex justify-between"><strong>생성일</strong><span>{new Date(note.createdAt).toLocaleString('ko-KR')}</span></li>
                    <li className="flex justify-between"><strong>수정일</strong><span>{new Date(note.updatedAt).toLocaleString('ko-KR')}</span></li>
                </ul>
            </div>

            {attachments && attachments.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 border-b border-border pb-2">첨부파일</h3>
                    <ul className="space-y-2">
                        {attachments.map(att => (
                            <li key={att.id} className="flex items-center justify-between bg-secondary p-2 rounded-lg">
                                <a href={getPublicUrl(att.storage_path)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary-foreground hover:underline">
                                    <PaperClipIcon className="w-5 h-5" /><span>{att.file_name}</span>
                                </a>
                                {isEditing && (
                                    <button onClick={() => onDeleteAttachment(att)} className="p-1 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 transition-colors" aria-label="첨부파일 삭제">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {!isEditing && (
                <div className="bg-card border border-border rounded-lg p-4 shadow-lg mt-6">
                    <button
                        onClick={() => { if (window.confirm('정말로 이 노트를 삭제하시겠습니까?')) onDeleteNote() }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-destructive-foreground bg-destructive rounded-lg hover:bg-destructive/80 disabled:opacity-50 transition-colors"
                        disabled={isDeletingNote}
                    >
                        <TrashIcon className="w-5 h-5" />
                        <span>노트 삭제</span>
                    </button>
                </div>
            )}

            {isEditing && (
                <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 border-b border-border pb-2">링크 관리</h3>
                    <button onClick={onOpenLinkEditor} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
                        <LinkIcon className="w-5 h-5" />
                        <span>링크 수정</span>
                    </button>
                </div>
            )}
        </aside>
    );
};
