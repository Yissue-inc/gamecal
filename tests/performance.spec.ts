import { test, expect, type Page } from '@playwright/test'

async function waitForCalendarReady(page: Page) {
  await page.locator('[data-testid="calendar-grid"]').waitFor({ state: 'attached' })
  await expect(page.locator('[data-testid="today-cell"]')).toBeVisible()
}

test('homepage loads within 5 seconds', async ({ page }) => {
  const startTime = Date.now()
  await page.goto('/')
  await waitForCalendarReady(page)
  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(5000)
})

test('mobile homepage reaches calendar within 5 seconds', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const startTime = Date.now()
  await page.goto('/')
  await waitForCalendarReady(page)
  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(5000)
})

test('my wishlists route renders shell within 5 seconds', async ({ page }) => {
  const startTime = Date.now()
  await page.goto('/my-schedule')
  await page.waitForSelector('[data-testid="my-schedule-page"]')
  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(5000)
})

test('no critical console errors on homepage', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/')
  await waitForCalendarReady(page)
  const criticalErrors = errors.filter(
    (e) => !e.includes('favicon') && !e.includes('404') && !e.includes('ServiceWorker')
  )
  expect(criticalErrors).toHaveLength(0)
})
