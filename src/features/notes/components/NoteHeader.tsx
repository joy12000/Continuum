import React from 'react';
import { ArrowLeftIcon, CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';

interface NoteHeaderProps {
    isEditing: boolean;
    title: string;
    editTitle: string;
    onEditTitleChange: (val: string) => void;
    onBack: () => void;
    onEdit: () => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}

export const NoteHeader: React.FC<NoteHeaderProps> = ({
    isEditing,
    title,
    editTitle,
    onEditTitleChange,
    onBack,
    onEdit,
    onSave,
    onCancel,
    isSaving,
}) => {
    return (
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-border">
            <div className="flex items-center flex-grow mr-4">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-secondary transition-colors" aria-label="뒤로 가기">
                    <ArrowLeftIcon className="w-6 h-6 text-muted-foreground" />
                </button>
                {isEditing ? (
                    <input
                        type="text"
                        value={editTitle}
                        onChange={e => onEditTitleChange(e.target.value)}
                        className="flex-grow bg-transparent text-2xl font-bold text-gray-200 focus:outline-none focus:ring-0 border-b-2 border-transparent focus:border-sky-500 transition-colors mx-2 pb-1"
                        placeholder="제목 (선택 사항)"
                    />
                ) : (
                    <h1 className="text-2xl font-bold text-gray-200 mx-2">{title || '제목 없는 노트'}</h1>
                )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {isEditing ? (
                    <>
                        <button
                            onClick={onSave}
                            className="flex items-center gap-2 px-3 py-1 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                            disabled={isSaving}
                        >
                            <CheckIcon className="w-4 h-4" /><span>저장</span>
                        </button>
                        <button
                            onClick={onCancel}
                            className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-muted-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                            <XMarkIcon className="w-4 h-4" /><span>취소</span>
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-primary-foreground bg-accent rounded-lg hover:bg-accent/80 transition-colors"
                    >
                        <PencilIcon className="w-4 h-4" /><span>수정</span>
                    </button>
                )}
            </div>
        </div>
    );
};
