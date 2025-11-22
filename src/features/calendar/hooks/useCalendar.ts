import { useQuery } from '@tanstack/react-query';
import { fetchNoteActivity, fetchNotesForDate, fetchAndSummarizeDay, NoteActivity, NoteTitle } from '../services/calendarService';
import { useAuth } from '../../../contexts/AuthContext';

export const useNoteActivity = (year: number, month: number) => {
    const { session } = useAuth();

    const firstDayOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

    return useQuery<NoteActivity[], Error>({
        queryKey: ['noteActivity', year, month],
        queryFn: () => fetchNoteActivity(firstDayOfMonth, lastDayOfMonth),
        enabled: !!session,
    });
};

export const useNotesForDate = (date: string) => {
    const { session } = useAuth();

    return useQuery<NoteTitle[], Error>({
        queryKey: ['notesForDate', date],
        queryFn: () => fetchNotesForDate(date),
        enabled: !!date && !!session,
    });
};

export const useDailySummary = (date: string, hasActivity: boolean) => {
    const { session } = useAuth();

    return useQuery<{ title: string; summary: string } | null, Error>({
        queryKey: ['dailySummary', date],
        queryFn: () => fetchAndSummarizeDay(date),
        enabled: !!date && !!session && hasActivity,
    });
};
