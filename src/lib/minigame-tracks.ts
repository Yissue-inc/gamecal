/**
 * 미니게임 "트랙" — 한 게임 안의 종목별 기록 (World Sprint Circuit 48종목).
 *
 * 왜 따로 두나
 *   기존 점수 API 는 게임당 점수 하나(정수, 방향 하나)다. 월드 스프린트는 종목마다
 *   단위·방향이 다르고(100m 는 낮을수록, 멀리뛰기는 높을수록, 골프는 음수) 기록이 소수다.
 *   그 기록들이 게임 안 AI 결선 필드가 된다 — 사람들의 실제 기록으로 메달을 가른다(CK 결정 2026-09-12).
 *
 * 안전장치
 *   - 범위표는 게임 정의에서 생성한다(sprint-game/tools/export_tracks.js). 손으로 고치지 않는다.
 *   - 범위 밖 기록은 **거절**한다(자르지 않는다 — 잘라 넣으면 가짜 극값이 분포에 남는다).
 *   - 공개로 내보내는 건 분위수뿐이다. 개인 기록·아이디는 나가지 않는다.
 */
import worldSprintTracks from './minigame-tracks-world-sprint.json'

export type MiniGameTrack = {
  higher: boolean
  min: number
  max: number
  scale: number
}

const TRACKS: Record<string, Record<string, MiniGameTrack>> = {
  'world-sprint-circuit': worldSprintTracks.tracks as Record<string, MiniGameTrack>,
}

export const TRACK_SCOPE_PREFIX = 'track:'
/** 점수 상한(500만) 안에서 방향을 부호로 싣는 기준점 */
export const TRACK_SCORE_BASE = 2_500_000
/** 분포로 내보내는 분위 — 5%부터 95%까지 5% 간격 */
export const TRACK_QUANTILES = Array.from({ length: 19 }, (_, i) => (i + 1) * 0.05)

export function gameHasTracks(slug: string): boolean {
  return !!TRACKS[slug]
}

export function getMiniGameTrack(slug: string, trackId: string): MiniGameTrack | null {
  const table = TRACKS[slug]
  if (!table || !Object.prototype.hasOwnProperty.call(table, trackId)) return null
  return table[trackId]
}

export function miniGameTrackScope(trackId: string): string {
  return `${TRACK_SCOPE_PREFIX}${trackId}`
}

export function trackIdFromScope(scope: string): string | null {
  return scope.startsWith(TRACK_SCOPE_PREFIX) ? scope.slice(TRACK_SCOPE_PREFIX.length) : null
}

export function trackValueInBounds(track: MiniGameTrack, value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= track.min && value <= track.max
}

/** 좋은 기록일수록 큰 정수 — 기존 리더보드 정렬(score desc)과 개인 최고 보존 규칙을 그대로 쓴다 */
export function encodeTrackScore(track: MiniGameTrack, value: number): number {
  return TRACK_SCORE_BASE + (track.higher ? 1 : -1) * Math.round(value * track.scale)
}

/** 오름차순 값의 분위수(선형 보간) — 방향 해석은 게임이 한다 */
export function trackQuantiles(values: number[]): number[] {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (!sorted.length) return []
  return TRACK_QUANTILES.map((p) => {
    const pos = p * (sorted.length - 1)
    const lo = Math.floor(pos)
    const hi = Math.min(sorted.length - 1, lo + 1)
    const v = sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
    return Math.round(v * 1000) / 1000
  })
}
