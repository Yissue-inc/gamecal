import { test, expect } from '@playwright/test'

test.describe('New Releases', () => {
  test('New Releases 페이지가 로드된다', async ({ page }) => {
    await page.goto('/new-releases')
    await expect(page.locator('h1')).toContainText('New Releases')
  })

  test('Featured 및 전체 출시 목록이 표시된다', async ({ page }) => {
    await page.goto('/new-releases')
    await expect(page.locator('text=Featured')).toBeVisible()
    await expect(page.locator('text=All Upcoming')).toBeVisible()
  })

  test('/newtitle 리다이렉트가 /new-releases로 동작한다', async ({ page }) => {
    await page.goto('/newtitle')
    await expect(page).toHaveURL(/\/new-releases/)
  })

  test('존재하지 않는 경로는 404 페이지를 표시한다', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    await expect(page.locator('text=Event not found')).toBeVisible()
  })
})
