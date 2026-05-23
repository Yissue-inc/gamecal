import { request as pwRequest } from '@playwright/test'

export async function checkEventsSeeded(baseURL: string): Promise<boolean> {
  const ctx = await pwRequest.newContext({ baseURL })
  const res = await ctx.get('/api/events')
  const data = await res.json()
  await ctx.dispose()
  return Array.isArray(data.events) && data.events.length > 0
}
