import axios from 'axios'
import * as cheerio from 'cheerio'
import { upsertEvents } from '@/lib/crawlers/shared'
import type { EventType } from '@/types'

function classifyEvent(title: string): EventType {
  const lower = title.toLowerCase()
  if (lower.includes('community day')) return 'live_event'
  if (lower.includes('raid hour')) return 'tournament'
  if (lower.includes('spotlight hour')) return 'limited_reward'
  if (lower.includes('fest')) return 'live_event'
  if (lower.includes('season')) return 'season_end'
  return 'live_event'
}

export async function crawlPokemonGo() {
  const events: Parameters<typeof upsertEvents>[0] = []

  try {
    const { data: html } = await axios.get('https://leekduck.com/events/', { timeout: 15000 })
    const $ = cheerio.load(html)

    $('.event-item, article, .event').slice(0, 15).each((_, el) => {
      const title = $(el).find('h2, h3, .event-title').first().text().trim()
      const dateText = $(el).find('.event-date, time, .date').first().text().trim()
      if (!title) return

      const parsed = dateText ? new Date(dateText) : new Date()
      if (isNaN(parsed.getTime())) return

      events.push({
        title,
        event_type: classifyEvent(title),
        importance: title.toLowerCase().includes('community day') ? 'critical' : 'high',
        start_at: parsed.toISOString(),
        source_url: 'https://pokemongolive.com',
      })
    })
  } catch {
    // LeekDuck unavailable
  }

  return upsertEvents(events, 'pokemon-go')
}
