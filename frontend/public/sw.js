const CACHE_NAME = 'ury-pos-v2'
const STATIC_CACHE = 'ury-static-v2'
const API_CACHE = 'ury-api-v2'
const OFFLINE_URL = '/offline.html'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  OFFLINE_URL,
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
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  if (e.request.method !== 'GET') return

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirst(e.request))
  } else {
    e.respondWith(cacheFirstWithFallback(e.request))
  }
})

async function cacheFirstWithFallback(req) {
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
    const fallback = await caches.match(OFFLINE_URL)
    return fallback || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/html' } })
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

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {}
  const title = data.title || 'URY POS'
  const options = {
    body: data.body || 'Nova obvestila',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: data.url || '/',
    actions: data.actions || [],
    tag: data.tag || 'ury-notification',
    renotify: true,
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data || '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-orders') {
    e.waitUntil(syncQueue())
  }
})

self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'menu-update') {
    e.waitUntil(updateMenuCache())
  }
})

async function updateMenuCache() {
  try {
    const cache = await caches.open(STATIC_CACHE)
    await cache.add('/api/v1/menu')
  } catch {}
}

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
