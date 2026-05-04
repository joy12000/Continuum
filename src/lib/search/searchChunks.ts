// src/lib/search/searchChunks.ts
// 검색 쿼리를 받아 API를 호출하는 유틸리티 함수입니다.
export async function searchChunksGET({
  q,
  limit = 12,
  uid,
  signal,
}: {
  q: string;
  limit?: number;
  uid?: string;
  signal?: AbortSignal;
}) {
  const url = new URL('/api/v1', window.location.origin);
  url.searchParams.set('action', 'search');
  url.searchParams.set('q', q);
  if (limit) url.searchParams.set('limit', String(limit));
  if (uid) url.searchParams.set('uid', uid);
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: uid ? { 'x-user-id': uid } : undefined,
    signal,
  });
  if (!res.ok) throw new Error('Search request failed');
  return await res.json();
}
