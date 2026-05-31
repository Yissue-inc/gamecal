const PROFILE_KEY = 'gamecal_profile'

export interface UserProfileMeta {
  platform?: string
  signup_source?: string
  onboarding_completed?: boolean
}

export function loadProfileMeta(): UserProfileMeta {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveProfileMeta(meta: UserProfileMeta) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...loadProfileMeta(), ...meta }))
}

export function shouldShowOnboarding(): boolean {
  return !loadProfileMeta().onboarding_completed
}
