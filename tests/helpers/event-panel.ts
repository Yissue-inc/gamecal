import { expect, type Page, test } from '@playwright/test'

export async function openEventPanel(page: Page) {
  await page.goto('/')
  await page.waitForSelector('[data-testid="calendar-grid"]')

  const todayEvent = page.locator('.fc-day-today .fc-event').first()
  if (await todayEvent.count()) {
    await todayEvent.click()
    await expect(page.locator('[data-testid="event-panel"]')).toBeVisible()
    return
  }

  const visible = page.locator('.fc-event:not(.guest-blurred-event)').first()
  if (await visible.count()) {
    await visible.click()
    await expect(page.locator('[data-testid="event-panel"]')).toBeVisible()
    return
  }

  test.skip(true, 'No visible events available to open event panel')
}
