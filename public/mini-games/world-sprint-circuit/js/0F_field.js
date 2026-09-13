/* ══════════════════════════════════════════════════════════════════
   결선 필드 — 메달은 **8명 결선의 순위**로 준다 (CK 결정 2026-09-12)

   ⛔ 왜 바꿨나
     예전 메달은 고정 컷이었다(`medalCuts`). 기록이 컷을 넘으면 금 — 누구와 겨뤘는지는
     상관없었다. 화면에서 라이벌 둘에게 지고 들어와도 금이 뜨고, 이기고 들어와도 동이 떴다.
     CK: "금은동은 사람들 간의 실제 기록으로 · AI 는 평균 기록으로."

   구조
     결선 = 나 + **화면에 보이는 라이벌**(엔진이 이미 뛰게 한다) + **화면 밖 결선 진출자**(여기서 뽑는다)
     최종 순위 = 엔진의 경기 순위 + 화면 밖 진출자 중 나보다 앞선 사람 수
     → 화면에서 본 순서는 절대 뒤집히지 않는다. 화면 밖 사람만 끼어든다.

   화면 밖 진출자의 기록 — '메달 사다리' 단위(t)로 뽑는다
     t = 0 → 기준기록(=결선 진출선) · t = 1 → 옛 금컷
     ⚠ 비율로 뽑지 않는 이유: 골프(0 → −4타)·승마(8 → 0벌점)는 0 을 지난다.
        비율은 거기서 무너진다(00_rules.medalCuts 주석과 같은 사고). 사다리 위의 위치는 안 무너진다.

     PROFILE = 결선 1~7위의 평균 자리. 옛 컷과 맞춰 잡았다:
       1위 0.97(옛 금 바로 아래) · 2위 0.60(옛 은 — 48종목 은컷 사다리 위치 중앙값 0.61, 사분위 0.53~0.67)
       · 3위 0.40 · … · 7위 0.00(진출선)
     ⚠ 첫 판(1위 1.00·2위 0.72)은 실측에서 옛 은 기록으로 은이 6% 였다 — 은이 사실상 사라졌다.
     ⚠ 화면 라이벌이 결선의 어느 자리인지는 **종목마다 다르다.** 첫 판은 '위 두 자리를 차지한다'고
        가정했는데(중장거리·수영은 옛 금 근처 — 비 1.00~1.04) 단거리 라이벌은 **보통에서 11.0초**
        (기준 11.40 근처 · 금 9.95 와 한참 멀다)였다 — 실측 2026-09-12.
        그래서 출발 전엔 **7자리를 다 뽑고**, 들어온 뒤 화면 라이벌의 실제 기록에 가장 가까운
        자리를 그 수만큼 뺀다. 결선은 늘 8명이고, 빼는 쪽은 나에게 불리해지지 않는다.
     ⚠ 동메달은 예전보다 **어렵다** — 예전엔 기준만 넘으면 동(t=0), 이제는 8명 중 3등(t≈0.4).
        '8명 중 세 명만 메달' 을 그대로 옮긴 결과다. CK 에 보고함.

   ⛔ 지키는 약속 하나: **보통 난이도에서 옛 금컷을 넘으면 반드시 금이다.**
      화면 밖 진출자는 t ≤ 1 로 자른다. 그래서 goldcheck/ceiling 이 잰 '금 도달' 이 그대로 유효하다.
      (화면 라이벌이 더 빠르면 그건 화면에서 보인다 — 숨은 손이 아니다.)

   난이도
     보통: 위 그대로
     어려움: 사다리 +0.08, 상한 1.10 — 라이벌이 사람 최선(PAR 1.00)으로 뛰는 것과 같은 결
     쉬움(아이용): 기록을 AI.PAR_TARGET 비(2.00/1.045)만큼 느리게 — 라이벌과 같은 배수.
                 0 을 지나는 단위(타·벌점)는 사다리로 −2.5.

   ⏭ 다음 단계(서버): gamerclock 에 플레이어 기록이 쌓이면 `Field.players[id]` 에
      분위수를 넣는다. 그때부터 PROFILE 대신 **사람들의 실제 기록 분포**에서 뽑는다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const FIELD = {
  N: 8,
  PROFILE: [0.97, 0.60, 0.40, 0.26, 0.15, 0.07, 0.00],
  NOISE: 0.07,
  /* 어려움 첫 판(+0.15·상한 1.15)은 옛 금 기록으로 금이 11% — '사람 최선' 이 아니라 '거의 불가능' 이었다 */
  HARD_SHIFT: 0.08, HARD_CAP: 1.10,
  EASY_LADDER: -2.5,                 // 0 을 지나는 단위에서만
  ZERO_CROSS_UNITS: ['타', '벌점'],
  /* 결과가 '맞붙어 이긴 시간' 인 종목 — 지면 결선 순위가 없다 */
  DUEL_KINDS: ['fence', 'rally', 'grap'],
};

const Field = {
  /* 서버에서 받은 사람 기록 분포(다음 단계). { [eventId]: { n, q:[...분위수] } } */
  players: {},

  level(){ return (typeof AI !== 'undefined' && AI.level) || 'normal'; },

  /* 사다리 위치 → 기록 */
  valueAt(def, t){
    const c = medalCuts(def);
    return c.bronze + t * (c.gold - c.bronze);
  },

  round(def, v){
    if(INT_UNITS_FIELD.has(def.unit) || Math.abs(v) >= 1000) return Math.round(v);
    return Math.round(v * 100) / 100;
  },

  gauss(rng){
    let u = 0, v = 0;
    while(u === 0) u = rng();
    while(v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },

  /* 화면 밖 결선 진출자 기록 — 좋은 순으로 정렬해 돌려준다 */
  hidden(def, nVisible, rng){
    rng = rng || Math.random;
    const lv = this.level();
    const slots = FIELD.PROFILE.slice(Math.min(nVisible || 0, FIELD.PROFILE.length));
    const zeroCross = FIELD.ZERO_CROSS_UNITS.includes(def.unit);
    const easyK = (typeof AI !== 'undefined' && AI.PAR_TARGET)
                ? AI.PAR_TARGET.easy / AI.PAR_TARGET.normal : 1.9;
    const out = [];
    for(const p of slots){
      let t = p + this.gauss(rng) * FIELD.NOISE;
      if(lv === 'hard') t = clamp(t + FIELD.HARD_SHIFT, 0, FIELD.HARD_CAP);
      else if(lv === 'easy' && zeroCross) t = clamp(t, 0, 1) + FIELD.EASY_LADDER;
      else t = clamp(t, 0, 1);
      let v = this.valueAt(def, t);
      if(lv === 'easy' && !zeroCross) v = def.higher ? v / easyK : v * easyK;
      out.push(this.round(def, v));
    }
    return out.sort((a, b) => def.higher ? b - a : a - b);
  },

  /* 화면 라이벌의 기록 추정(표시용) — 순서는 엔진 순위가 정한다.
     ⚠ 라이벌 객체 모양이 엔진마다 다르다(실측 2026-09-12):
        단거리·허들  finished/finishTimeS/distM   · 중장거리·계주·수영·사이클·조정 dist
        클라이밍  h/done   · 결승선을 지나도 dist 가 계속 는다 → 그 순간 평균 속도로 환산 */
  /* ⛔ 추정은 **내가 들어온 그 순간**의 라이벌 위치로 한다.
     첫 판은 결과 화면으로 넘어가는 순간(결승 +1.1초)의 위치를 썼다 — 단거리 라이벌이
     10초대로 들어왔을 텐데 표에 12.30 · 12.58 로 찍혔다(2026-09-12 스크린샷). */
  snap(ev){
    const L = ev.trackM || (ev.def && ev.def.distanceM) || 0;
    return (ev.rivals || []).map(r => {
      if(r.finished && r.finishTimeS > 0) return { t: r.finishTimeS };
      if(r.h !== undefined) return { d: r.done ? (typeof CLIMB !== 'undefined' ? CLIMB.wallM : 15) : r.h,
                                     L: (typeof CLIMB !== 'undefined' ? CLIMB.wallM : 15), rate: r.rate };
      return { d: r.distM !== undefined ? r.distM : r.dist, L };
    });
  },
  rivalMarks(ev, me){
    const sn = ev.fieldSnap || this.snap(ev);
    return sn.map(o => {
      if(o.t) return o.t;
      if(o.rate > 0 && o.L > 0) return o.L / o.rate;       // 클라이밍: 일정한 속도 — 정확하다
      if(o.L > 0 && o.d > 0 && me > 0) return me * o.L / o.d;
      return null;
    });
  },

  /* 결선 — 순위와 표. 결선에 못 든 판이면 null */
  final(def, ev, result, opt){
    opt = opt || {};
    if(!def || !result) return null;
    const lv = this.level();
    const ok = result.status === 'OK' || (lv === 'easy' && result.value > 0 && result.value < DNF);
    if(!ok || !(result.value < DNF)) return null;
    if(FIELD.DUEL_KINDS.includes(def.kind) && result.rank !== 1) return null;

    /* ⛔ 비교는 **반올림한 값끼리** 한다. 첫 판은 날값(21.2878)과 반올림한 진출자(21.29)를 비교해
       옛 금컷에 딱 맞춘 기록이 9% 확률로 금을 놓쳤다 — 화면엔 둘 다 21.29 로 보이는데 졌다. */
    const me = this.round(def, result.value);
    const isRace = !!(ev && ev.rivals && ev.rivals.length && typeof result.rank === 'number');
    const nVis = isRace ? ev.rivals.length : 0;
    let hid = (opt.hidden || this.hidden(def, 0, opt.rng)).slice();
    const est = isRace ? this.rivalMarks(ev, result.value) : [];
    if(isRace){
      /* 화면 라이벌이 차지한 자리를 뺀다 — 사다리 위 거리로 가장 가까운 것부터 */
      const c = medalCuts(def), span = Math.abs(c.gold - c.bronze) || 1;
      for(const v of est){
        if(hid.length <= FIELD.N - 1 - nVis) break;   // 결선은 나 포함 N 명
        let bi = hid.length - 1;               // 추정이 없으면 가장 느린 자리를 뺀다
        if(v !== null){
          let bd = Infinity;
          hid.forEach((h, i) => { const dd = Math.abs(h - v) / span; if(dd < bd){ bd = dd; bi = i; } });
        }
        hid.splice(bi, 1);
      }
    }
    const better = (a, b) => def.higher ? a > b : a < b;   // 동률은 나에게 — 옛 medalOf(>=)와 같은 결

    const raceRank = isRace ? clamp(result.rank | 0, 1, nVis + 1) : 1;
    const hiddenAhead = hid.filter(v => better(v, me)).length;
    const rank = raceRank + hiddenAhead;

    /* 표 — 화면 라이벌은 엔진 순위를 지키도록 추정값을 자른다 */
    /* ⛔ 표의 내 줄은 **날값**을 든다 — 비교만 반올림값으로 한다.
       반올림한 게임값(19.95)을 현실 척도로 옮기면 19.53, 결과 큰 숫자는 날값(19.9497)을 옮겨 19.54 —
       **같은 화면에 내 기록이 둘** 떴다(라이브 2026-09-12, 200m). */
    const rows = [{ who: 'me', value: result.value }];
    if(isRace){
      const order = ev.rivals.map((r, i) => ({ r, v: est[i] }))
        .sort((a, b) => (a.v === null) - (b.v === null) || (def.higher ? b.v - a.v : a.v - b.v));
      const eps = def.higher ? -0.01 : 0.01;
      order.forEach((o, i) => {
        const ahead = i < raceRank - 1;
        let v = o.v === null ? me + (ahead ? -eps : eps) * (i + 1) : o.v;
        if(ahead && !better(v, me)) v = me - eps * (raceRank - 1 - i);
        if(!ahead && better(v, me)) v = me + eps * (i - raceRank + 2);
        rows.push({ who: 'rival', name: o.r.name || null, value: this.round(def, v) });
      });
    }
    for(const v of hid) rows.push({ who: 'field', value: v });
    rows.sort((a, b) => {
      if(a.value === b.value) return a.who === 'me' ? -1 : b.who === 'me' ? 1 : 0;
      return def.higher ? b.value - a.value : a.value - b.value;
    });
    /* 표 순서와 순위가 어긋나지 않게 — 내 자리는 계산한 rank 로 못 박는다 */
    const mi = rows.findIndex(r => r.who === 'me');
    const mine = rows.splice(mi, 1)[0];
    rows.splice(rank - 1, 0, mine);
    this.nameRows(rows);
    rows.forEach((r, i) => { r.rank = i + 1; });

    const medal = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : null;
    const lead = rank > 1 ? rows[0].value : null;
    return { rank, medal, rows, level: lv, lead };
  },

  /* 경기 중 메달 레일 — **화면 밖 결선 진출자의 1·2·3위 기록**을 선으로 긋는다.
     ⚠ 경주 종목은 끝나고 화면 라이벌 자리를 빼므로 실제 시상대는 이 선보다 **같거나 쉽다.**
        '이 선을 넘으면 확실하다' 쪽으로 틀리는 편이 낫다(반대면 금 선을 넘고도 은이 뜬다).
     ⚠ 필드가 없으면(2인·감독·복합종목의 하위 종목) 옛 컷 그대로. */
  rail(ev){
    const f = ev && ev.field;
    if(f && f.length >= 3) return { gold: f[0], silver: f[1], bronze: f[2] };
    return (ev && ev.def) ? medalCuts(ev.def) : null;
  },

  nameRows(rows){
    const used = new Set(rows.filter(r => r.name).map(r => r.name));
    const pool = (typeof AI_NAMES !== 'undefined') ? AI_NAMES : ['KIM','SILVA','TANAKA','REYES','DUBOIS','MÜLLER','OKONKWO','ADEBAYO'];
    let k = 0;
    for(const r of rows){
      if(r.who === 'me' || r.name) continue;
      while(k < pool.length && used.has(pool[k])) k++;
      r.name = k < pool.length ? pool[k] : 'LANE ' + (rows.indexOf(r) + 1);
      used.add(r.name); k++;
    }
  },
};

/* 00_rules/05_hud 보다 먼저 쓰일 일은 없지만, 정수 단위 표는 05_hud 의 INT_UNITS 와 **같아야** 한다.
   ⚠ 05_hud 가 이 파일보다 늦게 실린다 — 그래서 사본을 두지 않고 늦게 읽는다. */
const INT_UNITS_FIELD = { has: u => (typeof INT_UNITS !== 'undefined') ? INT_UNITS.has(u) : ['kg','벌점','타'].includes(u) };
