import { test, expect } from '@playwright/test'

test.describe('UX Phase 2 — layout & feed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="calendar-grid"]', { timeout: 15000 })
  })

  test('3-column layout: sidebar, calendar, upcoming feed on desktop', async ({ page }) => {
    await expect(page.locator('[data-testid="game-sidebar"]')).toBeVisible()
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible()
    await expect(page.locator('[data-testid="upcoming-feed"]')).toBeVisible()
  })

  test('sidebar is 220px wide', async ({ page }) => {
    const box = await page.locator('[data-testid="game-sidebar"]').boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(210)
    expect(box?.width).toBeLessThanOrEqual(230)
  })

  test('weekly highlights or upcoming feed renders', async ({ page }) => {
    const highlights = page.locator('[data-testid="weekly-highlights"]')
    const feed = page.locator('[data-testid="upcoming-feed"]')
    await expect(feed).toBeVisible()
    const highlightCount = await highlights.count()
    if (highlightCount > 0) {
      await expect(highlights).toBeVisible()
    }
  })

  test('digest subscribe form in sidebar', async ({ page }) => {
    await expect(page.locator('[data-testid="digest-subscribe-form"]')).toBeVisible()
  })

  test('timezone label in header', async ({ page }) => {
    await expect(page.locator('[data-testid="timezone-label"]')).toBeVisible()
  })

  test('Cmd+K opens command search', async ({ page }) => {
    await page.keyboard.press('Meta+k')
    await expect(page.locator('[data-testid="command-search-overlay"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="command-search-overlay"]')).not.toBeVisible()
  })
})

test.describe('Engagement — wishlist & panel', () => {
  test('event panel shows wishlist and reminder controls', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="calendar-grid"]')
    const todayEvent = page.locator('.fc-day-today .fc-event').first()
    test.skip((await todayEvent.count()) === 0, 'No today events')
    await todayEvent.click()
    await expect(page.locator('[data-testid="wishlist-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="reminder-picker"]')).toBeVisible()
    await expect(page.locator('[data-testid="tracking-counter"]')).toBeVisible()
  })

  test('guest wishlist click prompts login toast', async ({ page }) => {
    test.skip(!!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD), 'Guest only')
    await page.goto('/')
    await page.waitForSelector('[data-testid="calendar-grid"]')
    const todayEvent = page.locator('.fc-day-today .fc-event').first()
    test.skip((await todayEvent.count()) === 0, 'No today events')
    await todayEvent.click()
    await page.click('[data-testid="wishlist-button"]')
    await expect(page.getByText(/Sign in free to save events/i)).toBeVisible({ timeout: 5000 })
  })

  test('my-schedule and profile pages load', async ({ page }) => {
    await page.goto('/my-schedule')
    await expect(page.locator('[data-testid="my-schedule-page"]')).toBeVisible()
    await page.goto('/profile')
    await expect(page.locator('[data-testid="profile-page"]')).toBeVisible()
  })
})

test.describe('Engagement — profile badges', () => {
  test('badge gallery renders on profile', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.locator('[data-testid="badge-gallery"]')).toBeVisible()
    await expect(page.locator('[data-testid="badge-streak_3"]')).toBeVisible()
  })
})
