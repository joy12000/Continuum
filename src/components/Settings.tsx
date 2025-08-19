
import { useEffect, useState } from "react";

type Engine = "auto" | "remote";

export function Settings({ onChange }: { onChange?: (e: Engine) => void }) {
  const [engine, setEngine] = useState<Engine>(() => (localStorage.getItem("semanticEngine") as Engine) || "auto");

  useEffect(() => {
    localStorage.setItem("semanticEngine", engine);
    onChange?.(engine);
  }, [engine]);

  return (
    <div className="card flex flex-wrap items-center gap-3">
      <div className="text-sm opacity-80">설정</div>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" name="engine" checked={engine==="auto"} onChange={() => setEngine("auto")} />
        로컬 시맨틱(자동: ONNX→해시)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="radio" name="engine" checked={engine==="remote"} onChange={() => setEngine("remote")} />
        원격 시맨틱(API)
      </label>
    </div>
  );
}
