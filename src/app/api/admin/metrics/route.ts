import { NextRequest, NextResponse } from 'next/server'
import { createSign } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type CountResult = {
  value: number
  error?: string
}

type NumericRow = Record<string, unknown>

const DAY_MS = 24 * 60 * 60 * 1000
const GA4_KEY_EVENTS = [
  'page_view',
  'roar_viewed',
  'roar_match_selected',
  'roar_cheer_submitted',
  'roar_auth_gate_hit',
  'roar_signin_prompt_viewed',
  'auth_started',
  'auth_submitted',
  'auth_success',
  'roar_score_saved',
  'roar_prediction_pick',
  'newsletter_subscribed',
  'wishlist_added',
  'reminder_set',
]

function verifyAdmin(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET
  const authHeader = request.headers.get('authorization')
  const provided = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  return Boolean(adminSecret && provided === adminSecret)
}

function iso(msAgo: number) {
  return new Date(Date.now() - msAgo).toISOString()
}

async function countTable(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  column?: string,
  gte?: string,
  lt?: string,
): Promise<CountResult> {
  let query = admin.from(table).select('*', { count: 'exact', head: true })
  if (column && gte) query = query.gte(column, gte)
  if (column && lt) query = query.lt(column, lt)
  const result = await query
  return {
    value: result.count ?? 0,
    error: result.error?.message,
  }
}

async function selectRows<T = NumericRow>(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  columns: string,
  options: {
    column?: string
    gte?: string
    lt?: string
    order?: string
    ascending?: boolean
    limit?: number
  } = {},
) {
  let query = admin.from(table).select(columns)
  if (options.column && options.gte) query = query.gte(options.column, options.gte)
  if (options.column && options.lt) query = query.lt(options.column, options.lt)
  if (options.order) query = query.order(options.order, { ascending: options.ascending ?? false })
  if (options.limit) query = query.limit(options.limit)
  const result = await query
  return {
    data: (result.data ?? []) as T[],
    error: result.error?.message,
  }
}

function sumRows(rows: NumericRow[], column: string) {
  return rows.reduce((sum, row) => sum + (Number(row[column]) || 0), 0)
}

function uniqueCount(rows: NumericRow[], column: string) {
  const values = new Set<string>()
  for (const row of rows) {
    const value = row[column]
    if (typeof value === 'string' && value) values.add(value)
  }
  return values.size
}

function aggregateCheerCountries(rows: NumericRow[]) {
  const map = new Map<string, { country: string; total: number; taps: number; shakes: number }>()
  for (const row of rows) {
    const country = String(row.country ?? 'Unknown')
    const current = map.get(country) ?? { country, total: 0, taps: 0, shakes: 0 }
    current.total += Number(row.total) || 0
    current.taps += Number(row.taps) || 0
    current.shakes += Number(row.shakes) || 0
    map.set(country, current)
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total || a.country.localeCompare(b.country))
}

function base64url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function parseMetricValue(row: { metricValues?: Array<{ value?: string }> }, index = 0) {
  return Number(row.metricValues?.[index]?.value ?? 0) || 0
}

async function getGoogleAccessToken() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!clientEmail || !privateKey) return null

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))
  const input = `${header}.${claims}`
  const signature = createSign('RSA-SHA256').update(input).sign(privateKey)
  const assertion = `${input}.${base64url(signature)}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const tokenPayload = await tokenResponse.json() as { access_token?: string; error_description?: string; error?: string }
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(tokenPayload.error_description ?? tokenPayload.error ?? 'GA4 token request failed')
  }
  return tokenPayload.access_token
}

async function ga4RunReport(
  propertyId: string,
  accessToken: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json() as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>
      metricValues?: Array<{ value?: string }>
    }>
    error?: { message?: string }
  }
  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'GA4 report request failed')
  }
  return payload.rows ?? []
}

async function getGa4Metrics() {
  const propertyId = process.env.GA4_PROPERTY_ID
  const hasCredentials = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)

  if (!propertyId || !hasCredentials) {
    return {
      configured: false,
      propertyId: propertyId ?? null,
      eventsLast7d: [],
      keyEventsLast7d: [],
      topPagesLast7d: [],
      error: 'Add GA4_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY to enable GA4 event values.',
    }
  }

  try {
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) throw new Error('GA4 credentials are incomplete')

    const [eventRows, pageRows] = await Promise.all([
      ga4RunReport(propertyId, accessToken, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 50,
      }),
      ga4RunReport(propertyId, accessToken, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 12,
      }),
    ])

    const eventsLast7d = eventRows.map((row) => ({
      eventName: row.dimensionValues?.[0]?.value ?? 'unknown',
      count: parseMetricValue(row),
    }))
    const eventMap = new Map(eventsLast7d.map((row) => [row.eventName, row.count]))

    return {
      configured: true,
      propertyId,
      eventsLast7d: eventsLast7d.slice(0, 20),
      keyEventsLast7d: GA4_KEY_EVENTS.map((eventName) => ({
        eventName,
        count: eventMap.get(eventName) ?? 0,
      })),
      topPagesLast7d: pageRows.map((row) => ({
        path: row.dimensionValues?.[0]?.value ?? 'unknown',
        views: parseMetricValue(row),
      })),
      error: null,
    }
  } catch (error) {
    return {
      configured: true,
      propertyId,
      eventsLast7d: [],
      keyEventsLast7d: [],
      topPagesLast7d: [],
      error: error instanceof Error ? error.message : 'Could not load GA4 metrics',
    }
  }
}

async function getAuthMetrics(start24h: string, start7d: string) {
  const admin = createAdminClient()
  let page = 1
  const perPage = 1000
  let total = 0
  let new24h = 0
  let new7d = 0
  const latest: Array<{ id: string; email?: string; createdAt?: string; provider?: string }> = []

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data.users ?? []
    total += users.length
    for (const user of users) {
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0
      if (createdAt >= new Date(start24h).getTime()) new24h += 1
      if (createdAt >= new Date(start7d).getTime()) new7d += 1
      latest.push({
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        provider: user.app_metadata?.provider,
      })
    }
    if (users.length < perPage) break
    page += 1
  }

  latest.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
  return {
    total,
    new24h,
    new7d,
    latest: latest.slice(0, 8).map((user) => ({
      ...user,
      email: user.email ? user.email.replace(/^(.{2}).*(@.*)$/, '$1***$2') : undefined,
    })),
  }
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const start24h = iso(DAY_MS)
  const start7d = iso(7 * DAY_MS)
  const errors: string[] = []

  try {
    const [
      auth,
      digestTotal,
      digest24h,
      digest7d,
      pushTotal,
      wishlistsTotal,
      wishlists24h,
      remindersTotal,
      reminders24h,
      releaseWishlistsTotal,
      releaseWishlists24h,
      releaseRemindersTotal,
      releaseReminders24h,
      gpRows24h,
      gpRows7d,
      roarSessionsTotal,
      roarSessions24h,
      roarSessions7d,
      roarSessionRows,
      roarCheerRows24h,
      roarCheerRows7d,
      roarScoresTotal,
      roarScores24h,
      miniPlayersTotal,
      miniPlayers24h,
      miniBetsTotal,
      miniBetsRows,
      cheerTotalsRows,
      recentSessions,
      ga4,
    ] = await Promise.all([
      getAuthMetrics(start24h, start7d),
      countTable(admin, 'digest_subscribers'),
      countTable(admin, 'digest_subscribers', 'created_at', start24h),
      countTable(admin, 'digest_subscribers', 'created_at', start7d),
      countTable(admin, 'push_subscriptions'),
      countTable(admin, 'wishlists'),
      countTable(admin, 'wishlists', 'created_at', start24h),
      countTable(admin, 'reminders'),
      countTable(admin, 'reminders', 'created_at', start24h),
      countTable(admin, 'release_wishlists'),
      countTable(admin, 'release_wishlists', 'created_at', start24h),
      countTable(admin, 'release_reminders'),
      countTable(admin, 'release_reminders', 'created_at', start24h),
      selectRows(admin, 'weekly_gp_log', 'gp_amount, action_type, created_at', { column: 'created_at', gte: start24h, limit: 5000 }),
      selectRows(admin, 'weekly_gp_log', 'gp_amount, action_type, created_at', { column: 'created_at', gte: start7d, limit: 10000 }),
      countTable(admin, 'roar_sessions'),
      countTable(admin, 'roar_sessions', 'created_at', start24h),
      countTable(admin, 'roar_sessions', 'created_at', start7d),
      selectRows(admin, 'roar_sessions', 'user_id, device_id, match_id, match_title, team_selected, source, created_at, last_seen_at', { limit: 10000 }),
      selectRows(admin, 'roar_cheers', 'user_id, device_id, match_id, match_title, team, taps, score_delta, source, created_at', { column: 'created_at', gte: start24h, limit: 10000 }),
      selectRows(admin, 'roar_cheers', 'user_id, device_id, match_id, match_title, team, taps, score_delta, source, created_at', { column: 'created_at', gte: start7d, limit: 20000 }),
      countTable(admin, 'roar_scores'),
      countTable(admin, 'roar_scores', 'created_at', start24h),
      countTable(admin, 'mini_cup_players'),
      countTable(admin, 'mini_cup_players', 'created_at', start24h),
      countTable(admin, 'mini_cup_bets'),
      selectRows(admin, 'mini_cup_bets', 'match_id, match_label, country, pick, stake, status, payout, claimed, created_at', { limit: 10000 }),
      selectRows(admin, 'mini_cup_cheer_totals', 'match_id, country, taps, shakes, total, updated_at', { order: 'total', limit: 5000 }),
      selectRows(admin, 'roar_sessions', 'match_id, match_title, team_selected, source, created_at, last_seen_at', { order: 'last_seen_at', limit: 12 }),
      getGa4Metrics(),
    ])

    for (const result of [
      digestTotal,
      digest24h,
      digest7d,
      pushTotal,
      wishlistsTotal,
      wishlists24h,
      remindersTotal,
      reminders24h,
      releaseWishlistsTotal,
      releaseWishlists24h,
      releaseRemindersTotal,
      releaseReminders24h,
      roarSessionsTotal,
      roarSessions24h,
      roarSessions7d,
      roarScoresTotal,
      roarScores24h,
      miniPlayersTotal,
      miniPlayers24h,
      miniBetsTotal,
    ]) {
      if (result.error) errors.push(result.error)
    }
    for (const result of [gpRows24h, gpRows7d, roarSessionRows, roarCheerRows24h, roarCheerRows7d, miniBetsRows, cheerTotalsRows, recentSessions]) {
      if (result.error) errors.push(result.error)
    }

    const sessionRows = roarSessionRows.data
    const cheerRows24h = roarCheerRows24h.data
    const cheerRows7d = roarCheerRows7d.data
    const cheerTotals = aggregateCheerCountries(cheerTotalsRows.data)
    const bets = miniBetsRows.data

    const matchMap = new Map<string, { matchId: string; matchTitle: string; sessions: number; cheers: number; score: number }>()
    for (const row of sessionRows) {
      const matchId = String(row.match_id ?? 'unknown')
      const current = matchMap.get(matchId) ?? {
        matchId,
        matchTitle: String(row.match_title ?? matchId),
        sessions: 0,
        cheers: 0,
        score: 0,
      }
      current.sessions += 1
      matchMap.set(matchId, current)
    }
    for (const row of cheerRows7d) {
      const matchId = String(row.match_id ?? 'unknown')
      const current = matchMap.get(matchId) ?? {
        matchId,
        matchTitle: String(row.match_title ?? matchId),
        sessions: 0,
        cheers: 0,
        score: 0,
      }
      current.cheers += 1
      current.score += Number(row.score_delta) || 0
      matchMap.set(matchId, current)
    }

    const sourceMap = new Map<string, number>()
    for (const row of sessionRows) {
      const source = String(row.source ?? 'direct')
      sourceMap.set(source, (sourceMap.get(source) ?? 0) + 1)
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      windows: { last24h: start24h, last7d: start7d },
      users: auth,
      site: {
        newsletterSubscribers: {
          total: digestTotal.value,
          last24h: digest24h.value,
          last7d: digest7d.value,
        },
        pushSubscriptions: pushTotal.value,
        gameWishlists: { total: wishlistsTotal.value, last24h: wishlists24h.value },
        gameReminders: { total: remindersTotal.value, last24h: reminders24h.value },
        releaseWishlists: { total: releaseWishlistsTotal.value, last24h: releaseWishlists24h.value },
        releaseReminders: { total: releaseRemindersTotal.value, last24h: releaseReminders24h.value },
        gpAwarded: {
          last24h: sumRows(gpRows24h.data, 'gp_amount'),
          last7d: sumRows(gpRows7d.data, 'gp_amount'),
        },
      },
      roar: {
        sessions: {
          total: roarSessionsTotal.value,
          last24h: roarSessions24h.value,
          last7d: roarSessions7d.value,
        },
        participants: {
          knownUsers: uniqueCount(sessionRows, 'user_id'),
          guestDevices: uniqueCount(sessionRows, 'device_id'),
          totalApprox: uniqueCount(sessionRows, 'user_id') + uniqueCount(sessionRows, 'device_id'),
        },
        cheers: {
          eventsLast24h: cheerRows24h.length,
          eventsLast7d: cheerRows7d.length,
          tapsLast24h: sumRows(cheerRows24h, 'taps'),
          scoreLast24h: sumRows(cheerRows24h, 'score_delta'),
          scoreLast7d: sumRows(cheerRows7d, 'score_delta'),
        },
        savedScores: {
          total: roarScoresTotal.value,
          last24h: roarScores24h.value,
        },
        miniCupPlayers: {
          total: miniPlayersTotal.value,
          last24h: miniPlayers24h.value,
        },
        predictions: {
          total: miniBetsTotal.value,
          open: bets.filter((row) => row.status === 'open').length,
          won: bets.filter((row) => row.status === 'won').length,
          lost: bets.filter((row) => row.status === 'lost').length,
          claimed: bets.filter((row) => Boolean(row.claimed)).length,
          stakeTotal: sumRows(bets, 'stake'),
          payoutTotal: sumRows(bets, 'payout'),
        },
        globalCheer: {
          total: sumRows(cheerTotals, 'total'),
          taps: sumRows(cheerTotals, 'taps'),
          shakes: sumRows(cheerTotals, 'shakes'),
        },
        topNations: cheerTotals
          .slice(0, 10)
          .map((row) => ({
            country: row.country,
            total: row.total,
            taps: row.taps,
            shakes: row.shakes,
          })),
        topMatches: Array.from(matchMap.values())
          .sort((a, b) => b.score - a.score || b.sessions - a.sessions)
          .slice(0, 10),
        sources: Array.from(sourceMap.entries())
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        recentSessions: recentSessions.data.map((row) => ({
          matchId: String(row.match_id ?? ''),
          matchTitle: String(row.match_title ?? ''),
          teamSelected: row.team_selected ? String(row.team_selected) : null,
          source: row.source ? String(row.source) : 'direct',
          lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null,
        })),
      },
      external: {
        ga4: ga4.configured
          ? ga4.error
            ? `GA4 Data API configured, but report fetch failed: ${ga4.error}`
            : `GA4 Data API connected for property ${ga4.propertyId}.`
          : ga4.error,
        vercel: 'Connected. Use Vercel Analytics for page views, referrers, devices, and countries.',
        posthog: process.env.POSTHOG_PERSONAL_API_KEY
          ? 'PostHog API key configured.'
          : 'PostHog client tracking is installed. Add POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY for server-side event counts here.',
      },
      ga4,
      errors: Array.from(new Set(errors)).slice(0, 8),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load metrics' },
      { status: 500 },
    )
  }
}
