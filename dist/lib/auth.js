import { getSupabaseClient } from "./supabaseClient.js";
export async function requireUser(req, res) {
    const auth = req.headers["authorization"];
    if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid Authorization header" });
        return null;
    }
    const token = auth.slice("Bearer ".length);
    const supabase = getSupabaseClient(token);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        res.status(401).json({ error: "Invalid token" });
        return null;
    }
    const userId = data.user.id;
    return { supabase, userId, token };
}
