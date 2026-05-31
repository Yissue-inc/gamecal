import { expect, type Page, test } from '@playwright/test'
import { hasAuthCredentials, loginWithEmail } from './auth'

export async function openEventPanel(page: Page) {
  test.skip(!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD), 'Event detail panel requires authenticated user')

  if (hasAuthCredentials() && !(await page.locator('[data-testid="user-menu"]').count())) {
    await loginWithEmail(page, process.env.TEST_USER_EMAIL!, process.env.TEST_USER_PASSWORD!)
  }

  await page.goto('/')
  await page.waitForSelector('[data-testid="calendar-grid"]')

  const todayEvent = page.locator('.fc-day-today .fc-event[data-game]:not(.guest-blurred-event)').first()
  if (await todayEvent.count()) {
    await todayEvent.click({ force: true })
    await expect(page.locator('[data-testid="event-panel"]')).toBeVisible()
    return
  }

  const visible = page.locator('.fc-event[data-game]:not(.guest-blurred-event)').first()
  if (await visible.count()) {
    await visible.click({ force: true })
    await expect(page.locator('[data-testid="event-panel"]')).toBeVisible()
    return
  }

  test.skip(true, 'No visible events available to open event panel')
}
