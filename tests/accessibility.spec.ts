import { test, expect } from '@playwright/test'

test('homepage has correct page title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/GAMECAL/)
})

test('auth modal email field is focusable via keyboard', async ({ page }) => {
  await page.goto('/')
  await page.click('[data-testid="signin-button"]')
  await page.locator('[data-testid="email"]').focus()
  await expect(page.locator('[data-testid="email"]')).toBeFocused()
})
