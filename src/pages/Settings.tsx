import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from '../lib/toast';
import BackupRestore from '../components/BackupRestore';

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
      // IMPORTANT: Assumes an RPC function `delete_all_my_notes` exists on Supabase
      const { error } = await supabase.rpc('delete_all_my_notes');
      if (error) throw error;
      toast.success('모든 노트가 삭제되었습니다.');
      setShowDeleteConfirm(false);
      setConfirmText("");
      // Optionally, navigate away or refresh
      navigate('/');
    } catch (error: any) {
      toast.error(`삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">설정</h1>

      <div className="space-y-4 mb-8">
        <button onClick={handleLogout} className="w-full text-left p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700">
          로그아웃
        </button>
        {/* Other settings can go here */}

        {/*
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <h2 className="font-medium mb-2">백업 및 복원</h2>
            <p className="text-sm text-slate-400 mb-4">
              현재 백업/복원 기능은 클라우드 데이터베이스(Supabase)가 아닌, 브라우저 내부의 로컬 데이터베이스(Dexie)에 대해서만 동작합니다.
              따라서 앱의 핵심 데이터와 호환되지 않아 비활성화되어 있습니다.
              이 기능을 클라우드 데이터와 연동되도록 개선하는 작업이 필요합니다.
            </p>
            <BackupRestore />
          </div>
        */}
      </div>

      {/* Danger Zone */}
      <div className="mt-12 p-4 border border-red-500/50 rounded-lg">
        <h2 className="text-lg font-bold text-red-400">위험 구역</h2>
        <p className="text-sm text-slate-400 mt-1 mb-4">
          이곳의 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.
        </p>
        <button 
          onClick={() => setShowDeleteConfirm(true)} 
          className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg"
        >
          모든 노트 삭제...
        </button>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="모든 노트를 삭제하시겠습니까?"
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteAllNotes}
        >
          <p className="text-sm text-slate-300 mb-4">
            이 작업은 되돌릴 수 없으며, 모든 노트와 관련 데이터가 영구적으로 삭제됩니다. 계속하려면 아래에 "<strong className='text-red-400'>내 모든 노트 삭제</strong>" 라고 정확히 입력하세요.
          </p>
          <input 
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full p-2 bg-slate-800 border border-slate-600 rounded-md"
            placeholder='내 모든 노트 삭제'
          />
        </ConfirmModal>
      )}
    </div>
  );
};

export default Settings;
