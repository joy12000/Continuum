// src/components/settings/EmbeddingMode.tsx
import { useState, useEffect } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { embeddingModels } from '@/lib/semantic/models';
import { getActiveModelId, setActiveModelId } from '@/lib/semantic/model';

export default function EmbeddingMode() {
  const [activeModel, setActiveModel] = useState('');

  useEffect(() => {
    // Load the active model from storage on component mount
    setActiveModel(getActiveModelId());
  }, []);

  const handleSelectModel = (modelId: string) => {
    setActiveModelId(modelId);
    setActiveModel(modelId);
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-neutral-700 bg-neutral-800/50">
      <div className="text-lg font-semibold text-white">임베딩 모델 선택</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {embeddingModels.map((model) => {
          const isActive = activeModel === model.id;
          const isDownloaded = model.status !== 'NOT_DOWNLOADED';

          return (
            <div
              key={model.id}
              onClick={() => isDownloaded && handleSelectModel(model.id)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200
                ${isActive ? 'border-sky-500 bg-sky-900/30' : 'border-neutral-600 hover:border-neutral-500'}
                ${isDownloaded ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}
              `}
            >
              <div className="flex justify-between items-start">
                <div className="font-bold text-white">{model.name}</div>
                {isActive && (
                  <CheckCircleIcon className="h-6 w-6 text-sky-400" />
                )}
              </div>
              <p className="text-sm text-neutral-400 mt-2 mb-3">{model.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono px-2 py-1 rounded bg-neutral-700 text-neutral-300">
                  {model.size}
                </span>
                {!isDownloaded && (
                    <button 
                        className="text-xs px-3 py-1 rounded-md bg-sky-600 text-white hover:bg-sky-500"
                        onClick={(e) => {
                            e.stopPropagation();
                            alert('다운로드 기능은 아직 구현되지 않았습니다.');
                        }}
                    >
                        다운로드
                    </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
