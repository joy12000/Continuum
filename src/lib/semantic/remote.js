import { API_BASE } from "../../config";
export class RemoteAdapter {
    base;
    name = "remote-api";
    constructor(base = API_BASE) {
        this.base = base;
    }
    async ensureReady() { return true; }
    async embed(texts) {
        // 간단한 배치 호출
        const r = await fetch(`${this.base}/embed`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ texts, output_dimensionality: 384 })
        });
        if (!r.ok)
            throw new Error(`Remote embed failed: ${r.status}`);
        const data = await r.json();
        if (Array.isArray(data.vectors))
            return data.vectors;
        if (Array.isArray(data.vector))
            return [data.vector];
        return texts.map(() => []);
    }
}
