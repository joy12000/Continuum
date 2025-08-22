/// <reference lib="webworker" />
/**
 * Semantic Worker (JS) - GitHub overwrite build
 * Mirrors TS version to avoid .js/.ts drift.
 */
import * as ort from 'onnxruntime-web';
import { AutoTokenizer, env } from '@xenova/transformers';

env.allowRemoteModels = false;
env.localModelPath = '/models';

class SemanticPipeline {
  static _inst = null;
  static getInstance() { return (this._inst ??= new SemanticPipeline()); }

  ready = false;
  session = null;
  tokenizer = null;
  inputNames = [];

  async init() {
    if (this.ready) return;

    async function assertJSON(url, optional = false) {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) { if (optional) return; throw new Error(`MISS ${url} -> ${r.status}`); }
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) {
        const head = (await r.text()).slice(0, 80).replace(/\n/g, ' ');
        if (optional) return;
        throw new Error(`NON-JSON ${url} (${ct}) head="${head}"`);
      }
    }
    async function assertText(url, optional = false) {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) { if (optional) return; throw new Error(`MISS ${url} -> ${r.status}`); }
      const ct = r.headers.get('content-type') || '';
      if (!/text\/plain|octet-stream/.test(ct)) {
        const head = (await r.text()).slice(0, 80).replace(/\n/g, ' ');
        if (optional) return;
        throw new Error(`NON-TEXT ${url} (${ct}) head="${head}"`);
      }
    }

    ort.env.wasm.wasmPaths = {
      mjs:  '/ort/ort-wasm-simd-threaded.mjs',
      wasm: '/ort/ort-wasm-simd-threaded.wasm',
    };
    ort.env.wasm.numThreads = Math.min(4, (self?.navigator?.hardwareConcurrency || 1));

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
    let lastErr = null;
    for (const url of candidates) {
      try {
        this.session = await ort.InferenceSession.create(url);
        console.log('[SemanticWorker] ONNX loaded:', url);
        break;
      } catch (e) { lastErr = e; }
    }
    if (!this.session) throw lastErr || new Error('ONNX model not loaded');

    this.tokenizer = await AutoTokenizer.from_pretrained('ko-sroberta');

    this.inputNames = this.session.inputNames || [];
    this.ready = true;
    console.log('[SemanticWorker] Pipeline initialized.', { inputNames: this.inputNames });
  }

  ensureTokenType(idsShape) {
    const size = idsShape.reduce((a, b) => a * b, 1);
    return new ort.Tensor('int64', new BigInt64Array(size), idsShape);
  }

  meanPool(hidden, mask, seq, hiddenDim) {
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

  async embed(text) {
    if (!this.ready) await this.init();
    if (!this.session || !this.tokenizer) throw new Error('Pipeline not ready');

    // ✅ batch tokenization to force [1, seq]
    const enc = await this.tokenizer([text], {
      return_tensors: 'np',
      padding: true,
      truncation: true,
    });

    let idsShape  = enc.input_ids.shape;
    let maskShape = enc.attention_mask.shape;
    if (idsShape.length === 1)  idsShape  = [1, idsShape[0]];
    if (maskShape.length === 1) maskShape = [1, maskShape[0]];

    const ids64  = BigInt64Array.from(Array.from(enc.input_ids.data,  (x) => BigInt(x)));
    const mask64 = BigInt64Array.from(Array.from(enc.attention_mask.data, (x) => BigInt(x)));

    const inputs = {
      input_ids:      new ort.Tensor('int64', ids64,  idsShape),
      attention_mask: new ort.Tensor('int64', mask64, maskShape),
    };
    if (this.inputNames?.includes('token_type_ids') && !('token_type_ids' in inputs)) {
      const size = idsShape[0] * idsShape[1];
      inputs.token_type_ids = new ort.Tensor('int64', new BigInt64Array(size), idsShape);
    }

    const outMap = await this.session.run(inputs);
    const firstKey = Object.keys(outMap)[0];
    const out = outMap[firstKey];
    const data = out.data; // Float32Array

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

self.onmessage = async (event) => {
  const { id, type, payload } = (event.data || {});
  try {
    const pipe = SemanticPipeline.getInstance();
    if (type === 'ensure') {
      await pipe.init();
      self.postMessage({ id, ok: true, result: true });
      return;
    }
    if (type === 'embed') {
      await pipe.init();
      const texts = Array.isArray(payload?.texts) ? payload.texts : [String(payload?.text ?? payload ?? '')];
      const vectors = await Promise.all(texts.map(t => pipe.embed(t)));
      self.postMessage({ id, ok: true, result: vectors });
      return;
    }
    self.postMessage({ id, ok: false, error: `Unknown type: ${type}` });
  } catch (error) {
    console.error('[SemanticWorker] error:', error);
    self.postMessage({ id, ok: false, error: error?.message || String(error) });
  }
};
