import { pipeline, env, AutoTokenizer } from '@xenova/transformers';
import { InferenceSession, Tensor } from 'onnxruntime-web';

// Vite/Webpack 환경에서 WASM 파일 경로를 올바르게 찾도록 명시적으로 설정
env.backends.onnx.wasm.wasmPaths = '/';

class SemanticPipeline {
  private static instance: SemanticPipeline | null = null;
  private session: InferenceSession | null = null;
  private tokenizer: AutoTokenizer | null = null;
  private ready: boolean = false;

  private constructor() {}

  // 싱글턴 인스턴스를 가져오는 표준 방식
  public static getInstance(): SemanticPipeline {
    if (!SemanticPipeline.instance) {
      SemanticPipeline.instance = new SemanticPipeline();
    }
    return SemanticPipeline.instance;
  }

  // 모델과 토크나이저를 비동기적으로 초기화하는 함수
  async init() {
    if (this.ready) return; // 이미 초기화되었다면 중복 실행 방지

    console.log('[SemanticWorker] Initializing pipeline...');
    try {
      this.session = await InferenceSession.create('/models/ko-sroberta-multitask_quantized.onnx');
      this.tokenizer = await AutoTokenizer.from_pretrained('Xenova/bge-m3');
      this.ready = true;
      console.log('[SemanticWorker] Pipeline initialized successfully.');
    } catch (error) {
      console.error('[SemanticWorker] Initialization failed:', error);
      this.ready = false; // 실패 시 상태를 명확히 함
      throw error;
    }
  }

  // 텍스트를 임베딩 벡터로 변환하는 함수
  async embed(text: string) {
    if (!this.ready || !this.session || !this.tokenizer) {
      console.error('[SemanticWorker] Pipeline not ready. Attempting to initialize...');
      await this.init(); // 만약 초기화되지 않았다면 재시도
      if (!this.ready || !this.session || !this.tokenizer) {
        throw new Error("Semantic pipeline could not be initialized or is not ready.");
      }
    }

    const encoded = (this.tokenizer as any)(text, { padding: true, truncation: true });

    // ONNX 모델이 요구하는 int64 타입으로 텐서 생성
    const feeds = {
      input_ids: new Tensor('int64', BigInt64Array.from(encoded.input_ids.data.map(BigInt)), encoded.input_ids.dims),
      attention_mask: new Tensor('int64', BigInt64Array.from(encoded.attention_mask.data.map(BigInt)), encoded.attention_mask.dims),
      token_type_ids: new Tensor('int64', BigInt64Array.from(encoded.token_type_ids.data.map(BigInt)), encoded.token_type_ids.dims),
    };

    const output = await this.session.run(feeds);
    const embedding = (output.last_hidden_state.data as Float32Array);
    
    // 벡터 정규화 (검색 품질 향상)
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalized = magnitude === 0 ? embedding : embedding.map(val => val / magnitude);

    return Array.from(normalized);
  }
}

// 워커 메시지 핸들러
self.onmessage = async (event) => {
  const { type, payload } = event.data;
  
  try {
    const pipeline = SemanticPipeline.getInstance();
    
    if (type === 'embed') {
      await pipeline.init(); // embed 호출 전에 항상 초기화 보장
      const embedding = await pipeline.embed(payload);
      self.postMessage({ type: 'embed_result', payload: [embedding] });
    }
  } catch (error) {
    self.postMessage({ type: 'error', payload: (error as Error).message });
  }
};