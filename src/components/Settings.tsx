
import { useEffect, useState } from "react";
import { db, Snapshot } from "../lib/db";
import ConfirmModal from "./ConfirmModal";
import { toast } from "../lib/toast";

type Engine = "auto" | "remote";

export function Settings({ onChange, onNavigateToDiagnostics }: { onChange?: (e: Engine) => void, onNavigateToDiagnostics: () => void }) {
  const [engine, setEngine] = useState<Engine>(() => (localStorage.getItem("semanticEngine") as Engine) || "auto");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ isOpen: boolean; snapshot: Snapshot | null }>({ isOpen: false, snapshot: null });

  useEffect(() => {
    localStorage.setItem("semanticEngine", engine);
    onChange?.(engine);
  }, [engine]);

  /**
   * Fetches all snapshots from the database and updates the state.
   */
  const fetchSnapshots = async () => {
    try {
      const allSnapshots = await db.snapshots.orderBy('timestamp').reverse().toArray();
      setSnapshots(allSnapshots);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error(`Failed to fetch snapshots: ${errorMessage}`);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  /**
   * Creates a new snapshot of the current notes and attachments.
   */
  const handleCreateSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const allNotes = await db.notes.toArray();
      const allAttachments = await db.attachments.toArray();
      const newSnapshot: Snapshot = {
        timestamp: Date.now(),
        notes: allNotes,
        attachments: allAttachments,
      };
      await db.snapshots.add(newSnapshot);
      toast.success("Snapshot created successfully!");
      fetchSnapshots(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error(`Failed to create snapshot: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initiates the restore process by opening a confirmation modal.
   * @param {Snapshot} snapshot - The snapshot to restore.
   */
  const handleRestoreClick = (snapshot: Snapshot) => {
    setModalState({ isOpen: true, snapshot });
  };

  /**
   * Confirms and executes the snapshot restoration.
   */
  const handleConfirmRestore = async () => {
    if (!modalState.snapshot) return;

    setLoading(true);
    setError(null);
    try {
      await db.transaction('rw', db.notes, db.attachments, async () => {
        // Clear existing data
        await db.notes.clear();
        await db.attachments.clear();

        // Add data from snapshot
        await db.notes.bulkAdd(modalState.snapshot!.notes);
        await db.attachments.bulkAdd(modalState.snapshot!.attachments);
      });
      toast.success("Snapshot restored successfully! Please refresh the page.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
      toast.error(`Failed to restore snapshot: ${errorMessage}`);
    } finally {
      setLoading(false);
      setModalState({ isOpen: false, snapshot: null });
    }
  };

  /**
   * Cancels the restore process and closes the modal.
   */
  const handleCancelRestore = () => {
    setModalState({ isOpen: false, snapshot: null });
  };

  return (
    <>
      <div className="card flex flex-wrap items-center gap-3">
        <div className="text-sm opacity-80">설정</div>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="engine" checked={engine === "auto"} onChange={() => setEngine("auto")} />
          로컬 시맨틱(자동: ONNX→해시)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="engine" checked={engine === "remote"} onChange={() => setEngine("remote")} />
          원격 시맨틱(API)
        </label>
      </div>

      <div className="card mt-4">
        <h2 className="text-lg font-semibold mb-3">스냅샷 관리</h2>
        <div className="flex flex-col gap-4">
          <button
            onClick={handleCreateSnapshot}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {loading ? '생성 중...' : '현재 상태 스냅샷 생성'}
          </button>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="mt-4">
            <h3 className="text-md font-semibold mb-2">생성된 스냅샷 목록</h3>
            {snapshots.length > 0 ? (
              <ul className="space-y-2">
                {snapshots.map((snapshot) => (
                  <li key={snapshot.id} className="flex items-center justify-between p-2 bg-gray-100 rounded-md">
                    <span className="text-sm">{new Date(snapshot.timestamp).toLocaleString()}</span>
                    <button
                      onClick={() => handleRestoreClick(snapshot)}
                      disabled={loading}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    >
                      복원
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">생성된 스냅샷이 없습니다.</p>
            )}
          </div>
        </div>
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
