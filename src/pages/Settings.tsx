import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { db, Snapshot, Note } from "../lib/db";
import ConfirmModal from "../components/ConfirmModal";
import { toast } from "../lib/toast";
import { DedupSuggestions } from "../components/DedupSuggestions";
import { ArrowLeft } from 'lucide-react';
import { BackupRestore } from "../components/BackupRestore";
import DevToolsLink from "../components/settings/DevToolsLink";
import EmbeddingMode from "../components/settings/EmbeddingMode";

interface SettingsProps {
  engine: 'auto' | 'remote';
  setEngine: (engine: 'auto' | 'remote') => void;
  modelStatus: string;
}

export default function Settings({ engine, setEngine, modelStatus }: SettingsProps) {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; snapshot: Snapshot | null }>({ isOpen: false, snapshot: null });

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
    toast.info("스냅샷 복원 기능은 아직 구현되지 않았습니다.");
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

  return (
    <div className="p-4 bg-surface text-text-primary font-sans min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">설정</h1>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-surface-2">
          <ArrowLeft size={24} />
        </button>
      </header>

      <div className="space-y-6">
        <EmbeddingMode />
        
        <BackupRestore onNotesImported={fetchNotes} />

        <div className="card bg-surface-2 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">스냅샷 관리</h2>
          <button onClick={handleCreateSnapshot} disabled={loading} className="btn bg-accent text-white mb-4 w-full">
            {loading ? '스냅샷 생성 중...' : '현재 상태 스냅샷 생성'}
          </button>
          {error && <div className="text-red-500 mb-4">{error}</div>}
          {snapshots.length === 0 ? (
            <p className="text-text-secondary">저장된 스냅샷이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {snapshots.map(snapshot => (
                <li key={snapshot.id} className="flex justify-between items-center p-2 bg-surface rounded-md">
                  <span>{new Date(snapshot.createdAt).toLocaleString()} ({snapshot.noteCount} 노트)</span>
                  <button onClick={() => handleRestoreClick(snapshot)} className="btn btn-sm bg-accent text-white">복원</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card bg-surface-2 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">중복 노트 관리</h2>
          <DedupSuggestions notes={notes} engine={engine} onMerge={handleMerge} />
        </div>

        <DevToolsLink />
      </div>

      <ConfirmModal
        isOpen={modalState.isOpen}
        title="스냅샷 복원 확인"
        message="정말로 이 스냅샷을 복원하시겠습니까? 현재 모든 데이터가 스냅샷 시점의 데이터로 대체됩니다. 이 작업은 되돌릴 수 없습니다."
        onConfirm={handleConfirmRestore}
        onCancel={handleCancelRestore}
      />
    </div>
  );
}