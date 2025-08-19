
import { useEffect, useState } from "react";
import { getSemanticAdapter } from "../lib/semantic";

export function ModelStatus({ engine }: { engine: "auto" | "remote" }) {
  const [text, setText] = useState("확인 중…");
  useEffect(() => {
    let dead = false;
    (async () => {
      if (engine === "remote") { setText("원격 API 사용"); return; }
      setText("로컬 엔진 준비 중…");
      const a = await getSemanticAdapter("auto");
      const ok = await a.ensureReady();
      if (dead) return;
      setText(ok ? "로컬 임베딩 준비 완료(onnxruntime)" : "로컬 임베딩 없음(해시 사용) — 토크나이저 패키지 미설치");
    })();
    return () => { dead = true; };
  }, [engine]);
  return <span className="text-xs text-slate-400">{text} · 권장: encoder.int8.onnx(가벼움)</span>;
}
