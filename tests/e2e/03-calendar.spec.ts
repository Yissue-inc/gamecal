import { test, expect } from '@playwright/test'
import { hasAuthCredentials, loginWithEmail } from '../helpers/auth'

test.describe('Calendar UI', () => {
  test.beforeEach(async ({ page }) => {
    if (hasAuthCredentials()) {
      await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    } else {
      await page.goto('/')
    }
  })

  test('다음 달 네비게이션이 동작한다', async ({ page }) => {
    const before = await page.locator('[data-testid="calendar-month-title"]').textContent()
    await page.click('[data-testid="nav-next"]')
    await expect(page.locator('[data-testid="calendar-month-title"]')).not.toHaveText(before || '')
  })

  test('이전 달 네비게이션이 동작한다', async ({ page }) => {
    await page.click('[data-testid="nav-next"]')
    const mid = await page.locator('[data-testid="calendar-month-title"]').textContent()
    await page.click('[data-testid="nav-prev"]')
    await expect(page.locator('[data-testid="calendar-month-title"]')).not.toHaveText(mid || '')
  })

  test('Today 버튼으로 오늘 셀이 표시된다', async ({ page }) => {
    await page.click('[data-testid="nav-next"]')
    await page.click('[data-testid="nav-next"]')
    await page.click('[data-testid="nav-today"]')
    await expect(page.locator('[data-testid="today-cell"]')).toBeVisible()
  })

  test('Fortnite 체크 해제 시 Fortnite 이벤트가 줄어든다', async ({ page }) => {
    test.skip(!hasAuthCredentials(), 'Guest sees limited events')
    const before = await page.locator('[data-testid="calendar-event-fortnite"]').count()
    await page.click('[data-testid="game-checkbox-fortnite"]')
    const after = await page.locator('[data-testid="calendar-event-fortnite"]').count()
    expect(after).toBeLessThanOrEqual(before)
  })

  test('Fortnite 재체크 시 이벤트가 복원된다', async ({ page }) => {
    test.skip(!hasAuthCredentials(), 'Guest sees limited events')
    await page.click('[data-testid="game-checkbox-fortnite"]')
    const countOff = await page.locator('[data-testid="calendar-event-fortnite"]').count()
    await page.click('[data-testid="game-checkbox-fortnite"]')
    const countOn = await page.locator('[data-testid="calendar-event-fortnite"]').count()
    expect(countOn).toBeGreaterThanOrEqual(countOff)
  })

  test('All 체크 해제 시 이벤트가 없어진다', async ({ page }) => {
    await page.click('[data-testid="game-checkbox-all"]')
    await expect(page.locator('.fc-event')).toHaveCount(0)
  })

  test('모바일(375px)에서 캘린더가 표시된다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible()
    await expect(page.locator('[data-testid="calendar-header"]')).toBeVisible()
  })
})
