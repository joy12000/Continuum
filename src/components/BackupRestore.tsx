
import { db } from "../lib/db";
import { encryptJSON, decryptJSON } from "../lib/crypto";

export function BackupRestore() {
  async function backup() {
    const password = prompt("백업 암호를 입력하세요 (잊지 마세요!)") || "";
    if (!password) return;
    const notes = await db.notes.toArray();
    const blobs = await encryptJSON({ notes }, password);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blobs);
    a.download = `continuum-backup-${new Date().toISOString().slice(0,19)}.bin`;
    a.click();
  }

  async function restore() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".bin,application/octet-stream";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const password = prompt("백업 암호를 입력하세요") || "";
      if (!password) return;
      const data = await decryptJSON(file, password);
      if (Array.isArray(data.notes)) {
        await db.notes.clear();
        await db.notes.bulkAdd(data.notes);
        alert(`복원 완료: ${data.notes.length}개 노트`);
      } else {
        alert("백업 형식이 올바르지 않습니다.");
      }
    };
    input.click();
  }

  
async function selfcheck(){
  const notes = await db.notes.toArray();
  const blob = new Blob([JSON.stringify({ notes }, null, 2)], { type: "application/json" });
  const text = await blob.text();
  const j = JSON.parse(text);
  const ok = Array.isArray(j.notes) && j.notes.length === notes.length;
  alert(ok ? "자가검증 OK: 노트 개수 일치" : "검증 실패: 노트 수 불일치");
}
return (

    <div className="card flex gap-2">
      <button className="btn" onClick={backup}>암호화 백업</button>
      <button className="btn" onClick={restore}>복원</button>
    </div>
  );
}
