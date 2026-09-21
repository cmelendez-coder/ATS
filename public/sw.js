/* EverTrack service worker
 * - Navegación (HTML): red primero; si no hay conexión, muestra la última versión guardada.
 * - Archivos de /assets (nombre con hash): caché primero, se guardan al usarse.
 * - Fuentes de Google (letras e íconos) y logos/íconos propios: se sirven de la caché y se
 *   refrescan en segundo plano, para que la app se vea completa sin conexión.
 * - Todo lo demás (Supabase, APIs, otros dominios): nunca se intercepta ni se guarda,
 *   así los datos siempre llegan frescos de la base.
 */
const CACHE = 'evertrack-v2'
const STATIC = 'evertrack-static-v2' // fuentes, logos e íconos

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== STATIC).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Sirve de la caché y, en paralelo, actualiza la copia guardada
function staleWhileRevalidate(req) {
  return caches.open(STATIC).then(cache =>
    cache.match(req).then(hit => {
      const network = fetch(req)
        .then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res })
        .catch(() => hit)
      return hit || network
    })
  )
}

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com']
const STATIC_PATHS = /^\/(logos\/|portals\/|pwa-|apple-touch-icon|icon-prt|logo-prt)/

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req))
    return
  }

  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)) }
        return res
      }))
    )
    return
  }

  if (STATIC_PATHS.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(req))
  }
})
