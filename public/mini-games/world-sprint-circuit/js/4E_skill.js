/* ══════════════════════════════════════════════════════════════════
   스킬 — 육성 층에서 제일 큰 구멍이었다

   ⚠ 지금까지 **Lv30 선수와 Lv1 선수가 하는 일이 같았다.** 숫자만 컸다.
      우마무스메·AFK아레나 육성 깊이의 절반이 스킬이다. 그게 통째로 없었다.

   ⛔ **경기 계산 불가침 약속을 여기서 처음으로, 의도적으로 깬다.**
      지금까지 이 층(레벨·장비·코치·유산·도감)은 **성장에만** 관여했다.
      스킬은 두 갈래로 나누고, 한쪽만 경기에 닿게 한다:

        · 육성형(grow) — 기존 통로 그대로. 성장률·회복·부상률·컨디션.
        · 경기형(race) — **Athlete.eff() 통로**. 시뮬레이션이 이미 읽고 있는
          reaction·sigma·lateFade·bigGame·hurdle·jump·throw 에 더한다.

      왜 이 통로인가: 특성(TRAITS)이 이미 같은 통로로 경기에 관여하고 있다.
      스킬을 여기 얹으면 **48종목 밸런스를 다시 재지 않아도 된다** — 특성 하나를
      더 가진 선수와 같은 크기의 변화다. 속도·거리 공식에는 한 줄도 안 들어간다.

   ⛔ 그래서 새 약속을 하나 세운다:
      **스킬을 장착하지 않은 선수는 스킬 층이 없던 때와 소수점까지 같다.**
      `tools/skill_neutral.js` 가 같은 시드로 두 번 굴려 검사한다.
      옛 세이브는 장착이 비어 있으므로 **어제와 완전히 같은 게임**이다.

   ⚠ 수동 플레이는 사정이 다르다. 실측해 보니 직접 뛸 때는
      `new Runner(p, {}, true, …)` — **선수 스탯을 아예 안 쓴다.** 누가 뛰든
      같은 일반 주자로 뛰고, 그 손놀림이 시뮬 결과를 ±4% 밀 뿐이다.
      그래서 경기형 스킬은 수동에서 **판정 창을 넓히는 것**으로 나타낸다.
      자동의 sigma 감소와 수동의 창 확대는 같은 말이다 — 둘 다 "PERFECT 가 는다".

   ── 스킬이 만드는 '선택' ────────────────────────────────────
   배운다 ≠ 쓴다. 배운 것 중 **슬롯 수만큼만 장착**한다(Lv1 1칸 → Lv40 4칸).
   FM·우마무스메의 '이번 판을 어떻게 짤까'가 여기서 처음 생긴다.

   ── 종족 등급이 두 번째 역할을 얻는다 ───────────────────────
   ⚠ 지금까지 5단계 등급의 유일한 기능은 잠재치 +0~15 였다. 경기 중엔 안 보였다.
      상위 스킬에 **등급 조건**을 건다 — 전설 종족만 배우는 스킬이 있다.
      이제 "전설을 뽑았다"가 숫자가 아니라 **할 수 있는 일**로 나타난다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const SKILL = {
  /* ── 슬롯 ────────────────────────────────────────────────
     ⚠ 실측: 16시즌 최고 Lv36. 4칸째(Lv40)는 일부러 안 닿게 뒀다 —
        닿을 듯 말 듯해야 슬롯이 자원이 된다. 현실적으로 3칸 싸움이다. */
  SLOT_AT: [1, 12, 25, 40],
  slots(a){ const lv=(a&&a.lv)||1; return this.SLOT_AT.filter(n=>lv>=n).length; },
  nextSlotAt(a){ const lv=(a&&a.lv)||1; return this.SLOT_AT.find(n=>lv<n) || null; },

  /* ── 목록 ────────────────────────────────────────────────
     tier = 필요한 **종족 등급**(1 흔함 … 5 전설). lv = 필요한 선수 레벨.
     cost = 훈련 포인트. spec 이 있으면 그 종목군 선수만.

     ⚠ 크기는 **실측으로 두 번 깎았다.** 처음 잡은 값(sigma -0.09/-0.20)은
        박자 하나가 100m 를 -1.69%, 절대 박자가 -3.71% 당겼다. 3칸을 채우면 -6.09%,
        메트로놈 특성까지 겹치면 **-8.44%** — 13.24초가 12.12초가 된다.
        수동 플레이의 보상 폭이 ±4% 인데 **가만히 있는 빌드가 그걸 두 배로 이겼다.**
        이 게임은 직접 뛰는 게 먼저다. 그래서 예산을 정했다:
          · 스킬 **전부 합쳐도 특성 하나(≈4%)를 넘지 않는다**
          · 한 칸짜리는 자기 영역에서 ≈0.4%, 상위는 ≈1.0%
     ⚠ 대신 스킬마다 **영역이 다르다** — 이게 '어느 3개를 고를까'를 만든다.
          박자   모든 종목(그래서 제일 작다)
          뒷심   오래 달리는 종목(중·장거리에서 크다)
          반응   짧은 스프린트만 (800m 에서는 0%)
          강심장 큰 대회에서만
        전부 다 좋은 스킬은 없다. 종목을 보고 고른다. */
  SKILLS: {
    /* ── 경기형 ── eff 통로. 시뮬레이션이 이미 읽는 키에만 얹는다 ── */
    burst   : { name:'총성 반응', desc:'출발 반응이 빨라진다',       branch:'race', tier:1, lv:1,  cost: 4, eff:{ reaction:-0.25 } },
    burstX  : { name:'화약 반응', desc:'출발이 눈에 띄게 빠르다',     branch:'race', tier:3, lv:18, cost:14, eff:{ reaction:-0.55 }, needs:'burst' },
    grit    : { name:'뒷심',      desc:'후반에 덜 무너진다',          branch:'race', tier:1, lv:1,  cost: 4, eff:{ lateFade:-0.13 } },
    gritX   : { name:'강철 뒷심', desc:'마지막까지 페이스가 산다',    branch:'race', tier:3, lv:22, cost:16, eff:{ lateFade:-0.32 }, needs:'grit' },
    beat    : { name:'박자',      desc:'리듬이 덜 흔들린다',          branch:'race', tier:1, lv:6,  cost: 6, eff:{ sigma:-0.022 } },
    beatX   : { name:'절대 박자', desc:'리듬이 거의 안 흔들린다',     branch:'race', tier:4, lv:30, cost:22, eff:{ sigma:-0.055 }, needs:'beat' },
    clutch  : { name:'강심장',    desc:'큰 경기에서 강하다',          branch:'race', tier:2, lv:14, cost:12, eff:{ bigGame:+0.18 } },
    clutchX : { name:'대무대 체질',desc:'큰 경기일수록 잘한다',       branch:'race', tier:5, lv:34, cost:30, eff:{ bigGame:+0.38 }, needs:'clutch' },
    skim    : { name:'허들 감각', desc:'허들을 깔끔하게 넘는다',      branch:'race', tier:2, lv:10, cost:10, eff:{ hurdle:+0.22 }, spec:'hurdles' },
    spring  : { name:'용수철',    desc:'도약이 멀리 뻗는다',          branch:'race', tier:2, lv:10, cost:10, eff:{ jump:+0.14 },   spec:'jump' },
    whip    : { name:'채찍팔',    desc:'던지기가 강해진다',           branch:'race', tier:2, lv:10, cost:10, eff:{ throw:+0.15 },  spec:'throw' },

    /* ── 육성형 ── 성장 통로. 경기 계산에 안 닿는다 ── */
    appetite: { name:'식성',      desc:'피로가 잘 빠진다',            branch:'grow', tier:1, lv:1,  cost: 4, grow:{ rest:+1.4 } },
    knee    : { name:'강철 무릎', desc:'부상 위험이 준다',            branch:'grow', tier:1, lv:1,  cost: 5, grow:{ hurt:-0.20 } },
    sunny   : { name:'낙천',      desc:'컨디션이 잘 오른다',          branch:'grow', tier:1, lv:8,  cost: 6, grow:{ cond:+2.0 } },
    eager   : { name:'흡수력',    desc:'훈련 효율이 오른다',          branch:'grow', tier:2, lv:12, cost:10, grow:{ grow:+0.10 } },
    eagerX  : { name:'천재성',    desc:'훈련 효율이 크게 오른다',     branch:'grow', tier:4, lv:28, cost:24, grow:{ grow:+0.22 }, needs:'eager' },
    pro     : { name:'프로 의식', desc:'모든 면이 조금씩 낫다',       branch:'grow', tier:3, lv:20, cost:18, grow:{ grow:+0.06, rest:+1.0, hurt:-0.12 } },
  },
  ids(){ return Object.keys(this.SKILLS); },
  def(id){ return this.SKILLS[id]; },

  /* ── 선수의 상태 ─────────────────────────────────────────
     ⚠ 옛 세이브에는 이 두 칸이 없다. 읽기 전에 반드시 통과시킨다 —
        없으면 빈 배열이라 **스킬 층이 없던 때와 같다.** */
  ensure(a){
    if(!a) return a;
    if(!Array.isArray(a.skills))   a.skills = [];     // 배운 것
    if(!Array.isArray(a.skillEq))  a.skillEq = [];    // 장착한 것(슬롯 순)
    return a;
  },
  known(a){ this.ensure(a); return a.skills; },
  equipped(a){
    this.ensure(a);
    /* 슬롯이 줄어들 일은 없지만(레벨은 안 내려간다) 방어적으로 자른다 */
    return a.skillEq.slice(0, this.slots(a)).filter(id=>this.SKILLS[id]);
  },
  has(a, id){ return this.equipped(a).indexOf(id) >= 0; },

  /* ── 배우기 ──────────────────────────────────────────────
     ⚠ 종족 등급이 조건이다. 전설 종족만 배우는 스킬이 있다 —
        5단계 등급이 잠재치 말고 **할 수 있는 일**로도 나타나는 자리. */
  rarityOf(a){ return (typeof rarityOf==='function') ? rarityOf(a) : 1; },
  why(a, id){
    const d = this.SKILLS[id]; if(!d) return '없는 스킬';
    this.ensure(a);
    if(a.skills.indexOf(id) >= 0) return '이미 배웠습니다';
    if((a.lv||1) < d.lv) return `Lv.${d.lv} 부터`;
    if(this.rarityOf(a) < d.tier){
      const nm = (typeof RARITY!=='undefined' && RARITY[d.tier]) ? RARITY[d.tier].name : d.tier;
      return `${nm} 등급 종족만`;
    }
    if(d.spec && a.spec !== d.spec){
      const S = { sprint:'단거리', hurdles:'허들', jump:'도약', throw:'투척' };
      return `${S[d.spec]||d.spec} 선수만`;
    }
    if(d.needs && a.skills.indexOf(d.needs) < 0) return `${this.SKILLS[d.needs].name} 먼저`;
    if((a.tp||0) < d.cost) return `훈련 포인트 ${d.cost} 필요`;
    return null;                                   // null = 배울 수 있다
  },
  canLearn(a, id){ return this.why(a, id) === null; },
  learn(a, id){
    if(!this.canLearn(a, id)) return false;
    const d = this.SKILLS[id];
    a.tp = (a.tp||0) - d.cost;
    a.skills.push(id);
    /* 빈 슬롯이 있으면 바로 끼워 준다 — 배웠는데 안 켜져 있는 건 함정이다 */
    if(a.skillEq.length < this.slots(a)) a.skillEq.push(id);
    return true;
  },

  /* ── 장착 ────────────────────────────────────────────────
     배운다 ≠ 쓴다. 여기가 이 게임에 처음 생기는 '편성' 결정이다. */
  toggle(a, id){
    this.ensure(a);
    if(a.skills.indexOf(id) < 0) return false;
    const i = a.skillEq.indexOf(id);
    if(i >= 0){ a.skillEq.splice(i,1); return true; }
    if(a.skillEq.length >= this.slots(a)) return false;   // 칸이 꽉 찼다
    a.skillEq.push(id);
    return true;
  },

  /* ── 효과 ────────────────────────────────────────────────
     ⛔ 여기가 이 층이 경기에 닿는 **유일한 자리**다.
        장착이 비어 있으면 0 을 돌려준다 → 예전과 완전히 같다. */
  eff(a, key){
    if(!a || !Array.isArray(a.skillEq) || !a.skillEq.length) return 0;
    let v = 0;
    for(const id of this.equipped(a)){
      const d = this.SKILLS[id];
      if(d && d.eff && d.eff[key]) v += d.eff[key];
    }
    return v;
  },
  /* 육성형 — 장비·코치·유산·도감과 같은 통로로 합쳐진다 */
  growBonus(a){
    const out = { grow:0, rest:0, hurt:0, cond:0, xp:0 };
    if(!a || !Array.isArray(a.skillEq) || !a.skillEq.length) return out;
    for(const id of this.equipped(a)){
      const d = this.SKILLS[id];
      if(!d || !d.grow) continue;
      for(const k in out) if(d.grow[k]) out[k] += d.grow[k];
    }
    return out;
  },

  /* ── 수동 플레이의 판정 창 ────────────────────────────────
     ⚠ 수동은 선수 스탯을 안 쓴다(실측). 그래서 스킬은 **창을 넓히는 것**으로만
        나타난다 — 자동의 sigma 감소와 같은 말이다("PERFECT 가 는다").
     ⚠ 값은 작게. RULES.perfectWindowPct 가 0.08 이므로 0.02 는 창이 25% 넓어진다.
        경기 한 판을 통째로 뒤집지 않으면서 '내 선수라서 다르다'는 느낌만 준다. */
  /* ⚠ 0.10 으로 재 봤더니 박자+절대박자를 다 껴도 창이 0.08 → 0.0877 (+9.6%) 뿐이라
     손에 안 잡혔다. 콤보 단계가 주는 확대(최대 +0.05, +62%)보다도 한참 작았다.
     0.25 면 최대 조합이 +0.019 (+24%) — 콤보보다는 작고, 없을 때와는 구분된다.
     ⛔ 특성(metronome 등)은 여기 안 넣는다. 수동은 예전부터 스탯·특성과 무관했다 —
        넣으면 그건 기존 게임을 바꾸는 것이다. */
  WIDEN_PER_SIGMA: 0.25,
  manualWiden: 0,             // ⚠ 감독 모드가 경기 전에 넣고 끝나면 0 으로 되돌린다
  widenFor(a){
    if(!a) return 0;
    return Math.max(0, -this.eff(a, 'sigma')) * this.WIDEN_PER_SIGMA;
  },
  /* 이번 수동 경기에 나가는 우리 선수 중 대표 한 명의 창을 쓴다 */
  beginManual(a){ this.manualWiden = this.widenFor(a); },
  endManual(){ this.manualWiden = 0; },

  /* ── 화면이 쓰는 것 ──────────────────────────────────────*/
  /* 이 선수가 지금 배울 수 있는 것 · 조건이 안 되는 것을 함께 (이유를 붙여서) */
  pool(a){
    this.ensure(a);
    return this.ids().map(id => ({ id, def:this.SKILLS[id],
      known: a.skills.indexOf(id) >= 0,
      on:    a.skillEq.indexOf(id) >= 0,
      why:   this.why(a, id) }))
      /* 배운 것 → 배울 수 있는 것 → 조건 미달 순. 눈이 위에서 아래로 흐른다 */
      .sort((x,y)=>{
        const rank = o => o.known ? 0 : (o.why===null ? 1 : 2);
        return rank(x)-rank(y) || x.def.tier-y.def.tier || x.def.cost-y.def.cost;
      });
  },
  /* 한 줄 요약 — 카드·목록에 */
  summary(a){
    const eq = this.equipped(a);
    if(!eq.length) return '';
    return eq.map(id=>this.SKILLS[id].name).join(' · ');
  },
};
