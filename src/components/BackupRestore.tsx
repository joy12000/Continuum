
import { db, Note } from "../lib/db";
import { encryptJSON, decryptJSON } from "../lib/crypto";
import { toast } from "../lib/toast";

/**
 * Calculates the SHA-256 hash of the content of all notes.
 * @param {Note[]} notes - An array of note objects.
 * @returns {Promise<string>} The SHA-256 hash as a hex string.
 */
async function calculateNotesHash(notes: Note[]): Promise<string> {
  const allContent = notes.map(note => note.content).join('');
  const encoder = new TextEncoder();
  const data = encoder.encode(allContent);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function BackupRestore({ onNotesImported }: { onNotesImported?: () => void }) {
  /**
   * Creates an encrypted backup of all notes with a data integrity hash.
   */
  async function backup() {
    const password = prompt("백업 암호를 입력하세요 (잊지 마세요!)");
    if (!password) {
      toast.info("백업이 취소되었습니다.");
      return;
    }

    try {
      const notes = await db.notes.toArray();
      const attachments = await db.attachments.toArray();
      const hash = await calculateNotesHash(notes);
      
      const backupData = {
        notes,
        attachments,
        metadata: {
          hash,
          timestamp: Date.now(),
          version: 1,
        }
      };

      const blobs = await encryptJSON(backupData, password);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blobs);
      a.download = `continuum-backup-${new Date().toISOString().slice(0, 19)}.bin`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("암호화된 백업 파일이 생성되었습니다.");
    } catch (error) {
      console.error("Backup failed:", error);
      toast.error("백업 중 오류가 발생했습니다.");
    }
  }

  /**
   * Restores notes from an encrypted backup file, verifying data integrity.
   */
  async function restore() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".bin,application/octet-stream";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const password = prompt("백업 암호를 입력하세요");
      if (!password) {
        toast.info("복원이 취소되었습니다.");
        return;
      }

      try {
        const data = await decryptJSON(file, password);

        if (Array.isArray(data.notes)) {
          const restoredNotes = data.notes as Note[];
          const storedHash = data.metadata?.hash;

          if (storedHash) {
            const calculatedHash = await calculateNotesHash(restoredNotes);
            if (calculatedHash !== storedHash) {
              toast.error("데이터 무결성 검증 실패! 파일이 손상되었거나 암호가 다를 수 있습니다.");
              return;
            }
            toast.success("데이터 무결성 검증 완료.");
          } else {
            toast.warn("이전 버전의 백업 파일입니다. 데이터 무결성 검증을 건너뜁니다.");
          }
          
          const confirmed = confirm(`복원을 진행하시겠습니까? 현재 모든 데이터가 백업 파일의 내용으로 대체됩니다. (${restoredNotes.length}개의 노트)`);
          if (!confirmed) {
            toast.info("복원이 취-소되었습니다.");
            return;
          }

          await db.notes.clear();
          await db.attachments.clear();
          await db.notes.bulkAdd(restoredNotes);
          if (data.attachments) {
            await db.attachments.bulkAdd(data.attachments);
          }
          
          toast.success(`복원 완료: ${restoredNotes.length}개의 노트. 페이지를 새로고침합니다.`);
          setTimeout(() => window.location.reload(), 1500);

        } else {
          toast.error("백업 형식이 올바르지 않습니다.");
        }
      } catch (error) {
        console.error("Restore failed:", error);
        toast.error("복원 실패: 파일 형식이 다르거나 암호가 올바르지 않습니다.");
      }
    };
    input.click();
  }

  return (
    <div className="card flex gap-2">
      <button className="btn" onClick={backup}>암호화 백업</button>
      <button className="btn" onClick={restore}>복원</button>
    </div>
  );
}
