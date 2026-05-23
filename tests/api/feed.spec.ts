import { test, expect } from '@playwright/test'

const GAMES = ['fortnite', 'wow', 'pokemon-go', 'genshin', 'lol', 'all']

for (const game of GAMES) {
  test(`GET /api/feed/${game} returns valid ICS`, async ({ request }) => {
    const response = await request.get(`/api/feed/${game}`)
    expect(response.status()).toBe(200)

    const contentType = response.headers()['content-type'] || ''
    expect(contentType).toContain('text/calendar')

    const body = await response.text()
    expect(body).toContain('BEGIN:VCALENDAR')
    expect(body).toContain('VERSION:2.0')
    expect(body).toContain('END:VCALENDAR')
  })
}

test('invalid game slug returns 404', async ({ request }) => {
  const response = await request.get('/api/feed/invalid-game-xyz')
  expect(response.status()).toBe(404)
})
