import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

function weekStartUtc(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}

function nextResetDays() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = now.getUTCDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  next.setUTCDate(next.getUTCDate() + daysUntilMonday)
  next.setUTCHours(0, 0, 0, 0)
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
}

export async function GET() {
  const weekStart = weekStartUtc()
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ weekStart, rows: [], me: null, nextResetDays: nextResetDays() })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_weekly_leaderboard', {
    target_week_start: weekStart,
  })

  if (error) {
    return NextResponse.json({
      weekStart,
      rows: [],
      me: user ? { rank: null, totalGp: 0, mayorTitles: [] } : null,
      nextResetDays: nextResetDays(),
      warning: error.message,
    })
  }

  let me = null
  if (user) {
    const { data: totals } = await admin
      .from('weekly_gp_log')
      .select('user_id, gp_amount')
      .eq('week_start', weekStart)

    const totalsByUser = new Map<string, number>()
    for (const row of totals ?? []) {
      totalsByUser.set(row.user_id, (totalsByUser.get(row.user_id) ?? 0) + row.gp_amount)
    }
    const ranked = Array.from(totalsByUser.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    const index = ranked.findIndex(([userId]) => userId === user.id)
    const mayorTitles: string[] = []
    const { data: affinityRows } = await admin
      .from('user_stats')
      .select('user_id, game_affinity_counts')

    const maxByGame = new Map<string, number>()
    const mine = new Map<string, number>()
    for (const row of affinityRows ?? []) {
      const counts = (row.game_affinity_counts ?? {}) as Record<string, number>
      for (const [game, count] of Object.entries(counts)) {
        const numericCount = Number(count) || 0
        maxByGame.set(game, Math.max(maxByGame.get(game) ?? 0, numericCount))
        if (row.user_id === user.id) mine.set(game, numericCount)
      }
    }

    for (const [game, count] of Array.from(mine.entries())) {
      if (count > 0 && count === maxByGame.get(game)) {
        mayorTitles.push(`${game} Mayor 🏆`)
      }
    }

    me = {
      rank: index >= 0 ? index + 1 : null,
      totalGp: totalsByUser.get(user.id) ?? 0,
      mayorTitles,
    }
  }

  return NextResponse.json({
    weekStart,
    rows: (data ?? []).map((row: { rank: number | string; user_id: string; display_name: string; total_gp: number | string }) => ({
      rank: Number(row.rank),
      userId: row.user_id,
      displayName: row.display_name,
      totalGp: Number(row.total_gp),
    })),
    me,
    nextResetDays: nextResetDays(),
  })
}
