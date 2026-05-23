import axios from 'axios'
import * as cheerio from 'cheerio'
import { upsertEvents } from '@/lib/crawlers/shared'

export async function crawlGenshin() {
  const events: Parameters<typeof upsertEvents>[0] = []

  try {
    const { data: html } = await axios.get('https://genshin.hoyoverse.com/en/news', { timeout: 15000 })
    const $ = cheerio.load(html)

    $('a[href*="/news/detail/"], .news-item, article').slice(0, 10).each((_, el) => {
      const title = $(el).find('h3, .title, span').first().text().trim() || $(el).text().trim()
      if (!title || title.length < 5) return

      events.push({
        title: title.slice(0, 120),
        event_type: title.toLowerCase().includes('version') ? 'new_content' : 'live_event',
        importance: title.toLowerCase().includes('version') ? 'critical' : 'high',
        start_at: new Date().toISOString(),
        source_url: 'https://genshin.hoyoverse.com',
      })
    })
  } catch {
    // ignore
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  for (const day of [1, 16]) {
    const reset = new Date(Date.UTC(year, month, day, 4, 0, 0))
    if (reset > now) {
      events.push({
        title: 'Spiral Abyss Reset',
        event_type: 'weekly_reset',
        importance: 'normal',
        start_at: reset.toISOString(),
        source_url: 'https://genshin.hoyoverse.com',
        is_recurring: true,
      })
    }
  }

  return upsertEvents(events, 'genshin')
}
