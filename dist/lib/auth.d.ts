import type { VercelRequest, VercelResponse } from "@vercel/node";
export declare function requireUser(req: VercelRequest, res: VercelResponse): Promise<{
    supabase: import("@supabase/supabase-js").SupabaseClient<any, "public", "public", any, any>;
    userId: string;
    token: string;
} | null>;
//# sourceMappingURL=auth.d.ts.map