/* ══════════════════════════════════════════════════════════════════
   대회 — 출전표 → 경기 관전 → 결과.
   감독은 경기 중에 조작하지 않는다. 이미 다 끝난 준비를 지켜볼 뿐이다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* ── 출전표 ─────────────────────────────────────────────── */
class EntryScreen extends Screen0 {
  constructor(mg){
    super(mg);
    const S=mg.season;
    if(!S.entries || !Object.keys(S.entries).length) S.entries = S.autoEntries();
    this.events = S.meetEvents();
  }
  get info(){
    /* 대회 주가 아니면 meetKind 가 null 이라 여기서 undefined.name 으로 죽는다.
       지금은 OfficeScreen 이 isMeetWeek 로 막고 있지만, 막이 하나 걷히면
       '무엇이 undefined 인지' 모를 오류만 남는다 — 무엇이 틀렸는지 말하게 한다. */
    const i = MEET_INFO[this.mg.season.meetKind];
    if(!i) throw new Error('출전표는 대회 주에만 연다 (지금 '+this.mg.season.week+'주차)');
    return i;
  }
  /* ⚠ '경기 시작' 을 목록 **맨 뒤**에 뒀더니 한 화면(7줄)에 안 들어왔다 — 지역대회가
     딱 7종목이라 시작 버튼이 스크롤 아래로 숨었고, 올림픽(종목 15개)에서는 훨씬 멀다.
     시작하는 법을 찾으려고 스크롤해야 하는 화면은 잘못된 화면이다. 앞으로 옮긴다. */
  get rows(){
    const S=this.mg.season;
    const head = [
      { label:'▶ 경기 시작', sub:'출전표를 확정하고 경기를 본다', color:PAL.green, right:'!' },
      { label:'자동 편성', sub:'컨디션과 적합도로 자동으로 짠다', right:'↻' },
    ];
    const r = this.events.map(ev=>{
      const ids=S.entries[ev.id]||[];
      const names=ids.map(id=>{ const a=this.mg.club.byId(id); return a? `${a.speciesName} ${a.name}` : '?'; });
      const bad = ids.some(id=>{ const a=this.mg.club.byId(id); return !a || !a.available; });
      /* ⚠ 계주의 분모까지 대회 인원 제한(2)을 쓰고 있었다 — 화면에 '4 / 2' 가
         초록색으로 떠서 규칙을 어긴 것처럼 보였다. 팀 종목은 구간 수가 정원이다. */
      const cap = (typeof isTeamEvent==='function' && isTeamEvent(ev)) ? ev.legs : this.info.entries;
      /* 직접 뛸 종목 표시 — 아케이드로 넘어가 손으로 뛴다(경험치 1.6배) */
      const man = !!(S.manualEvents && S.manualEvents[ev.id]);
      const playable = (typeof READY!=='undefined') && READY.includes(ev.id);
      return { label:(man?'▶ ':'')+ev.name,
        sub: (man? '직접 뛴다 · ' : '') + (names.length? names.join(', ') : '출전 없음'),
        right:`${ids.length} / ${cap}`,
        color: man?PAL.gold:undefined,
        rightColor: bad?PAL.red : ids.length?PAL.green:PAL.dim,
        _ev:ev, _playable:playable };
    });
    return head.concat(r);
  }
  confirm(){
    const S=this.mg.season;
    if(this.sel === 0){                            // 경기 시작
      const any = this.events.some(ev=>(S.entries[ev.id]||[]).length);
      if(!any){ this.mg.toast('출전 선수가 없습니다'); Sfx.fail(); return; }
      // 부상 선수 제거
      for(const ev of this.events)
        S.entries[ev.id]=(S.entries[ev.id]||[]).filter(id=>{ const a=this.mg.club.byId(id); return a&&a.available; });
      const meet = S.runMeet();
      /* '직접'으로 표시한 종목이 있으면 먼저 뛴다. 없으면 예전 그대로 관전으로. */
      const anyManual = S.manualEvents && meet.events.some(e=>S.manualEvents[e.ev.id]);
      if(anyManual){
        this.mg.runManualQueue(meet, ()=>{
          this.mg.stack=[new MeetWatchScreen(this.mg, meet)];
        });
        return;
      }
      this.mg.replace(new MeetWatchScreen(this.mg, meet));
      return;
    }
    if(this.sel === 1){ S.entries=S.autoEntries(); Sfx.ui(); this.mg.toast('자동 편성했습니다'); return; }
    this.mg.push(new PickEntryScreen(this.mg, this.events[this.sel-2]));
  }
  cancel(){ this.mg.pop(); }
  /* ◀▶ 로 그 종목을 직접 뛸지 정한다 — 목록을 떠나지 않고 바꿀 수 있어야 한다 */
  update(now){
    const S=this.mg.season;
    if(this.sel>=2 && (Input.pressed('left')||Input.pressed('right'))){
      const ev=this.events[this.sel-2];
      if(ev && (typeof READY==='undefined' || READY.includes(ev.id))){
        S.manualEvents = S.manualEvents || {};
        S.manualEvents[ev.id] = !S.manualEvents[ev.id];
        Sfx.ui();
        this.mg.toast(S.manualEvents[ev.id] ? '직접 뜁니다 (경험치 1.6배)' : '자동으로 처리합니다');
      } else Sfx.fail();
      return;
    }
    super.update(now);
  }
  draw(u){
    const S=this.mg.season;
    UI.header(u, this.info.name, `${S.week}주차 · 종목당 ${this.info.entries}명`);
    /* ⚠ 1인 출전 상한은 화면에 없으면 '왜 종목이 비어 있지?' 로만 보인다.
       몇 종목을 덮었는지, 누가 상한에 걸렸는지 여기서 보여 준다. */
    const load=S.entryLoad(S.entries);
    const covered=this.events.filter(ev=>(S.entries[ev.id]||[]).length).length;
    const maxed=Object.values(load).filter(v=>v>=MAX_EVENTS_PER_ATHLETE).length;
    txt(u,`출전 ${covered} / ${this.events.length}종목 · 1인 최대 ${MAX_EVENTS_PER_ATHLETE}종목`
        + (maxed? ` · ${maxed}명이 꽉 찼다` : ''),
        8, 27, 9, covered<this.events.length*0.4? PAL.gold : PAL.dim);
    UI.list(u, this.rows, this.sel, 8, 40, VW-16, 24, 7);
    UI.footer(u,'확인 선택 · ◀▶ 직접/자동 · 취소 돌아가기');
  }
}

class PickEntryScreen extends Screen0 {
  constructor(mg, ev){
    super(mg); this.ev=ev;
    this.cands = mg.club.squad.slice().sort((a,b)=>eventFitNow(b,this.ev)-eventFitNow(a,this.ev));
  }
  get chosen(){ return this.mg.season.entries[this.ev.id] || (this.mg.season.entries[this.ev.id]=[]); }
  /* ⚠ 정원을 대회 인원 제한 하나로만 봤다 — 계주는 4명이 필요한데 손으로 편집하면
     2명에서 막혔고, 그 상태로 대회를 열면 **계주가 조용히 빠졌다**(runRelay 가
     인원 미달로 return). 팀 종목의 정원은 구간 수다. */
  get cap(){
    return (typeof isTeamEvent==='function' && isTeamEvent(this.ev))
      ? this.ev.legs : MEET_INFO[this.mg.season.meetKind].entries;
  }
  get rows(){
    const max=this.cap;
    return this.cands.map(a=>{
      const on=this.chosen.includes(a.id);
      const fit=eventFitNow(a,this.ev);
      const pb=a.best[this.ev.id];
      const fav = (typeof speciesFavors==='function') && speciesFavors(a, this.ev.id);
      return { label:(on?'● ':'○ ')+`${a.speciesName} ${a.name}`+(fav?' ★':'')+(a.injury?' (부상)':''), nation:a.nation,
        sub:`적합 ${Math.round(fit)} · 컨디션 ${UI.condName(a.condition)} · 피로 ${Math.round(a.fatigue)}`,
        right: pb!==undefined ? fmtRec(this.ev, pb) : '기록 없음',
        rightColor: pb!==undefined?PAL.gold:PAL.dim,
        color: a.injury?PAL.red:(on?PAL.green:PAL.white), dim:!a.available };
    }).concat([{label:`— 확정 (${this.chosen.length}/${max})`, color:PAL.blue}]);
  }
  confirm(){
    const max=this.cap;
    if(this.sel>=this.cands.length){ this.mg.pop(); return; }
    const a=this.cands[this.sel];
    if(!a.available){ this.mg.toast('부상 중인 선수는 출전할 수 없습니다'); Sfx.fail(); return; }
    const i=this.chosen.indexOf(a.id);
    if(i>=0) this.chosen.splice(i,1);
    else { if(this.chosen.length>=max){ this.mg.toast(`이 종목은 ${max}명까지`); Sfx.fail(); return; } this.chosen.push(a.id); }
    Sfx.ui();
  }
  draw(u){
    UI.header(u, this.ev.name, `기준 ${fmtRec(this.ev, this.ev.qualify)}`);
    txt(u,'적합도는 컨디션까지 반영한 값입니다',8,27,9,PAL.dim);
    UI.list(u,this.rows,this.sel,8,40,VW-16,24,7);
    UI.footer(u,'확인 선택/해제   취소 돌아가기');
  }
}

/* ── 경기 관전 ───────────────────────────────────────────── */
/* 시뮬레이션 결과는 이미 확정돼 있다. 화면은 그 결과를 '재생'한다.
   ⚠ 화면에서 다시 굴리면 결과와 화면이 어긋난다 — 반드시 같은 값을 쓴다. */
class MeetWatchScreen extends Screen0 {
  constructor(mg, meet){
    super(mg); this.meet=meet; this.idx=0; this.t=0;
    this.startEvent();
  }
  startEvent(){
    const e=this.meet.events[this.idx];
    if(!e){ this.mg.replace(new MeetResultScreen(this.mg, this.meet)); return; }
    // ⚠ this.rows 로 두면 Screen0 의 getter 와 충돌해 TypeError 가 난다(실측: 경기 시작이 통째로 안 됐다)
    this.ev=e.ev; this.results=e.rows; this.t=0; this.phase='INTRO';
    this.isTrack = !this.ev.higher;
    if(this.isTrack){
      // 트랙: 확정된 기록으로 역산해 달리게 한다
      this.lanes = this.results.slice(0,3).map((r,i)=>({
        row:r, lane:i, dist:0,
        // 총 시간 안에 종목 거리를 달리는 평균 속도 + 약간의 페이스 곡선
        total: (r.res.falseStart||r.res.dnf) ? null : r.value,
      }));
      // 우리 선수가 안 보이면 밀어 넣는다
      const mineIdx = this.results.findIndex(r=>this.mg.club.has(r.athlete));
      if(mineIdx>=3){ this.lanes[2]={ row:this.results[mineIdx], lane:2, dist:0,
        total:(this.results[mineIdx].res.falseStart||this.results[mineIdx].res.dnf)?null:this.results[mineIdx].value }; }
      this.raceT=0;
      this.maxT=Math.max(...this.lanes.map(l=>l.total||0), 1);
    } else {
      this.attempt=0; this.attemptT=0;
      this.mineRow = this.results.find(r=>this.mg.club.has(r.athlete)) || this.results[0];
    }
    Sfx.crowd(0.4);
  }
  update(now){
    const dt=1/60;
    this.t += dt;
    if(Input.pressed('action')){
      if(this.phase==='DONE'){ this.idx++; this.startEvent(); return; }
      this.phase='DONE';            // 건너뛰기
    }
    if(Input.pressed('back')){ this.mg.replace(new MeetResultScreen(this.mg, this.meet)); return; }
    if(this.phase==='INTRO' && this.t>1.1){ this.phase='RUN'; this.t=0; Sfx.gun(); }
    if(this.phase!=='RUN') return;

    if(this.isTrack){
      this.raceT += dt*1.35;                       // 조금 빠르게 보여준다
      let allDone=true;
      for(const l of this.lanes){
        if(l.total===null) continue;
        const p=clamp(this.raceT/l.total,0,1);
        // 페이스 곡선 — 초반 가속, 후반 유지
        l.dist = this.ev.distanceM * (p<0.18 ? (p/0.18)*0.18*0.72 : 0.1296 + (p-0.18)/0.82*0.8704);
        if(p<1) allDone=false;
      }
      Sfx.crowd(clamp(this.raceT/this.maxT,0,1));
      if(allDone || this.raceT > this.maxT+0.4){ this.phase='DONE'; Sfx.finish(); }
    } else {
      this.attemptT += dt;
      if(this.attemptT > 1.2){
        this.attemptT=0; this.attempt++;
        const m=this.mineRow.res.marks && this.mineRow.res.marks[this.attempt-1];
        m===null ? Sfx.fail() : Sfx.beep(1046,0.16,'square',0.13);
        if(this.attempt>=3){ this.phase='DONE'; Sfx.finish(); }
      }
    }
  }
  draw(ctx){
    /* ⚠ 예전엔 전 종목을 같은 트랙으로 그렸다 — 수영도 던지기도 붉은 트랙 위였다.
       종목마다 무대를 바꾼다(Venue). 아케이드와 같은 무대를 쓴다. */
    const venue = Venue.kindOf(this.ev);
    const t = this.t*1000;
    this._hd = [];

    if(venue==='track'){
      const camM = Math.max(0, Math.max(...this.lanes.map(l=>l.dist)) - VW*0.16*0.34);
      const V = Venue.track(ctx, camM, 0.16, this.ev);
      const col=['#5aaaff','#ffd75e','#ff6b8a'];
      this.lanes.forEach((l,i)=>{
        const y=V.lanes[i], x=V.toX(l.dist);
        if(x<-24||x>VW+24) return;
        let ry=y, air=false;
        if(this.ev.id==='hurdles110'){
          for(let k=0;k<RULES.hurdleCount;k++){
            const m=RULES.hurdleFirstM+k*RULES.hurdleSpacingM, d=l.dist-m;
            if(d>-1.1&&d<1.1){ air=true; ry-=Math.cos(d/1.1*Math.PI/2)*15; break; }
          }
        }
        this.pushChar(l.row.athlete, x, ry, (this.raceT*4.2+i*0.3)%1, {airborne:air, moving:true, t});
      });
      return;
    }

    if(venue==='pool'){
      const V = Venue.pool(ctx, t, this.ev);
      this.lanes.forEach((l,i)=>{
        const y=V.lanes[i], x=V.toX(Math.min(l.dist, this.ev.distanceM));
        this.pushChar(l.row.athlete, x, y+6, (this.raceT*3.2+i*0.3)%1, {swim:true, moving:true, t});
        /* 물보라 */
        ctx.fillStyle='rgba(255,255,255,.32)';
        for(let k=0;k<3;k++) ctx.fillRect(x-12-k*5, y-2+Math.sin((this.raceT*6+k))*3, 2, 2);
      });
      return;
    }

    if(venue==='throwField'){
      const V = Venue.throwField(ctx, t, this.ev);
      const m = this.mineRow;
      const best = Math.max(this.ev.qualify*1.3, ...(m.res.marks||[]).filter(v=>v!==null));
      /* 지금까지의 기록을 땅에 꽂아 둔다 */
      (m.res.marks||[]).slice(0, Math.min(this.attempt,3)).forEach((v,k)=>{
        if(v===null){ ctx.fillStyle=PAL.red; ctx.fillRect(V.cx-4, V.ground-10-k*6, 5, 5); return; }
        const x=V.toX(v);
        ctx.fillStyle = v===m.res.best ? PAL.gold : 'rgba(255,255,255,.55)';
        ctx.fillRect(x-1, V.ground-12, 2, 12);
      });
      /* 날아가는 기구 */
      if(this.phase==='RUN' && this.attempt<3){
        const v=(m.res.marks||[])[this.attempt];
        const p=clamp(this.attemptT/1.2,0,1);
        if(v!==null && v!==undefined){
          const x=V.toX(v*p), y=V.ground-8-Math.sin(p*Math.PI)*46;
          if(!Art.blit(ctx, this.ev.id==='javelin'?'javelin':'hammer', x, y, 'center')){
            ctx.fillStyle=PAL.gold; ctx.fillRect(x-2,y-2,4,4); }
        }
      }
      this.pushChar(m.athlete, V.cx, V.ground, 0.25, {throwing:true, t});
      return;
    }

    if(venue==='runway'){
      const V = Venue.runway(ctx, RULES.boardPositionM-24, 0.16, this.ev);
      const m = this.mineRow;
      const best=(m.res.marks||[]).filter(v=>v!==null);
      best.forEach((v,k)=>{
        const x=V.toX(RULES.boardPositionM+v);
        ctx.fillStyle = v===m.res.best?PAL.gold:'rgba(255,255,255,.5)';
        ctx.fillRect(x-1, V.ground-10-k*5, 2, 9);
      });
      if(this.phase==='RUN' && this.attempt<3){
        const v=(m.res.marks||[])[this.attempt];
        const p=clamp(this.attemptT/1.2,0,1);
        if(v!==null && v!==undefined){
          const x=V.toX(RULES.boardPositionM+v*p);
          const y=V.ground - Math.sin(p*Math.PI)*30;
          this.pushChar(m.athlete, x, y, 0.25, {airborne:true, t});
        } else this.pushChar(m.athlete, V.board-30, V.ground, (t*0.003)%1, {moving:true, t});
      } else this.pushChar(m.athlete, V.board-30, V.ground, 0.25, {t});
      return;
    }

    /* vertical — 높이뛰기·장대 */
    const m = this.mineRow;
    const marks=(m.res.marks||[]).filter(v=>v!==null);
    const bar = m.res.best || this.ev.qualify;
    const V = Venue.vertical(ctx, t, this.ev, bar);
    if(this.phase==='RUN' && this.attempt<3){
      const p=clamp(this.attemptT/1.2,0,1);
      const x=V.barX-40+p*100;
      const y=V.ground - 4*bar*V.pxpm*p*(1-p);
      this.pushChar(m.athlete, x, y, 0.25, {airborne:true, t});
    } else this.pushChar(m.athlete, V.barX-70, V.ground, 0.25, {t});
  }

  /* 캐릭터를 UI 레이어에 넘긴다(고해상도) */
  pushChar(athlete, x, y, ph, o){
    const sp = athlete.species;
    const rare = (typeof SPECIES!=='undefined' && SPECIES[sp]) ? SPECIES[sp].rare : 1;
    const mine = this.mg.club.has(athlete);
    (this._hd=this._hd||[]).push({ sp, x, y, ph, mine, o:Object.assign({rare}, o) });
  }

  drawUI(u){
    if(this._hd){
      for(const c of this._hd){
        CharHD.draw(u, c.sp, c.x, c.y, c.ph, c.o);
        if(c.mine){ u.fillStyle=PAL.gold; u.fillRect(c.x-4, c.y-48, 8, 2); u.fillRect(c.x-1, c.y-46, 2, 4); }
      }
      this._hd=null;
    }
    const e=this.meet.events[this.idx]; if(!e) return;
    UI.header(u, this.ev.name, `${this.meet.name} · ${this.idx+1}/${this.meet.events.length}`);
    if(this.phase==='INTRO'){
      plate(u,VW/2-100,VH/2-22,200,44,.8);
      txt(u,this.ev.name,VW/2,VH/2-16,15,PAL.gold,'center',700);
      const mine=this.results.filter(r=>this.mg.club.has(r.athlete))
        .flatMap(r=>r.team ? r.team.map(a=>a.name) : [r.athlete.name]).join(', ');
      txt(u,mine?`출전: ${mine}`:'출전 선수 없음',VW/2,VH/2+4,10,PAL.white,'center');
      UI.footer(u,'확인 건너뛰기');
      return;
    }
    if(this.isTrack && this.phase==='RUN'){
      plate(u, VW/2-40, 24, 80, 18, .82);
      txt(u, this.raceT.toFixed(2)+'초', VW/2, 26, 15, PAL.gold,'center',700);
      // 실시간 순위 — 거리순으로 다시 정렬해야 '순위'다
      const order=this.lanes.slice().sort((a,b)=>b.dist-a.dist);
      plate(u, 6, 46, 150, 6+order.length*11, .82);
      order.forEach((l,i)=>{
        const mine=this.mg.club.has(l.row.athlete);
        txt(u, `${i+1} ${l.row.athlete.name}`, 11, 49+i*11, 9, mine?PAL.gold:PAL.white,'left',mine?700:400);
        txt(u, l.dist.toFixed(0)+'m', 152, 49+i*11, 9, PAL.dim, 'right');
      });
    }
    if(!this.isTrack && this.phase==='RUN'){
      const m=this.mineRow, marks=m.res.marks||[];
      plate(u, 6, 26, 150, 50, .84);
      txt(u, m.athlete.name, 11, 29, 10, PAL.gold,'left',700);
      for(let i=0;i<3;i++){
        const v=i<this.attempt ? marks[i] : undefined;
        txt(u, `${i+1}차`, 11, 42+i*11, 9, PAL.dim);
        txt(u, v===undefined?'—':(v===null?'파울':fmtRec(this.ev, v)),
            152, 42+i*11, 9, v===null?PAL.red:(v===undefined?PAL.dim:PAL.white),'right');
      }
    }
    if(this.phase==='DONE'){
      plate(u, 8, 30, VW-16, VH-52, .93);
      txt(u,'순위',14,34,8,PAL.dim);
      this.results.slice(0,8).forEach((r,i)=>{
        const mine=this.mg.club.has(r.athlete);
        const y=44+i*15;
        if(mine){ u.fillStyle='rgba(255,215,94,.14)'; u.fillRect(10,y-2,VW-20,14); }
        txt(u, String(r.rank), 16, y, 10, r.rank===1?PAL.gold:PAL.white,'left',700);
        txt(u, r.team ? r.team.map(a=>a.name).join('·') : r.athlete.name,
            34, y, 10, mine?PAL.gold:PAL.white, 'left', mine?700:400);
        const bad = r.res.falseStart?'부정출발' : r.res.dnf?'실격' : r.res.allFoul?'파울' : null;
        txt(u, bad || fmtRec(this.ev, r.value), VW-56, y, 10, bad?PAL.red:PAL.white,'right');
        if(r.isPB) txt(u,'PB',VW-38,y,9,PAL.green,'left',700);
        if(r.isCR) txt(u,'CR',VW-20,y,9,PAL.gold,'left',700);
      });
      UI.footer(u,'확인 다음 종목   취소 결과 보기');
    } else UI.footer(u,'확인 건너뛰기');
  }
}

/* ── 대회 결과 ───────────────────────────────────────────── */
class MeetResultScreen extends Screen0 {
  constructor(mg, meet){
    super(mg);
    this.meet = meet;
    this.page = 0;                 // 0=결과 · 1=국가별 메달
    this.top = 0;                  // 스크롤 시작 종목
    this._drawn = 0; this._total = 0;
  }
  update(now){
    /* ⚠ 메달표를 결과 위에 겹쳐 그렸더니 기록 열을 가렸다(실측). 페이지로 나눈다. */
    if(Input.pressed('right')){ this.page=(this.page+1)%3; Sfx.ui(); return; }
    if(Input.pressed('left')){ this.page=(this.page+2)%3; Sfx.ui(); return; }
    /* 종목이 한 화면을 넘으면 스크롤한다 — 올림픽은 14종목이다 */
    if(this.page===0){
      const last = this.top + this._drawn;         // 지금 화면의 마지막 다음
      if(Input.repeat('down', now) && last < this._total){ this.top++; Sfx.ui(); return; }
      if(Input.repeat('up', now)   && this.top > 0)       { this.top--; Sfx.ui(); return; }
    }
    if(Input.pressed('action')||Input.pressed('back')){
      Sfx.ui();
      /* 금메달이 있으면 시상식을 한 번 치르고 넘어간다(없으면 예전 그대로) */
      if(!this._podiumDone && typeof PodiumScreen!=='undefined' && PodiumScreen.has(this.mg, this.meet)){
        this._podiumDone = true;
        this.mg.push(new PodiumScreen(this.mg, this.meet));
        return;
      }
      this.mg.afterMeet();
    }
  }
  draw(u){
    if(this.page===1) return this.drawMedals(u);
    if(this.page===2) return this.drawRewards(u);
    
    const m=this.meet, S=this.mg.season;
    UI.header(u, m.name+' 결과', `${m.week}주차`);
    txt(u,'획득 승점',VW/2,32,9,PAL.dim,'center');
    txt(u,String(m.points),VW/2,42,26,PAL.gold,'center',700);
    /* ⚠ 예전엔 그린 **뒤에** 넘쳤는지 봤다 — 마지막 종목이 하단 문구를 덮었고(실측),
       화면을 넘는 종목은 아무 말 없이 사라졌다(올림픽 15종목). 그리기 전에 재고,
       못 담은 만큼은 몇 종목인지 말한 뒤 ▲▼ 로 넘긴다. */
    const shown = m.events.map(e=>({ e, mine:e.rows.filter(r=>this.mg.club.has(r.athlete)) }))
                          .filter(x=>x.mine.length);
    const BOT = VH-42;
    let y=76, drawn=0;
    for(let k=this.top; k<shown.length; k++){
      const {e, mine} = shown[k];
      if(y + mine.length*11 > BOT) break;
      txt(u, e.ev.short, 12, y, 9, PAL.blue,'left',700);
      mine.forEach((r,i)=>{
        const bad = r.res.falseStart?'부정출발':r.res.dnf?'실격':r.res.allFoul?'파울':null;
        /* ⚠ 계주는 rows 에 대표 한 명(team[0])만 담긴다 — 화면에도 한 명만 나와
           '4×100m 계주 6위 서건우' 처럼 혼자 뛴 것처럼 보였다. 팀이면 팀을 적는다. */
        const who = r.team ? r.team.map(a=>a.name).join('·') : r.athlete.name;
        txt(u, `${r.rank}위 ${who}`, 48, y+i*11, 9, r.rank<=3?PAL.gold:PAL.white);
        txt(u, bad || fmtRec(e.ev, r.value), VW-46, y+i*11, 9, bad?PAL.red:PAL.white,'right');
        if(r.isPB) txt(u,'PB',VW-28,y+i*11,8,PAL.green,'left',700);
        if(r.isCR) txt(u,'CR',VW-12,y+i*11,8,PAL.gold,'left',700);
      });
      y += mine.length*11 + 4;
      drawn++;
    }
    /* ⚠ '몇 종목 더'를 화면에 그린 수로만 셌더니 아무리 내려도 숫자가 그대로였다.
       위치를 말한다 — 몇 번째부터 몇 번째까지 보고 있는지가 사람이 알고 싶은 것이다. */
    this._drawn = drawn; this._total = shown.length;
    if(shown.length > drawn)
      txt(u, `▲▼ ${this.top+1}–${this.top+drawn} / ${shown.length}`, 12, VH-30, 9, PAL.gold,'left');
    txt(u,`시즌 승점 ${S.points} · 금 ${S.medals.gold} 은 ${S.medals.silver} 동 ${S.medals.bronze}`,
        VW/2, VH-30, 9, PAL.white,'center');
    UI.footer(u,'확인 계속');
    /* 메달표는 ▶ 로 넘어간다 — 겹쳐 그리면 결과 목록을 가린다(실측) */
    txt(u, '▶ 메달 · 보상', VW-8, VH-28, 9, PAL.gold, 'right');
  }
  /* ── 육성 보상 ───────────────────────────────────────────
     경기가 끝나고 '무엇을 벌었나'를 한 화면에. 이게 다음 대회를 열게 만드는 자리다. */
  drawRewards(u){
    const S=this.mg.season;
    const feed = (S.rpgFeed||[]);
    UI.header(u, '육성 보상', `${this.meet.name} · ${this.meet.week}주차`);
    if(!feed.length){ txt(u,'이번 대회에서 얻은 것이 없습니다', VW/2, 100, 12, PAL.dim,'center');
      UI.footer(u,'◀▶ 페이지   ·   확인 계속'); return; }
    const lv = feed.filter(f=>f.lv), drops = feed.filter(f=>f.drop);
    const xpTot = feed.reduce((s,f)=>s+(f.xp||0),0);
    /* 큰 숫자 세 개 — 한눈에 */
    const box=(x,label,val,col)=>{
      plate(u, x, 30, 148, 40, .85);
      txt(u, K(label), x+74, 34, 9, PAL.dim,'center');
      txt(u, String(val), x+74, 44, 22, col,'center',700);
    };
    box(8,   '얻은 경험치', xpTot.toLocaleString(), PAL.blue);
    box(166, '레벨 업',     lv.length,              lv.length?PAL.gold:PAL.dim);
    box(324, '장비',        drops.length,           drops.length?PAL.green:PAL.dim);
    let y=80;
    for(const f of feed.slice(-9)){
      if(f.drop){
        const c=RPG.rarityOf(f.drop.r).color;
        txt(u, '◆ '+RPG.itemName(f.drop), 12, y, 10, c,'left',700);
        txt(u, RPG.itemLine(f.drop), VW-12, y+1, 8, PAL.dim,'right');
      } else {
        txt(u, f.name, 12, y, 10, f.lv?PAL.gold:PAL.white,'left', f.lv?700:400);
        txt(u, '+'+f.xp+' XP', 120, y+1, 9, PAL.blue,'left');
        if(f.lv) txt(u, `Lv.${f.lv} 달성 · 포인트 +${f.tp}`, VW-12, y, 10, PAL.gold,'right',700);
        else     txt(u, f.ev||'', VW-12, y+1, 8, PAL.dim,'right');
      }
      y+=13; if(y>VH-40) break;
    }
    UI.footer(u,'◀▶ 페이지   ·   확인 계속');
  }

  drawMedals(u){
    const S=this.mg.season;
    const tbl = (S.nationTable && S.nationTable()) || [];
    UI.header(u, '국가별 메달', `${S.year}년차 · ${S.week}주차`);
    txt(u, '금  은  동', VW-14, 28, 9, PAL.dim, 'right');
    const rows = tbl.slice(0, 11);
    rows.forEach((n,i)=>{
      const y=42+i*17, mine = n.code===this.mg.club.nation;
      u.fillStyle = mine ? 'rgba(255,215,94,.18)' : (i%2?'rgba(255,255,255,.045)':'rgba(0,0,0,.20)');
      u.fillRect(14, y, VW-28, 16);
      txt(u, String(i+1), 22, y+3, 10, i<3?PAL.gold:PAL.dim, 'left', 700);
      if(typeof drawFlag==='function') drawFlag(u, 40, y+2, 18, 12, n.code);
      txt(u, nationName(n.code), 64, y+3, 11, mine?PAL.gold:PAL.white, 'left', mine?700:400);
      txt(u, String(n.g), VW-84, y+3, 11, '#ffd75e', 'right', 700);
      txt(u, String(n.s), VW-52, y+3, 11, '#c9cede', 'right');
      txt(u, String(n.b), VW-20, y+3, 11, '#c9884a', 'right');
    });
    if(!rows.length) txt(u, '아직 메달이 없습니다', VW/2, 90, 11, PAL.dim, 'center');
    UI.footer(u, '◀ 결과로   ·   확인 계속');
  }

}
