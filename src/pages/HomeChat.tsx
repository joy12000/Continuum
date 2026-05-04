'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useChatBundler, ChatMessage } from '../hooks/useChatBundler';

interface HomeChatProps {
  answerSignal?: number;
  onOpenAnswer?: () => void;
}

const getInitialMessages = (isRecordingMode: boolean): ChatMessage[] => [
  {
    id: 'welcome-1',
    role: 'assistant',
    author: 'Momentum',
    text: isRecordingMode 
      ? '기록하고 연결하며 성장하는 당신을 위한 모멘텀입니다. 지금 기록을 시작해보세요!' 
      : '기록하고 연결하며 성장하는 당신을 위한 모멘텀입니다. 편하게 대화를 시작해보세요!',
    timestamp: 1714400000000,
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
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const {
    messages,
    draft,
    setDraft,
    enqueueMessage,
    flushNow,
    resetFlushTimer,
    hasPending,
    statusLabel,
    timeToFlush,
    isTyping,
    isRecordingMode,
    setIsRecordingMode,
  } = useChatBundler({ 
    initialMessages: getInitialMessages(
      typeof window !== 'undefined' ? localStorage.getItem('isRecordingMode') === 'true' : false
    ) 
  });
  
  const [coachAvatarUrl, setCoachAvatarUrl] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const trimmedDraft = draft.trim();

  const countdown = useMemo(() => formatCountdown(timeToFlush), [timeToFlush]);
  const hasAnswer = typeof answerSignal === 'number' && answerSignal > 0;
  
  const flushNowRef = useRef(flushNow);
  useEffect(() => {
    flushNowRef.current = flushNow;
  }, [flushNow]);

  // Flush on unmount if pending
  useEffect(() => {
    return () => {
      // Safely flush on unmount without triggering on every re-render
      flushNowRef.current();
    };
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
      const { data } = await supabase
        .from('profiles')
        .select('coach_avatar_url')
        .eq('id', session.user.id)
        .single();
      if (data?.coach_avatar_url) setCoachAvatarUrl(data.coach_avatar_url);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}/coach_avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      await supabase
        .from('profiles')
        .update({ coach_avatar_url: urlWithTimestamp })
        .eq('id', session.user.id);

      setCoachAvatarUrl(urlWithTimestamp);
      toast.success('모멘텀의 프로필 이미지가 변경되었습니다.');
    } catch (error: any) {
      toast.error('이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const dateChip = useMemo(() => {
    if (!isMounted) return '';
    const ts = messages.length ? messages[0].timestamp : Date.now();
    return formatDateChip(ts);
  }, [isMounted, messages]);

  useEffect(() => {
    const el = chatBodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isTyping]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!trimmedDraft) return;
    enqueueMessage(trimmedDraft);
    setDraft('');
  };

  const runFlush = () => {
    const flushed = flushNow();
    if (flushed) {
      toast.success('동기화 완료! 지식이 별빛에 새겨졌습니다.');
    } else {
      toast('저장할 메시지가 없습니다.');
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

  const toggleRecordingMode = () => {
    const nextMode = !isRecordingMode;
    setIsRecordingMode(nextMode);
    if (nextMode) {
      toast('기록 모드가 활성화되었습니다. 챗봇이 응답하지 않습니다.', { icon: '✍️' });
    } else {
      toast('챗봇 모드가 활성화되었습니다. 모멘텀이 답변을 드립니다.', { icon: '💬' });
    }
  };

  if (!isMounted) {
    return (
      <div className="chat-screen" style={{ opacity: 0 }}>
        {/* Placeholder for hydration */}
      </div>
    );
  }

  return (
    <div 
      className="chat-screen"
      onTouchStart={resetFlushTimer}
      onClick={resetFlushTimer}
      onFocusCapture={resetFlushTimer}
    >
      <header className="chat-header">
        <div className="chat-header__top flex items-center">
          <button 
            onClick={() => router.push('/calendar')}
            className="mr-3 p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Go to calendar"
          >
            <ChevronLeftIcon className="w-6 h-6 text-foreground" />
          </button>
          
          <span className="font-semibold">Momentum</span>
          <div className="chat-header__actions ml-auto">
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
          <span>{isRecordingMode ? '기록 모드 활성' : statusLabel}</span>
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
                <div 
                  className="message__avatar cursor-pointer hover:opacity-80 transition-opacity" 
                  aria-hidden
                  onClick={() => setShowProfileModal(true)}
                >
                  {coachAvatarUrl ? (
                    <img src={coachAvatarUrl} alt="Momentum" className="w-full h-full object-cover" />
                  ) : (
                    (message.author || 'M').charAt(0)
                  )}
                </div>
              )}
              <div className="message__body">
                {!isOwn && message.author && <span className="message__author">{message.author}</span>}
                <div className="message__bubble">{message.text}</div>
                <div className="message__info">
                  <span>{formatTime(message.timestamp || 1714400000000)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="message-row">
            <div 
              className="message__avatar cursor-pointer hover:opacity-80 transition-opacity" 
              aria-hidden
              onClick={() => setShowProfileModal(true)}
            >
              {coachAvatarUrl ? (
                <img src={coachAvatarUrl} alt="Momentum" className="w-full h-full object-cover" />
              ) : (
                'M'
              )}
            </div>
            <div className="message__body">
              <span className="message__author">Momentum</span>
              <div className="message__bubble flex items-center h-[40px] px-4 gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

      </section>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <div 
          className={`chat-composer__extra ${isRecordingMode ? 'bg-[#3182f6] text-white' : ''} transition-all`} 
          role="button" 
          tabIndex={0} 
          aria-label="모드 전환"
          onClick={toggleRecordingMode}
        >
          {isRecordingMode ? 'R' : '+'}
        </div>
        <div className="chat-composer__input">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={isRecordingMode ? "기록할 내용을 입력하세요..." : "메시지를 입력하세요..."}
          />
          <button type="submit" disabled={!trimmedDraft}>
            전송
          </button>
        </div>
      </form>

      {/* Profile Image Modal */}
      {showProfileModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/40 animate-in fade-in duration-200"
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className="relative p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <div className="w-[360px] h-[360px] sm:w-[420px] sm:h-[420px] rounded-[40px] overflow-hidden shadow-2xl border-4 border-white/20">
                {coachAvatarUrl ? (
                  <img src={coachAvatarUrl} alt="Momentum Large" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#f2f4f6] flex items-center justify-center text-[80px] text-[#8b95a1] font-bold">
                    M
                  </div>
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Edit Icon Overlay (Moved outside overflow-hidden) */}
              <label className="absolute -bottom-2 -right-2 w-14 h-14 bg-[#3182f6] rounded-full flex items-center justify-center cursor-pointer shadow-xl hover:bg-[#1b64da] transition-all hover:scale-110 active:scale-95 z-10 border-4 border-[#abc1d1]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
              </label>
            </div>
            
            <button 
              className="absolute -top-10 right-0 text-white text-sm font-medium px-3 py-1 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              onClick={() => setShowProfileModal(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
