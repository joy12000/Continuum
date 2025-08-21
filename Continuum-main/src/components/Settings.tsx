
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

  return (
    <>
      {/* ... (Engine selection and Snapshot management UI remains the same) ... */}

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
