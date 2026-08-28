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

  nextWeek(){
    const S=this.season;
    S.advanceTraining(this.focus);
    this.lastLog = S.weekLog.slice();
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
        v:3, club:this.club, season:{
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
      if(!d || !(d.v===1 || d.v===2 || d.v===3)) return false;
      const c=new Club(d.club.name, 1);
      Object.assign(c, d.club);
      c.squad = d.club.squad.map(o=>Object.assign(new Athlete(o), o));
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
      if(d.season.ended && d.season.endReport){
        S.ended = true; S.endReport = d.season.endReport;
        this.stack=[new SeasonEndScreen(this, S.endReport)];
      } else this.stack=[new OfficeScreen(this)];
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
