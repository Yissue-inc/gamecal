import posthog from 'posthog-js'
import { track as trackVercelEvent } from '@vercel/analytics'

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_GA4_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID

type AnalyticsProperties = Record<string, unknown>
type FlatAnalyticsProperties = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function isPostHogEnabled(): boolean {
  return typeof window !== 'undefined' && !!key
}

export function isGA4Enabled(): boolean {
  return typeof window !== 'undefined' && !!gaMeasurementId && typeof window.gtag === 'function'
}

function flattenProperties(properties?: AnalyticsProperties): FlatAnalyticsProperties | undefined {
  if (!properties) return undefined

  return Object.fromEntries(
    Object.entries(properties).map(([propertyKey, value]) => {
      if (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        return [propertyKey, value]
      }
      return [propertyKey, JSON.stringify(value)]
    }),
  )
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (isPostHogEnabled()) {
    posthog.identify(userId, traits)
  }

  if (isGA4Enabled()) {
    window.gtag?.('set', 'user_id', userId)
    if (traits) {
      window.gtag?.('set', 'user_properties', flattenProperties(traits))
    }
  }
}

export function resetUser() {
  if (isPostHogEnabled()) {
    posthog.reset()
  }

  if (isGA4Enabled()) {
    window.gtag?.('set', 'user_id', null)
  }
}

export function trackEvent(event: string, properties?: AnalyticsProperties) {
  const flatProperties = flattenProperties(properties)

  if (isPostHogEnabled()) {
    posthog.capture(event, properties)
  }

  if (typeof window !== 'undefined') {
    trackVercelEvent(event, flatProperties)
  }

  if (isGA4Enabled()) {
    window.gtag?.('event', event, flatProperties)
  }
}

/** Cinematic intro */
export function trackCinematicSeen(skipped = false) {
  trackEvent(skipped ? 'cinematic_skipped' : 'cinematic_seen')
}

export function trackCinematicCta(action: 'enter_giveaway' | 'view_calendar' | 'skip') {
  trackEvent('cinematic_cta_clicked', { action })
}

/** Wishlist */
export function trackWishlistAdded(eventId: string, gameSlug?: string) {
  trackEvent('wishlist_added', { event_id: eventId, game_slug: gameSlug })
}

/** Check-in */
export function trackCheckinDone(streak: number) {
  trackEvent('checkin_done', { streak })
}

/** Onboarding */
export function trackOnboardingCompleted(meta: {
  games: string[]
  platform?: string
  signup_source?: string
}) {
  trackEvent('onboarding_completed', meta)
}

/** Badge */
export function trackBadgeUnlocked(badgeId: string) {
  trackEvent('badge_unlocked', { badge_id: badgeId })
}

/** Reminder */
export function trackReminderSet(eventId: string, offsetMin: number) {
  trackEvent('reminder_set', { event_id: eventId, offset_min: offsetMin })
}

/** Party referral */
export function trackPartyReferralVisit(meta: { source_slug: string; game?: string }) {
  trackEvent('party_referral_visit', meta)
}

export function trackPartyReferralInstallClick(meta: { source_slug: string; game?: string }) {
  trackEvent('party_referral_install_click', meta)
}

/** Launch giveaway */
export function trackLaunchEventViewed(meta?: { signed_in?: boolean; eligible?: boolean }) {
  trackEvent('launch_event_viewed', meta)
}

export function trackLaunchEventAuthClick(source: 'event_page' | 'cinematic_intro') {
  trackEvent('launch_event_auth_clicked', { source })
}

export function trackLaunchEventHashtagCopied(hashtag: string) {
  trackEvent('launch_event_hashtag_copied', { hashtag })
}

export function trackLaunchEventEntrySubmitted(meta: {
  platform: string
  eligible: boolean
  gp: number
}) {
  trackEvent('launch_event_entry_submitted', meta)
}

export function trackLaunchEventEntryFailed(reason: string, meta?: AnalyticsProperties) {
  trackEvent('launch_event_entry_failed', { reason, ...meta })
}

export function trackLaunchEventShared(method: 'native_share' | 'clipboard') {
  trackEvent('launch_event_shared', { method })
}

/** Auth */
export function trackAuthStarted(meta: { method: 'google' | 'email'; mode: 'sign_in' | 'sign_up'; source?: string }) {
  trackEvent('auth_started', meta)
}

export function trackAuthFailed(meta: { method: 'google' | 'email'; mode: 'sign_in' | 'sign_up'; reason?: string }) {
  trackEvent('auth_failed', meta)
}

export function trackNewsletterSubscribed(source = 'weekly_digest') {
  trackEvent('newsletter_subscribed', { source })
}

export function trackNewsletterSubscribeFailed(source = 'weekly_digest') {
  trackEvent('newsletter_subscribe_failed', { source })
}

export function trackClashAlertAction(action: 'view' | 'dismiss', meta: { date: string; event_count: number; game_count: number }) {
  trackEvent('clash_alert_action', { action, ...meta })
}
