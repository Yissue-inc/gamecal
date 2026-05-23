import axios from 'axios'
import * as cheerio from 'cheerio'
import { upsertEvents } from '@/lib/crawlers/shared'

export async function crawlLol() {
  const events: Parameters<typeof upsertEvents>[0] = []

  try {
    const { data: rss } = await axios.get(
      'https://www.leagueoflegends.com/en-us/news/rss/',
      { timeout: 10000 }
    )
    const $ = cheerio.load(rss, { xmlMode: true })
    $('item').slice(0, 8).each((_, el) => {
      const title = $(el).find('title').text()
      const link = $(el).find('link').text()
      const pubDate = $(el).find('pubDate').text()
      if (!title) return

      const isPatch = title.toLowerCase().includes('patch')
      events.push({
        title,
        event_type: isPatch ? 'patch_release' : 'new_content',
        importance: isPatch ? 'high' : 'normal',
        start_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        source_url: link || 'https://leagueoflegends.com',
      })
    })
  } catch {
    // ignore
  }

  const riotKey = process.env.RIOT_API_KEY
  if (riotKey) {
    try {
      const { data } = await axios.get(
        'https://na1.api.riotgames.com/lol/status/v4/platform-data',
        { headers: { 'X-Riot-Token': riotKey }, timeout: 10000 }
      )
      for (const incident of (data?.incidents ?? []).slice(0, 3)) {
        events.push({
          title: `Server Status: ${incident.name ?? 'Maintenance'}`,
          event_type: 'maintenance',
          importance: 'high',
          start_at: incident.created_at ?? new Date().toISOString(),
          source_url: 'https://leagueoflegends.com',
        })
      }
    } catch {
      // ignore
    }
  }

  return upsertEvents(events, 'lol')
}
