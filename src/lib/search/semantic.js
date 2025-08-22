/**
 * 시맨틱 검색 스텁.
 * onnxruntime-web을 옵션 종속성으로 두지 않고,
 * 사용자가 후에 추가할 수 있도록 인터페이스만 정의합니다.
 */
export class NoopSemantic {
    async ensureReady() { return false; }
    async embed(texts) { return texts.map(() => []); }
}
