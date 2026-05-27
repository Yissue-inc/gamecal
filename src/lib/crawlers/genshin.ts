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
      const timeText = $(el).find('time, .date').first().attr('datetime') || $(el).find('time, .date').first().text().trim()
      const imageUrl = $(el).find('img').first().attr('src')
      const parsed = timeText ? new Date(timeText) : null
      if (!title || title.length < 5) return
      if (!parsed || Number.isNaN(parsed.getTime())) return

      events.push({
        title: title.slice(0, 120),
        description: title.slice(0, 180),
        event_type: title.toLowerCase().includes('version') ? 'new_content' : 'live_event',
        importance: title.toLowerCase().includes('version') ? 'critical' : 'high',
        start_at: parsed.toISOString(),
        source_url: 'https://genshin.hoyoverse.com',
        image_url: imageUrl?.startsWith('//') ? `https:${imageUrl}` : imageUrl,
      })
    })
  } catch {
    // ignore
  }

  const now = new Date()
  for (let offset = 0; offset < 3; offset++) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1, 4, 0, 0))
    for (const day of [1, 16]) {
      const reset = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), day, 4, 0, 0))
      if (reset <= now) continue
      events.push({
        title: 'Spiral Abyss Reset',
        description: 'Twice-monthly Spiral Abyss rotation and reward reset.',
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
