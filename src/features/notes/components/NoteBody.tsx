'use client';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NoteBodyProps {
    isEditing: boolean;
    body: string;
    editBody: string;
    onEditBodyChange: (val: string) => void;
}

export const NoteBody: React.FC<NoteBodyProps> = ({
    isEditing,
    body,
    editBody,
    onEditBodyChange,
}) => {
    return (
        <div className="prose prose-invert max-w-none prose-base prose-p:text-muted-foreground prose-headings:text-primary-foreground prose-a:text-accent prose-strong:text-primary-foreground">
            {isEditing ? (
                <textarea
                    value={editBody}
                    onChange={e => onEditBodyChange(e.target.value)}
                    className="w-full h-96 bg-background border border-border rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                    placeholder="노트 내용 (마크다운 지원)"
                />
            ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {body || ''}
                </ReactMarkdown>
            )}
        </div>
    );
};
