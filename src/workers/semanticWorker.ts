/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web';
// ❗ @xenova/transformers' AutoTokenizer는 이제 /models/ko-sroberta 에서만 로드
import { AutoTokenizer, env } from '@xenova/transformers';

// ❗ @xenova/transformers의 외부 모델 다운로드 비활성화
//    - 로컬(/models/ko-sroberta)에 토크나이저가 없으면 바로 실패
//    - HF_ENDPOINT 등 외부 URL 접근 코드 제거
env.allowRemoteModels = false;
env.allowLocalModels = true;

type EmbedVec = number[];

class SemanticPipeline {
  private static _inst: SemanticPipeline | null = null;
  static getInstance() { return (this._inst ??= new SemanticPipeline()); }

  private ready = false;
  private session: ort.InferenceSession | null = null;
  private tokenizer: any | null = null;
  private inputNames: string[] = [];

  async init() {
    if (this.ready) return;

    // 헬퍼: URL 리소스가 JSON인지 확인 (아니면 HTML 등 실패)
    async function assertJSON(url: string, optional = false) {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) { if (optional) return; throw new Error(`MISS ${url} -> ${r.status}`); }
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        const head = (await r.text()).slice(0, 60).replace(/\n/g, ' ');
        if (optional) return;
        throw new Error(`HTML/Non-JSON at ${url} (${ct}) head="${head}"`);
      }
    }
    // 헬퍼: URL 리소스가 Plain Text인지 확인
    async function assertText(url: string, optional = false) {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) { if (optional) return; throw new Error(`MISS ${url} -> ${r.status}`); }
      const ct = r.headers.get('content-type') || '';
      if (!/text\/plain|octet-stream/.test(ct)) {
        const head = (await r.text()).slice(0, 60).replace(/\n/g, ' ');
        if (optional) return;
        throw new Error(`Not text at ${url} (${ct}) head="${head}"`);
      }
    }

    // 🔧 ORT 최신: mjs/wasm 파일명을 객체로 명시 (public/ort에 복사된 파일)
    ort.env.wasm.wasmPaths = {
      mjs:  '/ort/ort-wasm-simd-threaded.mjs',
      wasm: '/ort/ort-wasm-simd-threaded.wasm'
    };
    ort.env.wasm.numThreads = Math.min(4, (self as any).navigator?.hardwareConcurrency || 1);

    // ❗ 모델/토크나이저 경로는 /models/ko-sroberta로 고정
    const MODEL_DIR = '/models/ko-sroberta';
    console.log('[SemanticWorker] Initializing...', { MODEL_DIR });

    // 사전 점검: 토크나이저 파일이 없거나 HTML이면 여기서 즉시 중단
    await assertJSON(`${MODEL_DIR}/tokenizer.json`);
    await assertText(`${MODEL_DIR}/vocab.txt`);
    await assertJSON(`${MODEL_DIR}/tokenizer_config.json`, true);
    await assertJSON(`${MODEL_DIR}/special_tokens_map.json`, true);

    // ONNX 파일명 후보들을 순차 시도 (배포된 파일명에 맞게 자동 선택)
    const candidates = [
      `${MODEL_DIR}/ko-sroberta-multitask_quantized.onnx`,
      `${MODEL_DIR}/model_qint8_avx512_vnni.onnx`,
    ];
    let lastErr: any = null;
    for (const url of candidates) {
      try {
        this.session = await ort.InferenceSession.create(url);
        console.log('[SemanticWorker] ONNX loaded:', url);
        break;
      } catch (e) { lastErr = e; }
    }
    if (!this.session) throw lastErr || new Error('ONNX model not loaded');

    // ❗ ko-sroberta 폴더에서 토크나이저 로드 (절대 URL 금지)
    this.tokenizer = await AutoTokenizer.from_pretrained(MODEL_DIR);

    this.inputNames = (this.session as any).inputNames || [];
    this.ready = true;
    console.log('[SemanticWorker] Pipeline initialized.', { inputNames: this.inputNames });
  }

  private ensureTokenType(idsShape: number[]): ort.Tensor {
    const size = idsShape.reduce((a, b) => a * b, 1);
    const zeros = new BigInt64Array(size);
    return new ort.Tensor('int64', zeros, idsShape);
  }

  private meanPool(hidden: Float32Array, mask: BigInt64Array, seq: number, hiddenDim: number): number[] {
    const out = new Float32Array(hiddenDim); let denom = 0;
    for (let t = 0; t < seq; t++) {
      if (mask[t] === 0n) continue; denom++;
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
    const idsShape  = enc.input_ids.shape as number[];
    const maskShape = enc.attention_mask.shape as number[];

    const ids64  = BigInt64Array.from(Array.from(enc.input_ids.data as any, (x: number) => BigInt(x)));
    const mask64 = BigInt64Array.from(Array.from(enc.attention_mask.data as any, (x: number) => BigInt(x)));

    const inputs: Record<string, ort.Tensor> = {
      input_ids:      new ort.Tensor('int64', ids64,  idsShape),
      attention_mask: new ort.Tensor('int64', mask64, maskShape),
    };
    if (this.inputNames.includes('token_type_ids') && !('token_type_ids' in inputs)) {
      inputs.token_type_ids = this.ensureTokenType(idsShape);
    }

    const outMap = await this.session.run(inputs);
    const firstKey = Object.keys(outMap)[0];
    const out = outMap[firstKey];
    const data = out.data as Float32Array;

    if (out.dims.length === 2) return Array.from(data);        // [1, hidden]
    if (out.dims.length === 3) {                                // [1, seq, hidden]
      const [, seq, hidden] = out.dims; return this.meanPool(data, mask64, seq, hidden);
    }
    return Array.from(data);
  }
}

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
      const vectors = await Promise.all(texts.map(t => pipe.embed(t)));
      (self as any).postMessage({ id, ok: true, result: vectors });
      return;
    }
    (self as any).postMessage({ id, ok: false, error: `Unknown type: ${type}` });
  } catch (error: any) {
    console.error('[SemanticWorker] error:', error);
    (self as any).postMessage({ id, ok: false, error: error?.message || String(error) });
  }
};
