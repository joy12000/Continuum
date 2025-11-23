import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDraftPersistence } from './useDraftPersistence';
import { CHAT_BUNDLE_EVENT, CHAT_SUMMARY_EVENT, ChatSummaryEventDetail } from '../lib/events';

const FLUSH_INTERVAL = 30_000;

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
      if (role === 'user') {
        setPendingIds((prev) => [...prev, message.id]);
      }
    },
    [appendMessage]
  );

  const flush = useCallback(() => {
    const pendingSet = new Set(pendingIdsRef.current);
    if (pendingSet.size === 0) {
      return false;
    }
    const unsavedText = messagesRef.current
      .filter((msg) => msg.role === 'user' && pendingSet.has(msg.id))
      .map((msg) => msg.text)
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

  const hasPending = pendingIds.length > 0;

  const statusLabel = useMemo(() => {
    if (isSaving) return '임시 저장 중...';
    if (hasPending && timeToFlush !== null) {
      const seconds = Math.max(0, Math.ceil(timeToFlush / 1000));
      return `임시 저장 예정 ${seconds}s`;
    }
    if (lastSavedAt) {
      return `마지막 저장 ${new Date(lastSavedAt).toLocaleTimeString()}`;
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
        author: 'Continuum',
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
    hasPending,
    isSaving,
    timeToFlush,
    statusLabel,
    lastSavedAt,
  };
};
