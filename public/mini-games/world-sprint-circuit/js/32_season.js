/* ══════════════════════════════════════════════════════════════════
   시즌 — 24주. 대회는 6·12·18주(지역), 24주(챔피언십).
   감독은 매주 '직접 지도 3명'을 정하고, 대회 주에는 출전 명단을 짠다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const SEASON_WEEKS = 24;
/* 리그 절대 수준. 실측한 스쿼드 능력 축에 맞춘 값이다:
     신규 41.7 → 1년 51.9 → 2년 59.0 → 3년 64.3
   리그는 42 에서 해마다 7% (42→45→48→51.5). 잘 키우면 앞서고, 방치하면 따라잡힌다. */
let LEAGUE_BASE = 38;
let LEAGUE_GROWTH = 1.07;
let RIVAL_ADAPT = 0.15;    // 적응 비중. 1.0 이면 키운 만큼 상대도 세져 육성이 무의미해진다.
const MEET_WEEKS = { 6:'regional', 12:'regional', 18:'invitational', 24:'championship' };
const MEET_INFO = {
  regional    : { name:'지역 대회',   entries:2, pts:[8,6,4,3,2,1], big:false },
  invitational: { name:'초청 경기',   entries:2, pts:[12,9,6,4,3,2], big:false },
  championship: { name:'시즌 챔피언십', entries:3, pts:[20,15,11,8,6,4], big:true },
};

class Season {
  constructor(club, seed){
    this.club = club;
    this.year = club.year;
    this.week = 1;
    this.rng = makeRng(seed>>>0);
    this.points = 0;
    this.medals = { gold:0, silver:0, bronze:0 };
    this.weekLog = [];          // 이번 주에 일어난 일
    this.results = [];          // 대회 결과 이력
    this.entries = {};          // 이번 대회 출전표 { eventId: [athleteId] }
  }
  get meetKind(){ return MEET_WEEKS[this.week] || null; }
  get isMeetWeek(){ return !!this.meetKind; }
  get nextMeetWeek(){
    for(const w of Object.keys(MEET_WEEKS).map(Number).sort((a,b)=>a-b))
      if(w >= this.week) return w;
    return null;
  }
  /* 대회에서 열리는 종목 — 우리 스쿼드 전문분야 위주로 */
  /* 대회 종목 구성.
     ⚠ 종목이 6→14 로 늘었다. 대회 하나에 14종목을 다 넣으면 한 판이 너무 길다.
        지역·초청 대회는 성격을 나누고, 챔피언십만 전 종목을 연다. */
  meetEvents(){
    const kind=this.meetKind;
    if(kind==='championship') return EVENTS.slice();
    const SETS = {
      regional:     ['sprint100','sprint400','hurdles110','longJump','shotPut','relay4x100',
                     'swimFree100'],
      invitational: ['sprint200','run800','run1500','run5000','tripleJump','highJump','poleVault',
                     'discus','javelin','hammer','swimBack100','swimFly100'],
    };
    const ids = SETS[kind] || SETS.regional;
    return EVENTS.filter(e=>ids.includes(e.id));
  }

  /* 한 주 진행 — 훈련만. 대회 주는 별도로 runMeet() 을 부른다. */
  advanceTraining(focusMap){
    this.weekLog = [];
    for(const a of this.club.squad){
      const log = trainWeek(a, this.club.program, focusMap[a.id]||null, this.rng);
      for(const e of log.events) this.weekLog.push(e);
      const gains = Object.entries(log.gains);
      if(gains.length){
        const top = gains.sort((x,y)=>y[1]-x[1])[0];
        if(top[1] >= 0.35)
          this.weekLog.push({ t:'gain', msg:`${a.name} ${STAT_NAME[top[0]]} +${top[1].toFixed(1)}` });
      }
    }
    // 사기 — 부상자는 떨어지고, 건강한 선수는 천천히 회복
    for(const a of this.club.squad){
      a.morale = clamp(a.morale + (a.injury ? -1.6 : 1.1), 0, 100);
    }
    // 스카우트·이적·자금
    if(this.market){
      for(const e of this.market.weekTick(this)) this.weekLog.push(e);
    }
  }

  /* 자동 출전표 — 종목별 적합도 상위 N명 */
  autoEntries(){
    const info = MEET_INFO[this.meetKind];
    const out = {};
    for(const ev of this.meetEvents()){
      const need = ev.kind==='relay' ? 4 : info.entries;
      const fit = this.club.squad.filter(a=>a.available)
        .map(a=>({a, s:eventFitNow(a, ev)}))     // 출전표는 '오늘 상태'로 고른다
        .sort((x,y)=>y.s-x.s)
        .slice(0, need);
      out[ev.id] = fit.map(f=>f.a.id);
    }
    return out;
  }

  /* 대회 실행 — 우리 선수 + AI 상대들 */
  runMeet(){
    const kind = this.meetKind, info = MEET_INFO[kind];
    const meet = { week:this.week, kind, name:info.name, events:[], points:0 };
    for(const ev of this.meetEvents()){
      const mine = (this.entries[ev.id]||[]).map(id=>this.club.byId(id)).filter(a=>a && a.available);
      if(!mine.length) continue;
      if(ev.kind==='relay'){ this.runRelay(ev, mine, meet, info); continue; }
      const field = mine.concat(this.makeRivals(ev, kind, 8-mine.length));
      const rows = simulateMeetEvent(ev, field, { rng:this.rng, big:info.big });
      let evPts = 0;
      for(const r of rows){
        if(!this.club.has(r.athlete)) continue;
        const p = info.pts[r.rank-1] || 0;
        evPts += p;
        r.athlete.history.push({ year:this.year, week:this.week, event:ev.id, rank:r.rank, value:r.value });
        // 개인 최고
        const cur = r.athlete.best[ev.id];
        const better = cur===undefined || (ev.higher ? r.value>cur : r.value<cur);
        if(better && r.value>0 && r.value<90){ r.athlete.best[ev.id]=r.value; r.isPB=true; }
        // 사기
        r.athlete.morale = clamp(r.athlete.morale + (r.rank===1?14:(r.rank<=3?8:(r.rank<=5?1:-7))), 0, 100);
        // 대회는 피로를 남긴다
        r.athlete.fatigue = clamp(r.athlete.fatigue + 9, 0, 100);
        if(r.rank===1) this.medals.gold++;
        else if(r.rank===2) this.medals.silver++;
        else if(r.rank===3) this.medals.bronze++;
        // 클럽 기록
        const cb = this.club.records[ev.id];
        if(!cb || (ev.higher ? r.value>cb.value : r.value<cb.value)){
          if(r.value>0 && r.value<90){
            this.club.records[ev.id] = { value:r.value, name:r.athlete.name, year:this.year };
            r.isCR = true;
          }
        }
      }
      meet.points += evPts;
      meet.events.push({ ev, rows });
    }
    this.points += meet.points;
    /* 상금과 명성 — 성적이 곧 다음 시즌의 자금이 된다 */
    const prize = Math.round(meet.points * MarketTune.prizePerPoint * (info.big?1.8:1));
    this.club.budget = +(this.club.budget + prize).toFixed(1);
    this.club.reputation = +(this.club.reputation + meet.points*0.005 + this.medals.gold*0.03).toFixed(2);
    meet.prize = prize;
    this.results.push(meet);
    return meet;
  }

  /* 계주 — 우리 4명 대 상대 팀들 */
  runRelay(ev, mine, meet, info){
    if(mine.length < 4) return;                       // 4명이 안 되면 출전 불가
    const team = mine.slice(0,4);
    /* ⚠ trackM 을 안 넘기면 simulateRelay 가 400m 로 기본값을 잡아
       4x400(1600m) 이 4x100 과 같은 기록을 낸다(실측 40.7s — 실제는 3분대). */
    const ours = simulateRelay(team, { rng:this.rng, big:info.big, trackM:ev.distanceM });
    const rows = [{ athlete:team[0], team, res:ours, value:ours.timeS, isOurs:true }];
    for(let i=0;i<5;i++){
      const rteam=[]; for(let k=0;k<4;k++) rteam.push(this.rivalAt('sprint', EVENT_BY_ID.sprint100,
        (LEAGUE_BASE*Math.pow(LEAGUE_GROWTH,this.year-1))*{regional:1.0,invitational:1.12,championship:1.26}[this.meetKind]*(0.9+this.rng()*0.24)));
      const r=simulateRelay(rteam,{rng:this.rng, trackM:ev.distanceM});
      rows.push({ athlete:rteam[0], team:rteam, res:r, value:r.timeS });
    }
    rows.sort((a,b)=>a.value-b.value);
    rows.forEach((r,i)=>{ r.rank=i+1; });
    const ourRow = rows.find(r=>r.isOurs);
    const pts = info.pts[ourRow.rank-1] || 0;
    meet.points += pts;
    for(const a of team){
      a.morale = clamp(a.morale + (ourRow.rank===1?14:(ourRow.rank<=3?8:-4)), 0, 100);
      a.fatigue = clamp(a.fatigue + 7, 0, 100);
      a.history.push({ year:this.year, week:this.week, event:ev.id, rank:ourRow.rank, value:ourRow.value });
    }
    if(ourRow.rank===1) this.medals.gold++;
    else if(ourRow.rank===2) this.medals.silver++;
    else if(ourRow.rank===3) this.medals.bronze++;
    const cb=this.club.records[ev.id];
    if(!cb || ourRow.value<cb.value){
      this.club.records[ev.id]={ value:ourRow.value, name:team.map(a=>a.name.slice(0,3)).join('·'), year:this.year };
      ourRow.isCR=true;
    }
    meet.events.push({ ev, rows });
  }

  /* 상대 선수 — 우리 스쿼드 수준에 맞춰 만든다.
     ⚠ 고정 tier 로 뽑았더니 3년 동안 금·은이 0개였다(실측). 아무것도 못 이기면 육성이 무의미하다.
        지역대회는 우리보다 조금 약하게, 챔피언십은 확실히 강하게 — 이겨야 할 이유와 질 이유를 둘 다 만든다. */
  makeRivals(ev, kind, n){
    /* ⚠ 같은 경기에 같은 이름이 둘 나오면 순위표가 못 읽힌다(실측: '임시우' 2명) */
    const used = new Set(this.club.squad.map(a=>a.name));
    const mult = { regional:1.00, invitational:1.12, championship:1.26 }[kind];
    /* ⚠ 상대를 '내 실력에 맞춰' 뽑으면 키운 만큼 상대도 세져서 육성이 무의미해진다.
       실측: 그 상태에서 무지성 훈련(OVR 47.8·부상 9.4)이 관리 훈련(OVR 54.8·부상 2.2)을
       승점 292 대 194 로 이겼다 — 교훈이 통째로 뒤집혔다.
       그래서 리그는 **절대 기준**으로 두고(해마다 조금씩 상승) 적응은 살짝만 섞는다. */
    const spec = { sprint100:'sprint', sprint200:'sprint', sprint400:'sprint',
                   relay4x100:'sprint', relay4x400:'endure',
                   hurdles110:'hurdles', run800:'endure', run1500:'endure',
                   run5000:'endure', walk20k:'endure',
                   longJump:'jump', tripleJump:'jump', highJump:'jump', poleVault:'jump',
                   shotPut:'throw', discus:'throw', javelin:'throw', hammer:'throw',
                   swimFree100:'jump', swimBack100:'jump', swimBreast100:'throw', swimFly100:'throw'
                 }[ev.id] || 'sprint';
    const mine = this.club.squad.filter(a=>a.available);
    const myBest = mine.length ? Math.max(...mine.map(a=>eventFit(a,ev))) : 45;
    const LB = (typeof LEAGUE_BASE_OVERRIDE!=='undefined') ? LEAGUE_BASE_OVERRIDE : LEAGUE_BASE;
    const AD = (typeof RIVAL_ADAPT_OVERRIDE!=='undefined') ? RIVAL_ADAPT_OVERRIDE : RIVAL_ADAPT;
    const leagueBase = LB * Math.pow(LEAGUE_GROWTH, this.year-1);
    const target = (leagueBase*mult) * (1-AD) + (myBest*mult) * AD;
    const out=[];
    for(let i=0;i<Math.max(0,n);i++){
      const spread = 0.88 + (i/Math.max(1,n-1))*0.26;      // 상위권이 촘촘해야 우승이 어렵다
      let a=null;
      for(let k=0;k<6;k++){
        a = this.rivalAt(spec, ev, target*spread);
        if(!used.has(a.name)) break;
      }
      if(used.has(a.name)) a.name = a.name + ' ' + (out.length+2);
      used.add(a.name);
      a.isRival = true;
      out.push(a);
    }
    return out;
  }
  /* 목표 적합도에 맞춰 스탯을 스케일한 상대 하나 */
  rivalAt(spec, ev, targetFit){
    const a = rollAthlete(this.rng, { spec, tier:0.55, age:20+((this.rng()*8)|0) });
    a.condition = 66 + this.rng()*28; a.fatigue = this.rng()*18;
    for(let i=0;i<8;i++){
      const cur = eventFit(a, ev);
      if(cur <= 0.001) break;
      const k = clamp(targetFit/cur, 0.55, 1.9);
      if(Math.abs(k-1) < 0.02) break;
      for(const key of STAT_KEYS){
        a.stats[key] = clamp(a.stats[key]*k, 18, 99);
        a.potential[key] = Math.max(a.potential[key], Math.round(a.stats[key]));
      }
    }
    for(const key of STAT_KEYS) a.stats[key] = Math.round(a.stats[key]);
    return a;
  }
}

/* 선수-종목 적합도.
   ⚠ 두 종류를 갈라야 한다(실측으로 깨짐):
     · eventFit    = 순수 능력. 상대 수준을 맞추는 기준.
     · eventFitNow = 오늘 컨디션 반영. 출전표·추천에 쓴다.
   예전엔 하나로 쓰다 보니 72주 육성 후 적합도가 30.6→26.7 로 **떨어졌다**
   (스탯은 올랐는데 피로가 곱해져서). 리그 기준이 그 값에 묶여 있어 난이도가 뒤집혔다. */
/* 종목별 정규화 — 종목마다 가중치 구성이 달라 적합도의 '기준선'이 다르다.
   ⚠ 이걸 안 하면 투척 종목 값이 구조적으로 높아, 단거리 선수의 최고 적합 종목이
      포환으로 잡힌다(실측: 50종 중 26종이 그랬다). 화면에 숫자로 보이는 이상 고쳐야 한다.
   전 종 평균이 같아지도록 측정해서 뽑은 계수다. */
const FIT_NORM = {"sprint100":1.041,"sprint200":1.055,"sprint400":1.071,"hurdles110":0.97,
  "run800":1.083,"run1500":1.095,"relay4x100":1.006,"longJump":0.988,"tripleJump":0.969,
  "highJump":0.946,"shotPut":0.956,"discus":0.942,"javelin":0.957,"hammer":0.96};

function eventFit(a, ev){
  const W = {
    sprint100 : { speed:.34, acceleration:.24, rhythm:.18, technique:.12, stamina:.10, power:.02 },
    sprint200 : { speed:.36, acceleration:.18, rhythm:.18, technique:.10, stamina:.16, power:.02 },
    sprint400 : { speed:.28, acceleration:.12, rhythm:.18, technique:.10, stamina:.30, power:.02 },
    hurdles110: { technique:.28, rhythm:.20, speed:.22, acceleration:.14, stamina:.12, power:.04 },
    run800    : { stamina:.44, rhythm:.20, speed:.16, technique:.10, acceleration:.06, power:.04 },
    run1500   : { stamina:.54, rhythm:.20, speed:.10, technique:.10, acceleration:.04, power:.02 },
    relay4x100: { speed:.30, acceleration:.20, technique:.22, rhythm:.18, stamina:.08, power:.02 },
    longJump  : { power:.16, technique:.24, speed:.24, acceleration:.26, stamina:.02, rhythm:.08 },
    tripleJump: { power:.20, technique:.30, speed:.18, acceleration:.24, stamina:.04, rhythm:.04 },
    highJump  : { power:.16, technique:.36, acceleration:.28, speed:.10, rhythm:.08, stamina:.02 },
    /* 포환은 가장 순수한 힘 종목이다. 기술 비중이 높으면 도약형(기술이 높다)이
       포환 최적으로 잡힌다(실측: 캥거루·다람쥐·산양 등 7종). */
    shotPut   : { power:.68, technique:.20, speed:.04, acceleration:.04, rhythm:.02, stamina:.02 },
    discus    : { power:.46, technique:.34, speed:.08, acceleration:.06, rhythm:.04, stamina:.02 },
    javelin   : { power:.42, technique:.30, speed:.14, acceleration:.08, rhythm:.04, stamina:.02 },
    hammer    : { power:.46, technique:.30, speed:.08, acceleration:.06, rhythm:.06, stamina:.04 },
    run5000     : { stamina:.62, rhythm:.18, technique:.10, speed:.06, acceleration:.02, power:.02 },
    walk20k     : { stamina:.58, technique:.22, rhythm:.14, speed:.04, acceleration:.01, power:.01 },
    relay4x400  : { stamina:.34, speed:.22, rhythm:.18, technique:.18, acceleration:.06, power:.02 },
    poleVault   : { technique:.36, power:.26, speed:.20, acceleration:.14, rhythm:.02, stamina:.02 },
    swimFree100 : { technique:.34, power:.24, stamina:.20, rhythm:.16, speed:.04, acceleration:.02 },
    swimBack100 : { technique:.36, power:.22, stamina:.20, rhythm:.16, speed:.04, acceleration:.02 },
    swimBreast100:{ technique:.42, power:.24, stamina:.18, rhythm:.12, speed:.02, acceleration:.02 },
    swimFly100  : { technique:.34, power:.32, stamina:.18, rhythm:.12, speed:.02, acceleration:.02 },
  }[ev.id] || { speed:.2, acceleration:.2, stamina:.2, technique:.2, rhythm:.1, power:.1 };
  let s=0; for(const k of STAT_KEYS) s += a.stats[k]*W[k];
  const bonus = { longJump:'jump', tripleJump:'jump', highJump:'jump', poleVault:'jump',
                  javelin:'throw', hammer:'throw', shotPut:'throw', discus:'throw',
                  hurdles110:'hurdle' }[ev.id];
  if(bonus) s *= 1 + a.eff(bonus)*0.12;
  /* 종의 주 종목 보너스 — 스탯만으로는 설계 의도가 동률에 묻힌다.
     실측: 임팔라(허들 종)의 최고 종목이 높이뛰기로 나왔다(54 대 54).
     '이 종은 이 종목을 위해 만들어졌다'를 수치로 못박는다. */
  if(typeof speciesFavors==='function' && speciesFavors(a, ev.id)) s *= 1.09;
  return s * (FIT_NORM[ev.id] || 1);
}
function eventFitNow(a, ev){ return eventFit(a, ev) * a.formScore(); }

/* ── 클럽 ─────────────────────────────────────────────────── */
class Club {
  constructor(name, seed){
    this.name = name;
    this.year = 1;
    this.program = 'balanced';
    this.squad = [];
    this.records = {};
    this.trophies = [];
    this.budget = MarketTune.startBudget;
    this.reputation = 1;          // 성적으로 오른다 — 후원 수입과 스카우트 질에 영향
    this.rng = makeRng((seed^0x5bf03635)>>>0);
  }
  byId(id){ return this.squad.find(a=>a.id===id); }
  has(a){ return this.squad.includes(a); }
  static newClub(name, seed){
    const c = new Club(name, seed);
    const specs = ['sprint','sprint','sprint','hurdles','endure','endure','jump','jump','throw','throw'];
    for(let i=0;i<specs.length;i++)
      c.squad.push(rollAthlete(c.rng, { spec:specs[i], age:17+((c.rng()*4)|0), tier:0.32+c.rng()*0.34 }));
    return c;
  }
  /* 시즌 종료 — 나이·은퇴·신입 */
  endSeason(rng){
    const out = { retired:[], joined:[] };
    for(const a of this.squad.slice()){
      a.age++;
      a.fatigue = Math.max(0, a.fatigue-40);
      a.condition = clamp(a.condition+12, 30, 100);
      a.injury = null;
      const g = GROWTH[a.growth];
      if(a.age > g.peak + 4 && rng() < 0.30 + (a.age-g.peak-4)*0.16){
        out.retired.push(a);
        this.squad.splice(this.squad.indexOf(a),1);
      }
    }
    while(this.squad.length < 8){
      const a = rollAthlete(rng, { age:17+((rng()*2)|0), tier:0.3+rng()*0.42 });
      this.squad.push(a); out.joined.push(a);
    }
    this.year++;
    return out;
  }
}
