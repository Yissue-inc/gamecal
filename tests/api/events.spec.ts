import { test, expect } from '@playwright/test'

test('GET /api/events returns an events array', async ({ request }) => {
  const response = await request.get('/api/events')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(Array.isArray(body.events)).toBe(true)
})

test('GET /api/events?game=fortnite filters correctly', async ({ request }) => {
  const response = await request.get('/api/events?game=fortnite')
  const body = await response.json()
  for (const event of body.events) {
    expect(event.game?.slug).toBe('fortnite')
  }
})

test('GET /api/games returns 5 games', async ({ request }) => {
  const response = await request.get('/api/games')
  expect(response.status()).toBe(200)
  const body = await response.json()
  expect(body.games.length).toBeGreaterThanOrEqual(5)
})

test('GET /api/admin/verify requires valid secret', async ({ request }) => {
  const bad = await request.get('/api/admin/verify?secret=invalid')
  expect(bad.status()).toBe(401)
  const secret = process.env.ADMIN_SECRET || 'local-admin'
  const good = await request.get(`/api/admin/verify?secret=${secret}`)
  expect(good.status()).toBe(200)
})

test('POST /api/admin/crawl/fortnite requires admin secret', async ({ request }) => {
  const response = await request.post('/api/admin/crawl/fortnite')
  expect(response.status()).toBe(401)
})

test('sitemap.xml is valid', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain('<urlset')
})

test('robots.txt allows root and blocks admin', async ({ request }) => {
  const response = await request.get('/robots.txt')
  expect(response.status()).toBe(200)
  const body = await response.text()
  expect(body).toContain('Allow: /')
  expect(body).toContain('Disallow: /admin')
})
