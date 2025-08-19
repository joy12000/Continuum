/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', () => { self.clients.claim(); });

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (event.request.method === "GET" && (url.pathname.startsWith("/models/") || url.pathname.startsWith("/tokenizers/"))) {
    event.respondWith((async () => {
      const cache = await caches.open("continuum-cache");
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const resp = await fetch(event.request);
      if (resp.ok) { cache.put(event.request, resp.clone()); }
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
