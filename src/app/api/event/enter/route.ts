import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const EVENT_ID = 'gamecal-level-up-launch-2026'
const SILVER_TIERS = ['silver', 'gold', 'platinum', 'diamond']

function getPrestigeId(gp: number): string {
  if (gp >= 2500) return 'diamond'
  if (gp >= 1000) return 'platinum'
  if (gp >= 500) return 'gold'
  if (gp >= 200) return 'silver'
  return 'bronze'
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  // Authenticate user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse body
  let body: { platform?: string; social_url?: string; email?: string; event_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { platform, social_url, email, event_id } = body

  // Validate fields
  if (!platform || !['instagram', 'tiktok', 'twitter'].includes(platform)) {
    return NextResponse.json({ error: '유효하지 않은 플랫폼입니다' }, { status: 400 })
  }
  if (!social_url || !social_url.startsWith('https://')) {
    return NextResponse.json({ error: 'URL은 https://로 시작해야 합니다' }, { status: 400 })
  }
  if (!email || !email.trim()) {
    return NextResponse.json({ error: '이메일을 입력해주세요' }, { status: 400 })
  }
  if (!event_id) {
    return NextResponse.json({ error: 'event_id가 필요합니다' }, { status: 400 })
  }
  if (event_id !== EVENT_ID) {
    return NextResponse.json({ error: '지원하지 않는 이벤트입니다' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Get user's GP from user_stats
  const { data: stats, error: statsError } = await admin
    .from('user_stats')
    .select('gp, prestige_level')
    .eq('user_id', user.id)
    .maybeSingle()

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 })
  }

  const gp = stats?.gp ?? 0
  const prestigeId = stats?.prestige_level ?? getPrestigeId(gp)

  // Validate eligibility (silver or above)
  if (!SILVER_TIERS.includes(prestigeId) && !SILVER_TIERS.includes(getPrestigeId(gp))) {
    return NextResponse.json(
      { error: 'Silver 등급 이상만 응모할 수 있습니다' },
      { status: 403 }
    )
  }

  // Insert into event_entries
  const { data: entryData, error: insertError } = await admin
    .from('event_entries')
    .insert({
      user_id: user.id,
      email: email.trim(),
      social_url: social_url.trim(),
      platform,
      score_at_entry: gp,
      event_id,
    })
    .select()
    .single()

  if (insertError) {
    // Unique constraint violation = already entered
    if (insertError.code === '23505') {
      return NextResponse.json({ error: '이미 응모한 이벤트입니다' }, { status: 409 })
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ entry: entryData }, { status: 201 })
}
