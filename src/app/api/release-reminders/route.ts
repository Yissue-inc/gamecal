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

function releaseReminderAt(releaseDate: string, offsetMin: number) {
  const releaseAt = new Date(`${releaseDate}T09:00:00.000Z`)
  return new Date(releaseAt.getTime() - offsetMin * 60 * 1000)
}

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ reminders: [] })
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('release_reminders')
    .select('id,release_id,offset_min,remind_at,is_sent,created_at')
    .eq('user_id', user.id)
    .eq('is_sent', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reminders: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 })
  }

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { releaseId, offsetMin } = await request.json()
  if (!releaseId || !Number.isFinite(Number(offsetMin))) {
    return NextResponse.json({ error: 'Invalid reminder payload' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: release, error: releaseError } = await admin
    .from('new_releases')
    .select('id,release_date')
    .eq('id', releaseId)
    .single()

  if (releaseError || !release) {
    return NextResponse.json({ error: releaseError?.message ?? 'Release not found' }, { status: 404 })
  }

  const remindAt = releaseReminderAt(release.release_date, Number(offsetMin))
  if (Number.isNaN(remindAt.getTime())) {
    return NextResponse.json({ error: 'Invalid release date' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('release_reminders')
    .upsert(
      {
        user_id: user.id,
        release_id: releaseId,
        offset_min: Number(offsetMin),
        remind_at: remindAt.toISOString(),
        is_sent: false,
        sent_at: null,
        last_error: null,
      },
      { onConflict: 'user_id,release_id,offset_min' }
    )
    .select('id,release_id,offset_min,remind_at,is_sent,created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reminder: data })
}

export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ success: true })
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = request.nextUrl.searchParams
  const releaseId = params.get('release_id')
  const offsetMin = Number(params.get('offset_min'))
  if (!releaseId || !Number.isFinite(offsetMin)) {
    return NextResponse.json({ error: 'Invalid reminder payload' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('release_reminders')
    .delete()
    .eq('user_id', user.id)
    .eq('release_id', releaseId)
    .eq('offset_min', offsetMin)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
