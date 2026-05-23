import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('homepage - guest view', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('homepage-guest.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.05,
    })
  })

  test('new-releases page', async ({ page }) => {
    await page.goto('/new-releases')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('new-releases-page.png', {
      maxDiffPixelRatio: 0.05,
    })
  })

  test('mobile - homepage', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      maxDiffPixelRatio: 0.05,
    })
  })
})
