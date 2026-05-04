import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { getNotesByIds } from '../lib/supabaseService';
import type { AnswerData, Note } from '../types/common';

export class AnswerGenerationService {
    async generateAnswer(newNoteId: string, noteText: string, userId: string) {
        toast.loading("새로운 노트를 분석하고 있습니다...", { id: 'ai-summary-toast' });

        try {
            // 1. 컨텍스트 클러스터 찾기
            const contextNoteIds = await this.findContextCluster(newNoteId);

            if (!contextNoteIds || contextNoteIds.length <= 1) {
                toast.dismiss('ai-summary-toast');
                throw new Error("연결된 다른 노트를 찾지 못했습니다.");
            }

            // 2. 컨텍스트 노트 정보 가져오기
            const contextNotes = await this.fetchContextNotes(contextNoteIds, newNoteId);

            if (contextNotes.length === 0) {
                toast.dismiss('ai-summary-toast');
                throw new Error("연결된 다른 노트를 찾지 못했습니다.");
            }

            // 3. AI 답변 생성
            const summary = await this.generateSummary(noteText, contextNotes);

            // 4. 답변 데이터 포맷팅
            const answerData = this.formatAnswer(summary, contextNotes);

            toast.success("분석이 완료되었습니다!", { id: 'ai-summary-toast' });

            return answerData;
        } catch (error: any) {
            console.error("Failed to generate summary after save:", error);
            toast.error(`분석 오류: ${error.message}`, { id: 'ai-summary-toast' });
            throw error;
        }
    }

    private async findContextCluster(noteId: string): Promise<string[]> {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(`/api/v1?action=find-context-cluster&noteId=${noteId}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` })
            },
        });

        if (!response.ok) {
            throw new Error("Failed to find context cluster.");
        }

        const { contextNoteIds } = await response.json();
        return contextNoteIds;
    }

    private async fetchContextNotes(noteIds: string[], excludeId: string): Promise<Note[]> {
        const contextNotes = await getNotesByIds(noteIds);

        if (!contextNotes) {
            throw new Error("Failed to fetch context notes.");
        }

        // Exclude the newly created note itself from the context
        return contextNotes.filter((n: Note) => n.id !== excludeId);
    }

    private async generateSummary(query: string, context: Note[]): Promise<string> {
        const response = await fetch('/api/v1?action=generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'rag',
                input: { query },
                context: context.map((n: Note) => ({ id: n.id, body: n.body })),
            }),
        });

        if (!response.ok || !response.body) {
            throw new Error("Failed to generate summary.");
        }

        const result = await response.json();
        const summaryText = result?.data?.summary;

        if (!summaryText) {
            throw new Error("AI response did not contain a valid summary.");
        }

        return summaryText;
    }

    private formatAnswer(summary: string, notes: Note[]): {
        data: AnswerData;
        noteTitlesMap: Record<string, string>
    } {
        const noteTitlesMap: Record<string, string> = {};
        notes.forEach((n: Note) => {
            noteTitlesMap[n.id] = n.title || 'Untitled Note';
        });

        const answerData: AnswerData = {
            answerSegments: [{ sentence: summary, sourceNoteId: '' }],
            sourceNotes: notes.map((n: Note) => n.id),
        };

        return { data: answerData, noteTitlesMap };
    }
}

// Singleton instance
export const answerService = new AnswerGenerationService();
