import { SupabaseClient } from '@supabase/supabase-js';
import type { InsightThread, UUID } from './types.js';

const TABLE = 'insight_threads_cache';

interface CacheEntry {
  user_id: UUID;
  threads: InsightThread[];
  last_updated_at: string;
}

export async function getInsightThreadsCache(supabase: SupabaseClient, userId: UUID): Promise<{ threads: InsightThread[], lastUpdatedAt: string | null }> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('threads, last_updated_at')
    .eq('user_id', userId)
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

export async function upsertInsightThreadsCache(supabase: SupabaseClient, userId: UUID, threads: InsightThread[]): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert({
      user_id: userId,
      threads_data: threads,
      last_updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

  if (error) {
    console.error(`[cache] Failed to upsert cache for user ${userId}:`, error.message);
    throw new Error(`Failed to save insight threads to cache: ${error.message}`);
  }
}
