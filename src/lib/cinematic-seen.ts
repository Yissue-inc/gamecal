const STORAGE_KEY = 'gamecal-cinematic-seen'

export function hasSeenCinematic(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) === '1'
}

export function markCinematicSeen(): void {
  localStorage.setItem(STORAGE_KEY, '1')
}
