import { env, AutoTokenizer } from '@xenova/transformers';
import { InferenceSession, Tensor } from 'onnxruntime-web';

// ONNX Runtime WebAssembly 파일의 경로를 명시적으로 설정합니다.
// 이는 Vite와 같은 모던 번들러 환경에서 필수적입니다.
env.backends.onnx.wasm.wasmPaths = '/';

class SemanticSearchPipeline {
  private static instance: SemanticSearchPipeline | null = null;
  private session: InferenceSession | null = null;
  private tokenizer: AutoTokenizer | null = null;
  private modelPath = '/models/ko-sroberta-multitask_quantized.onnx';
  private tokenizerPath = '/models/tokenizer.json'; // 로컬 토크나이저 파일이 있는 디렉토리

  private constructor() {}

  public static async getInstance(): Promise<SemanticSearchPipeline> {
    if (!SemanticSearchPipeline.instance) {
      SemanticSearchPipeline.instance = new SemanticSearchPipeline();
      await SemanticSearchPipeline.instance.init();
    }
    return SemanticSearchPipeline.instance;
  }

  private async init(): Promise<void> {
    try {
      console.log('[SemanticWorker] Initializing...');
      this.session = await InferenceSession.create(this.modelPath, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
      // 로컬 경로에서 토크나이저 로드
      this.tokenizer = await AutoTokenizer.from_pretrained(this.tokenizerPath);
      console.log('[SemanticWorker] Model and tokenizer loaded successfully.');
    } catch (error) {
      console.error('[SemanticWorker] Initialization failed:', error);
      throw error; // 초기화 실패 시 에러를 전파
    }
  }

  public async embed(text: string | string[]): Promise<number[][] | null> {
    if (!this.session || !this.tokenizer) {
      console.error('[SemanticWorker] Pipeline not initialized.');
      return null;
    }

    try {
      const texts = Array.isArray(text) ? text : [text];
      const embeddings: number[][] = [];

      for (const t of texts) {
        // 토크나이저 인스턴스를 직접 함수처럼 사용
        const encoded = (this.tokenizer as any)(t, { padding: true, truncation: true });

        const feeds = {
          input_ids: new Tensor('int64', BigInt64Array.from(encoded.input_ids.data.map(BigInt)), encoded.input_ids.dims),
          attention_mask: new Tensor('int64', BigInt64Array.from(encoded.attention_mask.data.map(BigInt)), encoded.attention_mask.dims),
          token_type_ids: new Tensor('int64', BigInt64Array.from(encoded.token_type_ids.data.map(BigInt)), encoded.token_type_ids.dims),
        };

        const output = await this.session.run(feeds);
        const embedding = output.last_hidden_state.data as Float32Array;
        
        // 결과 벡터를 정규화(Normalize)하여 검색 품질을 높입니다.
        const normalized = this.normalize(embedding);
        embeddings.push(Array.from(normalized));
      }

      return embeddings;

    } catch (error) {
      console.error('[SemanticWorker] Embedding failed:', error);
      throw error; // 임베딩 실패 시 에러 전파
    }
  }

  // 벡터 정규화 함수
  private normalize(v: Float32Array): Float32Array {
    const magnitude = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return v;
    return v.map(val => val / magnitude);
  }
}

// Web Worker의 메시지 이벤트 리스너
self.onmessage = async (event) => {
  try {
    const { type, payload } = event.data;
    const pipelineInstance = await SemanticSearchPipeline.getInstance();

    if (type === 'embed') {
      const embeddings = await pipelineInstance.embed(payload);
      self.postMessage({ type: 'embed_result', payload: embeddings });
    }
  } catch (error) {
    self.postMessage({ type: 'error', payload: (error as Error).message });
  }
};