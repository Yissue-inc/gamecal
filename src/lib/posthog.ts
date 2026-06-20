import posthog from 'posthog-js'
import { track as trackVercelEvent } from '@vercel/analytics'

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
const PENDING_AUTH_KEY = 'gamerclock-pending-auth-context'
const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_GA4_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID

type AnalyticsProperties = Record<string, unknown>
type FlatAnalyticsProperties = Record<string, string | number | boolean | null | undefined>
type AuthMethod = 'google' | 'apple' | 'email'
type AuthMode = 'sign_in' | 'sign_up'
type AuthTrackingMeta = { method: AuthMethod; mode: AuthMode; source?: string }

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

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function persistPendingAuthContext(meta: AuthTrackingMeta) {
  if (!canUseStorage()) return
  window.sessionStorage.setItem(PENDING_AUTH_KEY, JSON.stringify({ ...meta, started_at: Date.now() }))
}

export function consumePendingAuthContext(): (AuthTrackingMeta & { started_at?: number }) | null {
  if (!canUseStorage()) return null
  const raw = window.sessionStorage.getItem(PENDING_AUTH_KEY)
  if (!raw) return null
  window.sessionStorage.removeItem(PENDING_AUTH_KEY)
  try {
    return JSON.parse(raw) as AuthTrackingMeta & { started_at?: number }
  } catch {
    return null
  }
}

export function clearPendingAuthContext() {
  if (!canUseStorage()) return
  window.sessionStorage.removeItem(PENDING_AUTH_KEY)
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

/** Auth */
export function trackAuthStarted(meta: AuthTrackingMeta) {
  trackEvent('auth_started', meta)
}

export function trackAuthSubmitted(meta: AuthTrackingMeta) {
  trackEvent('auth_submitted', meta)
}

export function trackAuthSuccess(meta: AuthTrackingMeta & { user_id?: string }) {
  trackEvent('auth_success', meta)
}

export function trackAuthFailed(meta: AuthTrackingMeta & { reason?: string }) {
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
