import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      lastCheckIn: null,
      checkedToday: false,
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: stats } = await admin
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const today = todayStr()
  const { data: todayRow } = await admin
    .from('attendance')
    .select('id')
    .eq('user_id', user.id)
    .eq('checked_at', today)
    .maybeSingle()

  return NextResponse.json({
    currentStreak: stats?.current_streak ?? 0,
    longestStreak: stats?.longest_streak ?? 0,
    totalDays: stats?.total_days ?? 0,
    lastCheckIn: stats?.last_check_in ?? null,
    gp: stats?.gp ?? 0,
    checkedToday: !!todayRow,
  })
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = todayStr()

  const { data: existing } = await admin
    .from('attendance')
    .select('id')
    .eq('user_id', user.id)
    .eq('checked_at', today)
    .maybeSingle()

  if (existing) {
    const { data: stats } = await admin
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    return NextResponse.json({
      alreadyChecked: true,
      currentStreak: stats?.current_streak ?? 0,
      longestStreak: stats?.longest_streak ?? 0,
      totalDays: stats?.total_days ?? 0,
      lastCheckIn: stats?.last_check_in ?? today,
      gp: stats?.gp ?? 0,
    })
  }

  const { error: insertError } = await admin.from('attendance').insert({
    user_id: user.id,
    checked_at: today,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const { data: stats } = await admin
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const continued = stats?.last_check_in === yesterdayStr()
  const currentStreak = continued ? (stats?.current_streak ?? 0) + 1 : 1
  const longestStreak = Math.max(stats?.longest_streak ?? 0, currentStreak)
  const totalDays = (stats?.total_days ?? 0) + 1
  const gp = (stats?.gp ?? 0) + 2

  const { error: upsertError } = await admin.from('user_stats').upsert({
    user_id: user.id,
    current_streak: currentStreak,
    longest_streak: longestStreak,
    total_days: totalDays,
    last_check_in: today,
    gp,
  })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  const badgeIds: string[] = []
  if (currentStreak >= 3) badgeIds.push('streak_3')
  if (currentStreak >= 7) badgeIds.push('streak_7')
  if (currentStreak >= 30) badgeIds.push('streak_30')
  if (currentStreak >= 100) badgeIds.push('streak_100')

  for (const badgeId of badgeIds) {
    await admin.from('user_badges').upsert(
      { user_id: user.id, badge_id: badgeId },
      { onConflict: 'user_id,badge_id' }
    )
  }

  return NextResponse.json({
    alreadyChecked: false,
    currentStreak,
    longestStreak,
    totalDays,
    lastCheckIn: today,
    gp,
    newBadges: badgeIds,
  })
}
