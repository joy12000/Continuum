export type Settings = { generateApiUrl?: string; embedApiUrl?: string; alpha?: number; lambda?: number; engine?: string; genEnabled?: boolean; genEndpoint?: string; };
const KEY = "continuum-settings";
export async function loadSettings(){ try{ const raw=localStorage.getItem(KEY); return raw? JSON.parse(raw): {}; }catch{ return {}; } }
export async function saveSettings(s:Settings){ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch{} }