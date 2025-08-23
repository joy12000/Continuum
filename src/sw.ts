// === Continuum SW Hotfix: bypass heavy model assets & fix cache recursion ===
const DO_NOT_CACHE_REGEX = /\.(onnx|wasm|bin)$/i;
function shouldBypass(req: Request): boolean {
  try {
    const u = new URL(req.url);
    if (u.pathname.startsWith('/models/')) return true;
    if (DO_NOT_CACHE_REGEX.test(u.pathname)) return true;
    return false;
  } catch { return false; }
}


// ---- Safe Cache.put helper to avoid 'Cache.put() encountered a network error' ----
async function safeCachePut(cache: Cache, request: Request, response: Response) {
  try {
    if (request.method !== 'GET') return;
    if (shouldBypass(request)) return;
    const url = new URL(request.url);
    const sameOrigin = self.location.origin === url.origin;
    const isOpaque = response.type === 'opaque';
    const isOpaqueRedirect = response.type === 'opaqueredirect';
    if (isOpaqueRedirect) return;
    if (!isOpaque && !response.ok) return;
    if (!sameOrigin && !isOpaque) return;
    await cache.put(request, response.clone ? response.clone() : response);
  } catch (e) {
    console.warn('[SW] safeCachePut skipped:', (request as any)?.url || request, e);
  }
}

/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import Dexie, { Table } from "dexie";

// The DB class needs to be redefined or imported in the worker scope.
// Based on src/store/db.ts
export interface Note { id: string; content: string; createdAt: number; updatedAt: number; tags: string[]; }
export class AppDB extends Dexie {
  notes!: Table<Note, string>;
  constructor(){ super("continuum");
    this.version(1).stores({
      notes: "id, createdAt, updatedAt, *tags",
    });
  }
}

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', () => { self.clients.claim(); });

self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'daily-lookback') {
    event.waitUntil(checkForPastNotes());
  }
});

async function checkForPastNotes() {
  const db = new AppDB();
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth();

  // Find notes from previous years on the same month and day
  const allNotes = await db.notes.orderBy('createdAt').toArray();
  const pastNotes = allNotes.filter(note => {
    const noteDate = new Date(note.createdAt);
    return noteDate.getDate() === day &&
           noteDate.getMonth() === month &&
           noteDate.getFullYear() < today.getFullYear();
  });

  if (pastNotes.length > 0) {
    // Pick a random note from the past to show
    const targetNote = pastNotes[Math.floor(Math.random() * pastNotes.length)];
    const noteDate = new Date(targetNote.createdAt);
    const yearsAgo = today.getFullYear() - noteDate.getFullYear();

    self.registration.showNotification(
      `${yearsAgo}년 전 오늘, 이런 생각을 했어요`,
      { 
        body: targetNote.content.replace(/<[^>]+>/g, '').substring(0, 100), 
        data: { noteId: targetNote.id },
        icon: '/icons/icon-192.png'
      }
    );
  }
}

self.addEventListener('notificationclick', (event: any) => {
    event.notification.close();
    const noteId = event.notification.data?.noteId;
    if (noteId) {
      event.waitUntil(
        self.clients.openWindow(`/?note=${noteId}`)
      );
    }
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (event.request.method === "GET" && (url.pathname.startsWith("/models/") || url.pathname.startsWith("/tokenizers/"))) {
    event.respondWith((async () => {
      const cache = await caches.open("continuum-cache");
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const resp = await fetch(event.request);
      if (resp.ok) { await safeCachePut(cache, event.request, resp.clone()); }
      return resp;
    })());
    return;
  }
  if (event.request.method === "POST" && url.pathname === "/share") {
    event.respondWith((async () => {
      const formData = await event.request.formData();
      const files = formData.getAll("files") as File[];
      const title = formData.get("title") as string || "";
      const text = formData.get("text") as string || "";
      const url = formData.get("url") as string || "";
      
      const dbReq = indexedDB.open("continuum-share-queue", 1);
      dbReq.onupgradeneeded = () => {
        dbReq.result.createObjectStore("items", { autoIncrement: true });
      };
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        dbReq.onsuccess = () => resolve(dbReq.result);
        dbReq.onerror = () => reject(dbReq.error);
      });
      
      const tx = db.transaction("items", "readwrite");
      const store = tx.objectStore("items");
      await store.add({ title, text, url, files, createdAt: Date.now() });
      await new Promise(r => tx.oncomplete = r);
      
      const bc = new BroadcastChannel("continuum-share");
      bc.postMessage({ type: "queued" });
      bc.close();

      return Response.redirect("/", 303);
    })());
  }
});
