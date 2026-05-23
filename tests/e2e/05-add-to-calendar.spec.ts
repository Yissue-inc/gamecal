import { test, expect } from '@playwright/test'

async function openTodayEventPanel(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForSelector('[data-testid="calendar-grid"]')
  await page.waitForSelector('.fc-day-today .fc-event', { timeout: 15000 })
  await page.locator('.fc-day-today .fc-event').first().click()
  await expect(page.locator('[data-testid="event-panel"]')).toBeVisible()
}

test.describe('Add to Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await openTodayEventPanel(page)
  })

  test('Add to Calendar 드롭다운이 열린다', async ({ page }) => {
    await page.click('[data-testid="add-to-calendar-btn"]')
    await expect(page.locator('[data-testid="google-calendar-link"]')).toBeVisible()
    await expect(page.locator('[data-testid="outlook-calendar-link"]')).toBeVisible()
    await expect(page.locator('[data-testid="ical-download-link"]')).toBeVisible()
    await expect(page.locator('[data-testid="copy-btn"]')).toBeVisible()
  })

  test('Google Calendar 링크에 calendar.google.com이 포함된다', async ({ page }) => {
    await page.click('[data-testid="add-to-calendar-btn"]')
    const href = await page.locator('[data-testid="google-calendar-link"]').getAttribute('href')
    expect(href).toContain('calendar.google.com')
    expect(href).toContain('action=TEMPLATE')
  })

  test('iCal 다운로드 링크가 .ics 경로를 가리킨다', async ({ page }) => {
    await page.click('[data-testid="add-to-calendar-btn"]')
    const href = await page.locator('[data-testid="ical-download-link"]').getAttribute('href')
    expect(href).toMatch(/\/api\/events\/.+\/ics/)
  })

  test('COPY 버튼 클릭 시 Discord 포맷이 클립보드에 복사된다', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.click('[data-testid="add-to-calendar-btn"]')
    await page.click('[data-testid="copy-btn"]')
    await expect(page.locator('text=/Copied/')).toBeVisible()
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard).toContain('🎮')
  })

  test('Reddit 포맷 복사 버튼이 동작한다', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.click('[data-testid="copy-reddit-btn"]')
    await expect(page.locator('text=/Copied/')).toBeVisible()
  })
})
