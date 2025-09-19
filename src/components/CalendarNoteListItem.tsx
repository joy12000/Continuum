import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Note } from '../types/common';

// --- Skeleton Loader Component ---
const SkeletonLoader = ({ className = 'h-4' }: { className?: string }) => (
  <div className={`bg-secondary/50 animate-pulse rounded ${className}`} />
);

// API to fetch the full details of a single note
const fetchNoteDetails = async (noteId: string): Promise<Note> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('인증이 필요합니다.');

  const response = await fetch(`/api/v1?action=get-note&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) {
    throw new Error('노트 상세 정보를 불러오는데 실패했습니다.');
  }
  return response.json();
};

interface CalendarNoteListItemProps {
  noteId: string;
  title?: string;
  createdAt: number;
  onNoteClick: (noteId: string) => void;
}

export const CalendarNoteListItem: React.FC<CalendarNoteListItemProps> = ({ noteId, title, createdAt, onNoteClick }) => {
  const { data: noteDetails, isLoading: isBodyLoading } = useQuery<Note, Error>({
    queryKey: ['noteBody', noteId],
    queryFn: () => fetchNoteDetails(noteId),
    staleTime: Infinity, // The body of a note is unlikely to change frequently
    enabled: !!noteId, // Ensure noteId is present
  });

  return (
    <li>
      <button onClick={() => onNoteClick(noteId)} className="block w-full text-left p-4 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors duration-200">
        <h3 className="font-semibold text-lg text-primary truncate">{title || '제목 없는 노트'}</h3>
        <div className="text-xs text-muted-foreground/80 mt-2 mb-2">{new Date(createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
        {isBodyLoading ? (
          <div className="space-y-2 mt-1">
            <SkeletonLoader className="h-4 w-full" />
            <SkeletonLoader className="h-4 w-5/6" />
          </div>
        ) : (
          <p className="text-base text-muted-foreground line-clamp-2 mt-1">{noteDetails?.body}</p>
        )}
      </button>
    </li>
  );
};