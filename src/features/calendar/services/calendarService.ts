import { supabase } from '../../../lib/supabase';
import type { Note } from '../../../types/common';

export type NoteActivity = {
    activity_date: string; // 'YYYY-MM-DD'
    count: number;
};

export type NoteTitle = Pick<Note, 'id' | 'title' | 'createdAt'>;

export const fetchNotesForDate = async (date: string | null): Promise<NoteTitle[]> => {
    if (!date) return [];

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('인증이 필요합니다.');

    const response = await fetch(`/api/v1?action=get-notes-for-date&date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '선택한 날짜의 노트를 불러오는데 실패했습니다.');
    }
    return response.json();
};

export const fetchAndSummarizeDay = async (date: string | null): Promise<{ title: string; summary: string } | null> => {
    if (!date) return null;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('인증이 필요합니다.');

    // 1. Fetch full notes for the day
    const notesResponse = await fetch(`/api/v1?action=get-full-notes-for-date&date=${date}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!notesResponse.ok) {
        console.error('요약을 위한 노트 전체 데이터 로딩 실패');
        return null;
    }
    const notes: Note[] = await notesResponse.json();

    if (notes.length === 0) {
        return null;
    }

    // 2. Summarize the notes
    const summaryResponse = await fetch(`/api/v1?action=summarize-day`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
    });

    if (!summaryResponse.ok) {
        const errorData = await summaryResponse.json();
        throw new Error(errorData.error || '일일 요약을 생성하는데 실패했습니다.');
    }
    return summaryResponse.json();
};

export const fetchNoteActivity = async (startDate: string, endDate: string): Promise<NoteActivity[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('인증이 필요합니다.');

    const response = await fetch(`/api/v1?action=calendar&start_date=${startDate}&end_date=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '노트 활동을 불러오는데 실패했습니다.');
    }
    return response.json();
}
