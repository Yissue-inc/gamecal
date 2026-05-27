import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'
import { verifyAdminSecret } from '@/lib/utils'

export async function GET(request: NextRequest) {
  const featured = request.nextUrl.searchParams.get('featured') === 'true'

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ releases: [] })
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
      .select('id,title,developer,platforms,release_date,description,image_url,source,source_url,confidence_score')
      .eq('status', 'pending')
      .not('release_date', 'is', null)
      .gte('confidence_score', 80)
      .order('confidence_score', { ascending: false })
      .order('release_date', { ascending: true })
      .limit(24)

    if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 })

    const releases = (candidates ?? []).map((candidate) => ({
      id: `candidate-${candidate.id}`,
      title: candidate.title,
      developer: candidate.developer,
      platform: candidate.platforms ?? [],
      release_date: candidate.release_date,
      description: candidate.description,
      image_url: candidate.image_url,
      hero_color: null,
      steam_url: candidate.source === 'steam' ? candidate.source_url : null,
      nintendo_url: candidate.source === 'nintendo' ? candidate.source_url : null,
      is_featured: false,
      is_published: true,
      source: 'candidate_preview',
    }))

    return NextResponse.json({ releases, source: 'candidate_preview' })
  }

  return NextResponse.json({ releases: data })
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
