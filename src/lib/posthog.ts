import posthog from 'posthog-js'

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

export function isPostHogEnabled(): boolean {
  return typeof window !== 'undefined' && !!key
}

export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!isPostHogEnabled()) return
  posthog.identify(userId, traits)
}

export function resetUser() {
  if (!isPostHogEnabled()) return
  posthog.reset()
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!isPostHogEnabled()) return
  posthog.capture(event, properties)
}

/** Cinematic intro */
export function trackCinematicSeen(skipped = false) {
  trackEvent(skipped ? 'cinematic_skipped' : 'cinematic_seen')
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
