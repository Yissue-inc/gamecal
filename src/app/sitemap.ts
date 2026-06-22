import type { MetadataRoute } from 'next'
import { MOCK_GAMES } from '@/lib/mock-data'
import { getAppUrl } from '@/lib/app-url'
import { appendWorldCupGame, fetchWorldCupEvents } from '@/lib/world-cup'
import { GUIDES } from '@/lib/guides'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppUrl()
  const now = new Date()
  const summerCupEvents = await fetchWorldCupEvents({ limit: 200 }).catch(() => [])

  return [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/summer-cup`, lastModified: now, changeFrequency: 'hourly', priority: 0.95 },
    { url: `${baseUrl}/roar`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/new-releases`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/leaderboard`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...GUIDES.map((guide) => ({
      url: `${baseUrl}/guides/${guide.slug}`,
      lastModified: new Date(guide.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
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
