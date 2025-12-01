import React, { useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useChatBundler, ChatMessage } from '../hooks/useChatBundler';
import { useNavigate } from 'react-router-dom';

interface HomeChatProps {
  answerSignal?: number;
  onOpenAnswer?: () => void;
  resetKey?: string | number;
}

const createInitialMessages = (): ChatMessage[] => [
  {
    id: 'welcome-1',
    role: 'assistant',
    author: 'Continuum',
    text: '안녕하세요! Continuum이 기억을 정리하는 일을 도와드릴게요.',
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

export default function HomeChat({ answerSignal, onOpenAnswer, resetKey }: HomeChatProps) {
  const initialMessages = useMemo(() => createInitialMessages(), [resetKey]);
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
    isResponding,
    responseError,
    retryLastUserMessage,
  } = useChatBundler({ initialMessages, resetKey });

  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const trimmedDraft = draft.trim();
  const navigate = useNavigate();
  const handleExtraClick = () => {
    navigate('/home');
  };

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
      toast.success('임시 저장했습니다.');
    } else {
      toast('아직 정리할 메시지가 없습니다.');
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
    <div className="home-chat-page">
      <div className="chat-screen">
        <header className="chat-header">
          <div className="chat-header__top">
            <span>Continuum</span>
            <div className="chat-header__actions">
              {hasAnswer && (
                <button className="chat-header__button" onClick={onOpenAnswer}>
                  AI 요약
                </button>
              )}
              <button
                className="chat-header__button chat-header__button--primary"
                onClick={handleFlush}
                disabled={!hasPending && !trimmedDraft}
              >
                정리 시작
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
          {isResponding && (
            <div className="message-row" aria-live="polite">
              <div className="message__avatar" aria-hidden>
                C
              </div>
              <div className="message__body">
                <span className="message__author">Continuum</span>
                <div className="message__bubble message__bubble--typing" aria-label="응답 생성 중">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          {(hasPending || trimmedDraft) && countdown && (
            <div className="chat-status-banner">
              {isSaving ? '임시 저장 중…' : `임시 저장까지 ${countdown}`}
            </div>
          )}
          {responseError && (
            <div className="chat-status-banner chat-status-banner--error">
              <div className="chat-status-banner__text">{responseError}</div>
              <button className="chat-header__button" onClick={retryLastUserMessage}>
                다시 시도
              </button>
            </div>
          )}
        </section>

        <form className="chat-composer" onSubmit={handleSubmit}>
          <div
            className="chat-composer__extra"
            role="button"
            tabIndex={0}
            aria-label="홈으로 이동"
            onClick={handleExtraClick}
          >
            <span className="chat-composer__extra-icon">+</span>
            <span className="chat-composer__extra-label">Chat</span>
          </div>
          <div className="chat-composer__input">
            <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="메모를 입력하세요" />
            <button type="submit" disabled={!trimmedDraft}>
              전송
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
