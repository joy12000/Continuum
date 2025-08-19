
/**
 * 시맨틱 검색 스텁.
 * onnxruntime-web을 옵션 종속성으로 두지 않고,
 * 사용자가 후에 추가할 수 있도록 인터페이스만 정의합니다.
 */

export interface SemanticAdapter {
  ensureReady(): Promise<boolean>;
  embed(texts: string[]): Promise<number[][]>; // L2-normalized
}

export class NoopSemantic implements SemanticAdapter {
  async ensureReady() { return false; }
  async embed(texts: string[]) { return texts.map(() => []); }
}
