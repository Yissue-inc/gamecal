export const WORLD_CUP_SLUG = 'world-cup'
export const WORLD_CUP_THEME_END = '2026-07-31T23:59:59-07:00'

export function isWorldCupThemeActive(now = new Date()): boolean {
  return now.getTime() <= new Date(WORLD_CUP_THEME_END).getTime()
}
