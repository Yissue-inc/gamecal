/* ══════════════════════════════════════════════════════════════════
   레이스 플랜 — 감독이 **경기 전에 거는 지시** (FM 12기둥 ③, CK 지시 2026-08-31)

   ⚠ 왜 필요한가
     감독 모드에서 대회에 하는 일이 '누구를 넣을까' 하나뿐이었다.
     FM 으로 치면 선발만 있고 전술이 없는 것이다 — 스쿼드를 짜고 나면 감독은 관객이 된다.

   ⛔ 규칙 넷
     ① **기본은 '평균' 이고, 평균은 지금과 완전히 같다**(배수가 전부 1.0).
        지시를 안 걸면 **바뀌는 값이 하나도 없다** — 이미 검증된 밸런스를 안 건드린다.
     ② **모든 플랜에 대가가 있다.** 선행은 초반이 빠르고 후반에 무너진다.
        추입은 아끼는 대신 앞이 멀어져 있을 수 있다.
     ③ **선수의 성격이 플랜을 좌우한다** — 지구력이 좋은 선수가 선행에 강하다.
        아무 선수나 아무 플랜을 걸어도 되면 그건 선택이 아니라 장식이다.
     ④ **긴 종목에만 건다.** 100m 에 '추입' 은 뜻이 없다(10초짜리 경기다).
        400m 이상·수영·사이클·조정처럼 페이스가 있는 종목만.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const TACTIC = {
  PLANS: [
    /* ⛔ **처음엔 추입이 항상 최고, 선행이 항상 최악이었다**(실측 800m ×40:
       선행 183.6 · 균등 181.6 · 추입 179.6). 그건 선택이 아니라 정답이다 —
       규칙 ②를 내가 어긴 것이다.
       원인: 시뮬은 선수 하나의 **시간 재기**라 '앞을 못 잡는 위험'이 없다.
       실제 추입의 대가는 시간이 아니라 **불확실성**이다. 그래서 대가를 편차로 준다.
         · 선행 — 중앙값은 조금 손해, 대신 **편차가 작다**(기준 통과가 목적일 때)
         · 추입 — 중앙값은 비슷, 대신 **편차가 크다**(이겨야 할 때 거는 도박)
       ⚠ 그래서 셋의 중앙값이 서로 가깝게 맞춰져 있다. 상황이 선택을 정하게 하려는 것이다. */
    { id:'front', name:'선행', desc:'앞에서 끌고 간다 — 안정적이지만 상한이 낮다',
      early:1.045, late:0.950, fat:1.10, sig:0.78, needStamina:62 },
    /* ⚠ 이름을 '평균' 으로 뒀다가 되돌렸다 — 번역표의 **조각 치환**이 단어를 통째로
       바꾸는 구조라, 나중에 화면에 '평균 기록' 같은 문구가 생기면 'Even 기록' 이 된다.
       흔한 낱말은 키로 쓰지 않는다(한 글자 키를 금지한 것과 같은 이유). */
    { id:'even',  name:'균등', desc:'고르게 간다 — 기본',
      early:1.000, late:1.000, fat:1.00, sig:1.00, needStamina:0 },
    { id:'kick',  name:'추입', desc:'아끼다 막판에 쏟는다 — 잘 되면 최고, 안 되면 최악',
      early:0.950, late:1.085, fat:0.94, sig:1.35, needStamina:0 },
  ],
  DEFAULT: 'even',

  /* 이 종목에 플랜을 걸 수 있나 — 페이스가 있는 종목만 */
  applies(def){
    if(!def) return false;
    if(def.kind === 'middle' || def.kind === 'walk') return true;
    if(def.kind === 'swim' && (def.distanceM || 0) >= 200) return true;
    if(def.kind === 'row' || def.kind === 'cycle') return true;
    /* 400m 는 sprint 갈래지만 페이스 싸움이다 */
    if(def.kind === 'sprint' && (def.distanceM || 0) >= 400) return true;
    if(def.kind === 'hurdles' && (def.distanceM || 0) >= 400) return true;
    return false;
  },

  byId(id){ return this.PLANS.find(p => p.id === id) || this.PLANS[1]; },

  /* 시즌이 플랜을 들고 있다 — 대회마다 새로 짜는 게 아니라 이어진다 */
  of(season, athleteId){
    if(!season) return this.DEFAULT;
    return (season.tactics && season.tactics[athleteId]) || this.DEFAULT;
  },
  set(season, athleteId, id){
    if(!season) return;
    if(!season.tactics) season.tactics = {};
    season.tactics[athleteId] = id;
  },
  cycle(season, athleteId){
    const cur = this.of(season, athleteId);
    const i = this.PLANS.findIndex(p => p.id === cur);
    const next = this.PLANS[(i + 1) % this.PLANS.length];
    this.set(season, athleteId, next.id);
    return next;
  },

  /* ── 시뮬레이터가 쓰는 값 ──────────────────────────────────
     ⛔ 선수가 그 플랜을 **감당할 수 있나**를 여기서 본다.
        지구력이 모자란 선수가 선행을 걸면 이득은 줄고 대가는 그대로다 —
        그래야 '아무 선수나 선행' 이 최적이 되지 않는다.
     반환: { early, late, fat } — 없으면 전부 1.0 */
  factors(plan, athlete){
    const P = this.byId(plan);
    if(P.id === 'even') return { early:1, late:1, fat:1, sig:1 };
    const st = (athlete && athlete.stats && athlete.stats.stamina) || 50;
    /* 요구 지구력을 못 채우면 **이득만** 깎인다(대가는 그대로) */
    const fit = P.needStamina > 0 ? clamp(st / P.needStamina, 0.45, 1) : 1;
    return {
      early: 1 + (P.early - 1) * fit,
      late:  1 + (P.late  - 1) * (P.late >= 1 ? fit : 1),
      fat:   P.fat,
      sig:   P.sig || 1,
    };
  },

  /* 화면 한 줄 */
  label(plan){ return this.byId(plan).name; },
  color(plan){
    return plan === 'front' ? PAL.red : plan === 'kick' ? PAL.blue : PAL.dim;
  },
};
