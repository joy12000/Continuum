import { useQuery } from '@tanstack/react-query';
import { fetchNoteData } from '../services/noteService';
import { useAuth } from '../../../contexts/AuthContext';

export const useNoteDetail = (noteId: string | undefined) => {
    const { session } = useAuth();

    return useQuery({
        queryKey: ['noteDetail', noteId],
        queryFn: () => fetchNoteData(noteId!),
        enabled: !!noteId && !!session,
    });
};
