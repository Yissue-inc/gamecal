import { test, expect } from '@playwright/test'

test('homepage loads within 5 seconds', async ({ page }) => {
  const startTime = Date.now()
  await page.goto('/')
  await page.waitForSelector('[data-testid="calendar-grid"]')
  const loadTime = Date.now() - startTime
  expect(loadTime).toBeLessThan(5000)
})

test('no critical console errors on homepage', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  await page.goto('/')
  await page.waitForSelector('[data-testid="calendar-grid"]')
  const criticalErrors = errors.filter(
    (e) => !e.includes('favicon') && !e.includes('404') && !e.includes('ServiceWorker')
  )
  expect(criticalErrors).toHaveLength(0)
})
