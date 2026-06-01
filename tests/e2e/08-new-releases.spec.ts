import { test, expect } from '@playwright/test'

test.describe('New Releases', () => {
  test('New Releases 페이지가 로드된다', async ({ page }) => {
    await page.goto('/new-releases')
    await expect(page.locator('h1')).toContainText('New Releases')
  })

  test('Featured 및 전체 출시 목록이 표시된다', async ({ page }) => {
    await page.goto('/new-releases')
    await expect(page.locator('[data-testid="new-releases-hero"]')).toBeVisible()
    await expect(page.locator('[data-testid="all-releases-section"]')).toBeVisible()
  })

  test('서브타이틀과 커버 플레이스홀더가 표시된다', async ({ page }) => {
    await page.goto('/new-releases')
    await expect(page.locator('[data-testid="new-releases-subtitle"]')).toContainText('PC · Console · Mobile')
    await expect(page.locator('[data-testid="release-hero-placeholder"]').first()).toBeVisible()
  })

  test('/newtitle 리다이렉트가 /new-releases로 동작한다', async ({ page }) => {
    await page.goto('/newtitle')
    await expect(page).toHaveURL(/\/new-releases/)
  })

  test('존재하지 않는 경로는 404 페이지를 표시한다', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await expect(page.locator('text=Page not found')).toBeVisible()
  })
})
