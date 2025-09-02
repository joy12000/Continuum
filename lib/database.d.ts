import type { SupabaseClient } from "@supabase/supabase-js";
import type { InsightThread } from "./types.js";
export declare function getInsightThreadsCache(supabase: SupabaseClient, userId: string): Promise<{
    threads: InsightThread[];
    lastUpdatedAt: string | null;
}>;
export declare function upsertInsightThreadsCache(supabase: SupabaseClient, userId: string, threads: InsightThread[]): Promise<{
    lastUpdatedAt: string | null;
    error?: string;
}>;
//# sourceMappingURL=database.d.ts.map