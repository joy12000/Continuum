import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, ArrowLeftOnRectangleIcon, CodeBracketIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SettingsCard } from '../components/SettingsCard';
import SkyBackground from '../components/SkyBackground';
import Moon from '../components/Moon';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

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

  return (
    <div className="relative min-h-screen w-full text-white">
      <SkyBackground />
      <Moon onClick={() => navigate('/settings')} />
      <div className="relative z-10 p-4 sm:p-6 max-w-4xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-sky-200 hover:text-white transition-colors"
            aria-label="뒤로 가기"
          >
            <ArrowLeftIcon className="w-6 h-6" />
            <span className="text-lg">뒤로</span>
          </button>
          <h1 className="text-3xl font-bold text-center text-white text-shadow-glow">설정</h1>
          <div className="w-16"></div> {/* Spacer for centering title */}
        </header>

        <div className="space-y-8">
          <SettingsCard title="개발자">
            <button onClick={() => navigate('/developer')} className="w-full flex items-center justify-between p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
              <span>개발자 페이지</span>
              <CodeBracketIcon className="w-6 h-6" />
            </button>
          </SettingsCard>

          <SettingsCard title="계정">
            <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 bg-black/20 rounded-lg hover:bg-black/30 transition-colors">
              <span>로그아웃</span>
              <ArrowLeftOnRectangleIcon className="w-6 h-6" />
            </button>
          </SettingsCard>

          <SettingsCard title="위험 구역" titleClassName="text-red-400">
            <div className="p-4 border border-red-500/50 rounded-lg bg-red-500/10">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-400 mr-4 flex-shrink-0" />
                <div>
                  <h2 className="text-lg font-bold text-red-200">모든 노트 삭제</h2>
                  <p className="text-sm text-red-300/80 mt-1 mb-4">
                    이 작업은 되돌릴 수 없습니다. 신중하게 진행해주세요.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
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
          <p className="text-sm text-gray-300 mb-4">
            이 작업은 되돌릴 수 없으며 모든 노트와 관련 데이터를 영구적으로 삭제합니다. 계속하려면 아래에 "<strong className='text-red-400'>delete all my notes</strong>"를 입력하세요.
          </p>
          <input 
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-red-500 focus:border-red-500 transition-colors text-white"
            placeholder='delete all my notes'
          />
        </ConfirmModal>
      )}
    </div>
  );
};

export default Settings;
