import { supabase } from '../lib/supabase';

export interface ChatBundleSyncResponse {
  summary: string;
  storeName: string;
  fileMetadata?: Record<string, any>;
  groundingMetadata?: Record<string, any>;
}

interface SyncPayload {
  noteId: string;
  body: string;
  createdAt: number;
}

export async function syncChatBundle(payload: SyncPayload): Promise<ChatBundleSyncResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const resp = await fetch('/api/v1?action=chat-bundle-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    let errorMessage = 'Failed to sync chat bundle.';
    try {
      const errorJson = await resp.json();
      errorMessage = errorJson?.error || errorMessage;
    } catch {
      errorMessage = await resp.text();
    }
    throw new Error(errorMessage);
  }

  const data = await resp.json();
  return data as ChatBundleSyncResponse;
}
