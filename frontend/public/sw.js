const CACHE = 'pos-v1'
const ASSETS = ['/', '/manifest.json', '/icon-192.svg']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim())
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // API requests - try network, queue if offline
  if (url.pathname.startsWith('/api/') && !navigator.onLine) {
    if (e.request.method !== 'GET') {
      e.respondWith(networkWithQueue(e.request))
      return
    }
  }

  // API GET requests - network first, fallback to cache or offline data
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      networkFirst(e.request).catch(async () => {
        // Try offline cached data
        if (url.pathname === '/api/v1/menu' || url.pathname === '/api/v1/menu/') {
          const c = await caches.match('/api/v1/menu-cache')
          if (c) return c
        }
        if (url.pathname === '/api/v1/tables' || url.pathname === '/api/v1/tables/') {
          const c = await caches.match('/api/v1/tables-cache')
          if (c) return c
        }
        return new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return
  }

  // Static assets - cache first
  e.respondWith(cacheFirst(e.request))
})

async function cacheFirst(req) {
  const cached = await caches.match(req)
  return cached || fetch(req).then(res => {
    if (req.method === 'GET') {
      const clone = res.clone()
      caches.open(CACHE).then(c => c.put(req, clone))
    }
    return res
  })
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    if (req.method === 'GET') {
      const clone = res.clone()
      caches.open(CACHE).then(c => c.put(req, clone))
    }
    return res
  } catch {
    const cached = await caches.match(req)
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function networkWithQueue(req) {
  try {
    return await fetch(req)
  } catch {
    const clone = req.clone()
    const body = await clone.json()
    const entry = {
      url: req.url,
      method: req.method,
      body,
      timestamp: Date.now(),
      id: crypto.randomUUID()
    }
    const db = await openDB()
    const tx = db.transaction('queue', 'readwrite')
    tx.objectStore('queue').add(entry)
    await tx.done
    return new Response(JSON.stringify({ queued: true, id: entry.id }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('pos-offline', 1)
    r.onupgradeneeded = () => {
      r.result.createObjectStore('queue', { keyPath: 'id' })
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

// Sync queued requests when back online
self.addEventListener('message', async e => {
  if (e.data === 'sync') {
    const db = await openDB()
    const tx = db.transaction('queue', 'readonly')
    const items = await tx.objectStore('queue').getAll()
    await tx.done
    for (const item of items) {
      try {
        await fetch(item.url, {
          method: item.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.body)
        })
        const tx2 = db.transaction('queue', 'readwrite')
        tx2.objectStore('queue').delete(item.id)
        await tx2.done
      } catch {}
    }
  }
})
