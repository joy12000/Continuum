import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDraftPersistence } from './useDraftPersistence';
import { CHAT_BUNDLE_EVENT, CHAT_SUMMARY_EVENT, ChatSummaryEventDetail } from '../lib/events';
import { supabase } from '../lib/supabase';

const FLUSH_INTERVAL = 120_000; // 2 minutes

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  text: string;
  timestamp: number;
  author?: string;
  noteId?: string;
}

interface UseChatBundlerOptions {
  initialMessages?: ChatMessage[];
}

const createMessageId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
};

export const useChatBundler = (options?: UseChatBundlerOptions) => {
  const { initialMessages = [] } = options || {};
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialMessages);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const pendingIdsRef = useRef<string[]>(pendingIds);
  const [targetFlushAt, setTargetFlushAt] = useState<number | null>(null);
  const [timeToFlush, setTimeToFlush] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecordingMode, setIsRecordingMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('isRecordingMode') === 'true';
    }
    return false;
  });
  const coachTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('isRecordingMode', String(isRecordingMode));
    }
  }, [isRecordingMode]);

  const { draft, setDraft, clearDraft } = useDraftPersistence();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    pendingIdsRef.current = pendingIds;
  }, [pendingIds]);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const enqueueMessage = useCallback(
    (text: string, role: ChatMessageRole = 'user', author?: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const message: ChatMessage = {
        id: createMessageId(),
        role,
        author,
        text: trimmed,
        timestamp: Date.now(),
      };
      appendMessage(message);
      setPendingIds((prev) => [...prev, message.id]);
    },
    [appendMessage]
  );

  const flush = useCallback(() => {
    const pendingSet = new Set(pendingIdsRef.current);
    if (pendingSet.size === 0) {
      return false;
    }
    const unsavedText = messagesRef.current
      .filter((msg) => pendingSet.has(msg.id) && msg.role !== 'system')
      .map((msg) => {
        const prefix = msg.role === 'assistant' ? 'Momentum: ' : 'User: ';
        return `${prefix}${msg.text}`;
      })
      .join('\n\n')
      .trim();

    if (!unsavedText) {
      setPendingIds([]);
      setTargetFlushAt(null);
      return false;
    }

    setIsSaving(true);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(CHAT_BUNDLE_EVENT, {
            detail: { text: unsavedText, createdAt: Date.now() },
          })
        );
      }
      setPendingIds([]);
      setTargetFlushAt(null);
      setLastSavedAt(Date.now());
      clearDraft();
      return true;
    } finally {
      setIsSaving(false);
    }
  }, [clearDraft]);

  const flushNow = useCallback(() => flush(), [flush]);

  const resetFlushTimer = useCallback(() => {
    if (pendingIdsRef.current.length > 0) {
      setTargetFlushAt(Date.now() + FLUSH_INTERVAL);
    }
  }, []);

  useEffect(() => {
    if (pendingIds.length === 0) {
      setTargetFlushAt(null);
      return;
    }
    setTargetFlushAt((current) => current ?? Date.now() + FLUSH_INTERVAL);
  }, [pendingIds]);

  useEffect(() => {
    if (!targetFlushAt) return;
    const delay = Math.max(0, targetFlushAt - Date.now());
    const timer = window.setTimeout(() => {
      flush();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [targetFlushAt, flush]);

  useEffect(() => {
    if (!targetFlushAt) {
      setTimeToFlush(null);
      return;
    }
    const update = () => {
      setTimeToFlush(Math.max(0, targetFlushAt - Date.now()));
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [targetFlushAt]);

  useEffect(() => {
    // If the last message is from the user, start a timer to call coach.
    const lastMsg = messages[messages.length - 1];
    if (isRecordingMode || !lastMsg || lastMsg.role !== 'user') return;

    if (coachTimerRef.current) window.clearTimeout(coachTimerRef.current);

    coachTimerRef.current = window.setTimeout(async () => {
      setIsTyping(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch('/api/v1?action=chat-coach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: messagesRef.current }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.text) {
            enqueueMessage(data.text, 'assistant', 'Momentum');
          }
        }
      } catch (err) {
        console.error('Failed to fetch coach response', err);
      } finally {
        setIsTyping(false);
      }
    }, 2500); // 2.5 seconds debounce

    return () => {
      if (coachTimerRef.current) window.clearTimeout(coachTimerRef.current);
    };
  }, [messages, enqueueMessage, isRecordingMode]);

  const hasPending = pendingIds.length > 0;

  const statusLabel = useMemo(() => {
    if (isSaving) return '저장 중...';
    if (hasPending && timeToFlush !== null) {
      const seconds = Math.max(0, Math.ceil(timeToFlush / 1000));
      return `자동 저장 예정: ${seconds}s`;
    }
    if (lastSavedAt) {
      return `마지막 저장: ${new Date(lastSavedAt).toLocaleTimeString()}`;
    }
    return '대기 중';
  }, [hasPending, isSaving, timeToFlush, lastSavedAt]);

  useEffect(() => {
    const handleSummary = (event: Event) => {
      const detail = (event as CustomEvent<ChatSummaryEventDetail>).detail;
      if (!detail?.summary) return;
      appendMessage({
        id: createMessageId(),
        role: 'assistant',
        text: detail.summary,
        timestamp: Date.now(),
        author: 'Momentum',
        noteId: detail.noteId,
      });
    };
    window.addEventListener(CHAT_SUMMARY_EVENT, handleSummary as EventListener);
    return () => {
      window.removeEventListener(CHAT_SUMMARY_EVENT, handleSummary as EventListener);
    };
  }, [appendMessage]);

  return {
    messages,
    draft,
    setDraft,
    clearDraft,
    enqueueMessage,
    flushNow,
    resetFlushTimer,
    hasPending,
    isSaving,
    isTyping,
    isRecordingMode,
    setIsRecordingMode,
    timeToFlush,
    statusLabel,
    lastSavedAt,
  };
};
