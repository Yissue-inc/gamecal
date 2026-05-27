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

interface SteamAppDetails {
  name?: string
  short_description?: string
  detailed_description?: string
  header_image?: string
  developers?: string[]
  publishers?: string[]
  release_date?: {
    coming_soon?: boolean
    date?: string
  }
  background_raw?: string
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeSteamImage(value?: string): string | undefined {
  if (!value) return undefined
  return value.replace('capsule_sm_120', 'header').replace('capsule_231x87', 'header')
}

function stripHtml(value?: string): string | undefined {
  if (!value) return undefined
  const text = cheerio.load(value).text().replace(/\s+/g, ' ').trim()
  return text || undefined
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
        filters: 'basic',
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

    enriched.push({
      ...candidate,
      title: normalizeTitle(details.name ?? candidate.title),
      developer: candidate.developer ?? details.developers?.[0] ?? details.publishers?.[0],
      release_date: nextDate,
      release_date_precision: nextPrecision,
      description:
        candidate.description ??
        stripHtml(details.short_description) ??
        stripHtml(details.detailed_description),
      image_url: candidate.image_url ?? details.header_image ?? details.background_raw,
      confidence_score: Math.min(
        98,
        candidate.confidence_score +
          (details.header_image && !candidate.image_url ? 4 : 0) +
          (details.short_description ? 4 : 0)
      ),
      signals: {
        ...candidate.signals,
        appdetails_enriched: true,
        steam_developers: details.developers ?? null,
        steam_publishers: details.publishers ?? null,
      },
      raw_payload: {
        ...candidate.raw_payload,
        steam_appdetails: details,
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

  return enrichSteamCandidates(deduped)
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

export async function crawlReleaseCandidates(source = 'all') {
  const sources =
    source === 'all' || source === 'steam'
      ? [{ source: 'steam', crawl: crawlSteamReleaseCandidates }]
      : []

  if (!sources.length) throw new Error(`Unknown release source: ${source}`)

  const results = []
  let totalInserted = 0
  let totalUpdated = 0
  let totalSkipped = 0

  for (const item of sources) {
    const candidates = await item.crawl()
    const result = await upsertReleaseCandidates(candidates)
    totalInserted += result.inserted
    totalUpdated += result.updated
    totalSkipped += result.skipped
    results.push({ source: item.source, fetched: candidates.length, ...result })
  }

  return {
    inserted: totalInserted,
    updated: totalUpdated,
    skipped: totalSkipped,
    sources: results,
  }
}
