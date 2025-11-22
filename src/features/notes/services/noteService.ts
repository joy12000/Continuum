import { supabase } from '../../../lib/supabase';
import type { Note, NoteAttachment } from '../../../types/common';

export const fetchNoteData = async (noteId: string) => {
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
        throw new Error(errorData.error || '노트를 불러오는데 실패했습니다.');
    }
    if (attachmentsError) throw new Error('첨부파일을 불러오는데 실패했습니다.');

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
