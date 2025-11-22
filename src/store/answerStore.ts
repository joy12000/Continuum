import type { AnswerData } from '../types/common';
import { create } from 'zustand';

interface AnswerStore {
    isOpen: boolean;
    signal: number;
    data: AnswerData | null;
    isLoading: boolean;
    error: string | null;
    noteTitlesMap: Record<string, string>;
    detailNoteId: string | null;

    openAnswer: () => void;
    closeAnswer: () => void;
    incrementSignal: () => void;
    setAnswer: (data: AnswerData, titles: Record<string, string>) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setDetailNoteId: (id: string | null) => void;
    reset: () => void;
}

export const useAnswerStore = create<AnswerStore>((set) => ({
    isOpen: false,
    signal: 0,
    data: null,
    isLoading: false,
    error: null,
    noteTitlesMap: {},
    detailNoteId: null,

    openAnswer: () => set({ isOpen: true }),
    closeAnswer: () => set({ isOpen: false }),
    incrementSignal: () => set((state) => ({ signal: state.signal + 1 })),
    setAnswer: (data, titles) => set({
        data,
        noteTitlesMap: titles,
        isLoading: false,
        error: null
    }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false }),
    setDetailNoteId: (detailNoteId) => set({ detailNoteId }),
    reset: () => set({
        data: null,
        isLoading: false,
        error: null,
        noteTitlesMap: {},
    }),
}));
