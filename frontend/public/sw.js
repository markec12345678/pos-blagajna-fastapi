const CACHE_NAME = 'pos-v1'
const STATIC_CACHE = 'pos-static-v1'
const API_CACHE = 'pos-api-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // Skip non-http(s) requests (e.g. chrome-extension://)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  if (e.request.method !== 'GET') return

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirst(e.request))
  } else {
    e.respondWith(cacheFirst(e.request))
  }
})

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) return cached
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    if (res.ok && !req.url.includes('/auth/') && !req.url.includes('/payments') && !req.url.includes('/orders') && !req.url.includes('/kds/')) {
      const cache = await caches.open(API_CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    return Response.json({ detail: 'Offline', offline: true }, { status: 503 })
  }
}

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting()
  if (e.data === 'sync') syncQueue()
})

async function syncQueue() {
  const db = await openDB()
  const tx = db.transaction('queue', 'readwrite')
  const store = tx.objectStore('queue')
  const req = store.getAll()
  req.onsuccess = async () => {
    const items = req.result
    for (const item of items) {
      try {
        await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        })
        store.delete(item.id)
      } catch {
        break
      }
    }
    const clients = await self.clients.matchAll()
    clients.forEach((c) => c.postMessage({ type: 'sync-done', remaining: items.length }))
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('pos-offline', 1)
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains('queue'))
        r.result.createObjectStore('queue', { keyPath: 'id' })
      if (!r.result.objectStoreNames.contains('cache'))
        r.result.createObjectStore('cache', { keyPath: 'key' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
