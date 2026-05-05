import { getSupabaseServer } from "../lib/server/supabase";

export async function requireUser(req: any, res: any) {
  const auth = req.headers["authorization"] || req.headers["Authorization"];
  if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return null;
  }
  const token = auth.slice("Bearer ".length);
  const supabase = getSupabaseServer(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    if (res.status) res.status(401).json({ error: "Invalid token" });
    return null;
  }
  const userId = data.user.id;
  return { supabase, userId, token };
}

