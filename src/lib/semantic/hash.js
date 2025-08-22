import { tokenize } from "../tokenize";
/**
 * 해시 기반 임베딩(문자 n-gram) — 모델 없이 즉시 동작.
 * 진짜 임베딩 대체는 아니지만 BM25 보조로 의미 근접도를 일부 포착.
 */
const DIM = 384;
function djb2x(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h) ^ s.charCodeAt(i);
    }
    return h >>> 0;
}
function l2norm(v) {
    let n = 0;
    for (let i = 0; i < v.length; i++)
        n += v[i] * v[i];
    const inv = n > 0 ? 1 / Math.sqrt(n) : 1;
    for (let i = 0; i < v.length; i++)
        v[i] *= inv;
}
export function embedHash(text) {
    const toks = tokenize(text);
    const v = new Float32Array(DIM);
    for (const t of toks) {
        // 문자 n-gram (3..5)
        const str = `^${t}$`;
        for (let n = 3; n <= 5; n++) {
            for (let i = 0; i + n <= str.length; i++) {
                const g = str.slice(i, i + n);
                const idx = djb2x(g) % DIM;
                v[idx] += 1;
            }
        }
    }
    l2norm(v);
    return Array.from(v);
}
