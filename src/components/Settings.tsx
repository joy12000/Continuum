import { useEffect, useState, useCallback } from "react";
import { db, Snapshot } from "../lib/db";
import type { Note } from "../types/common";
import ConfirmModal from "./ConfirmModal";
import toast from 'react-hot-toast';
import { DedupSuggestions } from "./DedupSuggestions";
import { ArrowLeft } from 'lucide-react';
import { ModelStatus } from "./ModelStatus";
import { supabase } from "../lib/supabase";
import { deleteAllUserData, bulkAddNotes, listNotes } from "../lib/supabaseService";
import { SettingsCard } from "./SettingsCard";
import SkyCanvasAnimation from "./SkyCanvasAnimation";

import { usePWAInstall } from "../hooks/usePWAInstall";

type Engine = "auto" | "remote";

export function Settings({ engine, setEngine, onNavigateHome, onNavigateToDiagnostics, modelStatus }: { engine: Engine, setEngine: (e: Engine) => void, onNavigateHome: () => void, onNavigateToDiagnostics: () => void, modelStatus: string }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; snapshot: Snapshot | null }>({ isOpen: false, snapshot: null });
  const { canInstall, triggerInstall } = usePWAInstall();

  useEffect(() => {
    localStorage.setItem("semanticEngine", engine);
  }, [engine]);

  const fetchSnapshots = useCallback(async () => {
    try {
      setLoading(true);
      const snapshotData = await db.snapshots.orderBy("createdAt").reverse().toArray();
      setSnapshots(snapshotData);
    } catch (err) {
      setError("스냅샷을 불러오는 데 실패했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const allNotes = await db.notes.toArray();
      setNotes(allNotes);
    } catch (err) {
      console.error("노트를 불러오는 데 실패했습니다.", err);
    }
  }, []);

  useEffect(() => {
    fetchSnapshots();
    fetchNotes();
  }, [fetchSnapshots, fetchNotes]);

  const handleCreateSnapshot = async () => {
    try {
      const noteCount = await db.notes.count();
      const snapshot = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        noteCount: noteCount,
      };
      await db.snapshots.add(snapshot);
      toast.success("스냅샷이 생성되었습니다!");
      fetchSnapshots(); // Refresh the list
    } catch (err) {
      toast.error("스냅샷 생성에 실패했습니다.");
      console.error(err);
    }
  };

  const handleRestoreClick = (snapshot: Snapshot) => {
    setModalState({ isOpen: true, snapshot });
  };

  const handleConfirmRestore = async () => {
    if (!modalState.snapshot) return;
    // Restore logic here...
    toast("스냅샷 복원 기능은 아직 구현되지 않았습니다.");
    setModalState({ isOpen: false, snapshot: null });
  };

  const handleCancelRestore = () => {
    setModalState({ isOpen: false, snapshot: null });
  };

  const handleMerge = async (keep: string, remove: string[]) => {
    try {
      await db.mergeNotes(keep, remove);
      toast.success(`${remove.length}개의 노트가 병합되었습니다.`);
      fetchNotes();
    } catch (error) {
      toast.error("노트 병합에 실패했습니다.");
      console.error(error);
    }
  };

  const handleExportNotes = async () => {
    try {
      const allNotes = await db.notes.toArray();
      const dataStr = JSON.stringify(allNotes, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `momentum_notes_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('노트가 성공적으로 내보내졌습니다!');
    } catch (err) {
      console.error('Failed to export notes:', err);
      toast.error('노트 내보내기에 실패했습니다.');
    }
  };

  const handleImportNotes = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast('가져올 파일을 선택해주세요.');
      return;
    }

    const confirmed = confirm(`가져오기를 진행하시겠습니까? 현재 모든 데이터가 가져온 파일의 내용으로 대체됩니다. 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) {
      toast("가져오기가 취소되었습니다.");
      return;
    }

    let backupNotes: Note[] = [];
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedNotes: any[] = JSON.parse(e.target?.result as string);
          if (!Array.isArray(importedNotes) || !importedNotes.every(note => ('content' in note || 'body' in note))) {
            throw new Error('유효하지 않은 JSON 파일 형식입니다. 노트 배열이 필요합니다.');
          }

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
          }

          // 1. Backup existing data
          toast("기존 데이터 백업 중...");
          const backupData = await listNotes(user.id);
          if (backupData) {
            backupNotes = backupData.map((n: any) => ({
              id: n.id,
              title: n.title,
              body: n.body,
              createdAt: new Date(n.created_at).getTime(),
              updatedAt: new Date(n.updated_at).getTime(),
              tags: n.tags || [],
              citations: n.citations || [],
            }));
          }

          // 2. Delete existing data
          toast("기존 데이터를 삭제하는 중... (시간이 걸릴 수 있습니다)");
          await deleteAllUserData(user.id);

          // 3. Import new data
          toast(`${importedNotes.length}개의 노트를 가져오는 중... (시간이 매우 오래 걸릴 수 있습니다)`);
          const notesToBulkAdd = importedNotes.map(n => ({ title: n.title, body: n.body || '' }));
          await bulkAddNotes(notesToBulkAdd, user.id);

          await db.notes.clear();
          
          toast.success(`가져오기 완료: ${importedNotes.length}개의 노트. 페이지를 새로고침합니다.`);
          setTimeout(() => window.location.reload(), 1500);

        } catch (importError) {
          console.error('Failed during import process:', importError);
          toast.error(`가져오기 실패: ${(importError as Error).message}`);
          
          // 4. Restore from backup if import failed
          if (backupNotes.length > 0) {
            toast("오류 발생. 백업 데이터 복원 시도 중...");
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if(user){
                await bulkAddNotes(backupNotes.map(n => ({ title: n.title, body: n.body || '' })), user.id);
                toast.success("백업 데이터가 성공적으로 복원되었습니다.");
              }
            } catch (restoreError) {
              console.error('Failed to restore backup:', restoreError);
              toast.error("백업 복원에 실패했습니다. 수동으로 데이터를 확인해주세요.");
            }
          }
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('Failed to import notes:', err);
      toast.error('노트 가져오기에 실패했습니다.');
    }
  };

  const handleClearAllData = async () => {
    const confirmed = confirm("정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 노트, 스냅샷 및 기타 데이터가 영구적으로 삭제됩니다.");
    if (!confirmed) {
      toast("데이터 삭제가 취소되었습니다.");
      return;
    }

    try {
      toast("모든 데이터를 삭제하는 중...");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await deleteAllUserData(user.id);
      }
      await db.delete(); // Deletes the entire database
      toast.success("모든 데이터가 삭제되었습니다. 페이지를 새로고침합니다.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error("데이터 삭제에 실패했습니다.");
      console.error(err);
    }
  };

  return (
    <div className="relative p-3 bg-slate-900 text-slate-100 font-sans min-h-screen isolate">
      <SkyCanvasAnimation />
      <div className="relative z-10">
        <div className="text-center mb-6 pt-4">
          <video
            src="/AIiconmotion.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="w-24 h-24 mx-auto mb-4 rounded-full shadow-[0_0_16px_rgba(255,255,220,0.35)] object-cover"
            aria-label="Momentum Logo"
          ></video>
          <h1 className="text-3xl font-bold text-gray-200">Momentum</h1>
        </div>
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">설정</h1>
          <button onClick={onNavigateHome} className="p-2 rounded-full hover:bg-slate-800">
            <ArrowLeft size={24} />
          </button>
        </header>

        <div className="space-y-4">
          <SettingsCard title="임베딩 모드">
            <select 
              value={engine} 
              onChange={(e) => setEngine(e.target.value as Engine)}
              className="select select-bordered w-full bg-slate-700 text-slate-100"
            >
              <option value="auto">자동 (On-device)</option>
              <option value="remote">원격 API</option>
            </select>
            <p className="text-sm text-slate-400 mt-2">
              '자동'은 기기 내에서 임베딩을 처리하여 빠르고 프라이버시가 보호됩니다. '원격 API'는 더 강력한 모델을 사용하지만 인터넷 연결이 필요합니다.
            </p>
            <div className="mt-2">
              <ModelStatus status={modelStatus} />
            </div>
          </SettingsCard>

          <SettingsCard title="데이터 관리">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onClick={handleExportNotes} className="btn btn-primary flex-1">
                모든 노트 내보내기 (JSON)
              </button>
              <input type="file" accept=".json" onChange={handleImportNotes} className="hidden" id="import-notes-file-input" />
              <label htmlFor="import-notes-file-input" className="btn btn-secondary flex-1 cursor-pointer">
                노트 가져오기 (JSON)
              </label>
            </div>
          </SettingsCard>

          <SettingsCard title="스냅샷 관리">
            <button onClick={handleCreateSnapshot} disabled={loading} className="btn btn-primary mb-4 w-full">
              {loading ? '스냅샷 생성 중...' : '현재 상태 스냅샷 생성'}
            </button>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            {snapshots.length === 0 ? (
              <p className="text-slate-400">저장된 스냅샷이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {snapshots.map(snapshot => (
                  <li key={snapshot.id} className="flex justify-between items-center p-2 bg-slate-700/50 rounded-md">
                    <span>{new Date(snapshot.createdAt).toLocaleString()} ({snapshot.noteCount} 노트)</span>
                    <button onClick={() => handleRestoreClick(snapshot)} className="btn btn-sm btn-secondary">복원</button>
                  </li>
                ))}
              </ul>
            )}
          </SettingsCard>

          <SettingsCard title="중복 노트 관리">
            <DedupSuggestions notes={notes} engine={engine} onMerge={handleMerge} />
          </SettingsCard>

          {canInstall && (
            <SettingsCard title="앱 설치">
              <button onClick={triggerInstall} className="btn btn-primary w-full">
                홈 화면에 앱 추가
              </button>
              <p className="text-sm text-slate-400 mt-2">
                이 웹 앱을 기기에 설치하여 네이티브 앱처럼 사용할 수 있습니다.
              </p>
            </SettingsCard>
          )}

          <SettingsCard title="모양">
            <div className="flex items-center justify-between">
              <span>테마</span>
              <select className="select select-bordered bg-slate-700 text-slate-100">
                <option>시스템</option>
                <option>라이트</option>
                <option>다크</option>
              </select>
            </div>
          </SettingsCard>

          <SettingsCard title="개발자">
            <button onClick={onNavigateToDiagnostics} className="w-full text-left p-2 text-sky-400 hover:underline">
              개발자 도구
            </button>
          </SettingsCard>

          <SettingsCard title="위험 구역">
              <button onClick={handleClearAllData} className="btn btn-error w-full">
                  모든 데이터 지우기
              </button>
              <p className="text-sm text-slate-400 mt-2">
                  이 작업은 되돌릴 수 없습니다. 모든 노트, 스냅샷 및 기타 데이터를 영구적으로 삭제합니다.
              </p>
          </SettingsCard>
        </div>

        {modalState.isOpen && (
          <ConfirmModal
            title="스냅샷 복원 확인"
            onConfirm={handleConfirmRestore}
            onClose={handleCancelRestore}
          >
            정말로 이 스냅샷을 복원하시겠습니까? 현재 모든 데이터가 스냅샷 시점의 데이터로 대체됩니다. 이 작업은 되돌릴 수 없습니다.
          </ConfirmModal>
        )}
      </div>
    </div>
  );
}