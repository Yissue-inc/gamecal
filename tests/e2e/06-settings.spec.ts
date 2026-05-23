import { test, expect } from '@playwright/test'
import { hasAuthCredentials, loginWithEmail } from '../helpers/auth'

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasAuthCredentials(), 'Requires TEST_USER_EMAIL/PASSWORD')
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await page.goto('/settings')
  })

  test('설정 페이지가 로드되고 폼이 표시된다', async ({ page }) => {
    await expect(page.locator('[data-testid="settings-form"]')).toBeVisible()
    await expect(page.locator('[data-testid="settings-nav-general"]')).toBeVisible()
    await expect(page.locator('[data-testid="settings-nav-time-zone"]')).toBeVisible()
  })

  test('타임존 변경 후 저장하면 성공 토스트가 표시된다', async ({ page }) => {
    await page.click('[data-testid="settings-nav-time-zone"]')
    await page.click('[data-testid="timezone-select"]')
    await page.getByRole('option', { name: 'America/Los_Angeles' }).click()
    await page.click('[data-testid="settings-save-btn"]')
    await expect(page.locator('text=/saved/i')).toBeVisible()
  })

  test('비로그인 사용자는 설정 페이지 접근 시 로그인으로 리다이렉트된다', async ({ page }) => {
    test.skip(hasAuthCredentials(), 'Run without credentials')
    await page.goto('/settings')
    await page.waitForURL('**/auth/login**')
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible()
  })
})
