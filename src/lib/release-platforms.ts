import type { NewRelease } from '@/types'

export const RELEASE_PLATFORM_ALL = 'all'

export const RELEASE_PLATFORM_OPTIONS = [
  { id: RELEASE_PLATFORM_ALL, label: 'All' },
  { id: 'PC', label: 'PC' },
  { id: 'PS5', label: 'PlayStation' },
  { id: 'Xbox', label: 'Xbox' },
  { id: 'Switch', label: 'Nintendo Switch' },
  { id: 'Mobile', label: 'Mobile' },
] as const

export type ReleasePlatformFilter = (typeof RELEASE_PLATFORM_OPTIONS)[number]['id']

export function normalizeReleasePlatform(platform: string): ReleasePlatformFilter | null {
  const value = platform.toLowerCase()

  if (value === RELEASE_PLATFORM_ALL) return RELEASE_PLATFORM_ALL
  if (value.includes('steam') || value.includes('windows') || value.includes('mac') || value.includes('linux') || value === 'pc') return 'PC'
  if (value.includes('playstation') || value.includes('ps4') || value.includes('ps5')) return 'PS5'
  if (value.includes('xbox')) return 'Xbox'
  if (value.includes('nintendo') || value.includes('switch')) return 'Switch'
  if (value.includes('ios') || value.includes('android') || value.includes('mobile')) return 'Mobile'

  return null
}

export function releaseMatchesPlatforms(release: NewRelease, selectedPlatforms: string[]): boolean {
  if (!selectedPlatforms.length) return false
  if (selectedPlatforms.includes(RELEASE_PLATFORM_ALL)) return true

  const selected = new Set(selectedPlatforms.map(normalizeReleasePlatform).filter(Boolean))
  return release.platform.some((platform) => {
    const normalized = normalizeReleasePlatform(platform)
    return normalized ? selected.has(normalized) : false
  })
}

export function countReleasePlatforms(releases: NewRelease[]) {
  const counts: Record<string, number> = { [RELEASE_PLATFORM_ALL]: releases.length }

  for (const release of releases) {
    const platforms = new Set(
      release.platform
        .map(normalizeReleasePlatform)
        .filter((platform): platform is ReleasePlatformFilter => Boolean(platform) && platform !== RELEASE_PLATFORM_ALL)
    )

    for (const platform of Array.from(platforms)) {
      counts[platform] = (counts[platform] ?? 0) + 1
    }
  }

  return counts
}
