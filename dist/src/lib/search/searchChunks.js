// src/lib/search/searchChunks.ts
// (선택) uid를 헤더나 쿼리로 전달할 수 있게 확장
export async function searchChunksGET({ q, limit = 12, uid, signal, }) {
    const url = new URL('/api/v1', window.location.origin);
    url.searchParams.set('action', 'search');
    url.searchParams.set('q', q);
    if (limit)
        url.searchParams.set('limit', String(limit));
    if (uid)
        url.searchParams.set('uid', uid);
    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: uid ? { 'x-user-id': uid } : undefined,
        signal,
    });
    if (!res.ok)
        throw new Error('Search request failed');
    return await res.json();
}
