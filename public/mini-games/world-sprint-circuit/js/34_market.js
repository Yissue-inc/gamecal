/* ══════════════════════════════════════════════════════════════════
   스카우팅 · 영입 · 이적 — FM 에서 제일 재미있는 부분.
   핵심은 '정보가 흐릿하다'는 것. 잠재력은 스카우트를 보내야 서서히 드러난다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const MarketTune = {
  /* ⚠ 실측으로 다시 잡음. 이전 값(6 / 0.9 / 0.55)은 두 가지가 깨져 있었다:
       ① 아무것도 안 해도 3년차에 자금 -10 으로 파산했다 (임금이 성장하는데 수입은 고정)
       ② **비싼 세계 스카우트가 가장 나쁜 성적**을 냈다(76.4점 vs 국내 104.6) —
          투자가 손해가 되면 시장 시스템 자체가 무의미하다.
     성공이 수입으로 돌아오게 명성 보너스와 상금을 크게 올렸다. */
  startBudget: 260,
  weeklySponsor: 9,          // 기본 후원 수입(주당)
  repBonus: 1.10,            // 명성 1당 추가 수입 — 성적이 곧 다음 시즌의 실탄
  /* ⚠ 종목이 6→14 로 늘며 승점이 두 배가 됐다. 상금 계수를 그대로 두니
     3년차 자금이 150만까지 불어 긴장이 사라졌다(실측). 종목 수에 맞춰 낮춘다. */
  /* ⚠ 종목이 늘 때마다 승점이 비례해 늘어난다(14종목 365점 -> 22종목 757점).
     상금·명성 계수를 그대로 두면 자금이 폭주한다(3년차 1364). 종목 수에 맞춰 낮춘다. */
  prizePerPoint: 0.28,       // 대회 승점당 상금
  /* ⚠ 종목이 22개가 되며 선수단이 10명으로 커졌다. 0.055 로는 주급이 수입을 넘어
     방치 시 3년차에 -452 로 파산했다(선수를 팔지 않으니 회복 경로도 없다). */
  wagePerOverall: 0.042,     // 선수 1명 주급 = OVR × 이 값
  scoutSlots: 2,             // 동시에 파견 가능한 스카우트 수
  scoutWeeks: 3,             // 한 번 파견에 걸리는 주
  /* 14종목을 6명으로는 못 채운다. 계주만 해도 4명이 필요하다. */
  squadMin: 5, squadMax: 12,
};

/* 스카우트가 본 만큼만 보여준다 — 0=미지, 3=완전 파악 */
function fogStat(v, level){
  if(level>=3) return Math.round(v)+'';
  if(level<=0) return '???';
  const band = level===1 ? 18 : 8;
  const lo=Math.max(10, Math.round((v-band)/5)*5), hi=Math.min(99, Math.round((v+band)/5)*5);
  return `${lo}~${hi}`;
}
function fogOverall(a, level){
  if(level>=3) return `${a.overall} / ${a.potOverall}`;
  if(level<=0) return '??? / ???';
  const b = level===1?12:6;
  return `${Math.max(10,a.overall-b)}~${Math.min(99,a.overall+b)} / ${level>=2?`${Math.max(10,a.potOverall-b)}~${Math.min(99,a.potOverall+b)}`:'???'}`;
}

/* 선수 몸값 — 잠재력과 나이로 정한다 */
function valueOf(a){
  const pot = a.potOverall, cur = a.overall;
  /* ⚠ 예전엔 (28-나이)/10 이라 25세가 0.3 배까지 떨어져
     69/77 짜리 선수가 13 에 팔렸다(자금 260 인데). 고민할 이유가 없어진다. */
  const youth = clamp((32-a.age)/12, 0.45, 1.35);
  const v = (cur*0.55 + pot*0.85) * youth * 1.15;
  const traitBonus = a.traits.reduce((s,t)=> s + (['glass','nervous'].includes(t) ? -6 : 7), 0);
  return Math.max(6, Math.round(v + traitBonus));
}
function wageOf(a){ return +(a.overall * MarketTune.wagePerOverall).toFixed(1); }

class Market {
  constructor(club, seed){
    this.club = club;
    this.rng = makeRng((seed^0x2f6a1c3d)>>>0);
    this.prospects = [];      // 스카우트가 찾아온 선수 {athlete, level, weeksLeft, askPrice}
    this.scouts = [];         // 파견 중 {region, weeksLeft}
    this.offers = [];         // 우리 선수에게 들어온 제안 {athleteId, price, weeksLeft}
    this.history = [];
  }

  /* ── 스카우트 파견 ── */
  regions(){
    return [
      { id:'local',  name:'국내',     cost:8,  tier:[0.28,0.62], weeks:2 },
      { id:'asia',   name:'아시아',   cost:15, tier:[0.38,0.80], weeks:3 },
      { id:'world',  name:'세계',     cost:26, tier:[0.52,0.96], weeks:4 },
      { id:'youth',  name:'유소년',   cost:12, tier:[0.30,0.86], weeks:4, young:true },
    ];
  }
  canScout(){ return this.scouts.length < MarketTune.scoutSlots; }
  sendScout(regionId){
    const r = this.regions().find(x=>x.id===regionId); if(!r) return '지역을 찾을 수 없습니다';
    if(!this.canScout()) return `스카우트는 동시에 ${MarketTune.scoutSlots}명까지 보낼 수 있습니다`;
    if(this.club.budget < r.cost) return '자금이 부족합니다';
    this.club.budget -= r.cost;
    this.scouts.push({ region:r.id, name:r.name, weeksLeft:r.weeks });
    return null;
  }

  /* ── 매주 처리 ── */
  weekTick(season){
    const out=[];
    // 스카우트 귀환
    for(const s of this.scouts.slice()){
      s.weeksLeft--;
      if(s.weeksLeft<=0){
        this.scouts.splice(this.scouts.indexOf(s),1);
        const r=this.regions().find(x=>x.id===s.region);
        const n = 1 + (this.rng()<0.45?1:0);
        for(let i=0;i<n;i++){
          const tier = lerp(r.tier[0], r.tier[1], this.rng());
          const age = r.young ? 16+((this.rng()*3)|0) : 18+((this.rng()*9)|0);
          const a = rollAthlete(this.rng, { tier, age });
          this.prospects.push({ athlete:a, level:1, weeksLeft:5+((this.rng()*4)|0), ask:valueOf(a) });
        }
        out.push({ t:'scout', msg:`${s.name} 스카우트 복귀 — 후보 ${n}명 발견` });
      }
    }
    // 후보 정보가 시간이 지나며 조금씩 드러난다(계속 지켜보는 셈)
    for(const p of this.prospects.slice()){
      p.weeksLeft--;
      /* 정보는 천천히 드러난다 — 빨리 다 보이면 '기다릴까 지금 살까'가 사라진다.
         실측: 0.34 였을 때 3주 만에 전부 레벨3 이 됐다. */
      if(this.rng()<0.16 && p.level<3) p.level++;
      if(p.weeksLeft<=0){
        this.prospects.splice(this.prospects.indexOf(p),1);
        out.push({ t:'lost', msg:`${p.athlete.name} — 다른 팀과 계약했습니다` });
      }
    }
    // 우리 선수에게 들어오는 제안 — 잘하는 선수일수록 자주
    for(const o of this.offers.slice()){
      o.weeksLeft--;
      if(o.weeksLeft<=0) this.offers.splice(this.offers.indexOf(o),1);
    }
    const stars = this.club.squad.filter(a=>a.overall>=52 && !a.injury);
    if(stars.length && this.rng() < 0.14 + stars.length*0.02){
      const a = stars[(this.rng()*stars.length)|0];
      if(!this.offers.find(o=>o.athleteId===a.id)){
        const price = Math.round(valueOf(a) * (1.05 + this.rng()*0.55));
        this.offers.push({ athleteId:a.id, price, weeksLeft:3, from:this.clubName() });
        out.push({ t:'offer', msg:`${a.name}에게 이적 제안 — ${price}` });
      }
    }
    // 수입·지출
    const wages = this.club.squad.reduce((s,a)=>s+wageOf(a),0);
    const income = MarketTune.weeklySponsor + this.club.reputation*MarketTune.repBonus;
    this.club.budget = +(this.club.budget + income - wages).toFixed(1);
    if(this.club.budget < 0){
      out.push({ t:'debt', msg:`자금 부족 (${this.club.budget.toFixed(0)}) — 선수를 정리해야 합니다` });
    }
    return out;
  }
  clubName(){
    const N=['북방 육상단','해안 스프린터스','고원 클럽','남부 아카데미','철도 체육회','왕립 트랙'];
    return N[(this.rng()*N.length)|0];
  }

  /* ── 영입 ── */
  sign(prospect){
    if(this.club.squad.length >= MarketTune.squadMax) return `선수단은 ${MarketTune.squadMax}명까지입니다`;
    if(this.club.budget < prospect.ask) return `자금이 부족합니다 (필요 ${prospect.ask})`;
    this.club.budget -= prospect.ask;
    this.club.squad.push(prospect.athlete);
    this.prospects.splice(this.prospects.indexOf(prospect),1);
    this.history.push({ t:'sign', name:prospect.athlete.name, price:prospect.ask, year:this.club.year });
    return null;
  }
  /* ── 방출 ── */
  release(a){
    if(this.club.squad.length <= MarketTune.squadMin) return `선수단은 최소 ${MarketTune.squadMin}명이어야 합니다`;
    this.club.squad.splice(this.club.squad.indexOf(a),1);
    this.club.budget = +(this.club.budget + Math.round(valueOf(a)*0.25)).toFixed(1);
    this.history.push({ t:'release', name:a.name, year:this.club.year });
    return null;
  }
  /* ── 이적 수락 ── */
  acceptOffer(offer){
    const a=this.club.byId(offer.athleteId); if(!a) return '선수를 찾을 수 없습니다';
    if(this.club.squad.length <= MarketTune.squadMin) return `선수단은 최소 ${MarketTune.squadMin}명이어야 합니다`;
    this.club.squad.splice(this.club.squad.indexOf(a),1);
    this.club.budget = +(this.club.budget + offer.price).toFixed(1);
    this.offers.splice(this.offers.indexOf(offer),1);
    this.history.push({ t:'sell', name:a.name, price:offer.price, year:this.club.year });
    // 남은 선수들 사기 하락 — 주축을 팔면 팀이 흔들린다
    for(const b of this.club.squad) b.morale = clamp(b.morale-6, 0, 100);
    return null;
  }
}
