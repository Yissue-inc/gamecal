import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ releaseIds: [], releases: [] })
  }

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('release_wishlists')
    .select('release_id, release:new_releases(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const releases = (data ?? [])
    .map((row) => (Array.isArray(row.release) ? row.release[0] : row.release))
    .filter(Boolean)

  return NextResponse.json({
    releaseIds: (data ?? []).map((row) => row.release_id),
    releases,
  })
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { releaseId } = await request.json()
  if (!releaseId) {
    return NextResponse.json({ error: 'releaseId required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('release_wishlists').upsert(
    { user_id: user.id, release_id: releaseId },
    { onConflict: 'user_id,release_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ wishlisted: true })
}

export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { releaseId } = await request.json()
  if (!releaseId) {
    return NextResponse.json({ error: 'releaseId required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('release_wishlists')
    .delete()
    .eq('user_id', user.id)
    .eq('release_id', releaseId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ wishlisted: false })
}
