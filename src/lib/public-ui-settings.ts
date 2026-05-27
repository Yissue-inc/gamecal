export type CinematicAnimationStyle = 'dragon' | 'embers' | 'minimal'

export interface CinematicIntroSettings {
  eyebrow: string
  title: string
  titleAccent?: string
  subtitle: string
  primaryCta: string
  secondaryCta: string
  sponsorLabel: string
  brandLabel: string
  accentColor: string
  animationStyle: CinematicAnimationStyle
  autoDismissMs: number
  letterboxHeight: number
  backdropOpacity: number
  backdropBlur: number
}

export interface PublicUiSettings {
  show_cinematic_intro: boolean
  show_signup_onboarding: boolean
  cinematic_intro: CinematicIntroSettings
}

export const DEFAULT_CINEMATIC_INTRO_SETTINGS: CinematicIntroSettings = {
  eyebrow: '',
  title: '',
  titleAccent: '',
  subtitle: '',
  primaryCta: '+ Add to GamerClock',
  secondaryCta: 'View Calendar',
  sponsorLabel: 'Sponsored',
  brandLabel: 'GamerClock',
  accentColor: '#f59e0b',
  animationStyle: 'dragon',
  autoDismissMs: 5500,
  letterboxHeight: 80,
  backdropOpacity: 40,
  backdropBlur: 1,
}

export const DEFAULT_PUBLIC_UI_SETTINGS: PublicUiSettings = {
  show_cinematic_intro: true,
  show_signup_onboarding: true,
  cinematic_intro: DEFAULT_CINEMATIC_INTRO_SETTINGS,
}

export function mergePublicUiSettings(value?: Partial<PublicUiSettings> | null): PublicUiSettings {
  return {
    ...DEFAULT_PUBLIC_UI_SETTINGS,
    ...(value ?? {}),
    cinematic_intro: {
      ...DEFAULT_CINEMATIC_INTRO_SETTINGS,
      ...(value?.cinematic_intro ?? {}),
    },
  }
}

export function sanitizePublicUiSettings(value: Partial<PublicUiSettings>): PublicUiSettings {
  const merged = mergePublicUiSettings(value)
  const autoDismissMs = Number(merged.cinematic_intro.autoDismissMs)
  const letterboxHeight = Number(merged.cinematic_intro.letterboxHeight)
  const backdropOpacity = Number(merged.cinematic_intro.backdropOpacity)
  const backdropBlur = Number(merged.cinematic_intro.backdropBlur)

  return {
    show_cinematic_intro: Boolean(merged.show_cinematic_intro),
    show_signup_onboarding: Boolean(merged.show_signup_onboarding),
    cinematic_intro: {
      eyebrow: String(merged.cinematic_intro.eyebrow ?? '').slice(0, 80),
      title: String(merged.cinematic_intro.title ?? '').slice(0, 120),
      titleAccent: String(merged.cinematic_intro.titleAccent ?? '').slice(0, 120),
      subtitle: String(merged.cinematic_intro.subtitle ?? '').slice(0, 160),
      primaryCta: String(merged.cinematic_intro.primaryCta ?? '').slice(0, 40),
      secondaryCta: String(merged.cinematic_intro.secondaryCta ?? '').slice(0, 40),
      sponsorLabel: String(merged.cinematic_intro.sponsorLabel ?? '').slice(0, 40),
      brandLabel: String(merged.cinematic_intro.brandLabel ?? '').slice(0, 40),
      accentColor: /^#[0-9a-f]{6}$/i.test(merged.cinematic_intro.accentColor)
        ? merged.cinematic_intro.accentColor
        : DEFAULT_CINEMATIC_INTRO_SETTINGS.accentColor,
      animationStyle: ['dragon', 'embers', 'minimal'].includes(merged.cinematic_intro.animationStyle)
        ? merged.cinematic_intro.animationStyle
        : DEFAULT_CINEMATIC_INTRO_SETTINGS.animationStyle,
      autoDismissMs: Number.isFinite(autoDismissMs)
        ? Math.min(15000, Math.max(2500, autoDismissMs))
        : DEFAULT_CINEMATIC_INTRO_SETTINGS.autoDismissMs,
      letterboxHeight: Number.isFinite(letterboxHeight)
        ? Math.min(160, Math.max(0, letterboxHeight))
        : DEFAULT_CINEMATIC_INTRO_SETTINGS.letterboxHeight,
      backdropOpacity: Number.isFinite(backdropOpacity)
        ? Math.min(90, Math.max(0, backdropOpacity))
        : DEFAULT_CINEMATIC_INTRO_SETTINGS.backdropOpacity,
      backdropBlur: Number.isFinite(backdropBlur)
        ? Math.min(12, Math.max(0, backdropBlur))
        : DEFAULT_CINEMATIC_INTRO_SETTINGS.backdropBlur,
    },
  }
}
