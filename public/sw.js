self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const { title, body, url } = data
  event.waitUntil(
    self.registration.showNotification(title ?? 'GAMECAL', {
      body: body ?? "CAL: Don't miss this.",
      icon: '/og-image.svg',
      badge: '/og-image.svg',
      data: { url: url ?? '/' },
      vibrate: [100, 50, 100],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(clients.openWindow(url))
})
