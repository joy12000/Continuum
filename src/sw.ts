


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
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('continuum-cache-') && cacheName !== 'continuum-cache-v1') {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle navigation requests (HTML) with a network-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open('continuum-cache-v1');
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          const cachedResponse = await caches.match(request);
          return cachedResponse || Response.error();
        }
      })()
    );
    return;
  }

  // Handle static assets with a cache-first strategy
  if (url.pathname.match(/\.(js|css|wasm|onnx|png|svg|webp|woff2|ttf|otf)$/)) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          // Revalidate in the background
          fetch(request).then(networkResponse => {
            const cache = caches.open('continuum-cache-v1');
            cache.then(c => c.put(request, networkResponse));
          });
          return cachedResponse;
        }
        const networkResponse = await fetch(request);
        const cache = await caches.open('continuum-cache-v1');
        cache.put(request, networkResponse.clone());
        return networkResponse;
      })()
    );
    return;
  }

  // Keep the existing logic for /share
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
      await new Promise(r => tx.oncomplete = r as any);
      
      const bc = new BroadcastChannel("continuum-share");
      bc.postMessage({ type: "queued" });
      bc.close();

      return Response.redirect("/", 303);
    })());
  }
});

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
