// Semantic Worker (overwrite by assistant)
// Robust init: local models + safer messaging protocol

import { AutoTokenizer } from '@xenova/transformers';
import { InferenceSession, Tensor } from 'onnxruntime-web';

type EmbedResult = number[];

class SemanticPipeline {
  private static _instance: SemanticPipeline | null = null;
  private ready = false;
  private session: InferenceSession | null = null;
  private tokenizer: any | null = null;

  static getInstance() {
    if (!this._instance) this._instance = new SemanticPipeline();
    return this._instance;
  }

  async init() {
    if (this.ready) return;
    // eslint-disable-next-line no-restricted-globals
    const ORIGIN = (self as any)?.location?.origin || '';
    const MODEL_BASE = ORIGIN + '/models';

    console.log('[SemanticWorker] Initializing pipeline...');
    try {
      // Local ONNX session
      this.session = await InferenceSession.create(
        MODEL_BASE + '/ko-sroberta-multitask_quantized.onnx'
      );

      // Local tokenizer
      this.tokenizer = await AutoTokenizer.from_pretrained(
        MODEL_BASE + '/bge-m3/'
      );

      this.ready = true;
      console.log('[SemanticWorker] Pipeline initialized successfully.');
    } catch (err) {
      console.error('[SemanticWorker] Initialization failed:', err);
      this.ready = false;
      throw err;
    }
  }

  async embed(text: string): Promise<EmbedResult> {
    if (!this.ready) await this.init();
    if (!this.session || !this.tokenizer) throw new Error('Pipeline not ready');
    // Tokenize
    const encoded = await this.tokenizer(text, { return_tensors: 'np' });
    const input_ids = encoded.input_ids.data;
    const attention_mask = encoded.attention_mask.data;

    const inputIdsTensor = new Tensor('int64', BigInt64Array.from(input_ids.map(BigInt)), encoded.input_ids.shape);
    const attnMaskTensor = new Tensor('int64', BigInt64Array.from(attention_mask.map(BigInt)), encoded.attention_mask.shape);

    const outputs = await this.session.run({ input_ids: inputIdsTensor, attention_mask: attnMaskTensor });
    const last = outputs[Object.keys(outputs)[0]];
    const data = Array.from(last.data as Float32Array);
    return data;
  }
}

// Structured messaging protocol
self.onmessage = async (event: MessageEvent) => {
  const { id, type, payload } = (event.data || {});
  try {
    const pipeline = SemanticPipeline.getInstance();
    if (type === 'embed') {
      await pipeline.init();
      const texts: string[] = Array.isArray(payload?.texts) ? payload.texts : [String(payload?.text ?? payload ?? '')];
      const results = await Promise.all(texts.map(t => pipeline.embed(t)));
      (self as any).postMessage({ id, ok: true, result: results });
      return;
    }
    (self as any).postMessage({ id, ok: false, error: `Unknown type: ${type}` });
  } catch (error: any) {
    (self as any).postMessage({ id, ok: false, error: error?.message || String(error) });
  }
};
