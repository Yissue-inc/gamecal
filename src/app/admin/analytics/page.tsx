import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DailyReportTestButton } from './DailyReportTestButton'

const GA4_MEASUREMENT_ID = 'G-KPBE1ZDTNZ'
const GA4_PROPERTY_ID = '360961201'
const GTM_CONTAINER_ID = 'GTM-M5L3BPDF'
const POSTHOG_PROJECT_KEY = 'phc_zPfdxoyaNucxKMzeGE5JnDGpvqt655h7R4HYjfW5DM56'

const toolLinks = [
  {
    name: 'GA4 Reports',
    status: 'Connected',
    href: `https://analytics.google.com/analytics/web/#/p${GA4_PROPERTY_ID}/reports/intelligenthome`,
    detail: `Property ${GA4_PROPERTY_ID} · Measurement ID ${GA4_MEASUREMENT_ID}`,
  },
  {
    name: 'GA4 Realtime',
    status: 'Connected',
    href: `https://analytics.google.com/analytics/web/#/p${GA4_PROPERTY_ID}/reports/realtime`,
    detail: 'Use this after opening gamerclock.com to confirm live users and events.',
  },
  {
    name: 'GA4 Events',
    status: 'Connected',
    href: `https://analytics.google.com/analytics/web/#/p${GA4_PROPERTY_ID}/reports/events`,
    detail: 'Use this property-specific link so ARTCAL EVENT data is not mixed into review sessions.',
  },
  {
    name: 'Google Tag Manager',
    status: 'Container only',
    href: 'https://tagmanager.google.com/#/container/accounts/6358363144/containers/254099850/workspaces/0',
    detail: `${GTM_CONTAINER_ID} exists, but GamerClock currently uses direct GA4 code instead of GTM tags.`,
  },
  {
    name: 'Vercel Web Analytics',
    status: 'Connected',
    href: 'https://vercel.com/artscal-web-s-projects/gamecal/analytics',
    detail: 'Page views and custom events are sent through @vercel/analytics.',
  },
  {
    name: 'Vercel Deployments',
    status: 'Connected',
    href: 'https://vercel.com/artscal-web-s-projects/gamecal/deployments',
    detail: 'Use deployments to correlate analytics changes with releases.',
  },
  {
    name: 'PostHog',
    status: 'Connected',
    href: 'https://us.posthog.com/',
    detail: `Production loads the PostHog project key ${POSTHOG_PROJECT_KEY.slice(0, 7)}...`,
  },
]

const trackedEvents = [
  'page_view',
  'auth_started',
  'auth_submitted',
  'auth_success',
  'auth_failed',
  'newsletter_subscribed',
  'newsletter_subscribe_failed',
  'wishlist_added',
  'reminder_set',
  'checkin_done',
  'onboarding_completed',
  'badge_unlocked',
  'party_referral_visit',
  'party_referral_install_click',
  'clash_alert_action',
]

const healthChecks = [
  {
    label: 'GA4',
    value: 'Direct gtag installed',
    detail: `${GA4_MEASUREMENT_ID} is in the production bundle and script preload.`,
  },
  {
    label: 'Vercel',
    value: 'Web Analytics installed',
    detail: '/_vercel/insights/script.js returns 200 on gamerclock.com.',
  },
  {
    label: 'PostHog',
    value: 'Provider installed',
    detail: 'PostHog assets load from us-assets.i.posthog.com in production.',
  },
  {
    label: 'Event fan-out',
    value: 'Single tracking layer',
    detail: 'trackEvent sends to PostHog, Vercel custom events, and GA4.',
  },
  {
    label: 'Daily report',
    value: process.env.RESEND_API_KEY ? 'Email enabled' : 'Awaiting email key',
    detail: `Scheduled for 9:00 AM PDT daily to ${process.env.REPORT_RECIPIENT_EMAIL ?? 'ck@yissue.biz'}.`,
  },
]

const domainTagChecks = [
  {
    domain: 'gamerclock.com',
    property: GA4_PROPERTY_ID,
    measurement: GA4_MEASUREMENT_ID,
    tagManager: 'Direct gtag',
  },
  {
    domain: 'artcalevent.com',
    property: '380961201',
    measurement: 'G-YZED1ZPSYJ',
    tagManager: 'GTM-WZMW4677',
  },
]

export default function AdminAnalyticsPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-300">Analytics Control</p>
          <h1 className="text-3xl font-bold text-white">GamerClock Analytics</h1>
          <p className="max-w-2xl text-sm text-zinc-400">
            One place to check connected analytics tools, key events, and production dashboard links.
          </p>
        </div>
        <Button asChild variant="outline" className="border-zinc-700">
          <Link href="/">Open Calendar</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {healthChecks.map((item) => (
          <Card key={item.label} className="border-zinc-800 bg-zinc-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-white">{item.value}</div>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle>Tool Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {toolLinks.map((tool) => (
              <a
                key={tool.name}
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-zinc-800 bg-black/25 p-4 transition hover:border-violet-400/50 hover:bg-violet-500/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">{tool.name}</div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{tool.detail}</p>
                  </div>
                  <span className="shrink-0 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-300">
                    {tool.status}
                  </span>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <CardTitle>Tracked Event Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {trackedEvents.map((eventName) => (
                <div
                  key={eventName}
                  className="rounded-md border border-zinc-800 bg-black/25 px-3 py-2 font-mono text-xs text-zinc-300"
                >
                  {eventName}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-zinc-500">
              These custom events are emitted through the shared client tracking layer. GA4 may take time to surface new
              event names outside Realtime and DebugView.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle>Domain Tag Separation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {domainTagChecks.map((item) => (
            <div key={item.domain} className="grid gap-2 rounded-lg border border-zinc-800 bg-black/25 p-4 md:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Domain</div>
                <div className="mt-1 font-semibold text-white">{item.domain}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">GA4 property</div>
                <div className="mt-1 font-mono text-sm text-zinc-200">{item.property}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Measurement ID</div>
                <div className="mt-1 font-mono text-sm text-zinc-200">{item.measurement}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Install path</div>
                <div className="mt-1 font-mono text-sm text-zinc-200">{item.tagManager}</div>
              </div>
            </div>
          ))}
          <p className="text-xs leading-5 text-zinc-500">
            If ARTCAL page titles appear while reviewing GamerClock, confirm the GA URL includes property p{GA4_PROPERTY_ID}
            and the live page loads {GA4_MEASUREMENT_ID}.
          </p>
        </CardContent>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader>
          <CardTitle>Daily Email Report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-black/25 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Recipient</div>
            <div className="mt-2 font-semibold text-white">{process.env.REPORT_RECIPIENT_EMAIL ?? 'ck@yissue.biz'}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/25 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Schedule</div>
            <div className="mt-2 font-semibold text-white">Daily at 9:00 AM PDT</div>
            <div className="mt-1 text-xs text-zinc-500">Cron: 16:00 UTC</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/25 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Manual trigger</div>
            <div className="mt-2 font-mono text-xs text-zinc-300">/api/cron/daily-report</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-black/25 p-4 md:col-span-3">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">Test delivery</div>
            <DailyReportTestButton />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
