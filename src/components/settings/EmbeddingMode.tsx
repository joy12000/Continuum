// src/components/settings/EmbeddingMode.tsx
import { useState, useEffect } from 'react';
import type { HybridMode } from '@/lib/semantic/mode';
import { getEmbeddingMode, setEmbeddingMode } from '@/lib/semantic/mode';

export default function EmbeddingMode() {
  const [mode, setMode] = useState<HybridMode>('local-first');
  useEffect(() => { setMode(getEmbeddingMode()); }, []);
  const onChange = (m: HybridMode) => { setMode(m); setEmbeddingMode(m); };

  return (
    <div className="space-y-2 p-3 rounded-lg border border-slate-200">
      <div className="font-medium">임베딩 모드</div>
      <label className="flex items-center gap-2">
        <input type="radio" name="emb" checked={mode==='local-only'} onChange={()=>onChange('local-only')} />
        <span>Local only <span className="text-xs text-gray-500">오프라인, 토큰 0</span></span>
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" name="emb" checked={mode==='local-first'} onChange={()=>onChange('local-first')} />
        <span>Local first <span className="text-xs text-green-600">추천: 로컬 우선, 실패 시 서버</span></span>
      </label>
      <label className="flex items-center gap-2">
        <input type="radio" name="emb" checked={mode==='remote-only'} onChange={()=>onChange('remote-only')} />
        <span>Remote only <span className="text-xs text-rose-600">토큰 사용</span></span>
      </label>
    </div>
  );
}
