import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSecret } from '@/lib/utils'

function inferHeroColor(platforms: string[]): string {
  if (platforms.includes('Switch')) return '#e4000f'
  if (platforms.includes('Mobile')) return '#22c55e'
  if (platforms.includes('PS5')) return '#2563eb'
  if (platforms.includes('Xbox')) return '#16a34a'
  return '#1b2838'
}

function normalizePlatforms(platforms: string[]): string[] {
  const order = ['PC', 'PS5', 'Xbox', 'Switch', 'Mobile']
  return Array.from(new Set(platforms)).sort((a, b) => {
    const left = order.includes(a) ? order.indexOf(a) : order.length
    const right = order.includes(b) ? order.indexOf(b) : order.length
    return left - right || a.localeCompare(b)
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const admin = createAdminClient()
  const { data: candidate, error: candidateError } = await admin
    .from('release_candidates')
    .select('*')
    .eq('id', id)
    .single()

  if (candidateError || !candidate) {
    return NextResponse.json(
      { error: candidateError?.message ?? 'Candidate not found' },
      { status: candidateError ? 500 : 404 }
    )
  }

  if (!candidate.release_date) {
    return NextResponse.json(
      { error: 'Release date is required before approving.' },
      { status: 400 }
    )
  }

  const releasePayload = {
    title: candidate.title,
    developer: candidate.developer,
    platform: normalizePlatforms(candidate.platforms ?? []),
    release_date: candidate.release_date,
    description: candidate.description,
    image_url: candidate.image_url,
    hero_color: inferHeroColor(candidate.platforms ?? []),
    steam_url: candidate.source === 'steam' ? candidate.source_url : null,
    nintendo_url: candidate.source === 'nintendo' ? candidate.source_url : null,
    is_featured: false,
    is_published: true,
  }

  const { data: existingRelease, error: existingError } = await admin
    .from('new_releases')
    .select('*')
    .eq('title', candidate.title)
    .eq('release_date', candidate.release_date)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

  const releaseRequest = existingRelease
    ? admin
        .from('new_releases')
        .update({
          developer: existingRelease.developer || releasePayload.developer,
          platform: normalizePlatforms([
            ...((existingRelease.platform as string[] | null) ?? []),
            ...releasePayload.platform,
          ]),
          description: existingRelease.description || releasePayload.description,
          image_url: existingRelease.image_url || releasePayload.image_url,
          hero_color: existingRelease.hero_color || releasePayload.hero_color,
          steam_url: existingRelease.steam_url || releasePayload.steam_url,
          nintendo_url: existingRelease.nintendo_url || releasePayload.nintendo_url,
          is_published: true,
        })
        .eq('id', existingRelease.id)
        .select()
        .single()
    : admin
        .from('new_releases')
        .insert(releasePayload)
        .select()
        .single()

  const { data: release, error: releaseError } = await releaseRequest

  if (releaseError) return NextResponse.json({ error: releaseError.message }, { status: 500 })

  const { data: updated, error: updateError } = await admin
    .from('release_candidates')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      approved_release_id: release.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ candidate: updated, release, merged: Boolean(existingRelease) })
}
