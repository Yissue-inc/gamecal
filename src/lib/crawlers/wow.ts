import axios from 'axios'
import * as cheerio from 'cheerio'
import { upsertEvents } from '@/lib/crawlers/shared'

async function getBattleNetToken(): Promise<string | null> {
  const clientId = process.env.BATTLENET_CLIENT_ID
  const clientSecret = process.env.BATTLENET_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const { data } = await axios.post(
      'https://oauth.battle.net/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        auth: { username: clientId, password: clientSecret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    )
    return data.access_token
  } catch {
    return null
  }
}

export async function crawlWow() {
  const events: Parameters<typeof upsertEvents>[0] = []
  const token = await getBattleNetToken()

  if (token) {
    try {
      const { data } = await axios.get(
        'https://us.api.blizzard.com/data/wow/news/?namespace=static-us&locale=en_US',
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      )
      for (const item of (data?.news ?? []).slice(0, 5)) {
        if (!item.creation_date) continue
        events.push({
          title: item.title,
          description: item.description ?? '',
          event_type: 'patch_release',
          importance: 'high',
          start_at: item.creation_date ?? new Date().toISOString(),
          source_url: item.url ?? 'https://worldofwarcraft.com',
          image_url: item.thumbnail_url ?? item.image_url,
        })
      }
    } catch {
      // fallback below
    }
  }

  try {
    const { data: rss } = await axios.get('https://www.wowhead.com/news/rss', { timeout: 10000 })
    const $ = cheerio.load(rss, { xmlMode: true })
    $('item').slice(0, 3).each((_, el) => {
      const title = $(el).find('title').text()
      const link = $(el).find('link').text()
      const pubDate = $(el).find('pubDate').text()
      const description = $(el).find('description').text().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const imageUrl =
        $(el).find('media\\:content, content').attr('url') ||
        $(el).find('enclosure').attr('url')
      const parsed = pubDate ? new Date(pubDate) : null
      if (title && parsed && !Number.isNaN(parsed.getTime())) {
        events.push({
          title,
          description,
          event_type: 'new_content',
          importance: 'normal',
          start_at: parsed.toISOString(),
          source_url: link || 'https://worldofwarcraft.com',
          image_url: imageUrl,
        })
      }
    })
  } catch {
    // ignore
  }

  const now = new Date()
  for (let i = 0; i < 8; i++) {
    const tuesday = new Date(now)
    tuesday.setDate(tuesday.getDate() + ((2 - tuesday.getDay() + 7) % 7 || 7) + i * 7)
    tuesday.setUTCHours(15, 0, 0, 0)
    const end = new Date(tuesday)
    end.setDate(end.getDate() + 7)
    end.setUTCHours(14, 59, 0, 0)

    events.push({
      title: 'Weekly Reset',
      description: 'Mythic+ weekly chest, raid lockouts, world quests, and weekly activities reset.',
      event_type: 'weekly_reset',
      importance: 'high',
      start_at: tuesday.toISOString(),
      end_at: end.toISOString(),
      source_url: 'https://worldofwarcraft.com',
      is_recurring: true,
    })
  }

  return upsertEvents(events, 'wow')
}
