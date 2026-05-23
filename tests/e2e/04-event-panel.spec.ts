import { test, expect } from '@playwright/test'

test.describe('Event Detail Panel', () => {
  async function openTodayEvent(page: import('@playwright/test').Page) {
    await page.goto('/')
    await page.waitForSelector('[data-testid="calendar-grid"]')
    await page.waitForSelector('.fc-day-today .fc-event', { timeout: 15000 })
    await page.locator('.fc-day-today .fc-event').first().click()
  }

  test('오늘 이벤트 클릭 시 상세 패널이 열린다', async ({ page }) => {
    await openTodayEvent(page)
    await expect(page.locator('[data-testid="event-panel"]')).toBeVisible()
  })

  test('패널에 이벤트 제목이 표시된다', async ({ page }) => {
    await openTodayEvent(page)
    await expect(page.locator('[data-testid="event-title"]')).not.toBeEmpty()
  })

  test('패널에 날짜 정보가 표시된다', async ({ page }) => {
    await openTodayEvent(page)
    await expect(page.locator('[data-testid="event-date-range"]')).toBeVisible()
  })

  test('패널에 카운트다운이 표시된다', async ({ page }) => {
    await openTodayEvent(page)
    await expect(page.locator('[data-testid="event-countdown"]')).toBeVisible()
  })

  test('닫기 버튼으로 패널이 닫힌다', async ({ page }) => {
    await openTodayEvent(page)
    await expect(page.locator('[data-testid="event-panel"]')).toBeVisible()
    await page.click('[data-testid="close-event-panel"]')
    await expect(page.locator('[data-testid="event-panel"]')).not.toBeVisible()
  })

  test('게스트가 blur 이벤트 클릭 시 Auth 모달이 열린다', async ({ page }) => {
    test.skip(!!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD), 'Requires guest mode')
    await page.goto('/')
    await page.click('[data-testid="nav-next"]')
    await page.waitForTimeout(500)
    const hidden = page.locator('.guest-blurred-event').first()
    test.skip((await hidden.count()) === 0, 'No blurred events in view')
    await hidden.click()
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible()
  })
})
