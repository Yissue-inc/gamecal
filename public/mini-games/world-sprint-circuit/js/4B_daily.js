/* ══════════════════════════════════════════════════════════════════
   일일 도전 — 다시 켤 이유

   ⚠ 지금 이 게임에는 **다시 할 이유가 없다.** 자기 최고 기록을 깨는 것 말고는.
      기록 게임에서 그건 며칠이면 마른다.

   방치형·육성물이 매일 열리는 이유는 '오늘 것'이 있기 때문이다.
     · 오늘의 종목 3개 — **모두에게 같다**(날짜가 시드다)
     · 한 번만 도전한다. 다시 하려면 내일
     · 합산 점수 → 코인 + 경험치. 육성 순환에 그대로 들어간다

   ⛔ 기존 종목·판정·기록은 한 줄도 안 바꾼다. 아케이드를 그대로 쓰고
      결과만 모은다. 이 파일을 지우면 예전 그대로다.

   ⚠ 날짜는 **현지 자정** 기준이다. UTC 로 하면 한국에서 오전 9시에 바뀐다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const Daily = {
  KEY: 'wsc_daily',

  /* 오늘이 며칠인가 — 현지 기준 YYYYMMDD 정수 */
  today(){
    const d=new Date();
    return d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
  },
  /* 날짜에서 뽑는 고정 난수 — 같은 날이면 누구에게나 같은 종목이 나온다 */
  rngOf(day, salt){
    let h = (day ^ 0x9e3779b9) >>> 0;
    for(let i=0;i<(salt||0)+3;i++) h = (h*1664525 + 1013904223) >>> 0;
    return ()=>{ h = (h*1664525 + 1013904223) >>> 0; return h/4294967296; };
  },

  /* 오늘의 종목 3개 — 아케이드에서 실제로 뛸 수 있는 것만 */
  events(day){
    day = day || this.today();
    const pool = (typeof EVENTS!=='undefined' ? EVENTS : [])
      .filter(e => typeof READY==='undefined' || READY.includes(e.id))
      /* 복합·철인은 한 판이 너무 길다 — 매일 하는 것에는 안 맞는다 */
      .filter(e => !['decathlon','heptathlon','pentathlon','triathlon','marathon','walk20k'].includes(e.id));
    if(!pool.length) return [];
    const rng=this.rngOf(day, 1);
    const picked=[], used=new Set();
    let guard=0;
    while(picked.length<3 && guard++<200){
      const e=pool[(rng()*pool.length)|0];
      if(used.has(e.id)) continue;
      used.add(e.id); picked.push(e);
    }
    return picked;
  },

  /* ── 저장 ────────────────────────────────────────────────
     { day, marks:{evId:value}, done:bool, claimed:bool } */
  load(){
    try{
      const d=JSON.parse(localStorage.getItem(this.KEY));
      if(d && d.day===this.today()) return d;
    }catch(e){}
    return { day:this.today(), marks:{}, done:false, claimed:false };
  },
  save(d){ try{ localStorage.setItem(this.KEY, JSON.stringify(d)); }catch(e){} },

  /* 한 종목을 마쳤다 — 성공한 기록만 담는다 */
  record(evId, value, status){
    const d=this.load();
    if(d.claimed) return d;                       // 이미 받았으면 잠근다
    if(d.marks[evId]!==undefined) return d;       // 한 종목 한 번
    d.marks[evId] = (status==='OK'||status==='MISSED_QUALIFY') ? value : null;
    const evs=this.events();
    d.done = evs.every(e=>d.marks[e.id]!==undefined);
    this.save(d);
    return d;
  },
  /* 아직 안 한 종목인가 */
  pending(evId){
    const d=this.load();
    return !d.claimed && this.events().some(e=>e.id===evId) && d.marks[evId]===undefined;
  },

  /* ── 점수 ────────────────────────────────────────────────
     종목마다 기준기록 대비 몇 %인지로 환산해 더한다.
     ⚠ 종목이 시간·거리·점수로 제각각이라 그냥 더할 수 없다 — 기준이 자를 준다.
        기준을 정확히 맞추면 1000점, 잘하면 그 이상. */
  scoreOf(ev, value){
    if(value===null || value===undefined) return 0;
    if(!(value>0) && !ev.higher){
      /* ⚠ '낮을수록 좋은' 종목 중에 0이 최고인 것이 있다(승마 벌점 0 · 골프 par).
         q/value 를 그대로 쓰면 0으로 나눠 무한대가 된다. 만점으로 친다. */
      return 2500;
    }
    const q=ev.qualify;
    if(!(q>0)) return 0;
    const ratio = ev.higher ? value/q : q/value;
    /* 상한 — 한 종목이 합계를 통째로 지배하면 '3종목'이 아니게 된다 */
    return Math.max(0, Math.min(2500, Math.round(ratio*1000)));
  },
  total(d){
    d = d || this.load();
    let s=0;
    for(const e of this.events()) s += this.scoreOf(e, d.marks[e.id]);
    return s;
  },

  /* ── 보상 ────────────────────────────────────────────────
     점수를 코인과 경험치로. 방치·대회와 같은 통로로 들어간다. */
  reward(d){
    const t=this.total(d);
    return { coin: Math.round(t/18), xp: t*4 };
  },
  /* 받는다 — 감독 모드가 있으면 클럽에, 없으면 다음에 열 때 준다 */
  claim(club){
    const d=this.load();
    if(!d.done || d.claimed) return null;
    const r=this.reward(d);
    if(club){
      club.budget = +((club.budget||0) + r.coin).toFixed(1);
      if(typeof RPG!=='undefined')
        for(const a of (club.squad||[])){ RPG.ensure(a); RPG.award(a, r.xp/Math.max(1,club.squad.length), '일일 도전'); }
    } else {
      /* 아케이드만 하는 사람 — 다음에 클럽을 만들면 그때 받도록 남겨 둔다 */
      try{ localStorage.setItem('wsc_daily_pending', JSON.stringify(r)); }catch(e){}
    }
    d.claimed=true; this.save(d);
    return r;
  },
  /* 클럽을 처음 열 때 밀린 보상이 있으면 준다 */
  drainPending(club){
    try{
      const raw=localStorage.getItem('wsc_daily_pending'); if(!raw) return null;
      const r=JSON.parse(raw); localStorage.removeItem('wsc_daily_pending');
      if(!club || !r) return null;
      club.budget = +((club.budget||0) + (r.coin||0)).toFixed(1);
      if(typeof RPG!=='undefined')
        for(const a of (club.squad||[])){ RPG.ensure(a); RPG.award(a, (r.xp||0)/Math.max(1,club.squad.length), '일일 도전'); }
      return r;
    }catch(e){ return null; }
  },

  /* 연속 도전 일수 — 매일 오는 이유를 하나 더 */
  streak(){
    try{
      const s=JSON.parse(localStorage.getItem('wsc_daily_streak')) || { day:0, n:0 };
      return s;
    }catch(e){ return { day:0, n:0 }; }
  },
  bumpStreak(){
    const s=this.streak(), t=this.today();
    if(s.day===t) return s;
    /* 어제였으면 잇고, 아니면 1부터 */
    const d=new Date(); d.setDate(d.getDate()-1);
    const y=d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
    const n = (s.day===y) ? s.n+1 : 1;
    const out={ day:t, n };
    try{ localStorage.setItem('wsc_daily_streak', JSON.stringify(out)); }catch(e){}
    return out;
  },
};
