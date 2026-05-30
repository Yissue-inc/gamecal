self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const { title, body, url } = data
  event.waitUntil(
    self.registration.showNotification(title ?? 'GamerClock', {
      body: body ?? "CAL: Don't miss this.",
      icon: '/og-image.svg',
      badge: '/og-image.svg',
      data: { url: url ?? '/' },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'snooze_30', title: 'Snooze 30m' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  if (event.action === 'dismiss') return

  if (event.action === 'snooze_30') {
    const title = event.notification.title
    const options = {
      body: event.notification.body,
      icon: event.notification.icon,
      badge: '/og-image.svg',
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
