export type GenResult = { summary: string; bullets: string[]; cites?: {id:string, text:string}[] };
export async function generateWithFallback(prompt: string, arg2?: any, arg3?: string | null): Promise<GenResult> {
  const apiBase = typeof arg2 === "string" ? arg2 : (typeof arg3 === "string" ? arg3 : "/api");
  try {
    const r = await fetch(`${apiBase}/generate`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ prompt }) });
    if (r.ok) return await r.json();
  } catch {}
  return { summary: "추가 근거 필요", bullets: ["로컬 폴백 응답입니다.", "설정에서 Generate API를 연결하세요."], cites: [] };
}