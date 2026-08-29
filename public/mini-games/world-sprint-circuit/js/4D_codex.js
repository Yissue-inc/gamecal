/* ══════════════════════════════════════════════════════════════════
   종족 도감 — 5단계 등급에 '모을 이유'를 준다

   ⚠ 등급 5단계는 처음부터 있었고 지금도 돈다(실측):
        흔함 7종 20.9% · 우수 18종 33.1% · 정예 18종 31.7% ·
        영웅 12종 12.1% · 전설 5종 2.2%
        잠재 보너스 +0 / +3 / +6 / +10 / +15 (전설은 흔함보다 잠재 OVR +11)
      그런데 **모을 대상이 아니었다.** 60종족이 있는데 플레이어는 평생
      자기 선수단의 열 몇 종만 본다. 전설 5종은 존재조차 모르고 끝난다.

   포켓몬의 도감이 하는 일이 정확히 이것이다 — 등급과 종류에 '수집'이라는
   목적을 붙이는 것. 데이터는 이미 다 있다(60종족 · 스프라이트 300장).

   ⛔ 규칙은 안 건드린다. **본 것을 기록**하고 보여 줄 뿐이다.
   ⚠ 도감은 클럽이 아니라 **감독**에게 붙는다 — 클럽을 새로 만들어도 남는다.
      한 판에 다 못 모으는 것이 도감이다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const Codex = {
  KEY: 'wsc_codex',

  /* { seen:{species:1}, owned:{species:1}, hall:{species:1}, claimed:{tier:1} } */
  load(){
    try{
      const d=JSON.parse(localStorage.getItem(this.KEY));
      if(d && typeof d==='object') return Object.assign(this.blank(), d);
    }catch(e){}
    return this.blank();
  },
  blank(){ return { seen:{}, owned:{}, hall:{}, claimed:{} }; },
  get d(){ return (this._d ||= this.load()); },
  save(){ if(this._quiet) return; try{ localStorage.setItem(this.KEY, JSON.stringify(this.d)); }catch(e){} },

  /* 기록하는 세 단계 — 보기만 한 것과 데리고 있던 것과 전당에 올린 것은 다르다 */
  see(sp){ if(!sp || this.d.seen[sp]) return false; this.d.seen[sp]=1; this.save(); return true; },
  own(sp){ if(!sp) return false;
    const isNew = !this.d.owned[sp];
    this.d.seen[sp]=1; this.d.owned[sp]=1; if(isNew) this.save(); return isNew; },
  enshrine(sp){ if(!sp) return false;
    const isNew = !this.d.hall[sp];
    this.d.seen[sp]=1; this.d.owned[sp]=1; this.d.hall[sp]=1; if(isNew) this.save(); return isNew; },

  /* ⚠ see/own 은 한 번에 수십 번 불린다(대회 한 판에 상대가 40명 넘게 지나간다).
     그때마다 localStorage 에 쓰면 낭비다 — 묶어서 한 번만 쓴다. */
  bulk(fn){ const before=JSON.stringify(this.d); this._quiet=true;
    try{ fn(); } finally { this._quiet=false; }
    if(JSON.stringify(this.d)!==before) this.save(); },

  all(){ return (typeof SPECIES_KEYS!=='undefined') ? SPECIES_KEYS : []; },
  tierOf(sp){ return (typeof SPECIES!=='undefined' && SPECIES[sp]) ? SPECIES[sp].rare : 1; },
  byTier(t){ return this.all().filter(sp=>this.tierOf(sp)===t); },
  countTier(t){
    const list=this.byTier(t);
    return { total:list.length,
             seen:list.filter(sp=>this.d.seen[sp]).length,
             owned:list.filter(sp=>this.d.owned[sp]).length };
  },
  totals(){
    const a=this.all();
    return { total:a.length,
             seen:a.filter(sp=>this.d.seen[sp]).length,
             owned:a.filter(sp=>this.d.owned[sp]).length,
             hall:a.filter(sp=>this.d.hall[sp]).length };
  },

  /* ── 보상 ────────────────────────────────────────────────
     ⚠ 처음엔 "등급 하나를 다 모으면 준다"로 짰다. **재 보고 버렸다**(tools/codex_fill.js):

        시즌   보유 종족   흔함(7종) 완성   영웅(12종)   전설(5종)
          10      24.7          0%           0%          0%
          20      34.6          2%           0%          0%
          40      46.4         27%           3%          3%

     실제 플레이는 16시즌 언저리다. **완성 보상은 아무도 못 받는다** — 죽은 콘텐츠다.
     원인은 분명하다: 데려오는 선수가 시즌당 두 명뿐이라 표본이 안 쌓인다.
     포켓몬은 풀숲에 가서 **직접 잡을 수 있어서** 도감이 성립한다. 우리는 못 잡는다.

     그래서 목표를 바꿨다:
       ① **한 종족 등록 = 그 자리에서 영구 성장 보너스** (등록 수 × 0.3%, 상한 18%)
          — 60종을 다 못 모아도 **한 종족마다 즉시 값이 붙는다.** 이게 실제 동력이다.
       ② **누적 마릿수 이정표** — 등급별이 아니라 전체 수로. 16 부터 시작한다
          (첫 선수단 12명이 이미 11종을 채우고 들어오므로 그 위에서 시작해야 목표가 된다)
       ③ 등급 완성은 남겨 두되 **덤**으로. 40시즌 27% 는 훈장이지 이정표가 아니다.

     ⛔ 성장 보너스는 유산(legacyBonus)과 같은 통로로 들어간다 — 경기 계산은 안 건드린다. */

  /* 등록 수에 비례하는 영구 성장 보너스. 상한 18% (유산 25% · 장비 48% 와 같은 대역) */
  GROW_PER: 0.003, GROW_CAP: 0.18,
  growBonus(){ return { grow: Math.min(this.GROW_CAP, this.totals().owned * this.GROW_PER) }; },

  /* 이정표 — 마릿수. 실측 곡선(3시즌 15 · 5시즌 18 · 10시즌 25 · 20시즌 35 · 40시즌 46)
     위에 얹어 **평생 아홉 번** 울리게 잡았다. 10시즌까지 받는 코인은 440 — 잔고를
     대략 두 배로 올린다. 수집이 실제로 살림에 보탬이 돼야 모을 이유가 생긴다. */
  MILESTONES: [
    /* ⚠ 앞의 두 개는 **가르치는 이정표**다. 첫 선수단 12명이 약 11종을 채우고 들어오므로
       12·14 는 1~2시즌에 울린다 — 그래야 "모으면 뭔가 온다"를 배운다.
       이게 없으면 첫 보상까지 5시즌(실측)이 걸려서 아무도 시스템을 눈치채지 못한다. */
    { n:12, coin:  40, tp: 1 }, { n:14, coin:  60, tp: 1 },
    { n:16, coin:  80, tp: 2 }, { n:20, coin: 140, tp: 2 }, { n:25, coin: 220, tp: 3 },
    { n:30, coin: 330, tp: 3 }, { n:36, coin: 480, tp: 4 }, { n:42, coin: 700, tp: 5 },
    { n:48, coin:1000, tp: 6 }, { n:54, coin:1400, tp: 8 }, { n:60, coin:2200, tp:12 },
  ],
  nextMilestone(){ const o=this.totals().owned;
    return this.MILESTONES.find(m=>m.n>o) || null; },
  pendingMilestones(){ const o=this.totals().owned;
    return this.MILESTONES.filter(m=>m.n<=o && !this.d.claimed['m'+m.n]); },

  /* 등급 완성은 덤 — 훈장이다 */
  TIER_BONUS: { 1:{coin:400,tp:4}, 2:{coin:900,tp:6}, 3:{coin:900,tp:6},
                4:{coin:1600,tp:10}, 5:{coin:3000,tp:20} },
  pendingTiers(){ const out=[];
    for(let t=1;t<=5;t++){ const c=this.countTier(t);
      if(c.total>0 && c.owned>=c.total && !this.d.claimed['t'+t]) out.push(t); }
    return out; },

  hasClaim(){ return this.pendingMilestones().length>0 || this.pendingTiers().length>0; },

  /* 받을 수 있는 것을 **한 번에** 준다 — 이정표 아홉 개를 아홉 번 누르게 하지 않는다 */
  claimAll(club){
    const ms=this.pendingMilestones(), ts=this.pendingTiers();
    if(!ms.length && !ts.length) return null;
    let coin=0, tp=0;
    for(const m of ms){ coin+=m.coin; tp+=m.tp; this.d.claimed['m'+m.n]=1; }
    for(const t of ts){ const b=this.TIER_BONUS[t]||{coin:0,tp:0};
      coin+=b.coin; tp+=b.tp; this.d.claimed['t'+t]=1; }
    if(club){
      club.budget = +((club.budget||0) + coin).toFixed(1);
      /* 훈련 포인트는 선수단 전원에게 — 도감은 클럽 전체의 성과다 */
      if(typeof RPG!=='undefined')
        for(const a of (club.squad||[])){ RPG.ensure(a); a.tp=(a.tp||0)+tp; }
    }
    this.save();
    return { coin, tp, milestones:ms.length, tiers:ts.length };
  },
};
