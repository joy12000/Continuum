import { embedHash } from "./hash";
import { RemoteAdapter } from "./remote";
import { BertWordPiece } from "./bert_tokenizer";
class HashAdapter {
    name = "hashing-ngram";
    async ensureReady() { return true; }
    async embed(texts) { return texts.map(t => embedHash(t)); }
}
class OrtAdapter {
    name = "onnxruntime";
    session = null;
    tokenizer = null;
    modelUrl = null;
    async probe(url) {
        try {
            const r = await fetch(url, { method: "HEAD" });
            return r.ok;
        }
        catch {
            return false;
        }
    }
    async hasFiles() {
        const hasInt8 = await this.probe("/models/encoder.int8.onnx");
        const hasFp = await this.probe("/models/encoder.onnx");
        const hasVocab = await this.probe("/models/vocab.txt");
        if (!hasVocab)
            return false;
        this.modelUrl = hasInt8 ? "/models/encoder.int8.onnx" : (hasFp ? "/models/encoder.onnx" : null);
        return !!this.modelUrl;
    }
    async ensureReady() {
        if (this.session && this.tokenizer)
            return true;
        if (!(await this.hasFiles()))
            return false;
        const ort = await import("onnxruntime-web");
        this.tokenizer = new BertWordPiece();
        const ok = await this.tokenizer.load("/models/vocab.txt");
        if (!ok)
            return false;
        this.session = await ort.InferenceSession.create(this.modelUrl, {
            executionProviders: ["wasm"],
        });
        return true;
    }
    async embed(texts) {
        const ready = await this.ensureReady();
        if (!ready || !this.session || !this.tokenizer)
            return texts.map(() => []);
        const ort = await import("onnxruntime-web");
        const out = [];
        for (const t of texts) {
            const enc = await this.tokenizer.encode(t);
            if (enc.ids.length === 0) {
                out.push([]);
                continue;
            }
            const maxLen = enc.ids.length;
            let feeds;
            try {
                feeds = {
                    input_ids: new ort.Tensor("int64", BigInt64Array.from(enc.ids.map(BigInt)), [1, maxLen]),
                    attention_mask: new ort.Tensor("int64", BigInt64Array.from(enc.mask.map(BigInt)), [1, maxLen]),
                };
            }
            catch {
                feeds = {
                    input_ids: new ort.Tensor("int32", Int32Array.from(enc.ids), [1, maxLen]),
                    attention_mask: new ort.Tensor("int32", Int32Array.from(enc.mask), [1, maxLen]),
                };
            }
            const res = await this.session.run(feeds);
            const key = Object.keys(res)[0];
            const data = res[key].data;
            const dim = data.length / maxLen;
            const vec = new Float32Array(dim);
            for (let i = 0; i < maxLen; i++) {
                if (enc.mask[i] === 0)
                    continue;
                for (let d = 0; d < dim; d++)
                    vec[d] += data[i * dim + d];
            }
            let n = 0;
            for (let d = 0; d < vec.length; d++)
                n += vec[d] * vec[d];
            const inv = n > 0 ? 1 / Math.sqrt(n) : 1;
            for (let d = 0; d < vec.length; d++)
                vec[d] *= inv;
            out.push(Array.from(vec));
        }
        return out;
    }
}
async function createOrtAdapter() {
    try {
        const a = new OrtAdapter();
        const ok = await a.ensureReady();
        return ok ? a : null;
    }
    catch {
        return null;
    }
}
export async function getSemanticAdapter(pref = 'auto') {
    if (pref === 'remote')
        return new RemoteAdapter();
    const ort = await createOrtAdapter();
    if (ort)
        return ort;
    return new HashAdapter();
}
