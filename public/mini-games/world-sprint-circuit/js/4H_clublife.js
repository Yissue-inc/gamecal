/* ══════════════════════════════════════════════════════════════════
   클럽 생활 — 감독 모드의 **빈 20주**를 채운다 (CK 지시 2026-08-31)

   ⚠ 왜 필요한가 (실사표 docs/MANAGER_FM_SCORECARD.md 로 확인한 것)
     24주 중 대회는 4주뿐이다. 나머지 **20주에 감독이 하는 일은
     '3명 지도 지정 → 다음 주' 클릭 두 번**이 전부였다.
     FM 12기둥 중 ⑨ 미디어·역학이 **0점**이었고, 그게 정확히 이 자리를 채우는 기둥이다.
     선수가 말을 걸고, 기자가 묻고, 스폰서가 제안하고, 라이벌이 도발한다.

   ⛔ 규칙 네 가지
     ① **기존 시스템을 안 바꾼다.** 사건은 이미 있는 값(사기·컨디션·자금·명성·스탯)만
        건드린다. 새 물리를 만들지 않는다.
     ② **모든 선택지에 대가가 있다.** 공짜 정답이 있으면 그건 선택이 아니라 클릭이다.
     ③ **한 화면에 한 사건.** 읽고 고르는 데 10초를 넘기지 않는다.
     ④ **결과를 말로 돌려준다.** 무엇이 얼마나 변했는지 숫자로 보여 준다 —
        안 보이면 선택이 도박이 되고, 도박은 다음에 배울 게 없다.

   ⚠ 팀 화합(cohesion)은 **새 스탯이지만 새 물리가 아니다.**
      화합은 매주 선수 사기를 끌어당기기만 한다. 사기는 이미 훈련 성장률(31_training
      moraleF)과 경기력(50_power)에 곱해지고 있으므로, 화합은 그 문을 통해서만 작동한다.
      ⛔ 이렇게 해야 밸런스가 이미 검증된 경로 위에 얹힌다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 번역 가능한 문장 조립기 — **패턴을 통째로 표에 올리고** 이름·숫자만 끼워 넣는다.
   ⛔ `${a.name} 와 ${b.name} 가 부딪쳤습니다` 처럼 조립해 버리면 표에서 절대 못 찾는다
      (K 는 **숫자**만 %1 로 접는다 — 사람 이름은 안 접힌다).
      실측 2026-08-31: 영어 화면에 사건 문구가 통째로 한국어로 떴다. */
function evText(pat, vals){
  let out = (typeof K === 'function') ? K(pat) : pat;
  if(vals) for(const k in vals) out = out.split('%' + k).join(vals[k]);
  return out;
}

const CLUBLIFE = {
  KEY_COH: 'cohesion',
  /* 사건이 뜰 확률 — 대회 주에는 안 뜬다(그 주는 이미 할 일이 있다) */
  CHANCE: 0.62,

  ensure(club){
    if(!club) return;
    if(club.cohesion === undefined) club.cohesion = 55;      // 보통에서 시작
    if(!club.lifeLog) club.lifeLog = [];
    if(club.lastEventWeek === undefined) club.lastEventWeek = 0;
    if(!club.eventSeen) club.eventSeen = {};        // id → 마지막으로 뜬 주
  },

  /* ── 관계 ──────────────────────────────────────────────
     ⛔ 사건이 한 번 쓰고 사라지면 그건 사건이 아니라 팝업이다.
        FM 은 같은 선수와 여러 번 부딪치면 **쌓인다** — 약속을 지켰나, 편을 들었나.
     ⚠ 관계도 새 물리가 아니다. 화합과 같은 방식으로 **사기를 통해서만** 작동하고,
        재계약 의사(4K_contract.willStay)에 한 번 더 쓰인다. 그 둘뿐이다. */
  REL_MIN: -100, REL_MAX: 100,
  rel(a){ return (a && a.rel !== undefined) ? a.rel : 0; },
  bumpRel(a, d){
    if(!a) return 0;
    a.rel = clamp(this.rel(a) + d, this.REL_MIN, this.REL_MAX);
    return a.rel;
  },
  relLabel(v){
    return v >= 55 ? '따른다' : v >= 20 ? '좋다' : v > -20 ? '보통'
         : v > -55 ? '서먹하다' : '등을 돌렸다';
  },
  relColor(v){ return v >= 20 ? PAL.green : v > -20 ? PAL.dim : PAL.red; },

  cohesionLabel(v){
    return v >= 80 ? '끈끈하다' : v >= 62 ? '좋다' : v >= 42 ? '보통' : v >= 24 ? '삐걱인다' : '갈라졌다';
  },
  cohesionColor(v){
    return v >= 62 ? PAL.green : v >= 42 ? PAL.gold : PAL.red;
  },

  /* 매주 한 번 — 화합이 사기를 끌어당긴다.
     ⚠ 화합 자체가 성장률을 곱하지 않는다. **사기를 통해서만** 작동한다(위 규칙 참조). */
  weeklyDrift(club){
    this.ensure(club);
    const pull = (club.cohesion - 50) * 0.06;               // 화합 100 → +3, 0 → −3
    for(const a of club.squad){
      if(a.morale === undefined) continue;
      /* 관계는 그 선수 **한 명에게만** 작용한다(화합은 전원) */
      const own = this.rel(a) * 0.02;                      // 관계 100 → +2, −100 → −2
      a.morale = clamp(a.morale + pull + own, 0, 100);
      /* 관계도 스스로 식는다 — 손을 놓으면 남이 된다 */
      if(a.rel) a.rel = a.rel * 0.985;
    }
    /* 화합은 스스로 보통으로 돌아간다 — 손을 놓으면 팀은 평범해진다 */
    club.cohesion = clamp(club.cohesion + (50 - club.cohesion) * 0.04, 0, 100);
  },

  /* ── 경기 전 팀 지시 ────────────────────────────────────
     ⛔ 대회에 감독이 개입할 자리가 없었다. 출전표를 짜고 나면 관객이 된다.
     ⚠ 결과는 **runMeet 이 한 번에 시뮬레이션**한다 — 경기 중 개입은 거짓말이 된다.
        그래서 **경기 직전**에 건다. 그게 이 구조에서 정직한 자리다(FM 의 팀 토크와 같다).
     ⛔ 정답이 없어야 한다 — 팀 상태(화합·사기)에 따라 맞는 말이 달라진다.
        압박은 사기가 높을 때 먹히고, 낮을 때는 역효과다. */
  TALKS: [
    { id:'push',  name:'몰아붙인다', desc:'사기가 높을 때만 먹힌다',
      need:a => a.morale >= 62, up:+9, down:-11 },
    { id:'trust', name:'믿는다',     desc:'언제나 조금은 오른다',
      need:() => true,           up:+5, down:0 },
    { id:'calm',  name:'편하게 하라', desc:'사기가 낮을 때 살린다',
      need:a => a.morale < 62,   up:+8, down:-4 },
  ],
  /* 출전 선수에게만 건다 — 안 나가는 선수에게 하는 말은 뜻이 없다 */
  teamTalk(mg, talkId){
    const T = this.TALKS.find(t => t.id === talkId) || this.TALKS[1];
    const S = mg.season, ids = new Set();
    for(const k in (S.entries || {})) for(const id of (S.entries[k] || [])) ids.add(id);
    let up = 0, down = 0;
    for(const a of mg.club.squad){
      if(!ids.has(a.id)) continue;
      const fit = T.need(a);
      const d = fit ? T.up : T.down;
      a.morale = clamp((a.morale ?? 60) + d, 0, 100);
      if(d > 0) up++; else if(d < 0) down++;
    }
    /* 말이 팀에 맞으면 화합도 오른다 */
    this.ensure(mg.club);
    mg.club.cohesion = clamp(mg.club.cohesion + (up > down ? 3 : -3), 0, 100);
    S.talkDone = true;
    return { up, down, name:T.name };
  },

  /* ── 사건 표 ───────────────────────────────────────────────
     each: { id, weight, when(mg), make(mg, rng) → {title, body, choices[]} }
     choice: { label, hint, run(mg) → '결과 문장' } */
  EVENTS: [
    /* ① 선수 요구 — 출전 기회 */
    { id:'wantRace', weight:12,
      when: mg => mg.club.squad.length >= 3,
      make(mg, rng){
        const a = pickLow(mg.club.squad, x => x.overall, rng);
        return {
          title:'출전시켜 주세요',
          body: evText('%A 이(가) 다음 대회에 꼭 나가고 싶다고 합니다.', {A:a.name}),
          who:a,
          choices:[
            { label:'약속한다', hint:'사기 크게 오름 · 화합 −(다른 선수가 본다)',
              run(){ a.morale = clamp(a.morale + 16, 0, 100);
                     mg.club.cohesion = clamp(mg.club.cohesion - 5, 0, 100);
                     CLUBLIFE.bumpRel(a, +14);
                     return `${a.name} ${K('사기')} +16 · ${K('팀 화합')} −5 · ${K('관계')} +14`; } },
            { label:'실력으로 따내라', hint:'사기 − · 화합 +(원칙이 선다)',
              run(){ a.morale = clamp(a.morale - 9, 0, 100);
                     mg.club.cohesion = clamp(mg.club.cohesion + 6, 0, 100);
                     CLUBLIFE.bumpRel(a, -8);
                     return `${a.name} ${K('사기')} −9 · ${K('팀 화합')} +6 · ${K('관계')} −8`; } },
            { label:'따로 훈련을 붙여 준다', hint:'자금 −18 · 사기와 기량 조금',
              need: () => mg.club.budget >= 18,
              run(){ mg.club.budget = +(mg.club.budget - 18).toFixed(1);
                     a.morale = clamp(a.morale + 8, 0, 100);
                     const k = bestStatKey(a); a.stats[k] = Math.min(a.potential[k] || 99, a.stats[k] + 1.2);
                     if(typeof recalcOverall === 'function') recalcOverall(a);
                     CLUBLIFE.bumpRel(a, +12);
                     return `${K('자금')} −18 · ${a.name} ${K('사기')} +8 · ${K(statLabel(k))} +1.2 · ${K('관계')} +12`; } },
          ] };
      } },

    /* ② 언론 — 시즌 목표를 어떻게 말할 것인가 */
    { id:'press', weight:10,
      when: mg => !!mg.season.goal,
      make(mg){
        const g = mg.season.goal;
        return {
          title:'기자가 묻는다',
          body: evText('"올해 목표가 승점 %P·금 %G 라던데, 자신 있습니까?"', {P:g.points, G:g.gold}),
          choices:[
            { label:'반드시 해낸다', hint:'명성 + · 선수들이 부담을 진다(사기 −)',
              run(){ mg.club.reputation = +(mg.club.reputation + 0.4).toFixed(2);
                     for(const a of mg.club.squad) a.morale = clamp(a.morale - 4, 0, 100);
                     return `${K('명성')} +0.4 · ${K('전원 사기')} −4`; } },
            { label:'선수들을 믿는다', hint:'화합 + · 명성 변화 없음',
              run(){ mg.club.cohesion = clamp(mg.club.cohesion + 7, 0, 100);
                     return `${K('팀 화합')} +7`; } },
            { label:'대답을 피한다', hint:'명성 − · 아무 일도 없음',
              run(){ mg.club.reputation = Math.max(0, +(mg.club.reputation - 0.2).toFixed(2));
                     return `${K('명성')} −0.2`; } },
          ] };
      } },

    /* ③ 스폰서 — 돈과 이름 */
    { id:'sponsor', weight:10,
      make(mg, rng){
        const amt = 40 + Math.round(rng() * 60);
        return {
          title:'후원 제안',
          body: evText('지역 기업이 %N 을 제안합니다. 대신 클럽 이름 옆에 로고가 붙습니다.', {N:amt}),
          choices:[
            { label:'받는다', hint:`자금 +${amt} · 명성 −0.3`,
              run(){ mg.club.budget = +(mg.club.budget + amt).toFixed(1);
                     mg.club.reputation = Math.max(0, +(mg.club.reputation - 0.3).toFixed(2));
                     return `${K('자금')} +${amt} · ${K('명성')} −0.3`; } },
            { label:'거절한다', hint:'명성 +0.2 · 돈은 없다',
              run(){ mg.club.reputation = +(mg.club.reputation + 0.2).toFixed(2);
                     return `${K('명성')} +0.2`; } },
          ] };
      } },

    /* ④ 라이벌 도발 */
    { id:'rival', weight:9,
      when: () => typeof RIVAL_CLUBS !== 'undefined' && RIVAL_CLUBS.length > 0,
      make(mg, rng){
        const r = RIVAL_CLUBS[(rng() * RIVAL_CLUBS.length) | 0];
        return {
          title:'라이벌의 말',
          body: evText('%C 감독: "그 클럽은 올해도 우리 상대가 아니죠."', {C:K(r.name)}),
          choices:[
            { label:'받아친다', hint:'화합 + · 명성 + · 목표 부담(사기 −)',
              run(){ mg.club.cohesion = clamp(mg.club.cohesion + 8, 0, 100);
                     mg.club.reputation = +(mg.club.reputation + 0.3).toFixed(2);
                     for(const a of mg.club.squad) a.morale = clamp(a.morale - 3, 0, 100);
                     return `${K('팀 화합')} +8 · ${K('명성')} +0.3 · ${K('전원 사기')} −3`; } },
            { label:'무시한다', hint:'아무 일도 없다',
              run(){ return K('조용히 넘어갔다'); } },
            { label:'훈련장에 붙여 놓는다', hint:'전원 사기 + · 화합 −(누군가는 싫어한다)',
              run(){ for(const a of mg.club.squad) a.morale = clamp(a.morale + 7, 0, 100);
                     mg.club.cohesion = clamp(mg.club.cohesion - 4, 0, 100);
                     return `${K('전원 사기')} +7 · ${K('팀 화합')} −4`; } },
          ] };
      } },

    /* ⑤ 팀 내부 마찰 */
    { id:'clash', weight:9,
      when: mg => mg.club.squad.length >= 4,
      make(mg, rng){
        const [a, b] = pickTwo(mg.club.squad, rng);
        return {
          title:'라커룸이 시끄럽다',
          body: evText('%A 와 %B 가 부딪쳤습니다.', {A:a.name, B:b.name}),
          choices:[
            { label:'둘을 앉혀 놓고 푼다', hint:'화합 +10 · 이번 주 훈련 손해(둘 컨디션 −)',
              run(){ mg.club.cohesion = clamp(mg.club.cohesion + 10, 0, 100);
                     a.condition = clamp(a.condition - 8, 15, 100);
                     b.condition = clamp(b.condition - 8, 15, 100);
                     return `${K('팀 화합')} +10 · ${a.name}·${b.name} ${K('컨디션')} −8`; } },
            { label:'내버려 둔다', hint:'화합 −12 · 아무 손해 없음',
              run(){ mg.club.cohesion = clamp(mg.club.cohesion - 12, 0, 100);
                     return `${K('팀 화합')} −12`; } },
            { label:'한 명을 편든다', hint:'한쪽 사기 ++ · 다른 쪽 −− · 화합 −',
              run(){ a.morale = clamp(a.morale + 14, 0, 100);
                     b.morale = clamp(b.morale - 14, 0, 100);
                     mg.club.cohesion = clamp(mg.club.cohesion - 6, 0, 100);
                     CLUBLIFE.bumpRel(a, +16); CLUBLIFE.bumpRel(b, -22);
                     return `${a.name} ${K('사기')} +14 · ${b.name} −14 · ${K('팀 화합')} −6`; } },
          ] };
      } },

    /* ⑥ 숨긴 부상 — 의무 기둥과 이어진다 */
    { id:'hideHurt', weight:8,
      when: mg => mg.club.squad.some(a => a.condition < 72),
      make(mg, rng){
        const a = pickLow(mg.club.squad, x => x.condition, rng);
        return {
          title:'괜찮다고 합니다',
          body: evText('%A 의 몸 상태가 안 좋아 보이는데 본인은 뛰겠다고 합니다.', {A:a.name}),
          who:a,
          choices:[
            { label:'쉬게 한다', hint:'컨디션 크게 회복 · 사기 −',
              run(){ a.condition = clamp(a.condition + 22, 15, 100);
                     a.fatigue = Math.max(0, (a.fatigue || 0) - 18);
                     a.morale = clamp(a.morale - 7, 0, 100);
                     CLUBLIFE.bumpRel(a, +6);
                     return `${a.name} ${K('컨디션')} +22 · ${K('피로')} −18 · ${K('사기')} −7`; } },
            { label:'본인 말을 믿는다', hint:'사기 + · 부상 위험을 안는다',
              run(){ a.morale = clamp(a.morale + 10, 0, 100);
                     a.fatigue = Math.min(100, (a.fatigue || 0) + 14);
                     CLUBLIFE.bumpRel(a, +10);
                     return `${a.name} ${K('사기')} +10 · ${K('피로')} +14 · ${K('관계')} +10`; } },
            { label:'정밀 검진을 받게 한다', hint:'자금 −25 · 확실히 회복',
              need: () => mg.club.budget >= 25,
              run(){ mg.club.budget = +(mg.club.budget - 25).toFixed(1);
                     a.condition = clamp(a.condition + 30, 15, 100);
                     a.fatigue = Math.max(0, (a.fatigue || 0) - 26);
                     if(a.injury) a.injury = 0;
                     CLUBLIFE.bumpRel(a, +18);
                     return `${K('자금')} −25 · ${a.name} ${K('컨디션')} +30 · ${K('부상 해소')} · ${K('관계')} +18`; } },
          ] };
      } },

    /* ⑦ 기회 — 합숙 */
    { id:'camp', weight:8,
      make(mg, rng){
        const cost = 30 + Math.round(rng() * 25);
        return {
          title:'합숙 제안',
          body: evText('고지대 합숙 자리가 났습니다. 비용 %N.', {N:cost}),
          choices:[
            { label:'간다', hint:`자금 −${cost} · 전원 지구력 + · 화합 +`,
              need: () => mg.club.budget >= cost,
              run(){ mg.club.budget = +(mg.club.budget - cost).toFixed(1);
                     let n = 0;
                     for(const a of mg.club.squad){
                       const cap = (a.potential && a.potential.stamina) || 99;
                       if(a.stats.stamina < cap){ a.stats.stamina = Math.min(cap, a.stats.stamina + 1.6); n++; }
                       if(typeof recalcOverall === 'function') recalcOverall(a);
                     }
                     mg.club.cohesion = clamp(mg.club.cohesion + 9, 0, 100);
                     return `${K('자금')} −${cost} · ${n}${K('명 지구력')} +1.6 · ${K('팀 화합')} +9`; } },
            { label:'보낸다', hint:'아무 일도 없다',
              run(){ return K('이번엔 넘어갔다'); } },
          ] };
      } },

    /* ⑧ 팬 — 명성이 낮을 때만 */
    { id:'fans', weight:7,
      when: mg => (mg.club.reputation || 0) < 4,
      make(mg){
        return {
          title:'관중이 줄었다',
          body:'홈 트랙에 사람이 없습니다. 무언가 해야 합니다.',
          choices:[
            { label:'공개 훈련을 연다', hint:'명성 +0.5 · 이번 주 훈련 손해',
              run(){ mg.club.reputation = +(mg.club.reputation + 0.5).toFixed(2);
                     for(const a of mg.club.squad) a.condition = clamp(a.condition - 5, 15, 100);
                     return `${K('명성')} +0.5 · ${K('전원 컨디션')} −5`; } },
            { label:'성적으로 말한다', hint:'화합 +5',
              run(){ mg.club.cohesion = clamp(mg.club.cohesion + 5, 0, 100);
                     return `${K('팀 화합')} +5`; } },
          ] };
      } },
  ],

  /* 이번 주에 사건이 있나 */
  roll(mg){
    this.ensure(mg.club);
    const S = mg.season;
    if(!S || S.week > SEASON_WEEKS) return null;
    if(MEET_WEEKS[S.week]) return null;                 // 대회 주는 이미 할 일이 있다
    if(mg.club.lastEventWeek === S.week) return null;   // 한 주에 한 번
    const rng = S.rng || Math.random;
    if(rng() > this.CHANCE) return null;

    /* ⛔ 같은 사건이 20·21·23주에 연달아 떴다(실측). 반복은 사건이 아니라 배경이 된다 —
       최근 4주 안에 나온 것은 뺀다. 뺄 게 없으면(초반) 그때만 전부에서 고른다. */
    const seenAt = mg.club.eventSeen || {};
    const absW = (S.year || 1) * 100 + S.week;
    const fresh = e => { const last = seenAt[e.id]; return last === undefined || absW - last >= 4; };
    let pool = this.EVENTS.filter(e => (!e.when || e.when(mg)) && fresh(e));
    if(!pool.length) pool = this.EVENTS.filter(e => !e.when || e.when(mg));
    if(!pool.length) return null;
    let sum = pool.reduce((s, e) => s + e.weight, 0), r = rng() * sum, pick = pool[0];
    for(const e of pool){ r -= e.weight; if(r <= 0){ pick = e; break; } }
    let made = null;
    try{ made = pick.make(mg, rng); }catch(err){ console.warn('클럽 사건 생성 실패', pick.id, err); return null; }
    if(!made) return null;
    made.id = pick.id;
    /* 조건을 못 채우는 선택지는 뺀다 — 못 고르는 줄을 보여 주면 그건 안내가 아니라 놀림이다 */
    made.choices = made.choices.filter(c => !c.need || c.need());
    if(!made.choices.length) return null;
    mg.club.lastEventWeek = S.week;
    mg.club.eventSeen[pick.id] = absW;
    return made;
  },
};

/* ⚠ 스탯 이름표는 30_athlete 의 STAT_NAME 을 쓴다 — 사본을 만들면 갈라진다
   (실측: 여기 새로 선언했다가 'STAT_NAME 이미 선언됨' 으로 **모듈 전체가 안 올라갔다**) */
const statLabel = k => (typeof STAT_NAME !== 'undefined' && STAT_NAME[k]) || k;

function bestStatKey(a){
  let k = 'speed', v = -1;
  for(const s in a.stats) if(a.stats[s] > v){ v = a.stats[s]; k = s; }
  return k;
}
function pickLow(list, f, rng){
  const sorted = list.slice().sort((x, y) => f(x) - f(y));
  const n = Math.max(1, Math.min(3, sorted.length));
  return sorted[((rng ? rng() : Math.random()) * n) | 0];
}
function pickTwo(list, rng){
  const i = ((rng ? rng() : Math.random()) * list.length) | 0;
  let j = ((rng ? rng() : Math.random()) * list.length) | 0;
  if(j === i) j = (i + 1) % list.length;
  return [list[i], list[j]];
}

/* ── 화면 ──────────────────────────────────────────────────
   ⚠ 평소 감독 화면 규칙을 그대로 쓴다(Screen0) — 새 조작을 배우게 하지 않는다. */
class ClubEventScreen extends Screen0 {
  constructor(mg, ev){ super(mg); this.ev = ev; this.result = null; this.t = 0; }
  get hdBg(){ return 'bg-office'; } get hdBgDim(){ return 0.82; }
  get rows(){ return this.result ? [{ label:'확인' }] : this.ev.choices; }
  update(now){
    this.t += 16.7;
    if(Input.repeat('up', now))   this.move(-1);
    if(Input.repeat('down', now)) this.move(1);
    if(Input.pressed('action'))   this.confirm();
    /* ⛔ 취소로 못 빠져나간다 — 고르지 않고 넘기면 선택이 아니라 장식이 된다 */
  }
  confirm(){
    if(this.result){ this.mg.pop(); return; }
    const c = this.ev.choices[this.sel]; if(!c) return;
    let msg = '';
    try{ msg = c.run() || ''; }catch(e){ console.warn('사건 처리 실패', e); msg = '—'; }
    this.result = msg;
    this.sel = 0;
    CLUBLIFE.ensure(this.mg.club);
    this.mg.club.lifeLog.unshift({ y:this.mg.club.year, w:this.mg.season.week,
                                   title:this.ev.title, choice:c.label, msg });
    if(this.mg.club.lifeLog.length > 40) this.mg.club.lifeLog.length = 40;
    if(typeof Sfx !== 'undefined') Sfx.record();
    if(this.mg.save) this.mg.save();
  }
  cancel(){ /* 못 나간다 */ }

  draw(u){
    const C = this.mg.club;
    UI.header(u, K('클럽'), `${C.year}${K('년차')} · ${this.mg.season.week} / 24${K('주')}`);

    /* 팀 화합 — 이 화면에서 제일 자주 움직이는 값이라 늘 보인다 */
    CLUBLIFE.ensure(C);
    const coh = C.cohesion;
    txt(u, K('팀 화합'), 12, 34, 9, PAL.dim, 'left');
    u.fillStyle = 'rgba(242,245,250,.14)'; u.fillRect(12, 45, 120, 6);
    u.fillStyle = CLUBLIFE.cohesionColor(coh);
    u.fillRect(12, 45, Math.round(120 * coh / 100), 6);
    txt(u, K(CLUBLIFE.cohesionLabel(coh)), 136, 43, 9, CLUBLIFE.cohesionColor(coh), 'left', 700);

    plate(u, 10, 58, VW - 20, 46, 0.72);
    txt(u, K(this.ev.title), VW / 2, 63, 14, PAL.gold, 'center', 700);
    txt(u, K(this.ev.body), VW / 2, 84, 10, PAL.white, 'center');

    if(this.result){
      plate(u, 10, 112, VW - 20, 40, 0.72);
      txt(u, K('결과'), VW / 2, 117, 9, PAL.dim, 'center');
      txt(u, K(this.result), VW / 2, 132, 11, PAL.green, 'center', 700);
      txt(u, K('확인 계속'), VW / 2, VH - 22, 10, PAL.gold, 'center', 700);
      return;
    }

    this.ev.choices.forEach((c, i) => {
      const y = 112 + i * 30, on = i === this.sel;
      if(typeof UIK !== 'undefined' && UIK.nine) UIK.nine(u, on ? 'row-selected' : 'panel-fill', 10, y, VW - 20, 27, 10);
      else plate(u, 10, y, VW - 20, 27, on ? 0.85 : 0.55);
      /* ⛔ 선택 줄은 **금색으로 꽉 찬 판**(row-selected)이다 — 그 위에 금색 글씨를 얹어
         통째로 안 읽혔다(실측 캡처). 판이 밝으면 글씨는 어두워야 한다. */
      txt(u, K(c.label), 20, y + 4, 12, on ? '#1b1b22' : PAL.white, 'left', on ? 700 : 400);
      txt(u, K(c.hint || ''), 20, y + 17, 8, on ? 'rgba(27,27,34,.78)' : PAL.dim, 'left');
    });
    txt(u, K('▲▼ 고르기   확인 결정'), VW / 2, VH - 16, 9, PAL.dim, 'center');
  }
}
