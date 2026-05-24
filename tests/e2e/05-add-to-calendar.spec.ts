import { test, expect } from '@playwright/test'
import { openEventPanel } from '../helpers/event-panel'

test.describe('Add to Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await openEventPanel(page)
  })

  test('Add to Calendar 드롭다운이 열린다', async ({ page }) => {
    await page.click('[data-testid="add-to-calendar-btn"]')
    await expect(page.locator('[data-testid="google-calendar-link"]')).toBeVisible()
    await expect(page.locator('[data-testid="outlook-calendar-link"]')).toBeVisible()
    await expect(page.locator('[data-testid="ical-download-link"]')).toBeVisible()
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

  test('Share Discord 버튼 클릭 시 클립보드에 복사된다', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.click('[data-testid="share-discord-btn"]')
    await expect(page.locator('text=/Copied/')).toBeVisible()
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard.length).toBeGreaterThan(10)
  })

  test('Share Reddit 버튼이 동작한다', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.click('[data-testid="share-reddit-btn"]')
    await expect(page.locator('text=/Copied/')).toBeVisible()
  })
})
