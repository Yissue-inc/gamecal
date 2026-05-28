import { test, expect } from '@playwright/test'

async function hideFirstVisitIntro(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('gamecal-cinematic-seen', '1')
  })
}

test.describe('Smoke Test', () => {
  test('홈페이지가 GamerClock 타이틀로 로드된다', async ({ page }) => {
    await hideFirstVisitIntro(page)
    await page.goto('/')
    await expect(page).toHaveTitle(/GamerClock/)
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible()
  })

  test('게스트에게 오늘 날짜 셀이 표시된다', async ({ page }) => {
    await hideFirstVisitIntro(page)
    await page.goto('/')
    await expect(page.locator('[data-testid="today-cell"]')).toBeVisible()
  })

  test('ICS 피드가 캘린더 데이터를 반환한다', async ({ request }) => {
    const response = await request.get('/api/feed/fortnite')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('BEGIN:VCALENDAR')
  })
})
