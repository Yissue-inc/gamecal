import { test, expect } from '@playwright/test'

test.describe('Admin Console (Standalone)', () => {
  test('Admin Console HTML이 로드된다', async ({ page }) => {
    await page.goto('/admin/console.html')
    await expect(page.locator('[data-testid="admin-setup-screen"]')).toBeVisible()
    await expect(page.locator('[data-testid="supabase-url-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="service-key-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="admin-secret-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="site-url-input"]')).toBeVisible()
  })

  test('필수 필드 없이 Connect 버튼이 비활성화된다', async ({ page }) => {
    await page.goto('/admin/console.html')
    await expect(page.locator('[data-testid="connect-admin-button"]')).toBeDisabled()
  })

  test('Next.js Admin 랜딩 페이지에서 Console 링크가 있다', async ({ page }) => {
    await page.goto('/admin?secret=dev-admin-secret')
    await expect(page.locator('[data-testid="admin-landing"]')).toBeVisible()
    await expect(page.locator('[data-testid="open-admin-console"]')).toBeVisible()
  })

  test('Admin verify API — 잘못된 secret은 401', async ({ request }) => {
    const res = await request.get('/api/admin/verify?secret=wrong-secret')
    expect(res.status()).toBe(401)
  })

  test('Admin crawl API — secret 없으면 401', async ({ request }) => {
    const res = await request.post('/api/admin/crawl/fortnite')
    expect(res.status()).toBe(401)
  })

  test('Admin crawl API — 올바른 secret이면 200', async ({ request }) => {
    const secret = process.env.ADMIN_SECRET || 'dev-admin-secret'
    const res = await request.post('/api/admin/crawl/fortnite', {
      headers: { 'x-admin-secret': secret },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })
})
