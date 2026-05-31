import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { verifyAdminSecret } from '@/lib/utils'

const PUBLIC_RELEASES_CACHE = {
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
}

function normalizeReleaseKey(title: string, date?: string | null) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}::${date ?? 'unknown'}`
}

function signalString(signals: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = signals?.[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function signalNumber(signals: Record<string, unknown> | null | undefined, key: string): number {
  const value = signals?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function signalBoolean(signals: Record<string, unknown> | null | undefined, key: string): boolean {
  return signals?.[key] === true
}

function signalStringArray(signals: Record<string, unknown> | null | undefined, key: string): string[] {
  const value = signals?.[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export async function GET(request: NextRequest) {
  const featured = request.nextUrl.searchParams.get('featured') === 'true'

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ releases: [] }, { headers: PUBLIC_RELEASES_CACHE })
  }

  const isAdmin = verifyAdminSecret(request)

  const admin = createAdminClient()
  let query = admin.from('new_releases').select('*').order('release_date')

  if (!isAdmin) {
    query = query.eq('is_published', true)
  }

  if (featured) query = query.eq('is_featured', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!isAdmin && !featured && (!data || data.length === 0)) {
    const { data: candidates, error: fallbackError } = await admin
      .from('release_candidates')
      .select('id,title,developer,platforms,release_date,description,image_url,source,source_url,confidence_score,signals')
      .eq('status', 'pending')
      .not('release_date', 'is', null)
      .gte('confidence_score', 80)
      .order('release_date', { ascending: true })
      .order('confidence_score', { ascending: false })
      .limit(80)

    if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 })

    const releaseMap = new Map<string, {
      id: string
      title: string
      developer?: string | null
      platform: string[]
      release_date: string | null
      description?: string | null
      image_url?: string | null
      hero_color: null
      steam_url?: string | null
      nintendo_url?: string | null
      trailer_url?: string | null
      genre_tags?: string[]
      preorder_url?: string | null
      hype_score?: number
      is_free_to_play?: boolean
      is_featured: boolean
      is_published: boolean
      source: string
      confidence_score: number
    }>()

    for (const candidate of candidates ?? []) {
      const key = normalizeReleaseKey(candidate.title, candidate.release_date)
      const existing = releaseMap.get(key)
      const signals = candidate.signals as Record<string, unknown> | null | undefined
      const nextPlatforms = Array.from(new Set([...(existing?.platform ?? []), ...(candidate.platforms ?? [])]))
      const nextGenreTags = Array.from(new Set([
        ...(existing?.genre_tags ?? []),
        ...signalStringArray(signals, 'genre_tags'),
      ]))
      const next = {
        id: existing?.id ?? `candidate-${candidate.id}`,
        title: existing?.title ?? candidate.title,
        developer: existing?.developer || candidate.developer,
        platform: nextPlatforms,
        release_date: existing?.release_date ?? candidate.release_date,
        description: existing?.description || candidate.description,
        image_url: existing?.image_url || candidate.image_url,
        hero_color: null,
        steam_url: existing?.steam_url || (candidate.source === 'steam' ? candidate.source_url : null),
        nintendo_url: existing?.nintendo_url || (candidate.source === 'nintendo' ? candidate.source_url : null),
        trailer_url: existing?.trailer_url || signalString(signals, 'trailer_url'),
        genre_tags: nextGenreTags,
        preorder_url: existing?.preorder_url || signalString(signals, 'preorder_url') || candidate.source_url,
        hype_score: Math.max(existing?.hype_score ?? 0, signalNumber(signals, 'hype_score'), candidate.confidence_score ?? 0),
        is_free_to_play: existing?.is_free_to_play || signalBoolean(signals, 'is_free_to_play'),
        is_featured: false,
        is_published: true,
        source: 'candidate_preview',
        confidence_score: Math.max(existing?.confidence_score ?? 0, candidate.confidence_score ?? 0),
      }
      releaseMap.set(key, next)
    }

    const releases = Array.from(releaseMap.values())
      .sort((a, b) => {
        const dateOrder = String(a.release_date).localeCompare(String(b.release_date))
        if (dateOrder !== 0) return dateOrder
        return b.confidence_score - a.confidence_score
      })
      .map(({ confidence_score, ...release }) => release)

    return NextResponse.json({ releases, source: 'candidate_preview' }, { headers: PUBLIC_RELEASES_CACHE })
  }

  return NextResponse.json(
    { releases: data },
    { headers: isAdmin ? { 'Cache-Control': 'no-store' } : PUBLIC_RELEASES_CACHE }
  )
}

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const admin = createAdminClient()

  if (body.is_featured) {
    const { count } = await admin
      .from('new_releases')
      .select('*', { count: 'exact', head: true })
      .eq('is_featured', true)
    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: 'Maximum 3 featured releases allowed' }, { status: 400 })
    }
  }

  const { data, error } = await admin.from('new_releases').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ release: data })
}
