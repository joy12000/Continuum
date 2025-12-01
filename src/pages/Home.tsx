import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="chat-screen">
      <header className="chat-header">
        <div className="chat-header__top">
          <span>기록 홈</span>
          <div className="chat-header__actions">
            <button className="chat-header__button" onClick={() => navigate('/chat')}>
              Chat
            </button>
            <button className="chat-header__button chat-header__button--primary" onClick={() => navigate('/calendar')}>
              기록 보기
            </button>
          </div>
        </div>
        <div className="chat-header__meta">
          <span>생각을 자유롭게 적고 정리해 보세요.</span>
        </div>
      </header>

      <section className="px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2">
          <h2 className="text-lg font-semibold">빠르게 메모 남기기</h2>
          <p className="text-sm text-slate-600">
            Chat 모드에서 작성한 메시지는 자동으로 묶여 저장돼요. 버튼을 눌러 바로 이동해 보세요.
          </p>
          <div className="flex justify-end">
            <button className="chat-header__button chat-header__button--primary" onClick={() => navigate('/chat')}>
              Chat으로 이동
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2">
          <h3 className="text-base font-semibold">오늘의 기록</h3>
          <p className="text-sm text-slate-600">
            달력이나 스레드에서 이전에 저장한 기록을 빠르게 찾아볼 수 있어요.
          </p>
          <div className="flex gap-2">
            <button className="chat-header__button" onClick={() => navigate('/threads')}>
              스레드 보기
            </button>
            <button className="chat-header__button" onClick={() => navigate('/search')}>
              검색하기
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
