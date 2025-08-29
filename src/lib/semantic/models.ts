// src/lib/semantic/models.ts
export interface EmbeddingModel {
  id: string;
  name: string;
  description: string;
  size: string;
  status: 'DOWNLOADED' | 'NOT_DOWNLOADED';
}

export const embeddingModels: EmbeddingModel[] = [
  {
    id: 'ko-sroberta',
    name: '한국어 SRoBERTa',
    description: '한국어 문장 임베딩에 최적화된 경량 모델입니다. (기본값)',
    size: '95 MB',
    status: 'DOWNLOADED',
  },
  {
    id: 'other-model-placeholder',
    name: '다른 모델 (준비중)',
    description: '향후 추가될 고성능 모델입니다.',
    size: '미정',
    status: 'NOT_DOWNLOADED',
  },
];
