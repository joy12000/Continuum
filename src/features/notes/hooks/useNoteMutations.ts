import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { NoteAttachment } from '../../../types/common';

export const useNoteMutations = (noteId: string | undefined) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const updateNoteMutation = useMutation({
        mutationFn: async ({ title, body, tags }: { title: string; body: string; tags: string[] }) => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('인증이 필요합니다.');

            const response = await fetch(`/api/v1?action=update-note&noteId=${noteId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    body,
                    tags,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '노트 업데이트에 실패했습니다.');
            }
        },
        onSuccess: () => {
            toast.success("노트가 성공적으로 업데이트되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
            queryClient.invalidateQueries({ queryKey: ['noteActivity'] });
            window.dispatchEvent(new CustomEvent('notes:updated'));
        },
        onError: (err: any) => toast.error(`업데이트 실패: ${err.message}`),
    });

    const updateNoteLinksMutation = useMutation({
        mutationFn: async ({ linksToAdd, linksToRemove }: { linksToAdd: string[], linksToRemove: string[] }) => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('인증이 필요합니다.');

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
                throw new Error(errorData.error || '노트 링크 업데이트에 실패했습니다.');
            }
        },
        onSuccess: () => {
            toast.success("노트 링크가 업데이트되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
        },
        onError: (err: any) => {
            toast.error(`링크 업데이트 실패: ${err.message}`);
        },
    });

    const deleteNoteMutation = useMutation({
        mutationFn: async (attachments: NoteAttachment[] = []) => {
            if (attachments && attachments.length > 0) {
                const paths = attachments.map(a => a.storage_path);
                await supabase.storage.from('notes-attachments').remove(paths);
            }
            const { error } = await supabase.from('notes').delete().eq('id', noteId!);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('노트가 삭제되었습니다.');
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            window.dispatchEvent(new CustomEvent('notes:updated'));
            navigate('/');
        },
        onError: (err: any) => toast.error(`삭제 실패: ${err.message}`),
    });

    const deleteAttachmentMutation = useMutation({
        mutationFn: async (attachment: NoteAttachment) => {
            await supabase.storage.from('notes-attachments').remove([attachment.storage_path]);
            const { error } = await supabase.from('note_attachments').delete().eq('id', attachment.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("첨부파일이 삭제되었습니다.");
            queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
        },
        onError: (err: any) => toast.error(`첨부파일 삭제 실패: ${err.message}`),
    });

    return {
        updateNoteMutation,
        updateNoteLinksMutation,
        deleteNoteMutation,
        deleteAttachmentMutation,
    };
};
