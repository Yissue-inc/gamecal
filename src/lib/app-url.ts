export const DEFAULT_APP_URL = 'https://gamerclock.com'

export function getAppUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!value) return DEFAULT_APP_URL

  try {
    return new URL(value).origin
  } catch {
    return DEFAULT_APP_URL
  }
}

export function getAppHost(): string {
  try {
    return new URL(getAppUrl()).host
  } catch {
    return new URL(DEFAULT_APP_URL).host
  }
}

export function getCrawlerUserAgent(context?: string): string {
  const suffix = context ? `; ${context}` : ''
  return `GamerClockBot/0.1 (+${getAppUrl()}${suffix})`
}
