import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-hot-toast';
import { ArrowDownOnSquareIcon, ArrowLeftOnRectangleIcon, CodeBracketIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SettingsCard } from '../components/SettingsCard';
import PageLayout from '../components/PageLayout';
import { usePWAInstall } from '../hooks/usePWAInstall';

const Settings: React.FC = () => {
  const { canInstall, triggerInstall } = usePWAInstall();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      video.playbackRate = -1;
      video.play();
    };

    const handleTimeUpdate = () => {
      if (video.playbackRate < 0 && video.currentTime < 0.1) {
        video.playbackRate = 1;
        video.play();
      }
    };
    
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setName(user.user_metadata.full_name || "");
        setGender(user.user_metadata.gender || "");
        setAge(user.user_metadata.age || "");
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleDeleteAllNotes = async () => {
    if (confirmText !== "delete all my notes") {
      toast.error('정확하게 입력해주세요.');
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_all_my_notes');
      if (error) throw error;
      toast.success('모든 노트가 삭제되었습니다.');
      setShowDeleteConfirm(false);
      setConfirmText("");
      navigate('/');
    } catch (error: any) {
      toast.error(`노트 삭제 실패: ${error.message}`);
    }
  };

  const handleProfileUpdate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: name,
          gender,
          age,
        }
      });
      if (error) {
        toast.error("프로필 업데이트에 실패했습니다.");
      } else {
        toast.success("프로필이 업데이트되었습니다.");
      }
    }
  };

  return (
    <PageLayout title="설정">
      <div className="relative z-10">
        <div className="text-center mb-6 pt-4">
          <video
            ref={videoRef}
            src="/AIiconmotion.mp4"
            autoPlay
            muted
            playsInline
            className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-md object-cover"
            aria-label="Momentum Logo"
          ></video>
          <h1 className="text-3xl font-bold text-slate-900">Momentum</h1>
        </div>
        <div className="space-y-6">
          <SettingsCard title="프로필">
            <div className="space-y-4 p-4 bg-white border border-slate-100 rounded-2xl max-w-xl mx-auto shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">내 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="profile-name" className="text-sm text-slate-500">이름</label>
                  <input id="profile-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-colors text-slate-900" />
                </div>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="profile-gender" className="text-sm text-slate-500">성별</label>
                  <select id="profile-gender" value={gender} onChange={(e) => setGender(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-colors text-slate-900">
                    <option value="">선택 안 함</option>
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                  </select>
                </div>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="profile-age" className="text-sm text-slate-500">나이</label>
                  <select id="profile-age" value={age} onChange={(e) => setAge(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-sky-400 focus:border-sky-400 transition-colors text-slate-900">
                    <option value="">선택 안 함</option>
                    <option value="10s">10대</option>
                    <option value="20s">20대</option>
                    <option value="30s">30대</option>
                    <option value="40s">40대</option>
                    <option value="50s">50대</option>
                    <option value="60s_plus">60대 이상</option>
                  </select>
                </div>
              </div>
              <button onClick={handleProfileUpdate} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                프로필 저장
              </button>
            </div>
          </SettingsCard>

          <SettingsCard title="개발자">
            <button onClick={() => navigate('/developer')} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
              <span className="font-medium text-slate-900">개발자 페이지</span>
              <CodeBracketIcon className="w-6 h-6" />
            </button>
          </SettingsCard>

          <SettingsCard title="앱 설치">
            <button
              onClick={canInstall ? triggerInstall : undefined}
              disabled={!canInstall}
              className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200"
            >
              <span className="font-medium text-slate-900">{canInstall ? "앱 설치" : "앱이 이미 설치되었거나 설치할 수 없습니다"}</span>
              <ArrowDownOnSquareIcon className="w-6 h-6" />
            </button>
          </SettingsCard>

          <SettingsCard title="계정">
            <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200">
              <span className="font-medium text-slate-900">로그아웃</span>
              <ArrowLeftOnRectangleIcon className="w-6 h-6" />
            </button>
          </SettingsCard>

          <SettingsCard title="위험 구역" titleClassName="text-red-500">
            <div className="p-4 border border-red-200 rounded-xl bg-red-50">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500 mr-4 flex-shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-red-700">모든 노트 삭제</h2>
                  <p className="text-sm text-red-600 mt-1 mb-4">
                    이 작업은 되돌릴 수 없습니다. 신중하게 진행해주세요.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                <TrashIcon className="w-5 h-5" />
                <span>모든 노트 삭제...</span>
              </button>
            </div>
          </SettingsCard>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="정말로 모든 노트를 삭제하시겠습니까?"
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteAllNotes}
        >
          <p className="text-sm text-slate-700 mb-4">
            이 작업은 되돌릴 수 없으며 모든 노트와 관련 데이터를 영구적으로 삭제합니다. 계속하려면 아래에 "<strong className='text-red-400'>delete all my notes</strong>"를 입력하세요.
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full p-3 bg-white border border-red-200 rounded-md focus:ring-red-400 focus:border-red-400 transition-colors text-slate-900"
            placeholder='delete all my notes'
          />
        </ConfirmModal>
      )}
    </PageLayout>
  );
};

export default Settings;