import type { MetadataRoute } from 'next'
import { MOCK_GAMES } from '@/lib/mock-data'
import { getAppUrl } from '@/lib/app-url'
import { appendWorldCupGame, fetchWorldCupEvents } from '@/lib/world-cup'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppUrl()
  const now = new Date()
  const summerCupEvents = await fetchWorldCupEvents({ limit: 200 }).catch(() => [])

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/summer-cup`, lastModified: now, changeFrequency: 'hourly', priority: 0.95 },
    { url: `${baseUrl}/roar`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/new-releases`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...appendWorldCupGame(MOCK_GAMES).map((game) => ({
      url: `${baseUrl}/games/${game.slug}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...summerCupEvents.map((event) => ({
      url: `${baseUrl}/summer-cup/${event.id}`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: 0.75,
    })),
  ]
}
