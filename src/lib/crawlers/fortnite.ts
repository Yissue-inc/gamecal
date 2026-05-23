import axios from 'axios'
import { upsertEvents } from '@/lib/crawlers/shared'

export async function crawlFortnite() {
  const events: Parameters<typeof upsertEvents>[0] = []

  try {
    const { data } = await axios.get('https://fortnite-api.com/v2/news?language=en', { timeout: 10000 })
    const messages = data?.data?.motds ?? data?.data?.br?.motds ?? []

    for (const item of messages.slice(0, 5)) {
      events.push({
        title: item.title ?? item.tabTitle ?? 'Fortnite News',
        description: item.body ?? item.shortText ?? '',
        event_type: 'live_event',
        importance: 'high',
        start_at: new Date().toISOString(),
        source_url: 'https://fortnite.com',
      })
    }
  } catch {
    // API unavailable — continue with recurring events
  }

  const now = new Date()
  for (let i = 0; i < 8; i++) {
    const thursday = new Date(now)
    thursday.setDate(thursday.getDate() + ((4 - thursday.getDay() + 7) % 7) + i * 7)
    thursday.setUTCHours(9, 0, 0, 0)
    const end = new Date(thursday)
    end.setDate(end.getDate() + 7)
    end.setUTCHours(8, 59, 0, 0)

    events.push({
      title: 'Weekly Quests Reset',
      event_type: 'weekly_reset',
      importance: 'high',
      start_at: thursday.toISOString(),
      end_at: end.toISOString(),
      source_url: 'https://fortnite.com',
      is_recurring: true,
    })
  }

  return upsertEvents(events, 'fortnite')
}
