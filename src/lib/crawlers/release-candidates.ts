import axios from 'axios'
import * as cheerio from 'cheerio'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'

type ReleaseDatePrecision = 'exact' | 'month' | 'quarter' | 'year' | 'unknown'

export interface ReleaseCandidateInput {
  title: string
  developer?: string
  platforms: string[]
  release_date?: string | null
  release_date_precision: ReleaseDatePrecision
  description?: string
  image_url?: string
  source: string
  source_url: string
  external_id: string
  confidence_score: number
  signals: Record<string, unknown>
  raw_payload?: Record<string, unknown>
}

const STEAM_COMING_SOON_URL =
  'https://store.steampowered.com/search/?filter=popularcomingsoon&category1=998&supportedlang=english&ndl=1'
const STEAM_PREMIUM_UPCOMING_URL =
  'https://store.steampowered.com/search/?filter=comingsoon&category1=998&os=win&sort_by=Price_DESC&supportedlang=english&ndl=1'
const NINTENDO_COMING_SOON_URL = 'https://www.nintendo.com/us/store/games/coming-soon/'
const PLAYSTATION_PS5_GAMES_URL = 'https://www.playstation.com/en-us/ps5/games/'
const XBOX_UPCOMING_URL = 'https://www.xbox.com/en-US/games/all-games?cat=upcoming'
const POCKET_GAMER_UPCOMING_URL = 'https://www.pocketgamer.com/upcoming/'
const GAMINGONPHONE_BASE_URL = 'https://gamingonphone.com'
const GAMESPOT_2026_RELEASES_URL =
  'https://www.gamespot.com/articles/2026-upcoming-games-schedule/1100-6534941/'
const RELEASE_WINDOW_DAYS = 35
const CANDIDATE_ENRICHMENT_LIMIT = 60

interface SteamAppDetails {
  name?: string
  short_description?: string
  detailed_description?: string
  header_image?: string
  developers?: string[]
  publishers?: string[]
  genres?: Array<{ description?: string }>
  categories?: Array<{ description?: string }>
  movies?: Array<{
    name?: string
    webm?: { max?: string; 480?: string }
    mp4?: { max?: string; 480?: string }
  }>
  is_free?: boolean
  price_overview?: {
    final_formatted?: string
    initial_formatted?: string
    discount_percent?: number
  }
  release_date?: {
    coming_soon?: boolean
    date?: string
  }
  background_raw?: string
}

interface RawgGame {
  id: number
  name?: string
  released?: string | null
  background_image?: string | null
  metacritic?: number | null
  rating?: number | null
  ratings_count?: number | null
  platforms?: Array<{ platform?: { name?: string } }>
  genres?: Array<{ name?: string }>
  description_raw?: string
}

interface IgdbGame {
  id: number
  name?: string
  summary?: string
  first_release_date?: number
  cover?: { url?: string }
  artworks?: Array<{ url?: string }>
  genres?: Array<{ name?: string }>
  platforms?: Array<{ name?: string }>
  involved_companies?: Array<{
    developer?: boolean
    publisher?: boolean
    company?: { name?: string }
  }>
  total_rating?: number
  total_rating_count?: number
  url?: string
}

interface MobileStoreMetadata {
  title?: string
  developer?: string
  description?: string
  image_url?: string
  source_url?: string
  genre_tags?: string[]
  is_free_to_play?: boolean
  source: 'app_store' | 'google_play'
}

let igdbTokenCache: { token: string; expiresAt: number } | null = null

function isRawgEnrichmentEnabled(): boolean {
  return process.env.ENABLE_RAWG_ENRICHMENT === 'true'
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeLookupTitle(value: string): string {
  return normalizeTitle(value)
    .toLowerCase()
    .replace(/™|®|©/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isLikelySameGame(a: string, b?: string): boolean {
  if (!b) return false
  const left = normalizeLookupTitle(a)
  const right = normalizeLookupTitle(b)
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

function mapExternalPlatform(value?: string): string | null {
  if (!value) return null
  if (/steam|pc|windows|mac|linux/i.test(value)) return 'PC'
  if (/playstation|ps5|ps4/i.test(value)) return 'PS5'
  if (/xbox/i.test(value)) return 'Xbox'
  if (/switch|nintendo/i.test(value)) return 'Switch'
  if (/ios|iphone|ipad|android|mobile/i.test(value)) return 'Mobile'
  return null
}

function mergePlatforms(current: string[], next: Array<string | null | undefined>): string[] {
  return Array.from(new Set([...current, ...next.filter(Boolean)] as string[]))
}

function metadataCompleteness(candidate: ReleaseCandidateInput): number {
  const weights = [
    candidate.title ? 10 : 0,
    candidate.release_date ? 20 : 0,
    candidate.release_date_precision === 'exact' ? 10 : 0,
    candidate.description ? 20 : 0,
    candidate.image_url ? 20 : 0,
    candidate.platforms.length ? 10 : 0,
    candidate.developer ? 5 : 0,
    candidate.source_url ? 5 : 0,
  ]
  return weights.reduce((sum, item) => sum + item, 0)
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function getStringArraySignal(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function mergeGenreTags(...groups: Array<unknown>): string[] {
  return Array.from(
    new Set(
      groups
        .flatMap(getStringArraySignal)
        .map((item) => normalizeTitle(item))
        .filter(Boolean)
    )
  ).slice(0, 8)
}

function getSteamTrailerUrl(details: SteamAppDetails): string | null {
  const movie = details.movies?.find((item) => item.webm?.max || item.mp4?.max || item.webm?.[480] || item.mp4?.[480])
  return movie?.webm?.max ?? movie?.mp4?.max ?? movie?.webm?.[480] ?? movie?.mp4?.[480] ?? null
}

function deriveCandidateHypeScore(candidate: ReleaseCandidateInput): number {
  const rawgMetacritic = typeof candidate.signals.rawg_metacritic === 'number' ? candidate.signals.rawg_metacritic : 0
  const rawgRating = typeof candidate.signals.rawg_rating === 'number' ? candidate.signals.rawg_rating * 20 : 0
  const igdbRating = typeof candidate.signals.igdb_rating === 'number' ? candidate.signals.igdb_rating : 0
  const metadata = typeof candidate.signals.metadata_completeness === 'number' ? candidate.signals.metadata_completeness : metadataCompleteness(candidate)
  const sourceScore = candidate.confidence_score
  const scores = [rawgMetacritic, rawgRating, igdbRating, sourceScore, metadata].filter((score) => score > 0)
  if (!scores.length) return clampScore(sourceScore)
  return clampScore(scores.reduce((sum, score) => sum + score, 0) / scores.length)
}

function normalizeIgdbImage(value?: string): string | undefined {
  if (!value) return undefined
  const url = value.startsWith('//') ? `https:${value}` : value
  return url.replace('t_thumb', 't_cover_big').replace('t_micro', 't_cover_big')
}

async function isReachableImageUrl(value?: string): Promise<boolean> {
  if (!value) return false

  try {
    const response = await axios.head(value, {
      timeout: 8000,
      maxRedirects: 3,
      headers: {
        'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app; image validation)',
      },
      validateStatus: (status) => status >= 200 && status < 400,
    })
    return response.headers['content-type']?.toString().startsWith('image/') ?? true
  } catch {
    try {
      const response = await axios.get(value, {
        timeout: 8000,
        maxRedirects: 3,
        responseType: 'stream',
        headers: {
          'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app; image validation)',
          Range: 'bytes=0-1023',
        },
        validateStatus: (status) => status >= 200 && status < 400,
      })
      response.data?.destroy?.()
      return response.headers['content-type']?.toString().startsWith('image/') ?? true
    } catch {
      return false
    }
  }
}

function compactDescription(value?: string, maxLength = 420): string | undefined {
  const text = normalizeTitle(stripHtml(value) ?? value ?? '')
  if (!text) return undefined
  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text
}

function normalizeSteamImage(value?: string): string | undefined {
  if (!value) return undefined
  return value
}

function stripHtml(value?: string): string | undefined {
  if (!value) return undefined
  const text = cheerio.load(value).text().replace(/\s+/g, ' ').trim()
  return text || undefined
}

function canonicalUrl(href: string | undefined, baseUrl: string): string {
  if (!href) return baseUrl
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return baseUrl
  }
}

function getMonthArticleCandidates() {
  const now = new Date()
  const months = [0, 1].map((offset) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))
    const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }).toLowerCase()
    const year = date.getUTCFullYear()
    return {
      month,
      year,
      url: `${GAMINGONPHONE_BASE_URL}/news/all-mobile-games-android-and-ios-releasing-in-${month}-${year}/`,
    }
  })

  return months
}

function normalizeImageUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined
  if (value.startsWith('//')) return `https:${value}`
  if (value.startsWith('http')) return value
  return canonicalUrl(value, baseUrl)
}

function slugify(value: string): string {
  return normalizeTitle(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function decodeJsonString(value?: string): string | undefined {
  if (!value) return undefined
  return value.replace(/\\u002F/g, '/').replace(/\\"/g, '"')
}

function parseSteamDate(value: string): { date: string | null; precision: ReleaseDatePrecision } {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (!cleaned || /coming soon|to be announced|tba/i.test(cleaned)) {
    return { date: null, precision: 'unknown' }
  }

  const exact = new Date(`${cleaned} 00:00:00 UTC`)
  if (!Number.isNaN(exact.getTime()) && /[a-z]{3,9}\s+\d{1,2},\s+\d{4}/i.test(cleaned)) {
    return { date: exact.toISOString().slice(0, 10), precision: 'exact' }
  }

  const month = cleaned.match(/^([A-Za-z]+)\s+(\d{4})$/)
  if (month) {
    const parsed = new Date(`${month[1]} 1, ${month[2]} 00:00:00 UTC`)
    if (!Number.isNaN(parsed.getTime())) {
      return { date: parsed.toISOString().slice(0, 10), precision: 'month' }
    }
  }

  const year = cleaned.match(/^(\d{4})$/)
  if (year) return { date: `${year[1]}-01-01`, precision: 'year' }

  const quarter = cleaned.match(/^Q([1-4])\s+(\d{4})$/i)
  if (quarter) {
    const monthIndex = (Number(quarter[1]) - 1) * 3 + 1
    return { date: `${quarter[2]}-${String(monthIndex).padStart(2, '0')}-01`, precision: 'quarter' }
  }

  return { date: null, precision: 'unknown' }
}

function isPastRelease(date?: string | null): boolean {
  if (!date) return false
  const today = new Date().toISOString().slice(0, 10)
  return date < today
}

function isWithinReleaseWindow(date?: string | null): boolean {
  if (!date) return false
  const release = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(release.getTime())) return false
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + RELEASE_WINDOW_DAYS)
  return release >= start && release <= end
}

function parseFlexibleDate(value: string): { date: string | null; precision: ReleaseDatePrecision } {
  const cleaned = value.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
  const explicit = cleaned.match(/\b([A-Z][a-z]+)\s+(\d{1,2}),?\s+(20\d{2})\b/)
  if (explicit) return parseSteamDate(`${explicit[1]} ${explicit[2]}, ${explicit[3]}`)

  const implicitYear = cleaned.match(/\b([A-Z][a-z]+)\s+(\d{1,2})\b/)
  if (implicitYear) {
    const year = new Date().getUTCFullYear()
    const parsed = parseSteamDate(`${implicitYear[1]} ${implicitYear[2]}, ${year}`)
    if (parsed.date && isPastRelease(parsed.date)) {
      return parseSteamDate(`${implicitYear[1]} ${implicitYear[2]}, ${year + 1}`)
    }
    return parsed
  }

  return parseSteamDate(cleaned)
}

function scoreCandidate(input: {
  officialSource: boolean
  hasExactDate: boolean
  hasImage: boolean
  hasPriceOrReviews: boolean
  platforms: string[]
}): number {
  let score = 35
  if (input.officialSource) score += 20
  if (input.hasExactDate) score += 20
  if (input.hasImage) score += 10
  if (input.hasPriceOrReviews) score += 5
  if (input.platforms.length > 1) score += 5
  return Math.min(95, score)
}

async function crawlSteamSearchPage(
  url: string,
  sourceLabel: string,
  rankingSignal: string,
  scoreBonus = 0
): Promise<ReleaseCandidateInput[]> {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app; release discovery)',
    },
  })
  const $ = cheerio.load(response.data)
  const candidates: ReleaseCandidateInput[] = []

  $('a.search_result_row').slice(0, 40).each((_, element) => {
    const row = $(element)
    const title = normalizeTitle(row.find('.title').text())
    const href = row.attr('href')?.split('?')[0] ?? ''
    const appId = row.attr('data-ds-appid') ?? href.match(/\/app\/(\d+)/)?.[1]
    if (!title || !href || !appId) return

    const releaseText = normalizeTitle(row.find('.search_released').text())
    const parsedDate = parseSteamDate(releaseText)
    if (isPastRelease(parsedDate.date)) return

    const imageUrl = normalizeSteamImage(row.find('img').attr('src'))
    const platforms = ['PC']
    const priceText = normalizeTitle(row.find('.search_price').text())
    const reviewText = normalizeTitle(row.find('.search_review_summary').attr('data-tooltip-html') ?? '')

    candidates.push({
      title,
      platforms,
      release_date: parsedDate.date,
      release_date_precision: parsedDate.precision,
      image_url: imageUrl,
      source: 'steam',
      source_url: href,
      external_id: appId,
      confidence_score: scoreCandidate({
        officialSource: true,
        hasExactDate: parsedDate.precision === 'exact',
        hasImage: Boolean(imageUrl),
        hasPriceOrReviews: Boolean(priceText || reviewText),
        platforms,
      }),
      signals: {
        official_store: true,
        source_label: sourceLabel,
        release_text: releaseText,
        price_text: priceText || null,
        review_text: reviewText || null,
        ranking_sources: [rankingSignal],
      },
      raw_payload: {
        app_id: appId,
        release_text: releaseText,
        steam_search_url: url,
      },
    })
    candidates[candidates.length - 1].confidence_score = Math.min(
      95,
      candidates[candidates.length - 1].confidence_score + scoreBonus
    )
  })

  return candidates
}

async function fetchSteamAppDetails(appId: string): Promise<SteamAppDetails | null> {
  try {
    const response = await axios.get('https://store.steampowered.com/api/appdetails', {
      timeout: 12000,
      params: {
        appids: appId,
        filters: 'basic,genres,categories,movies,price_overview',
      },
      headers: {
        'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app; release discovery)',
      },
    })

    const envelope = response.data?.[appId]
    if (!envelope?.success) return null
    return envelope.data ?? null
  } catch {
    return null
  }
}

async function enrichSteamCandidates(
  candidates: ReleaseCandidateInput[]
): Promise<ReleaseCandidateInput[]> {
  const enriched: ReleaseCandidateInput[] = []

  for (const candidate of candidates) {
    const details = await fetchSteamAppDetails(candidate.external_id)
    if (!details) {
      enriched.push(candidate)
      continue
    }

    const detailDate = details.release_date?.date
      ? parseSteamDate(details.release_date.date)
      : { date: null, precision: 'unknown' as ReleaseDatePrecision }
    const nextDate = candidate.release_date ?? detailDate.date
    const nextPrecision =
      candidate.release_date_precision !== 'unknown'
        ? candidate.release_date_precision
        : detailDate.precision
    const steamImageUrl = details.header_image ?? details.background_raw ?? candidate.image_url
    const hasReachableSteamImage = await isReachableImageUrl(steamImageUrl)
    const steamGenres = details.genres?.map((genre) => genre.description).filter(Boolean) ?? []
    const steamCategories = details.categories?.map((category) => category.description).filter(Boolean) ?? []
    const genreTags = mergeGenreTags(candidate.signals.genre_tags, steamGenres)
    const trailerUrl = getSteamTrailerUrl(details)

    const nextCandidate = {
      ...candidate,
      title: normalizeTitle(details.name ?? candidate.title),
      developer: candidate.developer ?? details.developers?.[0] ?? details.publishers?.[0],
      release_date: nextDate,
      release_date_precision: nextPrecision,
      description:
        candidate.description ??
        stripHtml(details.short_description) ??
        stripHtml(details.detailed_description),
      image_url: hasReachableSteamImage ? steamImageUrl : undefined,
      confidence_score: Math.min(
        98,
        candidate.confidence_score +
          (hasReachableSteamImage && steamImageUrl && !candidate.image_url ? 4 : 0) +
          (details.short_description ? 4 : 0)
      ),
      signals: {
        ...candidate.signals,
        appdetails_enriched: true,
        genre_tags: genreTags,
        steam_genres: steamGenres,
        steam_categories: steamCategories,
        trailer_url: trailerUrl,
        preorder_url: candidate.source_url,
        is_free_to_play: Boolean(details.is_free),
        steam_price_text: details.price_overview?.final_formatted ?? null,
        steam_image_valid: hasReachableSteamImage,
        steam_image_rejected: !hasReachableSteamImage && Boolean(steamImageUrl),
        steam_developers: details.developers ?? null,
        steam_publishers: details.publishers ?? null,
      },
      raw_payload: {
        ...candidate.raw_payload,
        steam_appdetails: details,
      },
    } satisfies ReleaseCandidateInput

    enriched.push({
      ...nextCandidate,
      signals: {
        ...nextCandidate.signals,
        hype_score: deriveCandidateHypeScore(nextCandidate),
      },
    })
  }

  return enriched
}

export async function crawlSteamReleaseCandidates(): Promise<ReleaseCandidateInput[]> {
  const [popular, premium] = await Promise.all([
    crawlSteamSearchPage(
      STEAM_COMING_SOON_URL,
      'Steam Popular Upcoming',
      'Steam popular upcoming',
      0
    ),
    crawlSteamSearchPage(
      STEAM_PREMIUM_UPCOMING_URL,
      'Steam Premium Upcoming',
      'Steam premium upcoming',
      8
    ),
  ])

  const map = new Map<string, ReleaseCandidateInput>()
  for (const candidate of [...popular, ...premium]) {
    const existing = map.get(candidate.external_id)
    if (!existing || candidate.confidence_score > existing.confidence_score) {
      map.set(candidate.external_id, {
        ...candidate,
        signals: {
          ...candidate.signals,
          ranking_sources: Array.from(
            new Set([
              ...((existing?.signals.ranking_sources as string[] | undefined) ?? []),
              ...((candidate.signals.ranking_sources as string[] | undefined) ?? []),
            ])
          ),
        },
      })
    }
  }

  const deduped = Array.from(map.values())
    .sort((a, b) => b.confidence_score - a.confidence_score)
    .slice(0, 60)

  const enriched = await enrichSteamCandidates(deduped)
  return enriched
    .filter((candidate) => isWithinReleaseWindow(candidate.release_date))
    .slice(0, 25)
}

function dedupeCandidates(candidates: ReleaseCandidateInput[], limit = 25): ReleaseCandidateInput[] {
  const map = new Map<string, ReleaseCandidateInput>()
  for (const candidate of candidates) {
    if (!isWithinReleaseWindow(candidate.release_date)) continue
    const key = `${candidate.source}:${candidate.external_id || slugify(candidate.title)}`
    const existing = map.get(key)
    if (!existing || candidate.confidence_score > existing.confidence_score) {
      map.set(key, candidate)
    }
  }
  return Array.from(map.values())
    .sort((a, b) => {
      const dateA = a.release_date ?? '9999-12-31'
      const dateB = b.release_date ?? '9999-12-31'
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      return b.confidence_score - a.confidence_score
    })
    .slice(0, limit)
}

export async function crawlNintendoReleaseCandidates(): Promise<ReleaseCandidateInput[]> {
  const { data: html } = await axios.get(NINTENDO_COMING_SOON_URL, {
    timeout: 15000,
    headers: { 'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app)' },
  })
  const candidates: ReleaseCandidateInput[] = []
  const productRegex =
    /"name":"([^"]+)"[\s\S]{0,1800}?"platform":\{"__typename":"Platform","label":"([^"]+)"[\s\S]{0,1400}?"productImageSquare":\{"__typename":"CloudinaryAsset","url":"([^"]+)"[\s\S]{0,900}?"releaseDate":"([^"]+)"/g

  for (const match of Array.from(html.matchAll(productRegex)) as RegExpMatchArray[]) {
    const title = normalizeTitle(match[1].replace(/™|®/g, ''))
    const platformLabel = match[2]
    const imageUrl = match[3]
    const releaseDate = new Date(match[4]).toISOString().slice(0, 10)
    if (!title || !isWithinReleaseWindow(releaseDate)) continue

    candidates.push({
      title,
      developer: 'Nintendo',
      platforms: ['Switch'],
      release_date: releaseDate,
      release_date_precision: 'exact',
      description: `${title} is listed as an upcoming ${platformLabel} release on Nintendo's official store.`,
      image_url: imageUrl,
      source: 'nintendo',
      source_url: `${NINTENDO_COMING_SOON_URL}${slugify(title)}`,
      external_id: `nintendo-${slugify(title)}-${releaseDate}`,
      confidence_score: 90,
      signals: {
        official_store: true,
        source_label: 'Nintendo Coming Soon',
        release_text: releaseDate,
        genre_tags: [],
        preorder_url: `${NINTENDO_COMING_SOON_URL}${slugify(title)}`,
        hype_score: 90,
        ranking_sources: ['Nintendo official coming soon'],
      },
      raw_payload: { platform_label: platformLabel },
    })
  }

  return dedupeCandidates(candidates, 20)
}

export async function crawlPlayStationReleaseCandidates(): Promise<ReleaseCandidateInput[]> {
  const { data: html } = await axios.get(PLAYSTATION_PS5_GAMES_URL, {
    timeout: 15000,
    headers: { 'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app)' },
  })
  const $ = cheerio.load(html)
  const candidates: ReleaseCandidateInput[] = []

  $('h2, h3, h4').each((_, heading) => {
    const title = normalizeTitle($(heading).text())
    if (!title || title.length < 3 || title.length > 90) return
    const block = $(heading).parent().text().replace(/\s+/g, ' ')
    const dateMatch = block.match(/Release Date:\s*([A-Z][a-z]+\s+\d{1,2},\s+20\d{2})/)
    if (!dateMatch) return
    const parsed = parseFlexibleDate(dateMatch[1])
    if (!isWithinReleaseWindow(parsed.date)) return

    const imageUrl = normalizeImageUrl(
      $(heading).closest('section, article, div').find('img').first().attr('src') ??
        $(heading).closest('section, article, div').find('source').first().attr('srcset')?.split(' ')[0],
      PLAYSTATION_PS5_GAMES_URL
    )

    candidates.push({
      title,
      platforms: ['PS5'],
      release_date: parsed.date,
      release_date_precision: parsed.precision,
      description: `${title} is listed on PlayStation's PS5 games page with a ${dateMatch[1]} release date.`,
      image_url: imageUrl,
      source: 'playstation',
      source_url: PLAYSTATION_PS5_GAMES_URL,
      external_id: `playstation-${slugify(title)}-${parsed.date}`,
      confidence_score: 86,
      signals: {
        official_store: true,
        source_label: 'PlayStation PS5 Games',
        release_text: dateMatch[1],
        genre_tags: [],
        preorder_url: PLAYSTATION_PS5_GAMES_URL,
        hype_score: 86,
        ranking_sources: ['PlayStation official games page'],
      },
    })
  })

  return dedupeCandidates(candidates, 20)
}

export async function crawlXboxReleaseCandidates(): Promise<ReleaseCandidateInput[]> {
  const { data: html } = await axios.get(XBOX_UPCOMING_URL, {
    timeout: 15000,
    headers: { 'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app)' },
  })
  const candidates: ReleaseCandidateInput[] = []
  const productRegex =
    /"description":"([^"]*)"[\s\S]{0,800}?"developerName":"([^"]*)"[\s\S]{0,1800}?"boxArt":\{"url":"([^"]+)"[\s\S]{0,2600}?"publisherName":"([^"]*)"[\s\S]{0,900}?"releaseDate":"([^"]+)"[\s\S]{0,900}?"shortDescription":"([^"]*)"[\s\S]{0,2200}?"title":"([^"]+)"/g

  for (const match of Array.from(html.matchAll(productRegex)) as RegExpMatchArray[]) {
    const releaseDate = new Date(match[5]).toISOString().slice(0, 10)
    if (!isWithinReleaseWindow(releaseDate)) continue
    const title = normalizeTitle(decodeJsonString(match[7]) ?? '')
    if (!title) continue

    candidates.push({
      title,
      developer: decodeJsonString(match[2]) || decodeJsonString(match[4]),
      platforms: ['Xbox'],
      release_date: releaseDate,
      release_date_precision: 'exact',
      description: normalizeTitle(decodeJsonString(match[6]) || decodeJsonString(match[1]) || '').slice(0, 300),
      image_url: decodeJsonString(match[3]),
      source: 'xbox',
      source_url: XBOX_UPCOMING_URL,
      external_id: `xbox-${slugify(title)}-${releaseDate}`,
      confidence_score: 88,
      signals: {
        official_store: true,
        source_label: 'Xbox Upcoming Games',
        release_text: releaseDate,
        genre_tags: [],
        preorder_url: XBOX_UPCOMING_URL,
        hype_score: 88,
        ranking_sources: ['Xbox official upcoming games'],
      },
    })
  }

  return dedupeCandidates(candidates, 20)
}

async function crawlPocketGamerArticle(url: string, headline: string): Promise<ReleaseCandidateInput | null> {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 12000,
      headers: { 'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app)' },
    })
    const $ = cheerio.load(html)
    const title = normalizeTitle($('h1').first().text() || headline)
    const text = $('article, main').first().text().replace(/\s+/g, ' ')
    const parsed = parseFlexibleDate(text)
    if (!isWithinReleaseWindow(parsed.date)) return null
    const description =
      $('meta[name="description"]').attr('content') ??
      $('meta[property="og:description"]').attr('content') ??
      text.slice(0, 220)
    const imageUrl = normalizeImageUrl($('meta[property="og:image"]').attr('content'), url)

    return {
      title: title.replace(/\s+(opens pre-registration|reveals|will launch|is coming).*$/i, ''),
      platforms: ['Mobile'],
      release_date: parsed.date,
      release_date_precision: parsed.precision,
      description: normalizeTitle(description).slice(0, 300),
      image_url: imageUrl,
      source: 'pocketgamer',
      source_url: url,
      external_id: `pocketgamer-${slugify(title)}-${parsed.date}`,
      confidence_score: 72,
      signals: {
        official_store: false,
        source_label: 'Pocket Gamer Upcoming',
        release_text: parsed.date,
        genre_tags: [],
        preorder_url: url,
        hype_score: 72,
        ranking_sources: ['Pocket Gamer upcoming mobile games'],
      },
    }
  } catch {
    return null
  }
}

function extractAppleAppId(url: string): string | null {
  return url.match(/\/id(\d+)/)?.[1] ?? null
}

function extractAppleCountry(url: string): string {
  return url.match(/apps\.apple\.com\/([a-z]{2})\//i)?.[1]?.toLowerCase() ?? 'us'
}

async function fetchAppStoreMetadata(url: string): Promise<MobileStoreMetadata | null> {
  const appId = extractAppleAppId(url)
  if (!appId) return null

  const countries = Array.from(new Set([extractAppleCountry(url), 'us']))
  for (const country of countries) {
    try {
      const response = await axios.get('https://itunes.apple.com/lookup', {
        timeout: 10000,
        params: { id: appId, country },
        headers: {
          'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app; mobile release discovery)',
        },
      })
      const result = response.data?.results?.[0]
      if (!result) continue

      return {
        title: normalizeTitle(result.trackName ?? ''),
        developer: normalizeTitle(result.sellerName ?? result.artistName ?? ''),
        description: compactDescription(result.description, 360),
        image_url: result.artworkUrl512 ?? result.artworkUrl100,
        source_url: result.trackViewUrl ?? url,
        genre_tags: [result.primaryGenreName].filter(Boolean),
        is_free_to_play: Number(result.price ?? 0) === 0,
        source: 'app_store',
      }
    } catch {
      continue
    }
  }

  return null
}

async function fetchGooglePlayMetadata(url: string): Promise<MobileStoreMetadata | null> {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GamerClockBot/0.1; +https://gamecal-beryl.vercel.app)',
      },
    })
    const $ = cheerio.load(html)
    const title = normalizeTitle(
      ($('meta[property="og:title"]').attr('content') ?? $('h1').first().text()).replace(/\s+-\s+Apps on Google Play$/i, '')
    )
    const developer = normalizeTitle($('a[href^="/store/apps/dev"]').first().text())
    const genre = normalizeTitle(
      $('a[href*="/store/apps/category/"]').first().text() ||
        $('meta[itemprop="applicationCategory"]').attr('content') ||
        ''
    )
    const description = compactDescription(
      $('meta[name="description"]').attr('content') ??
        $('meta[property="og:description"]').attr('content'),
      360
    )
    const imageUrl = normalizeImageUrl($('meta[property="og:image"]').attr('content'), url)

    return {
      title,
      developer,
      description,
      image_url: imageUrl,
      source_url: url,
      genre_tags: genre ? [genre] : [],
      is_free_to_play: true,
      source: 'google_play',
    }
  } catch {
    return null
  }
}

async function fetchMobileStoreMetadata(links: string[]): Promise<MobileStoreMetadata | null> {
  const appStoreUrl = links.find((link) => /apps\.apple\.com/i.test(link))
  const googlePlayUrl = links.find((link) => /play\.google\.com\/store\/apps/i.test(link))
  const [appStore, googlePlay] = await Promise.all([
    appStoreUrl ? fetchAppStoreMetadata(appStoreUrl) : Promise.resolve(null),
    googlePlayUrl ? fetchGooglePlayMetadata(googlePlayUrl) : Promise.resolve(null),
  ])

  return appStore ?? googlePlay
}

async function crawlGamingOnPhoneMonthlyArticle(
  url: string,
  sourceMonth: string,
  sourceYear: number
): Promise<ReleaseCandidateInput[]> {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GamerClockBot/0.1; +https://gamecal-beryl.vercel.app)',
      },
    })
    const $ = cheerio.load(html)
    const articleTitle = normalizeTitle($('h1').first().text())
    if (!/mobile games/i.test(articleTitle) || !new RegExp(String(sourceYear)).test(articleTitle)) {
      return []
    }

    const candidates: ReleaseCandidateInput[] = []
    const rows = $('table tr').slice(1).toArray()

    for (const row of rows) {
      const cells = $(row).find('td')
      if (cells.length < 2) continue

      const title = normalizeTitle($(cells[0]).text())
      const releaseText = normalizeTitle($(cells[1]).text())
      const parsed = parseFlexibleDate(releaseText)
      if (!title || !isWithinReleaseWindow(parsed.date)) continue

      const articleUrl = canonicalUrl($(cells[0]).find('a[href]').first().attr('href'), url)
      const storeLinks = $(cells[2])
        .find('a[href]')
        .map((_, link) => canonicalUrl($(link).attr('href'), url))
        .get()
        .filter((link) => /apps\.apple\.com|play\.google\.com\/store\/apps/i.test(link))
      const storeMetadata = await fetchMobileStoreMetadata(storeLinks)
      const sourceUrl = storeMetadata?.source_url ?? (articleUrl !== url ? articleUrl : storeLinks[0] ?? url)

      candidates.push({
        title: normalizeTitle(storeMetadata?.title ?? title),
        developer: storeMetadata?.developer,
        platforms: ['Mobile'],
        release_date: parsed.date,
        release_date_precision: parsed.precision,
        description:
          storeMetadata?.description ??
          `${title} is listed in GamingOnPhone's ${sourceMonth} ${sourceYear} Android and iOS release calendar.`,
        image_url: storeMetadata?.image_url,
        source: 'mobile',
        source_url: sourceUrl,
        external_id: `gamingonphone-${slugify(title)}-${parsed.date}`,
        confidence_score: scoreCandidate({
          officialSource: storeLinks.length > 0,
          hasExactDate: parsed.precision === 'exact',
          hasImage: Boolean(storeMetadata?.image_url),
          hasPriceOrReviews: false,
          platforms: ['Mobile'],
        }) + (storeMetadata ? 8 : 0),
        signals: {
          official_store: storeLinks.length > 0,
          source_label: `GamingOnPhone ${sourceMonth} ${sourceYear} mobile releases`,
          release_text: releaseText,
          mobile_store_source: storeMetadata?.source ?? null,
          genre_tags: storeMetadata?.genre_tags ?? [],
          preorder_url: sourceUrl,
          is_free_to_play: storeMetadata?.is_free_to_play ?? false,
          store_links: storeLinks,
          ranking_sources: ['GamingOnPhone monthly mobile release calendar'],
        },
        raw_payload: {
          article_title: articleTitle,
          article_url: articleUrl,
          store_metadata: storeMetadata,
        },
      })
    }

    return dedupeCandidates(candidates, 30)
  } catch {
    return []
  }
}

export async function crawlMobileReleaseCandidates(): Promise<ReleaseCandidateInput[]> {
  const { data: html } = await axios.get(POCKET_GAMER_UPCOMING_URL, {
    timeout: 15000,
    headers: { 'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app)' },
  })
  const $ = cheerio.load(html)
  const links = $('a[href]')
    .map((_, link) => {
      const headline = normalizeTitle($(link).text())
      const href = canonicalUrl($(link).attr('href'), POCKET_GAMER_UPCOMING_URL)
      return headline.length > 20 && href.includes('pocketgamer.com') ? { headline, href } : null
    })
    .get()
    .filter(Boolean)
    .slice(0, 20) as Array<{ headline: string; href: string }>

  const [pocketGamerCandidates, ...monthlyCandidates] = await Promise.all([
    Promise.all(links.map((item) => crawlPocketGamerArticle(item.href, item.headline))),
    ...getMonthArticleCandidates().map((item) =>
      crawlGamingOnPhoneMonthlyArticle(item.url, item.month, item.year)
    ),
  ])

  return dedupeCandidates(
    [
      ...(pocketGamerCandidates.filter(Boolean) as ReleaseCandidateInput[]),
      ...monthlyCandidates.flat(),
    ],
    30
  )
}

export async function crawlMediaReleaseCandidates(): Promise<ReleaseCandidateInput[]> {
  const { data: html } = await axios.get(GAMESPOT_2026_RELEASES_URL, {
    timeout: 15000,
    headers: { 'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app)' },
  })
  const $ = cheerio.load(html)
  const text = $('main, article, body').text().replace(/\s+/g, ' ')
  const candidates: ReleaseCandidateInput[] = []
  const regex = /([A-Z0-9][A-Za-z0-9:'’&.,+\-\s]{2,80})\s*[-–—]\s*(PS5|Xbox Series X\|S|Xbox|Switch 2|Switch|PC|Nintendo Switch|PlayStation 5)[^A-Z]{0,120}?([A-Z][a-z]+\s+\d{1,2},\s+20\d{2})/g

  for (const match of Array.from(text.matchAll(regex)) as RegExpMatchArray[]) {
    const parsed = parseFlexibleDate(match[3])
    if (!isWithinReleaseWindow(parsed.date)) continue
    const platformText = match[2]
    const platforms = [
      /PlayStation|PS5/i.test(platformText) ? 'PS5' : null,
      /Xbox/i.test(platformText) ? 'Xbox' : null,
      /Switch|Nintendo/i.test(platformText) ? 'Switch' : null,
      /\bPC\b/i.test(platformText) ? 'PC' : null,
    ].filter(Boolean) as string[]

    candidates.push({
      title: normalizeTitle(match[1]),
      platforms: platforms.length ? platforms : ['PC'],
      release_date: parsed.date,
      release_date_precision: parsed.precision,
      description: `${normalizeTitle(match[1])} appeared in a current release-date roundup for ${match[3]}.`,
      source: 'gamespot',
      source_url: GAMESPOT_2026_RELEASES_URL,
      external_id: `gamespot-${slugify(match[1])}-${parsed.date}`,
      confidence_score: 68,
      signals: {
        official_store: false,
        source_label: 'GameSpot 2026 Release Schedule',
        release_text: match[3],
        genre_tags: [],
        preorder_url: GAMESPOT_2026_RELEASES_URL,
        hype_score: 68,
        ranking_sources: ['GameSpot release schedule'],
      },
    })
  }

  return dedupeCandidates(candidates, 20)
}

async function fetchRawgGame(candidate: ReleaseCandidateInput): Promise<RawgGame | null> {
  const key = process.env.RAWG_API_KEY
  if (!key || !isRawgEnrichmentEnabled()) return null

  try {
    const search = await axios.get('https://api.rawg.io/api/games', {
      timeout: 12000,
      params: {
        key,
        search: candidate.title,
        search_precise: true,
        page_size: 5,
      },
      headers: {
        'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app; metadata enrichment)',
      },
    })
    const results = (search.data?.results ?? []) as RawgGame[]
    const match = results.find((game) => isLikelySameGame(candidate.title, game.name)) ?? results[0]
    if (!match?.id) return null

    const detail = await axios.get(`https://api.rawg.io/api/games/${match.id}`, {
      timeout: 12000,
      params: { key },
      headers: {
        'User-Agent': 'GamerClockBot/0.1 (+https://gamecal-beryl.vercel.app; metadata enrichment)',
      },
    })
    return { ...match, ...detail.data }
  } catch {
    return null
  }
}

async function fetchIgdbToken(): Promise<string | null> {
  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  if (igdbTokenCache && igdbTokenCache.expiresAt > Date.now() + 60_000) {
    return igdbTokenCache.token
  }

  try {
    const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      timeout: 12000,
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      },
    })
    const token = response.data?.access_token
    const expiresIn = Number(response.data?.expires_in ?? 0)
    if (!token) return null
    igdbTokenCache = {
      token,
      expiresAt: Date.now() + Math.max(300, expiresIn - 60) * 1000,
    }
    return token
  } catch {
    return null
  }
}

async function fetchIgdbGame(candidate: ReleaseCandidateInput): Promise<IgdbGame | null> {
  const clientId = process.env.TWITCH_CLIENT_ID
  const token = await fetchIgdbToken()
  if (!clientId || !token) return null

  const escapedTitle = candidate.title.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const body = [
    `search "${escapedTitle}";`,
    'fields name,summary,first_release_date,cover.url,artworks.url,genres.name,platforms.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,total_rating,total_rating_count,url;',
    'limit 5;',
  ].join(' ')

  try {
    const response = await axios.post('https://api.igdb.com/v4/games', body, {
      timeout: 12000,
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
    })
    const results = (response.data ?? []) as IgdbGame[]
    const match = results.find((game) => isLikelySameGame(candidate.title, game.name))
    if (match) return match
    return candidate.source === 'mobile' ? null : results[0] ?? null
  } catch {
    return null
  }
}

function applyRawgMetadata(candidate: ReleaseCandidateInput, rawg: RawgGame | null) {
  if (!rawg) return candidate

  const platforms = mergePlatforms(
    candidate.platforms,
    rawg.platforms?.map((item) => mapExternalPlatform(item.platform?.name)) ?? []
  )
  const rawgDescription = compactDescription(rawg.description_raw)
  const rankingSources = Array.isArray(candidate.signals.ranking_sources)
    ? candidate.signals.ranking_sources
    : []

  return {
    ...candidate,
    title: normalizeTitle(rawg.name ?? candidate.title),
    platforms,
    release_date: candidate.release_date ?? rawg.released ?? null,
    release_date_precision:
      candidate.release_date_precision !== 'unknown'
        ? candidate.release_date_precision
        : rawg.released
          ? 'exact'
          : candidate.release_date_precision,
    description: candidate.description ?? rawgDescription,
    image_url: candidate.image_url ?? rawg.background_image ?? undefined,
    confidence_score: Math.min(
      99,
      candidate.confidence_score +
        5 +
        (rawg.background_image && !candidate.image_url ? 4 : 0) +
        (rawgDescription && !candidate.description ? 4 : 0) +
        (rawg.metacritic ? 3 : 0)
    ),
    signals: {
      ...candidate.signals,
      rawg_enriched: true,
      rawg_id: rawg.id,
      rawg_rating: rawg.rating ?? null,
      rawg_ratings_count: rawg.ratings_count ?? null,
      rawg_metacritic: rawg.metacritic ?? null,
      rawg_genres: rawg.genres?.map((genre) => genre.name).filter(Boolean) ?? [],
      genre_tags: mergeGenreTags(
        candidate.signals.genre_tags,
        rawg.genres?.map((genre) => genre.name).filter(Boolean) ?? []
      ),
      ranking_sources: Array.from(new Set([...rankingSources, 'RAWG metadata'])),
    },
    raw_payload: {
      ...candidate.raw_payload,
      rawg,
    },
  } satisfies ReleaseCandidateInput
}

function applyIgdbMetadata(candidate: ReleaseCandidateInput, igdb: IgdbGame | null) {
  if (!igdb) return candidate

  const platforms = mergePlatforms(
    candidate.platforms,
    igdb.platforms?.map((item) => mapExternalPlatform(item.name)) ?? []
  )
  const developer =
    candidate.developer ??
    igdb.involved_companies?.find((item) => item.developer)?.company?.name ??
    igdb.involved_companies?.find((item) => item.publisher)?.company?.name
  const coverUrl = normalizeIgdbImage(igdb.cover?.url) ?? normalizeIgdbImage(igdb.artworks?.[0]?.url)
  const igdbDate = igdb.first_release_date
    ? new Date(igdb.first_release_date * 1000).toISOString().slice(0, 10)
    : null
  const rankingSources = Array.isArray(candidate.signals.ranking_sources)
    ? candidate.signals.ranking_sources
    : []

  return {
    ...candidate,
    title: normalizeTitle(igdb.name ?? candidate.title),
    developer,
    platforms,
    release_date: candidate.release_date ?? igdbDate,
    release_date_precision:
      candidate.release_date_precision !== 'unknown'
        ? candidate.release_date_precision
        : igdbDate
          ? 'exact'
          : candidate.release_date_precision,
    description: candidate.description ?? compactDescription(igdb.summary),
    image_url: candidate.image_url ?? coverUrl,
    confidence_score: Math.min(
      99,
      candidate.confidence_score +
        5 +
        (coverUrl && !candidate.image_url ? 4 : 0) +
        (igdb.summary && !candidate.description ? 4 : 0) +
        (igdb.total_rating ? 3 : 0)
    ),
    signals: {
      ...candidate.signals,
      igdb_enriched: true,
      igdb_id: igdb.id,
      igdb_rating: igdb.total_rating ?? null,
      igdb_rating_count: igdb.total_rating_count ?? null,
      igdb_genres: igdb.genres?.map((genre) => genre.name).filter(Boolean) ?? [],
      genre_tags: mergeGenreTags(
        candidate.signals.genre_tags,
        igdb.genres?.map((genre) => genre.name).filter(Boolean) ?? []
      ),
      preorder_url: candidate.signals.preorder_url ?? candidate.source_url,
      ranking_sources: Array.from(new Set([...rankingSources, 'IGDB metadata'])),
    },
    raw_payload: {
      ...candidate.raw_payload,
      igdb,
    },
  } satisfies ReleaseCandidateInput
}

async function enrichCandidateMetadata(
  candidate: ReleaseCandidateInput
): Promise<ReleaseCandidateInput> {
  const [rawg, igdb] = await Promise.all([fetchRawgGame(candidate), fetchIgdbGame(candidate)])
  const withRawg = applyRawgMetadata(candidate, rawg)
  const withIgdb = applyIgdbMetadata(withRawg, igdb)
  const hasReachableImage = await isReachableImageUrl(withIgdb.image_url)
  const fallbackIgdbImage = normalizeIgdbImage(igdb?.cover?.url) ?? normalizeIgdbImage(igdb?.artworks?.[0]?.url)
  const fallbackRawgImage = rawg?.background_image ?? undefined
  const fallbackImage = fallbackIgdbImage ?? fallbackRawgImage
  const imageUrl = hasReachableImage ? withIgdb.image_url : fallbackImage

  return {
    ...withIgdb,
    image_url: imageUrl,
    signals: {
      ...withIgdb.signals,
      metadata_completeness: metadataCompleteness(withIgdb),
      hype_score: deriveCandidateHypeScore(withIgdb),
      metadata_enrichment_sources: [
        rawg ? 'RAWG' : null,
        igdb ? 'IGDB' : null,
      ].filter(Boolean),
      image_validated: Boolean(imageUrl),
      image_fallback_source: hasReachableImage
        ? null
        : fallbackIgdbImage
          ? 'IGDB'
          : fallbackRawgImage
            ? 'RAWG'
            : null,
    },
  }
}

async function enrichReleaseCandidates(
  candidates: ReleaseCandidateInput[]
): Promise<ReleaseCandidateInput[]> {
  if ((!process.env.RAWG_API_KEY || !isRawgEnrichmentEnabled()) && !process.env.TWITCH_CLIENT_ID) {
    return candidates.map((candidate) => ({
      ...candidate,
      signals: {
        ...candidate.signals,
        metadata_completeness: metadataCompleteness(candidate),
        metadata_enrichment_sources: [],
      },
    }))
  }

  const enriched: ReleaseCandidateInput[] = []
  for (const candidate of candidates.slice(0, CANDIDATE_ENRICHMENT_LIMIT)) {
    enriched.push(await enrichCandidateMetadata(candidate))
  }
  return enriched
}

export async function upsertReleaseCandidates(
  candidates: ReleaseCandidateInput[]
): Promise<{ inserted: number; updated: number; skipped: number }> {
  if (!isSupabaseConfigured()) {
    return { inserted: 0, updated: 0, skipped: candidates.length }
  }

  const admin = createAdminClient()
  let inserted = 0
  let updated = 0
  let skipped = 0
  const seen = new Set<string>()

  for (const candidate of candidates) {
    const title = normalizeTitle(candidate.title)
    const dedupeKey = `${candidate.source}:${candidate.external_id || title.toLowerCase()}`
    if (!title || seen.has(dedupeKey)) {
      skipped++
      continue
    }
    seen.add(dedupeKey)

    const payload = {
      ...candidate,
      title,
      external_id: candidate.external_id || title.toLowerCase(),
      release_date: candidate.release_date ?? null,
      status: 'pending',
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: existing, error: findError } = await admin
      .from('release_candidates')
      .select('id,status')
      .eq('source', payload.source)
      .eq('external_id', payload.external_id)
      .maybeSingle()

    if (findError) throw findError

    if (existing) {
      const { error } = await admin
        .from('release_candidates')
        .update({
          ...payload,
          status: existing.status === 'rejected' ? 'rejected' : 'pending',
        })
        .eq('id', existing.id)
      if (error) throw error
      updated++
    } else {
      const { error } = await admin.from('release_candidates').insert(payload)
      if (error) throw error
      inserted++
    }
  }

  return { inserted, updated, skipped }
}

export async function repairReleaseCandidateImages(status = 'pending', limit = 200) {
  if (!isSupabaseConfigured()) {
    return { checked: 0, repaired: 0, skipped: 0, failed: 0 }
  }

  const admin = createAdminClient()
  let query = admin
    .from('release_candidates')
    .select('*')
    .order('confidence_score', { ascending: false })
    .order('last_seen_at', { ascending: false })
    .limit(limit)

  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error

  let checked = 0
  let repaired = 0
  let skipped = 0
  let failed = 0

  for (const row of data ?? []) {
    checked++
    if (await isReachableImageUrl(row.image_url)) {
      skipped++
      continue
    }

    const candidate = {
      title: row.title,
      developer: row.developer ?? undefined,
      platforms: row.platforms ?? [],
      release_date: row.release_date,
      release_date_precision: row.release_date_precision ?? 'unknown',
      description: row.description ?? undefined,
      image_url: undefined,
      source: row.source,
      source_url: row.source_url,
      external_id: row.external_id,
      confidence_score: row.confidence_score ?? 0,
      signals: row.signals ?? {},
      raw_payload: row.raw_payload ?? {},
    } satisfies ReleaseCandidateInput

    let imageUrl: string | undefined
    let imageFallbackSource: string | null = null
    let steamDetails: SteamAppDetails | null = null
    let igdb: IgdbGame | null = null

    if (row.source === 'steam' && row.external_id) {
      steamDetails = await fetchSteamAppDetails(row.external_id)
      const steamImageUrl = steamDetails?.header_image ?? steamDetails?.background_raw
      if (await isReachableImageUrl(steamImageUrl)) {
        imageUrl = steamImageUrl
        imageFallbackSource = 'Steam appdetails'
      }
    }

    if (!imageUrl) {
      igdb = await fetchIgdbGame(candidate)
      const igdbImageUrl = normalizeIgdbImage(igdb?.cover?.url) ?? normalizeIgdbImage(igdb?.artworks?.[0]?.url)
      if (await isReachableImageUrl(igdbImageUrl)) {
        imageUrl = igdbImageUrl
        imageFallbackSource = 'IGDB'
      }
    }

    if (!imageUrl) {
      failed++
      continue
    }

    const { error: updateError } = await admin
      .from('release_candidates')
      .update({
        image_url: imageUrl,
        signals: {
          ...(row.signals ?? {}),
          image_validated: true,
          image_repaired_at: new Date().toISOString(),
          image_fallback_source: imageFallbackSource,
          steam_image_rejected: Boolean(row.image_url),
          igdb_enriched: Boolean((row.signals ?? {}).igdb_enriched || igdb),
          igdb_id: igdb?.id ?? (row.signals ?? {}).igdb_id ?? null,
          igdb_genres:
            igdb?.genres?.map((genre) => genre.name).filter(Boolean) ??
            (row.signals ?? {}).igdb_genres ??
            [],
        },
        raw_payload: {
          ...(row.raw_payload ?? {}),
          ...(steamDetails ? { steam_appdetails: steamDetails } : {}),
          ...(igdb ? { igdb } : {}),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)

    if (updateError) {
      failed++
    } else {
      repaired++
    }
  }

  return { checked, repaired, skipped, failed }
}

export async function crawlReleaseCandidates(source = 'all') {
  const allSources = [
    { source: 'steam', crawl: crawlSteamReleaseCandidates },
    { source: 'nintendo', crawl: crawlNintendoReleaseCandidates },
    { source: 'playstation', crawl: crawlPlayStationReleaseCandidates },
    { source: 'xbox', crawl: crawlXboxReleaseCandidates },
    { source: 'mobile', crawl: crawlMobileReleaseCandidates },
    { source: 'media', crawl: crawlMediaReleaseCandidates },
  ]
  const sources = source === 'all'
    ? allSources
    : allSources.filter((item) => item.source === source)

  if (!sources.length) throw new Error(`Unknown release source: ${source}`)

  const results = []
  let totalInserted = 0
  let totalUpdated = 0
  let totalSkipped = 0

  for (const item of sources) {
    try {
      const candidates = await item.crawl()
      const enrichedCandidates = await enrichReleaseCandidates(candidates)
      const result = await upsertReleaseCandidates(enrichedCandidates)
      totalInserted += result.inserted
      totalUpdated += result.updated
      totalSkipped += result.skipped
      results.push({
        source: item.source,
        fetched: candidates.length,
        enriched: enrichedCandidates.filter((candidate) => {
          const sources = candidate.signals.metadata_enrichment_sources
          return Array.isArray(sources) && sources.length > 0
        }).length,
        ...result,
      })
    } catch (error) {
      results.push({
        source: item.source,
        fetched: 0,
        enriched: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : 'Source crawl failed',
      })
    }
  }

  return {
    inserted: totalInserted,
    updated: totalUpdated,
    skipped: totalSkipped,
    sources: results,
  }
}
