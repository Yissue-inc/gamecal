import type { Page } from '@playwright/test'

export async function loginWithEmail(page: Page, email: string, password: string) {
  await page.goto('/')
  await page.click('[data-testid="signin-button"]')
  await page.waitForSelector('[data-testid="auth-modal"]')
  await page.fill('[data-testid="email"]', email)
  await page.fill('[data-testid="password"]', password)
  await page.click('[data-testid="submit-auth"]')
  await page.waitForSelector('[data-testid="calendar-grid"]', { timeout: 15000 })
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]')
  await page.click('[data-testid="signout-button"]')
  await page.waitForSelector('[data-testid="signin-button"]')
}

export function hasAuthCredentials(): boolean {
  return !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD)
}
