import { createAdminClient } from '@/lib/supabase/admin'

const REPORT_RECIPIENT = process.env.REPORT_RECIPIENT_EMAIL ?? 'ck@yissue.biz'
const REPORT_FROM = process.env.REPORT_FROM_EMAIL ?? 'GamerClock Reports <reports@gamerclock.com>'
const POSTHOG_HOST = process.env.POSTHOG_HOST ?? 'https://us.posthog.com'

type Metric = {
  label: string
  value: number
  previous?: number
}

type CountResult = {
  value: number
  error?: string
}

type DailyReport = {
  generatedAt: string
  windowStart: string
  windowEnd: string
  recipient: string
  metrics: Metric[]
  posthogEvents: Metric[]
  notes: string[]
}

const trackedEvents = [
  'auth_started',
  'auth_failed',
  'newsletter_subscribed',
  'newsletter_subscribe_failed',
  'wishlist_added',
  'reminder_set',
  'checkin_done',
  'clash_alert_action',
]

function dayRange(now = new Date()) {
  const end = now
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  const previousStart = new Date(start.getTime() - 24 * 60 * 60 * 1000)
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    previousStart: previousStart.toISOString(),
  }
}

async function countQuery(query: {
  select: (columns: string, options: { count: 'exact'; head: true }) => unknown
}): Promise<CountResult> {
  const result = await query.select('*', { count: 'exact', head: true }) as { count: number | null; error?: { message?: string } | null }
  return {
    value: result.count ?? 0,
    error: result.error?.message,
  }
}

async function countTable(admin: ReturnType<typeof createAdminClient>, table: string, column?: string, gte?: string, lt?: string) {
  let query = admin.from(table).select('*', { count: 'exact', head: true })
  if (column && gte) query = query.gte(column, gte)
  if (column && lt) query = query.lt(column, lt)
  const result = await query
  return {
    value: result.count ?? 0,
    error: result.error?.message,
  }
}

async function getAuthUserMetrics(start: string, previousStart: string) {
  const admin = createAdminClient()
  let page = 1
  const perPage = 1000
  let total = 0
  let newUsers = 0
  let previousNewUsers = 0

  while (page < 20) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data.users ?? []
    total += users.length
    for (const user of users) {
      const createdAt = user.created_at ? new Date(user.created_at).getTime() : 0
      if (createdAt >= new Date(start).getTime()) newUsers += 1
      else if (createdAt >= new Date(previousStart).getTime()) previousNewUsers += 1
    }
    if (users.length < perPage) break
    page += 1
  }

  return {
    total,
    newUsers,
    previousNewUsers,
  }
}

async function getPostHogEventMetrics(start: string) {
  const projectId = process.env.POSTHOG_PROJECT_ID
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  if (!projectId || !apiKey) {
    return {
      metrics: [] as Metric[],
      note: 'PostHog API not configured. Add POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY to include event counts.',
    }
  }

  const query = `
    SELECT event, count() AS count
    FROM events
    WHERE timestamp >= toDateTime('${start}')
      AND event IN (${trackedEvents.map((event) => `'${event}'`).join(', ')})
    GROUP BY event
    ORDER BY count DESC
  `

  const res = await fetch(`${POSTHOG_HOST.replace(/\/$/, '')}/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query,
      },
    }),
  })

  if (!res.ok) {
    return {
      metrics: [] as Metric[],
      note: `PostHog query failed with ${res.status}. Check POSTHOG_PROJECT_ID and POSTHOG_PERSONAL_API_KEY.`,
    }
  }

  const payload = await res.json() as { results?: Array<[string, number]> }
  return {
    metrics: (payload.results ?? []).map(([event, count]) => ({
      label: event,
      value: Number(count) || 0,
    })),
    note: undefined,
  }
}

function metricRow(metric: Metric) {
  const delta = typeof metric.previous === 'number' ? metric.value - metric.previous : null
  const deltaText = delta === null ? '' : ` <span style="color:${delta >= 0 ? '#34d399' : '#f87171'}">(${delta >= 0 ? '+' : ''}${delta})</span>`
  return `<tr><td style="padding:10px 12px;border-bottom:1px solid #27272a;color:#d4d4d8">${metric.label}</td><td style="padding:10px 12px;border-bottom:1px solid #27272a;text-align:right;color:#fff;font-weight:700">${metric.value.toLocaleString()}${deltaText}</td></tr>`
}

function renderHtml(report: DailyReport) {
  const metricsRows = report.metrics.map(metricRow).join('')
  const eventRows = report.posthogEvents.length
    ? report.posthogEvents.map(metricRow).join('')
    : '<tr><td colspan="2" style="padding:12px;color:#a1a1aa">PostHog event counts are not configured yet.</td></tr>'
  const notes = report.notes.map((note) => `<li>${note}</li>`).join('')

  return `<!doctype html>
<html>
  <body style="margin:0;background:#09090b;color:#fafafa;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:720px;margin:0 auto;padding:28px">
      <p style="margin:0 0 8px;color:#a78bfa;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase">GamerClock Daily Report</p>
      <h1 style="margin:0 0 8px;font-size:28px;line-height:1.2">Launch metrics and performance summary</h1>
      <p style="margin:0 0 24px;color:#a1a1aa">Window: ${report.windowStart} to ${report.windowEnd}</p>

      <h2 style="margin:26px 0 10px;font-size:18px">Core metrics</h2>
      <table style="width:100%;border-collapse:collapse;background:#18181b;border:1px solid #27272a;border-radius:8px;overflow:hidden">${metricsRows}</table>

      <h2 style="margin:26px 0 10px;font-size:18px">Tracked events</h2>
      <table style="width:100%;border-collapse:collapse;background:#18181b;border:1px solid #27272a;border-radius:8px;overflow:hidden">${eventRows}</table>

      <h2 style="margin:26px 0 10px;font-size:18px">Notes</h2>
      <ul style="color:#d4d4d8;line-height:1.7">${notes}</ul>

      <p style="margin-top:28px;color:#71717a;font-size:12px">Generated at ${report.generatedAt}. Open the live hub: https://gamerclock.com/admin/analytics</p>
    </div>
  </body>
</html>`
}

function renderText(report: DailyReport) {
  const core = report.metrics.map((metric) => {
    const delta = typeof metric.previous === 'number' ? ` (${metric.value - metric.previous >= 0 ? '+' : ''}${metric.value - metric.previous})` : ''
    return `- ${metric.label}: ${metric.value}${delta}`
  }).join('\n')
  const events = report.posthogEvents.length
    ? report.posthogEvents.map((metric) => `- ${metric.label}: ${metric.value}`).join('\n')
    : '- PostHog event counts are not configured yet.'

  return [
    'GamerClock Daily Report',
    `Window: ${report.windowStart} to ${report.windowEnd}`,
    '',
    'Core metrics',
    core,
    '',
    'Tracked events',
    events,
    '',
    'Notes',
    report.notes.map((note) => `- ${note}`).join('\n'),
    '',
    'Dashboard: https://gamerclock.com/admin/analytics',
  ].join('\n')
}

export async function buildDailyReport(): Promise<DailyReport> {
  const { start, end, previousStart } = dayRange()
  const admin = createAdminClient()
  const notes: string[] = []

  const [
    authUsers,
    digestTotal,
    digestToday,
    digestPrevious,
    wishlistsToday,
    releaseWishlistsToday,
    remindersToday,
    releaseRemindersToday,
    checkinsToday,
    checkinsPrevious,
    gpToday,
  ] = await Promise.all([
    getAuthUserMetrics(start, previousStart),
    countTable(admin, 'digest_subscribers'),
    countTable(admin, 'digest_subscribers', 'created_at', start),
    countTable(admin, 'digest_subscribers', 'created_at', previousStart, start),
    countTable(admin, 'wishlists', 'created_at', start),
    countTable(admin, 'release_wishlists', 'created_at', start),
    countTable(admin, 'reminders', 'created_at', start),
    countTable(admin, 'release_reminders', 'created_at', start),
    countTable(admin, 'weekly_gp_log', 'created_at', start),
    countTable(admin, 'weekly_gp_log', 'created_at', previousStart, start),
    admin.from('weekly_gp_log').select('gp_amount').gte('created_at', start),
  ])

  const gpTotal = gpToday.error ? 0 : (gpToday.data ?? []).reduce((sum, row) => sum + (Number(row.gp_amount) || 0), 0)

  for (const result of [
    digestTotal,
    digestToday,
    digestPrevious,
    wishlistsToday,
    releaseWishlistsToday,
    remindersToday,
    releaseRemindersToday,
    checkinsToday,
    checkinsPrevious,
  ]) {
    if (result.error) notes.push(result.error)
  }

  const posthog = await getPostHogEventMetrics(start)
  if (posthog.note) notes.push(posthog.note)

  notes.push('GA4 and Vercel Analytics are linked from the admin analytics hub. API-level daily extraction can be added after their reporting credentials are available.')

  return {
    generatedAt: new Date().toISOString(),
    windowStart: start,
    windowEnd: end,
    recipient: REPORT_RECIPIENT,
    metrics: [
      { label: 'Total signups', value: authUsers.total },
      { label: 'New signups', value: authUsers.newUsers, previous: authUsers.previousNewUsers },
      { label: 'Newsletter subscribers total', value: digestTotal.value },
      { label: 'Newsletter subscribers new', value: digestToday.value, previous: digestPrevious.value },
      { label: 'Game event wishlists new', value: wishlistsToday.value },
      { label: 'Release wishlists new', value: releaseWishlistsToday.value },
      { label: 'Game reminders new', value: remindersToday.value },
      { label: 'Release reminders new', value: releaseRemindersToday.value },
      { label: 'Check-ins', value: checkinsToday.value, previous: checkinsPrevious.value },
      { label: 'GP awarded', value: gpTotal },
    ],
    posthogEvents: posthog.metrics,
    notes,
  }
}

export async function sendDailyReportEmail(report: DailyReport) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return {
      sent: false,
      configured: false,
      message: 'RESEND_API_KEY is not configured.',
    }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: REPORT_FROM,
      to: [report.recipient],
      subject: `GamerClock Daily Report - ${report.windowEnd.slice(0, 10)}`,
      html: renderHtml(report),
      text: renderText(report),
      tags: [
        { name: 'app', value: 'gamerclock' },
        { name: 'type', value: 'daily_report' },
      ],
    }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      sent: false,
      configured: true,
      status: res.status,
      error: payload,
    }
  }

  return {
    sent: true,
    configured: true,
    status: res.status,
    data: payload,
  }
}
