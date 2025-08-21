
import { useEffect, useState } from "react";
import { getSemanticAdapter } from "../lib/semantic";

async function fetchWithProgress(url: string, onProgress: (downloaded: number, total: number) => void): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  if (!contentLength) {
    console.warn("Content-Length header not found.");
    return response;
  }

  const total = parseInt(contentLength, 10);
  let loaded = 0;

  const stream = new ReadableStream({
    start(controller) {
      const reader = response.body!.getReader();

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            controller.close();
            return;
          }
          loaded += value.byteLength;
          onProgress(loaded, total);
          controller.enqueue(value);
          read();
        }).catch(error => {
          console.error(error);
          controller.error(error);
        });
      }
      read();
    }
  });

  return new Response(stream, {
    headers: response.headers
  });
}


export function ModelStatus({ engine }: { engine: "auto" | "remote" }) {
  const [text, setText] = useState("확인 중…");

  useEffect(() => {
    let dead = false;

    const updateStatus = (message: string) => {
      if (!dead) setText(message);
    };

    const checkLocalEngine = async () => {
      updateStatus("로컬 엔진 준비 중…");
      
      const modelUrl = '/models/all-MiniLM-L6-v2.onnx';
      try {
        const response = await fetchWithProgress(modelUrl, (downloaded, total) => {
          const downloadedMb = (downloaded / 1024 / 1024).toFixed(2);
          const totalMb = (total / 1024 / 1024).toFixed(2);
          updateStatus(`모델 다운로드 중: ${downloadedMb}MB / ${totalMb}MB`);
        });
        
        // Ensure the body is consumed for the download to complete
        await response.arrayBuffer(); 
        updateStatus("모델 다운로드 완료. 초기화 중...");

        const a = await getSemanticAdapter("auto");
        const ok = await a.ensureReady();
        
        if (dead) return;
        updateStatus(ok ? "로컬 임베딩 준비 완료(onnxruntime)" : "로컬 임베딩 없음(해시 사용)");

      } catch (error) {
        console.error("Failed to prepare local engine:", error);
        updateStatus("로컬 엔진 준비 실패. 원격 API 사용.");
      }
    };

    if (engine === "remote") {
      updateStatus("원격 API 사용");
    } else {
      checkLocalEngine();
    }

    return () => { dead = true; };
  }, [engine]);

  return <span className="text-xs text-slate-400">{text}</span>;
}
