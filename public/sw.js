const CACHE_NAME = 'gamerclock-shell-v1'
const SHELL_URLS = ['/', '/manifest.json', '/favicon.ico', '/icon-192.png']

// ── Install: 앱 셸 캐시 ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

// ── Activate: 구버전 캐시 정리 ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch: 네트워크 우선, 실패 시 캐시 ──
self.addEventListener('fetch', (event) => {
  const { request } = event
  // API, chrome-extension 등은 캐시하지 않음
  if (request.method !== 'GET' || !request.url.startsWith('http') || request.url.includes('/api/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 성공 시 Shell URL만 캐시 갱신
        if (response.ok && SHELL_URLS.some((u) => new URL(request.url).pathname === u)) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
        }
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/')))
  )
})

// ── Push 알림 수신 ──
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const { title, body, url } = data
  event.waitUntil(
    self.registration.showNotification(title ?? 'GamerClock', {
      body: body ?? "CAL: Don't miss this.",
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      data: { url: url ?? '/' },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'snooze_30', title: 'Snooze 30m' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

// ── 알림 클릭 ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  if (event.action === 'dismiss') return

  if (event.action === 'snooze_30') {
    const title = event.notification.title
    const options = {
      body: event.notification.body,
      icon: event.notification.icon,
      badge: '/badge-96.png',
      data: event.notification.data,
      vibrate: [100, 50, 100],
    }
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(() => {
          self.registration.showNotification(title, options).then(resolve)
        }, 30 * 60 * 1000)
      })
    )
    return
  }

  event.waitUntil(clients.openWindow(url))
})
