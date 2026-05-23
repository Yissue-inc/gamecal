import { test, expect } from '@playwright/test'

test.describe('Guest experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('캘린더 그리드가 표시된다', async ({ page }) => {
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible()
  })

  test('게임 사이드바에 All + 5개 게임 체크박스가 있다', async ({ page }) => {
    const sidebar = page.locator('[data-testid="game-sidebar"]')
    await expect(sidebar).toBeVisible()
    await expect(page.locator('[data-testid="game-checkbox-all"]')).toBeVisible()
    await expect(page.locator('[data-testid="game-checkbox-fortnite"]')).toBeVisible()
    await expect(page.locator('[data-testid="game-checkbox-wow"]')).toBeVisible()
  })

  test('오늘 날짜 셀이 강조 표시된다', async ({ page }) => {
    await expect(page.locator('[data-testid="today-cell"]')).toBeVisible()
  })

  test('게스트 배너(blur-overlay)에 가입 CTA가 있다', async ({ page }) => {
    const overlay = page.locator('[data-testid="blur-overlay"]')
    await expect(overlay).toBeVisible()
    await expect(overlay).toContainText('Sign up')
  })

  test('헤더에 Sign In 버튼이 표시된다', async ({ page }) => {
    await expect(page.locator('[data-testid="signin-button"]')).toBeVisible()
  })

  test('가입 CTA 클릭 시 Auth 모달이 열린다', async ({ page }) => {
    await page.click('[data-testid="create-account-button"]')
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible()
  })

  test('Sign In 버튼 클릭 시 Auth 모달이 열린다', async ({ page }) => {
    await page.click('[data-testid="signin-button"]')
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible()
  })
})
