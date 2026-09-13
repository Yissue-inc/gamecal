/** 미니게임 트랙(종목별 기록) 헬퍼 검사 — npx tsx scripts/check-minigame-tracks.ts */
import { encodeTrackScore, getMiniGameTrack, trackQuantiles, trackValueInBounds, miniGameTrackScope, trackIdFromScope } from '../src/lib/minigame-tracks'
const fails: string[] = []
const ok = (c: boolean, m: string) => { if (!c) fails.push(m) }
const s100 = getMiniGameTrack('world-sprint-circuit', 'sprint100')!
const lj = getMiniGameTrack('world-sprint-circuit', 'longJump')!
const golf = getMiniGameTrack('world-sprint-circuit', 'golf')!
const walk = getMiniGameTrack('world-sprint-circuit', 'walk20k')!
ok(!!s100 && !!lj && !!golf, 'tracks exist')
ok(getMiniGameTrack('world-sprint-circuit', 'toString') === null, 'prototype key rejected')
ok(getMiniGameTrack('paint-world', 'sprint100') === null, 'other game has no tracks')
ok(encodeTrackScore(s100, 9.8) > encodeTrackScore(s100, 10.2), '100m faster = bigger score')
ok(encodeTrackScore(lj, 8.1) > encodeTrackScore(lj, 7.2), 'long jump farther = bigger score')
ok(encodeTrackScore(golf, -4) > encodeTrackScore(golf, -1), 'golf lower = bigger score')
for (const [t, v] of [[s100, s100.min], [s100, s100.max], [walk, walk.max], [walk, walk.min], [golf, golf.min]] as const) {
  const sc = encodeTrackScore(t, v); ok(sc >= 0 && sc <= 5_000_000, `score in 0..5M: ${sc}`)
}
ok(!trackValueInBounds(s100, 3.2), '100m 3.2s rejected')
ok(!trackValueInBounds(s100, NaN), 'NaN rejected')
ok(!trackValueInBounds(s100, '9.9' as unknown), 'string rejected')
ok(trackValueInBounds(s100, 10.5), '100m 10.5 accepted')
const q = trackQuantiles([5, 1, 3, 2, 4])
ok(q.length === 19 && q[0] <= q[18] && Math.abs(q[9] - 3) < 1e-9, 'quantiles ' + JSON.stringify(q))
ok(trackQuantiles([]).length === 0, 'empty quantiles')
ok(trackIdFromScope(miniGameTrackScope('run800')) === 'run800' && trackIdFromScope('global') === null, 'scope round trip')
if (fails.length) { console.log('FAIL', fails); process.exit(1) } else console.log('ok — minigame-tracks helpers')
