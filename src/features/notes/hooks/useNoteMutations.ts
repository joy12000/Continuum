import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import type { NoteAttachment } from '../../../types/common';

export const useNoteMutations = (noteId: string | undefined) => {
    const queryClient = useQueryClient();
    const router = useRouter();

    const updateNoteMutation = useMutation({
        mutationFn: async ({ title, body, tags }: { title: string; body: string; tags: string[] }) => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('?紐꾩쵄???袁⑹뒄??몃빍??');

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
                throw new Error(errorData.error || '?紐낅뱜 ??낅쑓??꾨뱜????쎈솭??됰뮸??덈뼄.');
            }
        },
        onSuccess: () => {
            toast.success("?紐낅뱜揶쎛 ?源껊궗?怨몄몵嚥???낅쑓??꾨뱜??뤿???щ빍??");
            queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
            queryClient.invalidateQueries({ queryKey: ['noteActivity'] });
            window.dispatchEvent(new CustomEvent('notes:updated'));
        },
        onError: (err: any) => toast.error(`??낅쑓??꾨뱜 ??쎈솭: ${err.message}`),
    });

    const updateNoteLinksMutation = useMutation({
        mutationFn: async ({ linksToAdd, linksToRemove }: { linksToAdd: string[], linksToRemove: string[] }) => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('?紐꾩쵄???袁⑹뒄??몃빍??');

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
                throw new Error(errorData.error || '?紐낅뱜 筌띻낱寃???낅쑓??꾨뱜????쎈솭??됰뮸??덈뼄.');
            }
        },
        onSuccess: () => {
            toast.success("?紐낅뱜 筌띻낱寃뺝첎? ??낅쑓??꾨뱜??뤿???щ빍??");
            queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
        },
        onError: (err: any) => {
            toast.error(`筌띻낱寃???낅쑓??꾨뱜 ??쎈솭: ${err.message}`);
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
            toast.success('?紐낅뱜揶쎛 ?????뤿???щ빍??');
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            window.dispatchEvent(new CustomEvent('notes:updated'));
            router.push('/');
        },
        onError: (err: any) => toast.error(`??????쎈솭: ${err.message}`),
    });

    const deleteAttachmentMutation = useMutation({
        mutationFn: async (attachment: NoteAttachment) => {
            await supabase.storage.from('notes-attachments').remove([attachment.storage_path]);
            const { error } = await supabase.from('note_attachments').delete().eq('id', attachment.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("筌ｂ뫀????뵬???????뤿???щ빍??");
            queryClient.invalidateQueries({ queryKey: ['noteDetail', noteId] });
        },
        onError: (err: any) => toast.error(`筌ｂ뫀????뵬 ??????쎈솭: ${err.message}`),
    });

    return {
        updateNoteMutation,
        updateNoteLinksMutation,
        deleteNoteMutation,
        deleteAttachmentMutation,
    };
};
