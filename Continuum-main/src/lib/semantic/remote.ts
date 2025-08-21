
import { API_BASE } from "../../config";

export class RemoteAdapter {
  name = "remote-api";
  constructor(private base = API_BASE) {}

  async ensureReady() { return true; }

  async embed(texts: string[]): Promise<number[][]> {
    // 간단한 배치 호출
    const r = await fetch(`${this.base}/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texts, output_dimensionality: 384 })
    });
    if (!r.ok) throw new Error(`Remote embed failed: ${r.status}`);
    const data = await r.json();
    if (Array.isArray(data.vectors)) return data.vectors as number[][];
    if (Array.isArray(data.vector)) return [data.vector as number[]];
    return texts.map(() => []);
  }
}
