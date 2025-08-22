/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web';
import { AutoTokenizer } from '@xenova/transformers';
class SemanticPipeline {
    static _inst = null;
    static getInstance() { return (this._inst ??= new SemanticPipeline()); }
    ready = false;
    session = null;
    tokenizer = null;
    inputNames = [];
    async init() {
        if (this.ready)
            return;
        // 🔧 최신 ORT: mjs/wasm 파일명을 객체로 명시
        // public/ort 에 복사한 파일명에 맞춰 수정 가능:
        // - mjs: ort-wasm-simd-threaded.mjs
        // - wasm: ort-wasm-simd-threaded.wasm (JSEP 쓰면 *.jsep.wasm)
        ort.env.wasm.wasmPaths = {
            mjs: '/ort/ort-wasm-simd-threaded.mjs',
            wasm: '/ort/ort-wasm-simd-threaded.wasm'
        };
        // 보수적 스레드 설정(전역 COEP 없어도 동작)
        ort.env.wasm.numThreads = Math.min(4, self.navigator?.hardwareConcurrency || 1);
        const origin = self?.location?.origin || '';
        const MODEL_DIR = `${origin}/models/ko-sroberta`;
        console.log('[SemanticWorker] Initializing...', { MODEL_DIR });
        // ONNX 파일명 후보들을 순차 시도 (배포된 파일명에 맞게 자동 픽)
        const candidates = [
            `${MODEL_DIR}/ko-sroberta-multitask_quantized.onnx`,
            `${MODEL_DIR}/model_qint8_avx512_vnni.onnx`,
            `${MODEL_DIR}/model.onnx`,
        ];
        let lastErr = null;
        for (const url of candidates) {
            try {
                this.session = await ort.InferenceSession.create(url);
                console.log('[SemanticWorker] ONNX loaded:', url);
                break;
            }
            catch (e) {
                lastErr = e;
            }
        }
        if (!this.session)
            throw lastErr || new Error('ONNX model not loaded');
        // ko-sroberta 폴더에서 토크나이저 로드 (tokenizer.json + vocab.txt 필요)
        this.tokenizer = await AutoTokenizer.from_pretrained(`${MODEL_DIR}/`);
        this.inputNames = this.session.inputNames || [];
        this.ready = true;
        console.log('[SemanticWorker] Pipeline initialized.', { inputNames: this.inputNames });
    }
    ensureTokenType(idsShape) {
        const size = idsShape.reduce((a, b) => a * b, 1);
        const zeros = new BigInt64Array(size);
        return new ort.Tensor('int64', zeros, idsShape);
    }
    meanPool(hidden, mask, seq, hiddenDim) {
        const out = new Float32Array(hiddenDim);
        let denom = 0;
        for (let t = 0; t < seq; t++) {
            if (mask[t] === 0n)
                continue;
            denom++;
            const base = t * hiddenDim;
            for (let h = 0; h < hiddenDim; h++)
                out[h] += hidden[base + h];
        }
        const d = Math.max(1, denom);
        for (let h = 0; h < hiddenDim; h++)
            out[h] /= d;
        return Array.from(out);
    }
    async embed(text) {
        if (!this.ready)
            await this.init();
        if (!this.session || !this.tokenizer)
            throw new Error('Pipeline not ready');
        const enc = await this.tokenizer(text, { return_tensors: 'np', padding: true, truncation: true });
        const idsShape = enc.input_ids.shape;
        const maskShape = enc.attention_mask.shape;
        const ids64 = BigInt64Array.from(Array.from(enc.input_ids.data, (x) => BigInt(x)));
        const mask64 = BigInt64Array.from(Array.from(enc.attention_mask.data, (x) => BigInt(x)));
        const inputs = {
            input_ids: new ort.Tensor('int64', ids64, idsShape),
            attention_mask: new ort.Tensor('int64', mask64, maskShape),
        };
        if (this.inputNames.includes('token_type_ids') && !('token_type_ids' in inputs)) {
            inputs.token_type_ids = this.ensureTokenType(idsShape);
        }
        const outMap = await this.session.run(inputs);
        const firstKey = Object.keys(outMap)[0];
        const out = outMap[firstKey];
        const data = out.data;
        if (out.dims.length === 2)
            return Array.from(data); // [1, hidden]
        if (out.dims.length === 3) { // [1, seq, hidden]
            const [, seq, hidden] = out.dims;
            return this.meanPool(data, mask64, seq, hidden);
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
    }
    catch (error) {
        console.error('[SemanticWorker] error:', error);
        self.postMessage({ id, ok: false, error: error?.message || String(error) });
    }
};
