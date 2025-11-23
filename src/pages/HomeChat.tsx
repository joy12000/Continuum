import React, { useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useChatBundler, ChatMessage } from '../hooks/useChatBundler';

interface HomeChatProps {
  answerSignal?: number;
  onOpenAnswer?: () => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    role: 'assistant',
    author: 'Continuum',
    text: '밤하늘에 남긴 메모들을 연결해 드릴게요. 편하게 대화를 시작해보세요!',
    timestamp: Date.now() - 1000 * 60 * 3,
  },
];

const formatDateChip = (timestamp: number) =>
  new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date(timestamp));

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));

const formatCountdown = (ms: number | null) => {
  if (ms === null) return null;
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainSeconds).padStart(2, '0')}`;
};

export default function HomeChat({ answerSignal, onOpenAnswer }: HomeChatProps) {
  const {
    messages,
    draft,
    setDraft,
    enqueueMessage,
    flushNow,
    hasPending,
    statusLabel,
    timeToFlush,
    isSaving,
  } = useChatBundler({ initialMessages: INITIAL_MESSAGES });

  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const trimmedDraft = draft.trim();

  const countdown = useMemo(() => formatCountdown(timeToFlush), [timeToFlush]);
  const hasAnswer = typeof answerSignal === 'number' && answerSignal > 0;
  const dateChip = messages.length ? formatDateChip(messages[0].timestamp) : formatDateChip(Date.now());

  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!trimmedDraft) return;
    enqueueMessage(trimmedDraft);
    setDraft('');
  };

  const runFlush = () => {
    const flushed = flushNow();
    if (flushed) {
      toast.success('임시 저장을 완료했어요.');
    } else {
      toast('저장할 메시지가 없어요.');
    }
  };

  const handleFlush = () => {
    if (trimmedDraft) {
      enqueueMessage(trimmedDraft);
      setDraft('');
      setTimeout(runFlush, 0);
      return;
    }
    runFlush();
  };

  return (
    <div className="chat-screen">
      <header className="chat-header">
        <div className="chat-header__top">
          <span>Continuum</span>
          <div className="chat-header__actions">
            {hasAnswer && (
              <button className="chat-header__button" onClick={onOpenAnswer}>
                AI 답변
              </button>
            )}
            <button
              className="chat-header__button chat-header__button--primary"
              onClick={handleFlush}
              disabled={!hasPending && !trimmedDraft}
            >
              지금 저장
            </button>
          </div>
        </div>
        <div className="chat-header__meta">
          <span>{statusLabel}</span>
          {countdown && (hasPending || trimmedDraft) && <span>{countdown}</span>}
        </div>
      </header>

      <section className="main-chat" ref={chatBodyRef}>
        <div className="chat__timestamp">{dateChip}</div>
        {messages.map((message) => {
          const isOwn = message.role === 'user';
          return (
            <div key={message.id} className={`message-row ${isOwn ? 'message-row--own' : ''}`}>
              {!isOwn && (
                <div className="message__avatar" aria-hidden>
                  {(message.author || 'C').charAt(0)}
                </div>
              )}
              <div className="message__body">
                {!isOwn && message.author && <span className="message__author">{message.author}</span>}
                <div className="message__bubble">{message.text}</div>
                <div className="message__info">
                  <span>{formatTime(message.timestamp)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {(hasPending || trimmedDraft) && countdown && (
          <div className="chat-status-banner">
            {isSaving ? '임시 저장 중...' : `임시 저장까지 ${countdown}`}
          </div>
        )}
      </section>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <div className="chat-composer__extra" role="button" tabIndex={0} aria-label="추가기능">
          +
        </div>
        <div className="chat-composer__input">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="메시지를 입력하세요"
          />
          <button type="submit" disabled={!trimmedDraft}>
            ↑
          </button>
        </div>
      </form>
    </div>
  );
}
