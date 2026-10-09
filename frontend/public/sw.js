/*
 * MajiGuard service worker: a small, dependency-free cache layer.
 *
 * - /assets/*  (content-hashed JS/CSS/fonts)  -> cache first; a hash never changes.
 * - /geo/*, /images/*                         -> stale-while-revalidate.
 * - GET /api/* data (never /api/v1/auth/*)    -> stale-while-revalidate, so a
 *   reload paints the last answers at once while fresh ones load behind them.
 * - page navigations                          -> network first, cached shell
 *   when the network is slow or offline.
 *
 * Bump VERSION to drop every cache on the next visit.
 */
const VERSION = 'v1'
const ASSETS = `mg-assets-${VERSION}`
const STATIC = `mg-static-${VERSION}`
const API = `mg-api-${VERSION}`
const PAGES = `mg-pages-${VERSION}`
const KEEP = new Set([ASSETS, STATIC, API, PAGES])

const LIMITS = { [ASSETS]: 250, [STATIC]: 120, [API]: 400, [PAGES]: 4 }
const NAVIGATION_TIMEOUT_MS = 3500

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (!KEEP.has(name)) {
          await caches.delete(name)
        }
      }
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') {
    return
  }
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, ASSETS))
    return
  }
  if (url.pathname.startsWith('/geo/') || url.pathname.startsWith('/images/')) {
    event.respondWith(staleWhileRevalidate(event, request, STATIC))
    return
  }
  if (
    url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/api/v1/auth') &&
    !request.headers.has('Authorization')
  ) {
    event.respondWith(staleWhileRevalidate(event, request, API))
  }
})

function cacheable(response) {
  return response.ok && response.type === 'basic' && !response.headers.get('Cache-Control')?.includes('no-store')
}

async function put(cacheName, request, response) {
  const cache = await caches.open(cacheName)
  await cache.put(request, response)
  const keys = await cache.keys()
  const excess = keys.length - LIMITS[cacheName]
  for (let i = 0; i < excess; i += 1) {
    await cache.delete(keys[i])
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName })
  if (cached) {
    return cached
  }
  const response = await fetch(request)
  if (cacheable(response)) {
    await put(cacheName, request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(event, request, cacheName) {
  const cached = await caches.match(request, { cacheName })
  const network = fetch(request).then(async (response) => {
    if (cacheable(response)) {
      await put(cacheName, request, response.clone())
    }
    return response
  })
  if (cached) {
    // Refresh in the background; an aborted or failed refresh keeps the cached copy.
    event.waitUntil(network.catch(() => undefined))
    return cached
  }
  return network
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES)
  const network = fetch(request).then(async (response) => {
    if (cacheable(response)) {
      // Every route renders the same single-page shell.
      await cache.put('/', response.clone())
    }
    return response
  })
  try {
    return await Promise.race([
      network,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NAVIGATION_TIMEOUT_MS)),
    ])
  } catch {
    const shell = await cache.match('/')
    // No cached shell yet (first visit): keep waiting for the network.
    return shell ?? network
  }
}
