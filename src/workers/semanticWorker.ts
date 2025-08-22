/// <reference lib="webworker" />
/**
 * Semantic Worker (TS) - GitHub overwrite build
 * - Local tokenizer only (/models/ko-sroberta)
 * - Robust ONNX/WASM
 * - Batch tokenization -> [1, seq]
 * - token_type_ids auto fill
 * - Mean pooling for [1, seq, hidden]
 * - Guard checks to avoid HTML instead of JSON
 */
import * as ort from 'onnxruntime-web';
import { AutoTokenizer, env } from '@xenova/transformers';

// Transformers.js: local only
;(env as any).allowRemoteModels = false;
;(env as any).localModelPath = '/models';

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

    async function assertJSON(url: string, optional = false) {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) { if (optional) return; throw new Error(`MISS ${url} -> ${r.status}`); }
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        const head = (await r.text()).slice(0, 80).replace(/\n/g, ' ');
        if (optional) return;
        throw new Error(`NON-JSON ${url} (${ct}) head="${head}"`);
      }
    }
    async function assertText(url: string, optional = false) {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) { if (optional) return; throw new Error(`MISS ${url} -> ${r.status}`); }
      const ct = r.headers.get('content-type') || '';
      if (!/text\/plain|octet-stream/.test(ct)) {
        const head = (await r.text()).slice(0, 80).replace(/\n/g, ' ');
        if (optional) return;
        throw new Error(`NON-TEXT ${url} (${ct}) head="${head}"`);
      }
    }

    // ORT WASM in /public/ort
    ort.env.wasm.wasmPaths = {
      mjs:  '/ort/ort-wasm-simd-threaded.mjs',
      wasm: '/ort/ort-wasm-simd-threaded.wasm',
    };
    ort.env.wasm.numThreads = Math.min(4, (self as any).navigator?.hardwareConcurrency || 1);

    const MODEL_DIR = '/models/ko-sroberta';
    console.log('[SemanticWorker] Initializing...', { MODEL_DIR });

    await assertJSON(`${MODEL_DIR}/tokenizer.json`);
    await assertText(`${MODEL_DIR}/vocab.txt`);
    await assertJSON(`${MODEL_DIR}/tokenizer_config.json`, true);
    await assertJSON(`${MODEL_DIR}/special_tokens_map.json`, true);

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

    this.tokenizer = await AutoTokenizer.from_pretrained('ko-sroberta');

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

    // Batch tokenize: [text] => shapes [1, seq]
    const enc: any = await this.tokenizer([text], {
      return_tensors: 'np',
      padding: true,
      truncation: true,
    });

    let idsShape  = enc.input_ids.shape as number[];
    let maskShape = enc.attention_mask.shape as number[];
    if (idsShape.length === 1)  idsShape  = [1, idsShape[0]];
    if (maskShape.length === 1) maskShape = [1, maskShape[0]];

    const ids64  = BigInt64Array.from(Array.from(enc.input_ids.data as any,  (x: number) => BigInt(x)));
    const mask64 = BigInt64Array.from(Array.from(enc.attention_mask.data as any, (x: number) => BigInt(x)));

    const inputs: Record<string, ort.Tensor> = {
      input_ids:      new ort.Tensor('int64', ids64,  idsShape),
      attention_mask: new ort.Tensor('int64', mask64, maskShape),
    };
    if (this.inputNames.includes('token_type_ids') && !('token_type_ids' in inputs)) {
      inputs.token_type_ids = this.ensureTokenType(idsShape);
    }

    const outMap = await this.session.run(inputs);
    const out = outMap[Object.keys(outMap)[0]];
    const data = out.data as Float32Array;

    if (out.dims.length === 2) return Array.from(data);
    if (out.dims.length === 3) {
      const seq = out.dims[1], hidden = out.dims[2];
      const acc = new Float32Array(hidden);
      let denom = 0;
      for (let t = 0; t < seq; t++) {
        if (mask64[t] === 0n) continue;
        denom++;
        const base = t * hidden;
        for (let h = 0; h < hidden; h++) acc[h] += data[base + h];
      }
      const d = Math.max(1, denom);
      for (let h = 0; h < hidden; h++) acc[h] /= d;
      return Array.from(acc);
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
