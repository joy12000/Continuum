
/// <reference lib="webworker" />
import { BertWordPiece } from '../lib/semantic/bert_tokenizer';
import { InferenceSession, Tensor } from 'onnxruntime-web';

class OnDeviceSemantic {
  public name = "on-device";
  private tokenizer?: BertWordPiece;
  private session?: InferenceSession;
  private readyPromise?: Promise<boolean>;

  /**
   * Ensures the model and tokenizer are loaded and ready for inference.
   * @returns {Promise<boolean>} True if the session is ready, false otherwise.
   */
  public ensureReady = () => {
    if (!this.readyPromise) {
      this.readyPromise = this.init();
    }
    return this.readyPromise;
  }

  /**
   * Initializes the tokenizer and ONNX session.
   * This method is called by ensureReady().
   */
  private init = async () => {
    const modelUrl = '/models/all-MiniLM-L6-v2.onnx';
    
    try {
      this.tokenizer = new BertWordPiece();
      const [session] = await Promise.all([
        InferenceSession.create(modelUrl, { executionProviders: ['wasm'] }),
        this.tokenizer.load()
      ]);
      this.session = session;
      return true;
    } catch (e) {
      console.error("Failed to initialize on-device semantic model:", e);
      return false;
    }
  }

  /**
   * Generates embeddings for a list of texts.
   * @param {string[]} texts - The texts to embed.
   * @returns {Promise<number[][]>} A promise that resolves to an array of embeddings.
   */
  public embed = async (texts: string): Promise<number[][]> => {
    if (!this.tokenizer || !this.session) {
      throw new Error("Session not initialized. Call ensureReady() first.");
    }

    const { ids, mask } = await this.tokenizer.encode(texts);
    const feeds = {
      input_ids: new Tensor('int32', ids, [1, ids.length]),
      attention_mask: new Tensor('int32', mask, [1, mask.length]),
    };
    
    const output = await this.session.run(feeds);
    const embeddings = this.normalize(output.last_hidden_state.data as Float32Array, output.last_hidden_state.dims[1], output.last_hidden_state.dims[2]);
    
    return embeddings;
  }

  /**
   * Normalizes the output tensor to create sentence embeddings.
   * @param {Float32Array} data - The raw output from the model.
   * @param {number} numTokens - The number of tokens.
   * @param {number} embeddingDim - The dimension of the embeddings.
   * @returns {number[][]} The normalized embeddings.
   */
  private normalize = (data: Float32Array, numTokens: number, embeddingDim: number): number[][] => {
    const embeddings: number[][] = [];
    for (let i = 0; i < data.length; i += numTokens * embeddingDim) {
      const sentenceEmbedding = new Array(embeddingDim).fill(0);
      const slice = data.slice(i, i + numTokens * embeddingDim);
      
      // Mean pooling
      for (let j = 0; j < numTokens; j++) {
        for (let k = 0; k < embeddingDim; k++) {
          sentenceEmbedding[k] += slice[j * embeddingDim + k];
        }
      }
      for (let k = 0; k < embeddingDim; k++) {
        sentenceEmbedding[k] /= numTokens;
      }

      // L2 normalization
      const norm = Math.sqrt(sentenceEmbedding.reduce((acc, val) => acc + val * val, 0));
      embeddings.push(sentenceEmbedding.map(val => val / norm));
    }
    return embeddings;
  }
}

const onDeviceSemantic = new OnDeviceSemantic();

type Msg =
  | { id: string; type: "ensure"; payload: { pref: "auto" | "remote" } }
  | { id: string; type: "embed"; payload: { pref: "auto" | "remote"; texts: string[] } };

self.addEventListener("message", async (e: MessageEvent<Msg>) => {
  const { id, type, payload } = e.data;
  try {
    if (type === "ensure") {
      const ready = await onDeviceSemantic.ensureReady();
      self.postMessage({ id, ok: true, result: { name: onDeviceSemantic.name, ready } });
      return;
    }
    if (type === "embed") {
      await onDeviceSemantic.ensureReady();
      const vecs = await onDeviceSemantic.embed(payload.texts.join(' '));
      self.postMessage({ id, ok: true, result: vecs });
      return;
    }
    self.postMessage({ id, ok: false, error: "Unknown command" });
  } catch (err: any) {
    self.postMessage({ id, ok: false, error: String(err?.message || err) });
  }
});
