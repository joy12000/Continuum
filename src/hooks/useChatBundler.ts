import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
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
  const [isResponding, setIsResponding] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<ChatMessage | null>(null);

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

  const sendMessageToAI = useCallback(
    async (message: ChatMessage) => {
      setIsResponding(true);
      setResponseError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const token = session?.access_token;
        const userId = session?.user?.id;

        const resp = await fetch('/api/v1?action=chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(userId && { 'X-User-Id': userId }),
          },
          body: JSON.stringify({
            message: message.text,
            role: message.role,
            userId,
          }),
        });

        if (!resp.ok) {
          const errorBody = await resp.text();
          throw new Error(errorBody || 'AI 호출에 실패했습니다.');
        }

        const data = await resp.json();
        const assistantText = data?.reply ?? data?.text ?? data?.message;

        if (!assistantText) {
          throw new Error('AI 응답이 비어 있습니다.');
        }

        appendMessage({
          id: createMessageId(),
          role: 'assistant',
          text: assistantText,
          timestamp: Date.now(),
          author: data?.author || 'Continuum',
        });
        setFailedMessage(null);
      } catch (error) {
        const messageText = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        setResponseError(messageText);
        setFailedMessage(message);
        toast.error('AI 응답을 가져오지 못했어요. 다시 시도해 주세요.');
      } finally {
        setIsResponding(false);
      }
    },
    [appendMessage]
  );

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
        sendMessageToAI(message);
      }
    },
    [appendMessage, sendMessageToAI]
  );

  const retryLastUserMessage = useCallback(() => {
    if (failedMessage) {
      sendMessageToAI(failedMessage);
    }
  }, [failedMessage, sendMessageToAI]);

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
    if (isResponding) return 'AI 응답 생성 중...';
    if (isSaving) return '임시 저장 중...';
    if (hasPending && timeToFlush !== null) {
      const seconds = Math.max(0, Math.ceil(timeToFlush / 1000));
      return `임시 저장 예정 ${seconds}s`;
    }
    if (lastSavedAt) {
      return `마지막 저장 ${new Date(lastSavedAt).toLocaleTimeString()}`;
    }
    return '대기 중';
  }, [hasPending, isResponding, isSaving, timeToFlush, lastSavedAt]);

  useEffect(() => {
    const handleSummary = (event: Event) => {
      const detail = (event as CustomEvent<ChatSummaryEventDetail>).detail;
      if (!detail?.summary) return;

      const createdAt = detail.createdAt ?? Date.now();
      const timeLabel = new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(createdAt));

      const formattedSummary = [
        '저장된 메모를 정리했어요.',
        `🗒️ 노트: ${detail.noteId}`,
        `🕒 ${timeLabel}`,
        '',
        detail.summary.trim(),
      ]
        .filter(Boolean)
        .join('\n');

      appendMessage({
        id: createMessageId(),
        role: 'assistant',
        text: formattedSummary,
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
    isResponding,
    responseError,
    retryLastUserMessage,
  };
};
