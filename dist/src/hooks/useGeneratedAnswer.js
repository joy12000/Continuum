import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { addNoteAndChunks, getNotesByIds } from '../lib/supabaseService';
export function useGeneratedAnswer() {
    const [answerOpen, setAnswerOpen] = useState(false);
    const [answerSignal, setAnswerSignal] = useState(0);
    const [generatedAnswer, setGeneratedAnswer] = useState({
        data: null,
        isLoading: false,
        error: null,
    });
    useEffect(() => {
        const handleSave = async (e) => {
            const detail = e.detail;
            if (!detail || !detail.text)
                return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error("User not logged in, cannot save note.");
                return;
            }
            try {
                await addNoteAndChunks({ title: detail.text.slice(0, 50), body: detail.text, user_id: user.id });
                // Add a 2-second delay to allow the database index to update
                setTimeout(() => {
                    generateSummaryAfterSave(detail.text, user.id);
                }, 2000);
            }
            catch (error) {
                console.error("Failed to save note from HomeSky:", error);
            }
        };
        window.addEventListener('sky:save', handleSave);
        return () => window.removeEventListener('sky:save', handleSave);
    }, []);
    async function generateSummaryAfterSave(noteText, userId) {
        try {
            setGeneratedAnswer({ data: null, isLoading: true, error: null });
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            // 1. Search for similar notes
            const searchRes = await fetch(`/api/v1?action=search&q=${encodeURIComponent(noteText)}&uid=${userId}`, {
                headers: {
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
            });
            if (!searchRes.ok)
                throw new Error("Failed to search for similar notes.");
            const similarChunks = await searchRes.json();
            // 2. Get top 3 unique note IDs from chunks
            const uniqueNoteIds = [...new Set(similarChunks.map((c) => c.note_id))];
            if (uniqueNoteIds.length === 0) {
                setGeneratedAnswer({ data: null, isLoading: false, error: "유사한 노트를 찾지 못했습니다." });
                setAnswerOpen(true); // Open the modal to show this message
                return;
            }
            // 3. Fetch full content of these notes
            const contextNotes = await getNotesByIds(uniqueNoteIds);
            if (!contextNotes)
                throw new Error("Failed to fetch context notes.");
            // 4. Call generate API
            const generateRes = await fetch('/api/v1?action=generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'rag',
                    input: { query: noteText },
                    context: contextNotes.map((n) => ({ id: n.id, body: n.body }))
                })
            });
            if (!generateRes.ok || !generateRes.body) {
                throw new Error("Failed to generate summary.");
            }
            // 5. Handle streaming response
            const reader = generateRes.body.getReader();
            const decoder = new TextDecoder();
            let fullAnswer = "";
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                fullAnswer += decoder.decode(value, { stream: true });
            }
            const finalAnswerData = {
                answerSegments: [{ sentence: fullAnswer, sourceNoteId: '' }], // Simplified for now
                sourceNotes: contextNotes.map((n) => n.id),
            };
            setGeneratedAnswer({ data: finalAnswerData, isLoading: false, error: null });
            setAnswerSignal(s => s + 1);
            setAnswerOpen(true); // Open the modal to show the result
        }
        catch (error) {
            console.error("Failed to generate summary after save:", error);
            setGeneratedAnswer({ data: null, isLoading: false, error: error.message });
            setAnswerOpen(true); // Open the modal to show the error
        }
    }
    return { answerOpen, setAnswerOpen, generatedAnswer, answerSignal };
}
