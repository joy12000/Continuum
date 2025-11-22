import { supabase } from '../../../lib/supabase';
import type { Note, AnswerData } from '../../../types/common';
import { getNotesByIds } from '../../../lib/supabaseService';

export type SearchResult = {
    note_id: string;
    chunk_index: number;
    content: string;
    similarity: number;
};

export const searchNotes = async (query: string): Promise<SearchResult[]> => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return [];

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('인증이 필요합니다.');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found.');
    const userId = user.id;

    const res = await fetch(`/api/v1?action=search&q=${encodeURIComponent(trimmedQuery)}&uid=${userId}&timestamp=${new Date().getTime()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: 'Could not parse error body' }));
        throw new Error(`Search failed with status ${res.status}${errorBody.error ? `: ${errorBody.error}` : ''}`);
    }
    return res.json();
};

export const generateSearchAnswer = async (query: string, searchResults: SearchResult[]): Promise<{ answerData: AnswerData, noteTitlesMap: Record<string, string> } | null> => {
    if (!searchResults || searchResults.length === 0 || query.trim().length < 2) {
        return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('인증이 필요합니다.');

    const filteredResults = searchResults.filter(r => r.similarity >= 0.7);
    const topNoteIds = [...new Set(filteredResults.map(r => r.note_id))].slice(0, 5);

    if (topNoteIds.length === 0) return null;

    const contextNotes = await getNotesByIds(topNoteIds);

    if (!contextNotes || contextNotes.length === 0) {
        throw new Error("Could not fetch context notes.");
    }

    const noteTitlesMap: Record<string, string> = {};
    contextNotes.forEach((n: Note) => {
        noteTitlesMap[n.id] = n.title || '제목 없는 노트';
    });

    const generateRes = await fetch('/api/v1?action=generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            type: 'rag',
            input: { query },
            context: contextNotes.map((n: Note) => ({ id: n.id, body: n.body }))
        })
    });

    if (!generateRes.ok || !generateRes.body) {
        const errorText = await generateRes.text();
        throw new Error(`요약 생성 실패: ${errorText}`);
    }

    const result = await generateRes.json();
    const summaryText = result?.data?.summary;
    if (!summaryText) throw new Error("AI response did not contain a valid summary.");

    const answerData: AnswerData = {
        answerSegments: [{ sentence: summaryText, sourceNoteId: '' }],
        sourceNotes: contextNotes.map((n: Note) => n.id),
    };

    return { answerData, noteTitlesMap };
};
