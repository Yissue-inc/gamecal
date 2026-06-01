import type { MetadataRoute } from 'next'
import { MOCK_GAMES } from '@/lib/mock-data'
import { getAppUrl } from '@/lib/app-url'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppUrl()
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/new-releases`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    ...MOCK_GAMES.map((game) => ({
      url: `${baseUrl}/games/${game.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    { url: `${baseUrl}/settings`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]
}
