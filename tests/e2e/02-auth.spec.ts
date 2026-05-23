import { test, expect } from '@playwright/test'
import { hasAuthCredentials, loginWithEmail, logout } from '../helpers/auth'

test.describe('Authentication', () => {
  test('Sign In 클릭 시 Auth 모달이 열린다', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="signin-button"]')
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible()
  })

  test('Auth 모달에 Google 및 Email 입력이 있다', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="signin-button"]')
    await expect(page.locator('[data-testid="google-signin-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="email"]')).toBeVisible()
    await expect(page.locator('[data-testid="password"]')).toBeVisible()
  })

  test('잘못된 이메일 형식 제출 시 브라우저 유효성 검사가 동작한다', async ({ page }) => {
    await page.goto('/')
    await page.click('[data-testid="signin-button"]')
    await page.fill('[data-testid="email"]', 'not-an-email')
    await page.fill('[data-testid="password"]', 'short')
    await page.click('[data-testid="submit-auth"]')
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible()
  })

  test('Supabase 미설정 시 로그인 에러 메시지가 표시된다', async ({ page }) => {
    test.skip(!!process.env.NEXT_PUBLIC_SUPABASE_URL, 'Only when Supabase not configured')
    await page.goto('/auth/login')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'Test1234!')
    await page.click('[data-testid="submit-auth"]')
    await expect(page.locator('[data-testid="error-title"]')).toBeVisible({ timeout: 5000 })
  })

  test('로그인 후 blur 배너가 사라진다', async ({ page }) => {
    test.skip(!hasAuthCredentials(), 'Requires TEST_USER_EMAIL/PASSWORD')
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await expect(page.locator('[data-testid="blur-overlay"]')).not.toBeVisible()
  })

  test('로그아웃 후 Sign In 버튼이 다시 표시된다', async ({ page }) => {
    test.skip(!hasAuthCredentials(), 'Requires TEST_USER_EMAIL/PASSWORD')
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
    await logout(page)
    await expect(page.locator('[data-testid="signin-button"]')).toBeVisible()
  })
})
