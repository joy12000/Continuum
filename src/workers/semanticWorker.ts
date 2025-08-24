/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web';

// ---- Init lock & single-fetch cache ----
let __initInFlight: Promise<void> | null = null;
let __initDone = false;
import { AutoTokenizer, env } from '@xenova/transformers';

;(env as any).allowRemoteModels = false;
;(env as any).localModelPath = '/models';

type EmbedVec = number[];

async function __fetchModelOnce(url: string): Promise<ArrayBuffer> {
  // Use HTTP cache aggressively; SW may also cache by URL.
  // Avoid multiple parallel downloads by memoizing the result in a self-scoped variable.
  if ((self as any).__modelBuf) return (self as any).__modelBuf as ArrayBuffer;
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error('model fetch failed: ' + res.status);
  const buf = await res.arrayBuffer();
  (self as any).__modelBuf = buf;
  return buf;
}

class SemanticPipeline {
  private static _inst: SemanticPipeline | null = null;
  static getInstance() { return (this._inst ??= new SemanticPipeline()); }

  private ready = false;
  private session: ort.InferenceSession | null = null;
  private tokenizer: any | null = null;
  private inputNames: string[] = [];

  async init() {
    if (__initDone) return;
    if (__initInFlight) { await __initInFlight; return; }
    __initInFlight = (async () => {
      try {
        if (this.ready) return;

        ort.env.wasm.wasmPaths = {
          mjs:  '/ort/ort-wasm-simd-threaded.mjs',
          wasm: '/ort/ort-wasm-simd-threaded.wasm',
        };
        ort.env.wasm.numThreads = Math.min(4, (self as any).navigator?.hardwareConcurrency || 1);

        const MODEL_DIR = '/models/ko-sroberta';
        console.log('[SemanticWorker] Initializing...', { MODEL_DIR });

        this.session = await ort.InferenceSession.create(await __fetchModelOnce(`${MODEL_DIR}/ko-sroberta-multitask_quantized.onnx`)).catch(async () => {
          return await ort.InferenceSession.create(await __fetchModelOnce(`${MODEL_DIR}/model_qint8_avx512_vnni.onnx`));
        });
        this.tokenizer = await AutoTokenizer.from_pretrained('ko-sroberta');

        this.inputNames = (this.session as any).inputNames || [];
        this.ready = true;
        console.log('[SemanticWorker] Pipeline initialized.', { inputNames: this.inputNames });
        __initDone = true;
      } catch (e) {
        console.error("Failed to initialize semantic worker", e);
        throw e;
      } finally {
        __initInFlight = null;
      }
    })();
    await __initInFlight;
  }

  private ensureTokenType(idsDims: number[]): ort.Tensor {
    const size = idsDims.reduce((a, b) => a * b, 1);
    return new ort.Tensor('int64', new BigInt64Array(size), idsDims);
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

    // ✅ batch tokenize -> Transformers.js returns Tensor with .data and .dims (not .shape)
    const enc: any = await this.tokenizer([text], { return_tensors: 'np', padding: true, truncation: true });

    const idsData  = enc.input_ids.data as any;
    const maskData = enc.attention_mask.data as any;

    let idsDims  = enc.input_ids.dims as number[];
    let maskDims = enc.attention_mask.dims as number[];
    if (idsDims.length === 1)  idsDims  = [1, idsDims[0]];
    if (maskDims.length === 1) maskDims = [1, maskDims[0]];

    const ids64  = BigInt64Array.from(Array.from(idsData,  (x: number) => BigInt(x)));
    const mask64 = BigInt64Array.from(Array.from(maskData, (x: number) => BigInt(x)));

    const inputs: Record<string, ort.Tensor> = {
      input_ids:      new ort.Tensor('int64', ids64,  idsDims),
      attention_mask: new ort.Tensor('int64', mask64, maskDims),
    };
    if (this.inputNames.includes('token_type_ids') && !('token_type_ids' in inputs)) {
      inputs.token_type_ids = this.ensureTokenType(idsDims);
    }

    const outMap = await this.session.run(inputs);
    const firstKey = Object.keys(outMap)[0];
    const out = outMap[firstKey];
    const data = out.data as Float32Array;

    if (out.dims.length === 2) return Array.from(data);
    if (out.dims.length === 3) {
      const seq = out.dims[1], hidden = out.dims[2];
      return this.meanPool(data, mask64, seq, hidden);
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