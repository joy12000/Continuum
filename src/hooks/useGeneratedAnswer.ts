import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { addNoteAndChunks, getNotesByIds, CHAT_HISTORY_MARKER } from '../lib/supabaseService';
import { AnswerData, Note } from '../types/common';
import { CHAT_BUNDLE_EVENT } from '../lib/events';
import { useAnswerStore } from '../store/answerStore';

export function useGeneratedAnswer() {
  const {
    openAnswer,
    setAnswer,
    setLoading,
    setError,
    incrementSignal
  } = useAnswerStore();

  useEffect(() => {
    const handleSave = async (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.text) return;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!user) {
        console.error("User not logged in, cannot save note.");
        return;
      }

      try {
        let noteTitle = detail.text.slice(0, 50);
        let noteBody = detail.text;

        // Attempt to summarize the conversation if it contains multiple messages
        if (detail.text.includes('User: ') || detail.text.includes('Momentum: ')) {
          try {
            const token = sessionData.session?.access_token;
            const summarizeRes = await fetch('/api/v1?action=summarize-conversation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              body: JSON.stringify({ text: detail.text })
            });

            if (summarizeRes.ok) {
              const summaryData = await summarizeRes.json();
              if (summaryData.title && summaryData.summary) {
                noteTitle = summaryData.title;
                noteBody = summaryData.summary + '\n\n' + CHAT_HISTORY_MARKER + '\n\n' + detail.text; 
              }
            }
          } catch (sumErr) {
            console.error("Failed to summarize conversation, saving raw text:", sumErr);
          }
        }

        await addNoteAndChunks({ title: noteTitle, body: noteBody, user_id: user.id });
        // Add a 2-second delay to allow the database index to update
        setTimeout(() => {
          generateSummaryAfterSave(noteBody, user.id);
        }, 2000);
      } catch (error) {
        console.error("Failed to save note from HomeSky:", error);
      }
    };

    window.addEventListener(CHAT_BUNDLE_EVENT, handleSave);
    return () => window.removeEventListener(CHAT_BUNDLE_EVENT, handleSave);
  }, []);

  async function generateSummaryAfterSave(noteText: string, userId: string) {
    try {
      setLoading(true);
      setError(null);
  
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1. Search for similar notes
      const searchRes = await fetch(`/api/v1?action=search&q=${encodeURIComponent(noteText)}&uid=${userId}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!searchRes.ok) throw new Error("Failed to search for similar notes.");
      const similarChunks = await searchRes.json();
  
      // 2. Get top 3 unique note IDs from chunks
      const uniqueNoteIds = [...new Set(similarChunks.map((c: any) => c.note_id))] as string[];
      if (uniqueNoteIds.length === 0) {
        setLoading(false);
        setError("연결된 다른 노트를 찾지 못했습니다.");
        openAnswer();
        return;
      }
      
      // 3. Fetch full content of these notes
      const contextNotes = await getNotesByIds(uniqueNoteIds);
      if (!contextNotes) throw new Error("Failed to fetch context notes.");
  
      // 4. Call generate API
      const generateRes = await fetch('/api/v1?action=generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rag',
          input: { query: noteText },
          context: contextNotes.map((n: Note) => ({ id: n.id, body: n.body }))
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
        if (done) break;
        fullAnswer += decoder.decode(value, { stream: true });
      }
      
      let parsedAnswer = fullAnswer;
      try {
        const json = JSON.parse(fullAnswer);
        if (json.data && json.data.summary) {
          parsedAnswer = json.data.summary;
        } else if (json.summary) {
          parsedAnswer = json.summary;
        }
      } catch (e) {
        // If it's not valid JSON, just fallback to using the raw text
        console.warn("Could not parse response as JSON, using raw text", e);
      }
  
      const finalAnswerData: AnswerData = {
        answerSegments: [{ sentence: parsedAnswer, sourceNoteId: '' }], // Simplified for now
        sourceNotes: contextNotes.map((n: Note) => n.id),
      };
  
      // Build titles map
      const titlesMap: Record<string, string> = {};
      contextNotes.forEach((n: Note) => {
        titlesMap[n.id] = n.title || '제목 없는 메모';
      });

      setAnswer(finalAnswerData, titlesMap);
      incrementSignal();
      openAnswer();
  
    } catch (error) {
      console.error("Failed to generate summary after save:", error);
      setError((error as Error).message);
      openAnswer();
    }
  }
}
