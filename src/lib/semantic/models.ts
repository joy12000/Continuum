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
    id: 'gemini-api',
    name: 'Gemini API',
    description: 'Google의 Gemini API를 사용하여 임베딩을 생성합니다. 인터넷 연결이 필요합니다.',
    size: 'API',
    status: 'DOWNLOADED',
  },
];
