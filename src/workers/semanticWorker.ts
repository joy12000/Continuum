/// <reference lib="webworker" />

// 핵심: wasm 경로 자동설정 + ko-sroberta 폴더 + onnx 후보명 시도 + token_type_ids 보정 + mean-pooling
import * as ort from 'onnxruntime-web';
// 빌드 후 실제 자산 URL을 얻기 위해 ?url 사용 (Vite에서 지원)
import wasmSimdUrl from 'onnxruntime-web/dist/ort-wasm-simd.wasm?url';
import wasmThreadedUrl from 'onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';
import wasmThreadedWorkerUrl from 'onnxruntime-web/dist/ort-wasm-simd-threaded.worker.js?url';

import { AutoTokenizer } from '@xenova/transformers';

type EmbedVec = number[];

class SemanticPipeline {
  private static _instance: SemanticPipeline | null = null;
  static getInstance() {
    return this._instance ?? (this._instance = new SemanticPipeline());
  }

  private ready = false;
  private session: ort.InferenceSession | null = null;
  private tokenizer: any | null = null;
  private inputNames: string[] = [];

  async init() {
    if (this.ready) return;

    // 1) ORT WASM 경로를 빌드 산출물에서 유도
    const baseFrom = (u: string) => u.replace(/\/ort-wasm[^/]*$/, '/');
    const wasmBase = baseFrom(wasmSimdUrl);
    ort.env.wasm.wasmPaths = wasmBase;
    ort.env.wasm.numThreads = Math.min(4, (self as any).navigator?.hardwareConcurrency || 1);

    const ORIGIN = (self as any)?.location?.origin || '';
    const MODEL_DIR = `${ORIGIN}/models/ko-sroberta`;

    console.log('[SemanticWorker] Initializing pipeline...', { wasmBase, MODEL_DIR });
    // 2) ONNX 파일명 후보들 순차 시도
    const candidates = [
      `${MODEL_DIR}/ko-sroberta-multitask_quantized.onnx`,
      `${MODEL_DIR}/model_qint8_avx512_vnni.onnx`,
      `${MODEL_DIR}/model.onnx`,
    ];
    let lastErr: any = null;
    for (const url of candidates) {
      try {
        this.session = await ort.InferenceSession.create(url);
        console.log('[SemanticWorker] ONNX loaded:', url);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!this.session) throw lastErr || new Error('ONNX model not loaded');

    // 3) ko-sroberta 폴더에서 토크나이저 로드 (tokenizer.json + vocab.txt + sidecars)
    this.tokenizer = await AutoTokenizer.from_pretrained(`${MODEL_DIR}/`);

    this.inputNames = (this.session as any).inputNames || [];
    this.ready = true;
    console.log('[SemanticWorker] Pipeline initialized successfully.', { inputNames: this.inputNames });
  }

  private ensureTokenType(idsShape: number[]): ort.Tensor {
    // 일부 ONNX는 token_type_ids를 요구함 → 없으면 0으로 채워 제공
    const size = idsShape.reduce((a, b) => a * b, 1);
    const zeros = new BigInt64Array(size);
    return new ort.Tensor('int64', zeros, idsShape);
  }

  private meanPool(hidden: Float32Array, mask: BigInt64Array, seq: number, hiddenDim: number): number[] {
    const out = new Float32Array(hiddenDim);
    let denom = 0;
    for (let t = 0; t < seq; t++) {
      if (mask[t] === 0n) continue;
      denom++;
      const base = t * hiddenDim;
      for (let h = 0; h < hiddenDim; h++) out[h] += hidden[base + h];
    }
    const d = Math.max(1, denom);
    for (let h = 0; h < hiddenDim; h++) out[h] /= d;
    return Array.from(out);
  }

  async embed(text: string): Promise<EmbedVec> {
    if (!this.ready) await this.init();
    if (!this.session || !this.tokenizer) throw new Error('Pipeline not ready');

    const enc = await this.tokenizer(text, { return_tensors: 'np', padding: true, truncation: true });
    const idsShape = enc.input_ids.shape as number[];
    const maskShape = enc.attention_mask.shape as number[];

    // onnxruntime-web은 int64 입력을 선호 (BERT/Roberta 계열)
    const ids64 = BigInt64Array.from(Array.from(enc.input_ids.data as any, (x: number) => BigInt(x)));
    const mask64 = BigInt64Array.from(Array.from(enc.attention_mask.data as any, (x: number) => BigInt(x)));

    const inputs: Record<string, ort.Tensor> = {
      input_ids: new ort.Tensor('int64', ids64, idsShape),
      attention_mask: new ort.Tensor('int64', mask64, maskShape),
    };
    if (this.inputNames.includes('token_type_ids') && !('token_type_ids' in inputs)) {
      inputs.token_type_ids = this.ensureTokenType(idsShape);
    }

    const outMap = await this.session.run(inputs);
    const firstKey = Object.keys(outMap)[0];
    const out = outMap[firstKey];
    const data = out.data as Float32Array;

    if (out.dims.length === 2) {
      // [1, hidden]
      return Array.from(data);
    } else if (out.dims.length === 3) {
      // [1, seq, hidden] → mean-pooling
      const [, seq, hidden] = out.dims;
      return this.meanPool(data, mask64, seq, hidden);
    } else {
      return Array.from(data); // 예외적인 경우
    }
  }
}

// 메시지 핸들러: embed 외에 ensure도 지원(초기화 체크 용)
self.onmessage = async (event: MessageEvent) => {
  const { id, type, payload } = (event.data || {}) as any;
  try {
    const pipe = SemanticPipeline.getInstance();
    if (type === 'ensure') {
      await pipe.init();
      (self as any).postMessage({ id, ok: true, result: true });
      return;
    }
    if (type === 'embed') {
      await pipe.init();
      const texts: string[] = Array.isArray(payload?.texts) ? payload.texts : [String(payload?.text ?? payload ?? '')];
      const results = await Promise.all(texts.map(t => pipe.embed(t)));
      (self as any).postMessage({ id, ok: true, result: results });
      return;
    }
    (self as any).postMessage({ id, ok: false, error: `Unknown type: ${type}` });
  } catch (error: any) {
    console.error('[SemanticWorker] error:', error);
    (self as any).postMessage({ id, ok: false, error: error?.message || String(error) });
  }
};
