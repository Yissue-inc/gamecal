/* ══════════════════════════════════════════════════════════════════
   감독 모드 컨트롤러 — 화면 스택과 주차 진행.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const MG_SAVE = 'wsc_manager_save';

const MG = {
  club:null, season:null, stack:[], focus:{}, lastLog:[], t:0,
  toastMsg:'', toastAt:-1e9,

  newGame(name, seed, nation){
    seed = seed || ((Date.now()^0x1f2e3d4c)>>>0);
    /* ⚠ 클럽은 한 나라를 대표한다. 국가 이름이 클럽 이름이 된다 —
       LA 2028 을 겨냥한 소속감의 출발점. */
    this.nation = nation || this.nation || 'KOR';
    const nm = name || ((typeof nationName==='function' ? nationName(this.nation) : '') + ' 트랙 클럽');
    this.club = Club.newClub(nm, seed, this.nation);
    this.season = new Season(this.club, seed);
    this.season.market = new Market(this.club, seed);
    this.focus = {}; this.lastLog = []; this.stack = [];
    this.push(new OfficeScreen(this));
    this.save();
  },
  push(s){ this.stack.push(s); },
  pop(){ if(this.stack.length>1) this.stack.pop(); },
  replace(s){ this.stack[this.stack.length-1]=s; },
  get top(){ return this.stack[this.stack.length-1]; },
  toast(m){ this.toastMsg=m; this.toastAt=this.t; },

  /* 대회가 끝나면 그 주의 훈련도 처리하고 다음 주로 */
  afterMeet(){
    this.season.entries = {};
    this.nextWeek();
  },

  /* ── 한 주의 결산 ────────────────────────────────────────
     ⚠ 한 주를 넘기는 순간이 이 게임에서 **제일 크게 오르는 순간**인데 조용했다.
        로그에 "○○ 스피드 +1.2" 같은 줄이 세 개 뜨는 게 전부였다.
        육성 화면에서는 포인트 하나에도 +20 이 뜨는데, 정작 한 주치 성장은
        숫자로 안 보인다 — 큰 것이 작은 것보다 안 보이는 건 뒤집힌 것이다.
     그래서 주 넘김 앞뒤로 클럽 경기력을 재고, 누가 제일 자랐는지까지 남긴다. */
  weekSummary: null,
  snapWeek(){
    if(typeof Power==='undefined') return null;
    const m={};
    for(const a of this.club.squad) m[a.id]=Power.statOf(a);
    return { per:m };
  },
  makeWeekSummary(before){
    if(!before || typeof Power==='undefined') return null;
    const rows=[]; let sum=0;
    for(const a of this.club.squad){
      const b=before.per[a.id]; if(b===undefined) continue;   // 이번 주에 들어온 선수
      const d=Power.statOf(a)-b;
      if(d){ rows.push({ name:a.name, d, lv:a.lv }); sum+=d; }
    }
    rows.sort((x,y)=>y.d-x.d);
    /* ⚠ 평균이 아니라 **합계**다. 한 주의 성장은 흐름이지 잔고가 아니다 —
       평균으로 내면 선수가 많을수록 숫자가 작아져서 큰 팀이 손해로 보인다. */
    return { grow: sum, top: rows.slice(0,2) };
  },

  nextWeek(){
    const S=this.season;
    const before = this.snapWeek();
    S.advanceTraining(this.focus);
    /* 도감 — 지금 데리고 있는 종족은 매주 기록한다(대회 전에 은퇴/방출돼도 남게) */
    if(typeof Codex!=='undefined') Codex.bulk(()=>{
      for(const a of this.club.squad) Codex.own(a.species); });
    this.lastLog = S.weekLog.slice();
    this.weekSummary = this.makeWeekSummary(before);
    this.focus = {};
    S.week++;
    if(S.week > SEASON_WEEKS){
      this.stack=[this.seasonEndScreen()];
    } else {
      this.stack=[new OfficeScreen(this)];
    }
    this.save();
  },

  /* 시즌 마감 — **딱 한 번만** 돈다.
     ⚠ 예전엔 SeasonEndScreen 의 생성자가 club.endSeason() 을 불렀다. 화면을 만드는 일이
        은퇴·신인·연차 증가를 일으킨 것이다. 그래서 시즌 종료 화면에서 게임을 껐다 켜면
        (그 시점에 자동 저장된다) 불러오기는 사무소 화면을 띄우고, 다음 주로 넘길 때
        **오프시즌이 한 번 더 돌았다** — 선수가 또 은퇴하고 연차가 2년 뛰었다.
        결과를 시즌에 적어 두고, 화면은 그걸 읽기만 한다. */
  endSeasonOnce(){
    const S=this.season;
    if(S.ended) return S.endReport;
    const res = this.club.endSeason(S.rng);
    S.ended = true;
    S.endReport = {
      grade: S.gradeSeason ? S.gradeSeason() : null,
      points: S.points, medals: S.medals, year: S.year, olympic: !!S.isOlympicYear,
      retired: res.retired.map(a=>({name:a.name, age:a.age, overall:a.overall})),
      joined:  res.joined.map(a=>({name:a.name, age:a.age, overall:a.overall, potOverall:a.potOverall})),
    };
    return S.endReport;
  },
  seasonEndScreen(){ return new SeasonEndScreen(this, this.endSeasonOnce()); },

  /* ── 직접 뛸 종목 처리 ───────────────────────────────────
     대회는 이미 다 시뮬레이션돼 있다(runMeet). '직접'으로 표시한 종목만
     차례로 아케이드로 넘겨, 끝나면 **손놀림 품질만큼 기록을 당기거나 민다.**
     ⚠ 시뮬레이션 결과를 통째로 갈아치우지 않는다 — 그러면 선수 스탯이 의미를 잃는다. */
  MANUAL_SWING: 0.04,          // 잘 치면 4% 당기고 못 치면 4% 민다
  runManualQueue(meet, done){
    const S=this.season;
    const list = (meet.events||[]).filter(e =>
      S.manualEvents && S.manualEvents[e.ev.id] &&
      e.rows.some(r=>this.club.has(r.athlete)));
    let i=0;
    const next = ()=>{
      if(i >= list.length){ done(); return; }
      const slot = list[i++];
      /* 스킬 — 이 종목에 나가는 우리 선수 중 **가장 앞선 한 명**의 창을 쓴다.
         ⚠ 수동은 선수 스탯을 안 쓰므로 여기서 켜 주지 않으면 스킬을 배운 선수와
            안 배운 선수가 직접 뛸 때 완전히 똑같다(=스킬이 반쪽만 산다). */
      const mine = slot.rows.filter(r=>this.club.has(r.athlete)).map(r=>r.athlete);
      if(typeof MANUAL!=='undefined') MANUAL.begin(mine[0]);
      G.playForManager(slot.ev, (res, quality)=>{
        if(typeof MANUAL!=='undefined') MANUAL.end();
        this.applyManual(slot, quality);
        next();
      });
    };
    next();
  },
  applyManual(slot, quality){
    const q = (typeof quality==='number') ? clamp(quality,0,1) : 0.5;
    const swing = (q - 0.5) * 2 * this.MANUAL_SWING;     // -0.04 ~ +0.04
    const ev = slot.ev;
    for(const r of slot.rows){
      if(!this.club.has(r.athlete)) continue;
      r.manual = true; r.manualQ = q;
      if(!(r.value>0) || r.value>=DNF) continue;
      /* 높을수록 좋은 종목은 올리고, 낮을수록 좋은 종목은 내린다 */
      r.value = +(ev.higher ? r.value*(1+swing) : r.value*(1-swing)).toFixed(3);
    }
    /* 순위를 다시 매긴다 — 내 기록이 바뀌었으니 등수도 바뀔 수 있다 */
    slot.rows.sort((a,b)=> ev.higher ? b.value-a.value : a.value-b.value);
    slot.rows.forEach((r,k)=>{ r.rank=k+1; });
  },

  update(dt){
    this.t += dt*1000;
    const top=this.top;
    if(top) top.update(this.t);
    Input.flush();
  },
  draw(ctx, u){
    ctx.fillStyle='#0a0d16'; ctx.fillRect(0,0,VW,VH);
    const top=this.top; if(!top) return;
    if(top.draw && top.drawUI){ top.draw(ctx); top.drawUI(u); }     // 관전 화면
    else {
      this.bg(ctx);
      top.draw(u);
    }
    if(this.t - this.toastAt < 1700){
      const a=1-(this.t-this.toastAt)/1700;
      u.save(); u.globalAlpha=a;
      plate(u, VW/2-95, VH-40, 190, 18, .88);
      txt(u, this.toastMsg, VW/2, VH-36, 10, PAL.gold, 'center'); u.restore();
    }
  },
  /* 메뉴 뒤 배경.
     ⚠ 0.80 덮개로는 부족했다 — 트랙 레인 번호가 글자 사이로 비쳐 목록이 안 읽혔다(실측).
        경기장은 상단 띠에만 남기고 본문은 불투명 판으로 덮는다. */
  bg(ctx){
    /* ⛔ 이 칠은 **불투명**하다 — 게임 레이어를 통째로 덮으므로 그 아래 BG(HD) 레이어에
       그린 것은 전부 사라진다. 화면이 BG.fill 로 배경을 깔아 놓고도 안 보이는 사고가
       이 코드베이스에서 세 번째다(볼트 어셋 3종 · 홀 바닥 · 이번 bg-office).
       실측: MasterScreen 이 bg-office 를 BG 에 그리고 있었고 픽셀에도 남아 있었지만
       (21,15,12 = 사무실의 갈색) 화면은 (22,21,34) 단색이었다.
       그래서 화면이 hdBg 를 들고 있고 그 그림이 **실제로 그려졌으면** 이 칠을 건너뛴다.
       ⚠ 대신 글자가 읽히도록 반투명 어둠막만 얹는다 — 메뉴는 읽는 화면이다. */
    const top = this.stack[this.stack.length-1];
    if(top && top.hdBg && typeof BG!=='undefined' && BG.fill
       && BG.fill(BG.ctx(), top.hdBg, 0, VH)){
      ctx.clearRect(0,0,VW,VH);
      ctx.fillStyle = 'rgba(6,9,18,' + (top.hdBgDim!==undefined ? top.hdBgDim : 0.62) + ')';
      ctx.fillRect(0,0,VW,VH);
      return;
    }
    /* 관중 텍스처를 띠로 남겼더니 주차 스트립 뒤에서 잡음처럼 보였다 — 통째로 뺀다.
       메뉴는 읽는 화면이다. 분위기는 아주 옅은 트랙 모티프로만 준다. */
    const g=ctx.createLinearGradient(0,0,0,VH);
    g.addColorStop(0,'#101728'); g.addColorStop(0.35,'#0c1120'); g.addColorStop(1,'#070a11');
    ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle='rgba(168,72,44,.055)';
    const off=(this.t*0.008)%36;
    for(let y=52; y<VH; y+=36) ctx.fillRect(0, y-off, VW, 18);
    ctx.fillStyle='rgba(255,215,94,.10)'; ctx.fillRect(0,45,VW,1);
  },

  /* ── 저장 ── */
  save(){
    try{
      /* ⚠ 시즌에서 저장하던 건 연차·주차·승점·메달뿐이었다. 불러오면 **리그 순위표·시즌
         목표·국가 메달표가 통째로 사라져** 시즌 중간에 판이 리셋된 것처럼 보인다.
         화면에 보이는 것은 전부 저장한다. */
      localStorage.setItem(MG_SAVE, JSON.stringify({
        v:5, seen:Date.now(), club:this.club, season:{
          year:this.season.year, week:this.season.week,
          points:this.season.points, medals:this.season.medals,
          results:this.season.results.length,
          leagueTable:this.season.leagueTable || null,
          goal:this.season.goal || null,
          nationMedals:this.season.nationMedals || null,
          entries:this.season.entries || {},
          ended:!!this.season.ended, endReport:this.season.endReport || null,
        },
      }));
    }catch(e){}
  },
  hasSave(){ try{ return !!localStorage.getItem(MG_SAVE); }catch(e){ return false; } },
  load(){
    try{
      const d=JSON.parse(localStorage.getItem(MG_SAVE));
      /* v1 세이브도 계속 열린다 — 없던 항목은 새로 만든다 */
      if(!d || !(d.v>=1 && d.v<=5)) return false;
      const c=new Club(d.club.name, 1);
      Object.assign(c, d.club);
      c.squad = d.club.squad.map(o=>Object.assign(new Athlete(o), o));
      /* 육성 층(46_rpg) — 선수에 붙는 값은 선수와 함께 직렬화된다(Object.assign 이
         lv·xp·tp·equip 를 그대로 옮긴다). 이 층을 모르던 옛 세이브(v1~v3)는
         값이 없으므로 기본값을 채워 준다 — 그래야 Lv1 부터 시작한다. */
      if(typeof RPG!=='undefined') for(const a of c.squad) RPG.ensure(a);
      c.inventory = d.club.inventory || [];
      c.coaches = d.club.coaches || [];   // 코치(49_depth) — 없던 세이브는 빈 배열
      c.hall    = d.club.hall || [];      // 명예의 전당 — 세대를 잇는 기록
      c.rng = makeRng((Date.now()^0x77)>>>0);
      this.club=c;
      const S=new Season(c, (Date.now()^0x99)>>>0);
      S.market=new Market(c, (Date.now()^0xab)>>>0);
      S.year=d.season.year; S.week=d.season.week; S.points=d.season.points; S.medals=d.season.medals;
      if(d.season.leagueTable) S.leagueTable=d.season.leagueTable;
      if(d.season.goal) S.goal=d.season.goal;
      if(d.season.nationMedals) S.nationMedals=d.season.nationMedals;
      if(d.season.entries) S.entries=d.season.entries;
      this.season=S; this.focus={}; this.lastLog=[];
      /* 시즌이 이미 끝난 상태로 저장됐으면 **그 화면으로 돌아간다** — 사무소를 띄우면
         플레이어는 평가를 못 보고, 다음 주로 넘기는 순간 오프시즌이 두 번 돈다. */
      /* 방치 정산 — 자리를 비운 동안 선수들이 훈련했다.
         ⚠ 주차는 안 흐른다(대회를 건너뛰면 안 된다). 경험치만 준다. */
      /* 아케이드만 하다가 클럽을 만든 사람의 밀린 일일 보상 */
      if(typeof Daily!=='undefined') Daily.drainPending(c);
      if(typeof RPG!=='undefined' && d.seen){
        this.idleReport = RPG.settleIdle(c, d.seen, Date.now());
      }
      if(d.season.ended && d.season.endReport){
        S.ended = true; S.endReport = d.season.endReport;
        this.stack=[new SeasonEndScreen(this, S.endReport)];
      } else this.stack=[new OfficeScreen(this)];
      /* 자리를 비운 동안 번 것을 먼저 보여 준다 */
      if(this.idleReport && this.idleReport.per>0 && typeof IdleReturnScreen!=='undefined')
        this.stack.push(new IdleReturnScreen(this, this.idleReport));
      return true;
    }catch(e){ return false; }
  },
};

/* ── 시즌 종료 ───────────────────────────────────────────── */
class SeasonEndScreen extends Screen0 {
  constructor(mg, rep){
    super(mg);
    /* ⚠ 평가를 승점 절대값으로 매기면 클럽이 커질수록 저절로 S 가 된다.
       **시즌 시작에 받은 목표**를 넘겼는지로 매긴다 — 감독을 평가하는 것이다. */
    if(!rep) throw new Error('SeasonEndScreen: 시즌 마감 보고서 없이 열 수 없다 (MG.seasonEndScreen 을 쓸 것)');
    this.report = rep.grade;
    this.res = { retired: rep.retired, joined: rep.joined };
    this.pts = rep.points; this.medals = rep.medals;
    this.year = rep.year;
    this.olympic = rep.olympic;
    this.grade = this.report
      ? ({good:'S', ok:'B', bad:'D'})[this.report.grade]
      : (this.pts>=200?'S' : this.pts>=140?'A' : this.pts>=90?'B' : this.pts>=50?'C':'D');
    Sfx.record();
  }
  update(now){
    if(Input.pressed('action')){
      const seed=(Date.now()^0x3c5f)>>>0;
      const prevMarket = this.mg.season.market;
      this.mg.season = startNextSeason(this.mg.club, seed);  // 연차는 이 함수 안에서만 오른다
      this.mg.season.market = prevMarket || new Market(this.mg.club, seed);
      this.mg.focus={}; this.mg.lastLog=[];
      this.mg.stack=[new OfficeScreen(this.mg)];
      this.mg.save(); Sfx.ui();
    }
  }
  draw(u){
    UI.header(u, `${this.year}년차 시즌 종료`, this.mg.club.name);
    txt(u,'평가',VW/2,30,9,PAL.dim,'center');
    txt(u,this.grade,VW/2,40,30, this.grade==='S'?PAL.gold:this.grade==='D'?PAL.red:PAL.green,'center',700);
    txt(u,`승점 ${this.pts}  ·  금 ${this.medals.gold} 은 ${this.medals.silver} 동 ${this.medals.bronze}`,
        VW/2,72,11,PAL.white,'center');
    if(this.report){
      const g=this.report.goal;
      txt(u,`목표 승점 ${g.points} · 금 ${g.gold}`, VW/2, 86, 9, PAL.dim, 'center');
    }
    if(this.olympic) txt(u, olympicName(this.year)+' 해', VW/2, 20, 10, PAL.gold, 'center', 700);
    let y=100;
    if(this.res.retired.length){
      txt(u,'은퇴',12,y,9,PAL.dim); y+=11;
      for(const a of this.res.retired){ txt(u,`${a.name} (${a.age}세) — OVR ${a.overall}`,20,y,10,'#ffa04c'); y+=12; }
      y+=4;
    }
    if(this.res.joined.length){
      txt(u,'신입',12,y,9,PAL.dim); y+=11;
      for(const a of this.res.joined){
        txt(u,`${a.name} (${a.age}세) — OVR ${a.overall} / 잠재 ${a.potOverall}`,20,y,10,PAL.green); y+=12;
      }
    }
    UI.footer(u,'확인 다음 시즌 시작');
  }
}
