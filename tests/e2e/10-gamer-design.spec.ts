import { test, expect } from '@playwright/test'
import { hasAuthCredentials, loginWithEmail } from '../helpers/auth'

async function openEventPanel(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForSelector('[data-testid="calendar-grid"]')
  await page.waitForSelector('.fc-event:not(.guest-blurred-event)', { timeout: 15000 })
  await page.locator('.fc-event:not(.guest-blurred-event)').first().click()
  await expect(page.locator('[data-testid="event-panel"]')).toBeVisible()
}

test.describe('Gamer Design — Share & Countdown', () => {
  test('이벤트 패널에 Share 버튼(Discord/Reddit/Copy)이 표시된다', async ({ page }) => {
    if (hasAuthCredentials()) {
      await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    }
    await openEventPanel(page)
    await expect(page.locator('[data-testid="share-event-section"]')).toBeVisible()
    await expect(page.locator('[data-testid="share-discord-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="share-reddit-btn"]')).toBeVisible()
    await expect(page.locator('[data-testid="share-plain-btn"]')).toBeVisible()
  })

  test('Discord 공유 버튼 클릭 시 클립보드에 복사된다', async ({ page, context }) => {
    if (hasAuthCredentials()) {
      await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    }
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openEventPanel(page)
    await page.click('[data-testid="share-discord-btn"]')
    await expect(page.locator('text=/Copied/')).toBeVisible()
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard).toContain('**')
  })

  test('이벤트 패널에 게이머 카운트다운 형식이 표시된다', async ({ page }) => {
    if (hasAuthCredentials()) {
      await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    }
    await openEventPanel(page)
    const countdown = page.locator('[data-testid="event-countdown"]')
    await expect(countdown).toBeVisible()
    const text = await countdown.textContent()
    expect(text).toMatch(/⏳|LIVE|left|Starts in|D-|Ended/)
  })

  test('이벤트 패널 상단에 hero 배너가 표시된다', async ({ page }) => {
    if (hasAuthCredentials()) {
      await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    }
    await openEventPanel(page)
    await expect(page.locator('[data-testid="event-panel-hero"]')).toBeVisible()
  })
})

test.describe('Gamer Design — Mobile & Calendar', () => {
  test('모바일에서 가로 스크롤 게임 칩이 표시된다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.locator('[data-testid="mobile-game-chips"]')).toBeVisible()
    await expect(page.locator('[data-testid="mobile-chip-fortnite"]')).toBeVisible()
  })

  test('모바일 게임 칩 클릭 시 필터가 토글된다', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForSelector('[data-testid="calendar-grid"]')
    const chip = page.locator('[data-testid="mobile-chip-fortnite"]')
    await chip.click()
    await expect(chip).toHaveClass(/border-zinc-700/)
  })

  test('캘린더 출시일 셀에 release art가 표시된다', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="calendar-grid"]')
    const releaseCell = page.locator('[data-testid^="release-cell-"]').first()
    test.skip((await releaseCell.count()) === 0, 'No release dates in current month view')
    await expect(releaseCell).toBeVisible()
  })

  test('출시 셀 클릭 시 릴리즈 패널이 열린다', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="calendar-grid"]')
    const releaseCell = page.locator('[data-testid^="release-cell-"]').first()
    test.skip((await releaseCell.count()) === 0, 'No release dates in current month view')
    await releaseCell.click()
    await expect(page.locator('[data-testid="release-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="release-panel-title"]')).not.toBeEmpty()
  })
})

test.describe('Gamer Design — New Releases Hero', () => {
  test('New Releases 히어로 카드가 표시된다', async ({ page }) => {
    await page.goto('/new-releases')
    await expect(page.locator('[data-testid="new-releases-hero"]')).toBeVisible()
    await expect(page.locator('[data-testid="new-releases-hero-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="hero-release-title"]')).not.toBeEmpty()
  })

  test('히어로 카드에 D-day 뱃지가 표시된다', async ({ page }) => {
    await page.goto('/new-releases')
    await expect(page.locator('[data-testid="hero-dday-badge"]')).toBeVisible()
  })
})
