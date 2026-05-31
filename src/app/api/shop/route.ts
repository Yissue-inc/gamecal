import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

const SHOP_ITEMS = [
  { id: 'streak_freeze', price: 100 },
  { id: 'double_gp_day', price: 200 },
  { id: 'theme_neon', price: 50 },
  { id: 'theme_gold', price: 150 },
  { id: 'veteran_badge', price: 500 },
]

function emptyState() {
  return {
    streakFreezeCount: 0,
    doubleGpUntil: null,
    activeTheme: 'default',
    unlockedBadges: [],
  }
}

async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ gp: 0, state: emptyState() })
  }

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: stats, error } = await admin
    .from('user_stats')
    .select('gp, streak_freeze_count, double_gp_until, active_theme')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: badges } = await admin
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id)

  return NextResponse.json({
    gp: stats?.gp ?? 0,
    state: {
      streakFreezeCount: stats?.streak_freeze_count ?? 0,
      doubleGpUntil: stats?.double_gp_until ?? null,
      activeTheme: stats?.active_theme ?? 'default',
      unlockedBadges: (badges ?? []).map((badge) => badge.badge_id),
    },
  })
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemId } = await request.json()
  const item = SHOP_ITEMS.find((candidate) => candidate.id === itemId)
  if (!item) return NextResponse.json({ error: 'Unknown shop item' }, { status: 400 })

  const admin = createAdminClient()
  const { data: stats, error: statsError } = await admin
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (statsError) return NextResponse.json({ error: statsError.message }, { status: 500 })
  const gp = stats?.gp ?? 0
  if (gp < item.price) {
    return NextResponse.json({ error: 'Not enough GP' }, { status: 400 })
  }

  const nextStats: Record<string, unknown> = {
    user_id: user.id,
    gp: gp - item.price,
  }

  if (item.id === 'streak_freeze') {
    nextStats.streak_freeze_count = (stats?.streak_freeze_count ?? 0) + 1
  } else if (item.id === 'double_gp_day') {
    const currentUntil = stats?.double_gp_until ? new Date(stats.double_gp_until).getTime() : 0
    const base = Math.max(Date.now(), currentUntil)
    nextStats.double_gp_until = new Date(base + 24 * 60 * 60 * 1000).toISOString()
  } else if (item.id === 'theme_neon') {
    nextStats.active_theme = 'neon'
  } else if (item.id === 'theme_gold') {
    nextStats.active_theme = 'gold'
  }

  const { error: updateError } = await admin.from('user_stats').upsert(nextStats)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  if (item.id === 'veteran_badge') {
    const { error: badgeError } = await admin.from('user_badges').upsert(
      { user_id: user.id, badge_id: 'veteran' },
      { onConflict: 'user_id,badge_id' }
    )
    if (badgeError) return NextResponse.json({ error: badgeError.message }, { status: 500 })
  }

  const { data: freshStats } = await admin
    .from('user_stats')
    .select('gp, streak_freeze_count, double_gp_until, active_theme')
    .eq('user_id', user.id)
    .maybeSingle()
  const { data: badges } = await admin
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id)

  return NextResponse.json({
    gp: freshStats?.gp ?? gp - item.price,
    spent: item.price,
    state: {
      streakFreezeCount: freshStats?.streak_freeze_count ?? 0,
      doubleGpUntil: freshStats?.double_gp_until ?? null,
      activeTheme: freshStats?.active_theme ?? 'default',
      unlockedBadges: (badges ?? []).map((badge) => badge.badge_id),
    },
  })
}
