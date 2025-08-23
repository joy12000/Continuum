
import { useEffect, useState, useCallback } from "react";
import { db, Snapshot, Note } from "../lib/db";
import ConfirmModal from "./ConfirmModal";
import { toast } from "../lib/toast";
import { DedupSuggestions } from "./DedupSuggestions";

type Engine = "auto" | "remote";

export function Settings({ onChange, onNavigateToDiagnostics }: { onChange?: (e: Engine) => void, onNavigateToDiagnostics: () => void }) {
  const [engine, setEngine] = useState<Engine>(() => (localStorage.getItem("semanticEngine") as Engine) || "auto");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; snapshot: Snapshot | null }>({ isOpen: false, snapshot: null });

  useEffect(() => {
    localStorage.setItem("semanticEngine", engine);
    onChange?.(engine);
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
    setModalState({ isOpen: false, snapshot: null });
  };

  const handleCancelRestore = () => {
    setModalState({ isOpen: false, snapshot: null });
  };

  const handleMerge = async (keep: string, remove: string[]) => {
    try {
      await db.mergeNotes(keep, remove);
      toast.success(`${remove.length}개의 노트가 병합되었습니다.`);
      // Refresh notes after merging
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
      a.download = `continuum_notes_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
      toast.warn('가져올 파일을 선택해주세요.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedNotes: Note[] = JSON.parse(e.target?.result as string);
          if (!Array.isArray(importedNotes) || !importedNotes.every(note => 'content' in note && 'createdAt' in note)) {
            throw new Error('유효하지 않은 JSON 파일 형식입니다. 노트 배열이 필요합니다.');
          }

          // 기존 노트와 충돌 시 업데이트, 없으면 추가
          await db.notes.bulkPut(importedNotes);
          toast.success(`${importedNotes.length}개의 노트가 성공적으로 가져와졌습니다!`);
          fetchNotes(); // 노트 목록 새로고침
        } catch (parseError) {
          console.error('Failed to parse imported file:', parseError);
          toast.error(`파일 파싱 오류: ${(parseError as Error).message}`);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error('Failed to import notes:', err);
      toast.error('노트 가져오기에 실패했습니다.');
    }
  };

  return (
    <>
      <div className="card mt-4">
        <h2 className="text-lg font-semibold mb-3">스냅샷 관리</h2>
        <button onClick={handleCreateSnapshot} disabled={loading} className="btn btn-primary mb-4">
          {loading ? '스냅샷 생성 중...' : '현재 상태 스냅샷 생성'}
        </button>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {snapshots.length === 0 ? (
          <p className="text-slate-500">저장된 스냅샷이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {snapshots.map(snapshot => (
              <li key={snapshot.id} className="flex justify-between items-center p-2 bg-slate-700/50 rounded-md">
                <span>{new Date(snapshot.createdAt).toLocaleString()} ({snapshot.noteCount} 노트)</span>
                <button onClick={() => handleRestoreClick(snapshot)} className="btn btn-sm">복원</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 새로운 데이터 백업 및 복원 섹션 */}
      <div className="card mt-4">
        <h2 className="text-lg font-semibold mb-3">데이터 백업 및 복원</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={handleExportNotes} className="btn btn-outline flex-1">
            모든 노트 내보내기 (JSON)
          </button>
          <input
            type="file"
            accept=".json"
            onChange={handleImportNotes}
            className="hidden"
            id="import-notes-file-input"
          />
          <label htmlFor="import-notes-file-input" className="btn btn-outline flex-1 cursor-pointer text-center">
            노트 가져오기 (JSON)
          </label>
        </div>
      </div>

      <div className="card mt-4">
        <h2 className="text-lg font-semibold mb-3">중복 노트 관리</h2>
        <DedupSuggestions notes={notes} engine={engine} onMerge={handleMerge} />
      </div>

      <div className="card mt-4">
        <button onClick={onNavigateToDiagnostics} className="w-full text-center py-2 text-blue-500 hover:underline">
          개발자 도구
        </button>
      </div>

      <ConfirmModal
        isOpen={modalState.isOpen}
        title="스냅샷 복원 확인"
        message="정말로 이 스냅샷을 복원하시겠습니까? 현재 모든 데이터가 스냅샷 시점의 데이터로 대체됩니다. 이 작업은 되돌릴 수 없습니다."
        onConfirm={handleConfirmRestore}
        onCancel={handleCancelRestore}
      />
    </>
  );
}

{/* Periodic Sync support flag: (window as any).__SUPPORTS_PERIODIC_SYNC__ */}
