import type { SupabaseClient } from "@supabase/supabase-js";
import type { InsightThread } from "./types.js";

type CacheRow = {
  user_id: string;
  threads_data: InsightThread[];
  last_updated_at: string;
};

export async function getInsightThreadsCache(
  supabase: SupabaseClient,
  userId: string
): Promise<{ threads: InsightThread[]; lastUpdatedAt: string | null }> {
  const { data, error } = await supabase
    .from("insight_threads_cache")
    .select("threads_data,last_updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { threads: [], lastUpdatedAt: null };
  }
  if (!data) return { threads: [], lastUpdatedAt: null };
  return {
    threads: (data as any).threads_data ?? [],
    lastUpdatedAt: (data as any).last_updated_at ?? null
  };
}

export async function upsertInsightThreadsCache(
  supabase: SupabaseClient,
  userId: string,
  threads: InsightThread[]
): Promise<{ lastUpdatedAt: string | null; error?: string }> {
  const { error } = await supabase
    .from("insight_threads_cache")
    .upsert({
      user_id: userId,
      threads_data: threads,
      last_updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  if (error) return { lastUpdatedAt: null, error: error.message };

  const { data, error: e2 } = await supabase
    .from("insight_threads_cache")
    .select("last_updated_at")
    .eq("user_id", userId)
    .single();

  if (e2) return { lastUpdatedAt: null, error: e2.message };
  return { lastUpdatedAt: (data as any).last_updated_at ?? null };
}
