export interface PublicUiSettings {
  show_signup_onboarding: boolean
}

export const DEFAULT_PUBLIC_UI_SETTINGS: PublicUiSettings = {
  show_signup_onboarding: true,
}

export function mergePublicUiSettings(value?: Partial<PublicUiSettings> | null): PublicUiSettings {
  return {
    ...DEFAULT_PUBLIC_UI_SETTINGS,
    ...(value ?? {}),
  }
}

export function sanitizePublicUiSettings(value: Partial<PublicUiSettings>): PublicUiSettings {
  const merged = mergePublicUiSettings(value)

  return {
    show_signup_onboarding: Boolean(merged.show_signup_onboarding),
  }
}
