import { toast } from "../toast";

export async function getQueryEmbedding(text: string): Promise<number[]> {
  try {
    const res = await fetch('/api/on-device-support/create-query-embedding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Failed to get query embedding with status ${res.status}`, errorBody);
      throw new Error(`Failed to get query embedding with status ${res.status}`);
    }

    const data = await res.json();
    return data.embedding;
  } catch (e) {
    toast.error("검색어 임베딩 생성에 실패했습니다.");
    console.error(e);
    throw e;
  }
}