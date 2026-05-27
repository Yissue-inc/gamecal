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

function parseLeekDuckDate(text: string): Date | null {
  const dateMatch = text.match(
    /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+[A-Z][a-z]{2}\s+\d{1,2},\s+(?:at\s+)?\d{1,2}:\d{2}\s+[AP]M\b/i
  )
  if (!dateMatch) return null

  const cleaned = dateMatch[0]
    .replace(/Starts?:/i, '')
    .replace(/Ends?:.*/i, '')
    .replace(/\s+Local Time/i, '')
    .replace(/\bat\b/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return null
  const withYear = /\b\d{4}\b/.test(cleaned) ? cleaned : `${cleaned}, ${new Date().getFullYear()}`
  const parsed = new Date(withYear)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function crawlPokemonGo() {
  const events: Parameters<typeof upsertEvents>[0] = []

  try {
    const { data: html } = await axios.get('https://leekduck.com/events/', { timeout: 15000 })
    const $ = cheerio.load(html)

    $('.event-item-wrapper').slice(0, 20).each((_, el) => {
      const title = $(el).find('h2, h3, .event-title').first().text().trim()
        || $(el).find('.event-text').first().contents().filter((_, node) => node.type === 'text').text().trim()
      const dateText = $(el).text().trim()
      const imageUrl = $(el).find('img').first().attr('src')
      if (!title) return

      const parsed = parseLeekDuckDate(dateText)
      if (!parsed) return

      events.push({
        title,
        event_type: classifyEvent(title),
        importance: title.toLowerCase().includes('community day') ? 'critical' : 'high',
        start_at: parsed.toISOString(),
        source_url: 'https://pokemongolive.com',
        description: dateText.replace(/\s+/g, ' ').slice(0, 220),
        image_url: imageUrl?.startsWith('//') ? `https:${imageUrl}` : imageUrl,
      })
    })
  } catch {
    // LeekDuck unavailable
  }

  return upsertEvents(events, 'pokemon-go')
}
