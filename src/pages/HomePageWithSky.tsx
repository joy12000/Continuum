import React, { useRef, useState } from 'react';
import HomeSky, { type HomeSkyHandle } from '@/components/HomeSky';
import SkyTypeOverlay from '@/components/SkyTypeOverlay';
import { useNavigate } from 'react-router-dom';

export default function HomePageWithSky() {
  const skyRef = useRef<HomeSkyHandle | null>(null);
  const [answerSignal, setAnswerSignal] = useState(0);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <HomeSky ref={skyRef as any} answerSignal={answerSignal} />
      <SkyTypeOverlay onTextRectChange={(rects) => skyRef.current?.setExclusions(rects)} />
      {/* 달 아이콘 → 설정 */}
      <button
        className="fixed right-6 top-6 z-[30] text-white/90 text-2xl"
        onClick={() => navigate('/settings')}
        aria-label="설정 열기"
        title="설정"
      >
        🌙
      </button>
      {/* 하단 탭바가 있다면 z-index 60 이상으로 유지 */}
    </div>
  );
}
