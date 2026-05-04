import { supabase } from '../../../lib/supabase';
import type { Note, NoteAttachment } from '../../../types/common';

export const fetchNoteData = async (noteId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('?紐꾩쵄???袁⑹뒄??몃빍??');

    const notePromise = fetch(`/api/v1?action=get-note&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const attachmentsPromise = supabase.from('note_attachments').select('*').eq('note_id', noteId);
    const backlinksPromise = fetch(`/api/v1?action=get-backlinks&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const connectionsPromise = fetch(`/api/v1?action=get-connections&noteId=${noteId}`, { headers: { 'Authorization': `Bearer ${token}` } });

    const [noteRes, { data: attachments, error: attachmentsError }, backlinksRes, connectionsRes] = await Promise.all([notePromise, attachmentsPromise, backlinksPromise, connectionsPromise]);

    if (!noteRes.ok) {
        if (noteRes.status === 404) throw new Error('?紐낅뱜??筌≪뼚??????곷뮸??덈뼄.');
        const errorData = await noteRes.json();
        throw new Error(errorData.error || '?紐낅뱜???븍뜄???삳뮉????쎈솭??됰뮸??덈뼄.');
    }
    if (attachmentsError) throw new Error('筌ｂ뫀????뵬???븍뜄???삳뮉????쎈솭??됰뮸??덈뼄.');

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
