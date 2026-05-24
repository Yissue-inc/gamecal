import { test, expect } from '@playwright/test'
import { hasAuthCredentials, loginWithEmail } from '../helpers/auth'

test.describe('Design UI — Sidebar & Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="calendar-grid"]')
  })

  test('사이드바 헤더가 Games로 표시된다', async ({ page }) => {
    const header = page.locator('[data-testid="games-section-header"]')
    await expect(header).toBeVisible()
    await expect(header).toHaveText('Games')
    await expect(header).not.toContainText('Game Select')
  })

  test('게임 항목에 플랫폼 칩이 표시된다', async ({ page }) => {
    const platforms = page.locator('[data-testid="game-platforms-fortnite"]')
    await expect(platforms).toBeVisible()
    await expect(page.locator('[data-testid="platform-chip-fortnite-pc"]')).toBeVisible()
  })

  test('이벤트 바에 타입 아이콘이 prefix로 표시된다', async ({ page }) => {
    if (hasAuthCredentials()) {
      await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
      await page.goto('/')
      await page.waitForSelector('[data-testid="calendar-grid"]')
    }

    await page.waitForSelector('.fc-event', { timeout: 15000 })
    const visibleEvent = page.locator('.fc-event:not(.guest-blurred-event)').first()
    test.skip((await visibleEvent.count()) === 0, 'No unblurred events in current view')

    await expect(visibleEvent).toHaveAttribute('data-event-type', /.*/)
    const text = await visibleEvent.textContent()
    expect(text).toMatch(/[🔄🚀🏁🎉🎁🔧🏆📊⏳⚡🛠✨📌]/)
  })

  test('로그인 사용자에게 critical 이벤트가 강조 표시된다', async ({ page }) => {
    test.skip(!hasAuthCredentials(), 'Requires authenticated user')
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await page.goto('/')
    await page.click('[data-testid="nav-next"]')
    await page.waitForSelector('[data-testid="critical-event-bar"]', { timeout: 15000 })
    await expect(page.locator('[data-testid="critical-event-bar"]').first()).toBeVisible()
  })
})

test.describe('Design UI — Guest Blur Banner', () => {
  test('게스트 배너에 잠긴 이벤트 수와 Sign in free CTA가 표시된다', async ({ page }) => {
    await page.goto('/')
    const overlay = page.locator('[data-testid="blur-overlay"]')
    await expect(overlay).toBeVisible()
    await expect(page.locator('[data-testid="locked-event-count"]')).toBeVisible()
    await expect(overlay).toContainText('Sign in to unlock the full calendar')
    await expect(page.locator('[data-testid="sign-in-free-button"]')).toBeVisible()
  })

  test('Sign in free 버튼 클릭 시 Auth 모달이 열린다', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="sign-in-free-button"]')
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible()
  })
})

test.describe('Design UI — New Releases', () => {
  test('서브타이틀이 PC · Console · Mobile로 표시된다', async ({ page }) => {
    await page.goto('/new-releases')
    await expect(page.locator('[data-testid="new-releases-subtitle"]')).toHaveText(
      'PC · Console · Mobile — upcoming titles'
    )
  })

  test('릴리즈 카드에 gradient 커버 플레이스홀더가 표시된다', async ({ page }) => {
    await page.goto('/new-releases')
    await expect(page.locator('[data-testid="release-hero-placeholder"]').first()).toBeVisible()
  })
})

test.describe('Design UI — Typography', () => {
  test('GAMECAL 로고에 Rajdhani 폰트가 적용된다', async ({ page }) => {
    await page.goto('/')
    const logo = page.locator('[data-testid="logo-link"]')
    const fontFamily = await logo.evaluate((el) => getComputedStyle(el).fontFamily)
    expect(fontFamily.toLowerCase()).toContain('rajdhani')
  })
})
