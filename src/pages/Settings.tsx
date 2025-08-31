import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from '../lib/toast';

import { ArrowLeft } from 'lucide-react';
import PageLayout from '../components/PageLayout';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleDeleteAllNotes = async () => {
    if (confirmText !== "내 모든 노트 삭제") {
      toast.error('확인 문구를 정확히 입력하세요.');
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
      toast.error(`삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  return (
    <PageLayout title="설정">
      <div className="space-y-8">
        

        <div className="space-y-4">
          <button onClick={() => navigate('/developer')} className="w-full text-left p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            개발자 페이지
          </button>
        </div>

        <div className="space-y-4">
          <button onClick={handleLogout} className="w-full text-left p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            로그아웃
          </button>
        </div>

        <div className="mt-12 p-4 border border-red-500/30 rounded-lg bg-red-900/20">
          <h2 className="text-lg font-bold text-red-400">위험 구역</h2>
          <p className="text-sm text-red-200/80 mt-1 mb-4">
            이곳의 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.
          </p>
          <button 
            onClick={() => setShowDeleteConfirm(true)} 
            className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            모든 노트 삭제...
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="모든 노트를 삭제하시겠습니까?"
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteAllNotes}
        >
          <p className="text-sm text-gray-300 mb-4">
            이 작업은 되돌릴 수 없으며, 모든 노트와 관련 데이터가 영구적으로 삭제됩니다. 계속하려면 아래에 "<strong className='text-red-400'>내 모든 노트 삭제</strong>" 라고 정확히 입력하세요.
          </p>
          <input 
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-red-500 focus:border-red-500"
            placeholder='내 모든 노트 삭제'
          />
        </ConfirmModal>
      )}
    </PageLayout>
  );
};

export default Settings;
