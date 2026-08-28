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
  get info(){ return MEET_INFO[this.mg.season.meetKind]; }
  get rows(){
    const S=this.mg.season;
    const r = this.events.map(ev=>{
      const ids=S.entries[ev.id]||[];
      const names=ids.map(id=>{ const a=this.mg.club.byId(id); return a? `${a.speciesName} ${a.name}` : '?'; });
      const bad = ids.some(id=>{ const a=this.mg.club.byId(id); return !a || !a.available; });
      return { label:ev.name, sub: names.length? names.join(', ') : '출전 없음',
        right:`${ids.length} / ${this.info.entries}`,
        rightColor: bad?PAL.red : ids.length?PAL.green:PAL.dim };
    });
    r.push({ label:'▶ 경기 시작', sub:'출전표를 확정하고 경기를 본다', color:PAL.green, right:'!' });
    r.push({ label:'자동 편성', sub:'컨디션과 적합도로 자동으로 짠다', right:'↻' });
    return r;
  }
  confirm(){
    const S=this.mg.season;
    if(this.sel === this.events.length){          // 경기 시작
      const any = this.events.some(ev=>(S.entries[ev.id]||[]).length);
      if(!any){ this.mg.toast('출전 선수가 없습니다'); Sfx.fail(); return; }
      // 부상 선수 제거
      for(const ev of this.events)
        S.entries[ev.id]=(S.entries[ev.id]||[]).filter(id=>{ const a=this.mg.club.byId(id); return a&&a.available; });
      const meet = S.runMeet();
      this.mg.replace(new MeetWatchScreen(this.mg, meet));
      return;
    }
    if(this.sel === this.events.length+1){ S.entries=S.autoEntries(); Sfx.ui(); this.mg.toast('자동 편성했습니다'); return; }
    this.mg.push(new PickEntryScreen(this.mg, this.events[this.sel]));
  }
  cancel(){ this.mg.pop(); }
  draw(u){
    const S=this.mg.season;
    UI.header(u, this.info.name, `${S.week}주차 · 종목당 ${this.info.entries}명`);
    txt(u,'★ 은 그 종목을 위해 태어난 종입니다. 컨디션이 나쁘면 기록이 크게 떨어집니다',8,27,9,PAL.dim);
    UI.list(u, this.rows, this.sel, 8, 40, VW-16, 24, 7);
    UI.footer(u,'확인 선택   취소 돌아가기');
  }
}

class PickEntryScreen extends Screen0 {
  constructor(mg, ev){
    super(mg); this.ev=ev;
    this.cands = mg.club.squad.slice().sort((a,b)=>eventFitNow(b,this.ev)-eventFitNow(a,this.ev));
  }
  get chosen(){ return this.mg.season.entries[this.ev.id] || (this.mg.season.entries[this.ev.id]=[]); }
  get rows(){
    const max=MEET_INFO[this.mg.season.meetKind].entries;
    return this.cands.map(a=>{
      const on=this.chosen.includes(a.id);
      const fit=eventFitNow(a,this.ev);
      const pb=a.best[this.ev.id];
      const fav = (typeof speciesFavors==='function') && speciesFavors(a, this.ev.id);
      return { label:(on?'● ':'○ ')+`${a.speciesName} ${a.name}`+(fav?' ★':'')+(a.injury?' (부상)':''), nation:a.nation,
        sub:`적합 ${Math.round(fit)} · 컨디션 ${UI.condName(a.condition)} · 피로 ${Math.round(a.fatigue)}`,
        right: pb!==undefined ? pb.toFixed(2)+this.ev.unit : '기록 없음',
        rightColor: pb!==undefined?PAL.gold:PAL.dim,
        color: a.injury?PAL.red:(on?PAL.green:PAL.white), dim:!a.available };
    }).concat([{label:`— 확정 (${this.chosen.length}/${max})`, color:PAL.blue}]);
  }
  confirm(){
    const max=MEET_INFO[this.mg.season.meetKind].entries;
    if(this.sel>=this.cands.length){ this.mg.pop(); return; }
    const a=this.cands[this.sel];
    if(!a.available){ this.mg.toast('부상 중인 선수는 출전할 수 없습니다'); Sfx.fail(); return; }
    const i=this.chosen.indexOf(a.id);
    if(i>=0) this.chosen.splice(i,1);
    else { if(this.chosen.length>=max){ this.mg.toast(`이 종목은 ${max}명까지`); Sfx.fail(); return; } this.chosen.push(a.id); }
    Sfx.ui();
  }
  draw(u){
    UI.header(u, this.ev.name, `기준 ${this.ev.qualify.toFixed(2)}${this.ev.unit}`);
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
      const mine=this.results.filter(r=>this.mg.club.has(r.athlete)).map(r=>r.athlete.name).join(', ');
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
        txt(u, v===undefined?'—':(v===null?'파울':v.toFixed(2)+this.ev.unit),
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
        txt(u, r.athlete.name, 34, y, 10, mine?PAL.gold:PAL.white, 'left', mine?700:400);
        const bad = r.res.falseStart?'부정출발' : r.res.dnf?'실격' : r.res.allFoul?'파울' : null;
        txt(u, bad || (r.value.toFixed(2)+this.ev.unit), VW-56, y, 10, bad?PAL.red:PAL.white,'right');
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
  }
  update(now){
    /* ⚠ 메달표를 결과 위에 겹쳐 그렸더니 기록 열을 가렸다(실측). 페이지로 나눈다. */
    if(Input.pressed('right')||Input.pressed('left')){ this.page = this.page?0:1; Sfx.ui(); return; }
    if(Input.pressed('action')||Input.pressed('back')){ Sfx.ui(); this.mg.afterMeet(); }
  }
  draw(u){
    if(this.page===1) return this.drawMedals(u);
    
    const m=this.meet, S=this.mg.season;
    UI.header(u, m.name+' 결과', `${m.week}주차`);
    txt(u,'획득 승점',VW/2,32,9,PAL.dim,'center');
    txt(u,String(m.points),VW/2,42,26,PAL.gold,'center',700);
    let y=76;
    for(const e of m.events){
      const mine=e.rows.filter(r=>this.mg.club.has(r.athlete));
      if(!mine.length) continue;
      txt(u, e.ev.short, 12, y, 9, PAL.blue,'left',700);
      mine.forEach((r,i)=>{
        const bad = r.res.falseStart?'부정출발':r.res.dnf?'실격':r.res.allFoul?'파울':null;
        txt(u, `${r.rank}위 ${r.athlete.name}`, 48, y+i*11, 9, r.rank<=3?PAL.gold:PAL.white);
        txt(u, bad || r.value.toFixed(2)+e.ev.unit, VW-46, y+i*11, 9, bad?PAL.red:PAL.white,'right');
        if(r.isPB) txt(u,'PB',VW-28,y+i*11,8,PAL.green,'left',700);
        if(r.isCR) txt(u,'CR',VW-12,y+i*11,8,PAL.gold,'left',700);
      });
      y += Math.max(1,mine.length)*11 + 4;
      if(y>VH-40) break;
    }
    txt(u,`시즌 승점 ${S.points} · 금 ${S.medals.gold} 은 ${S.medals.silver} 동 ${S.medals.bronze}`,
        VW/2, VH-30, 10, PAL.white,'center');
    UI.footer(u,'확인 계속');
    /* 메달표는 ▶ 로 넘어간다 — 겹쳐 그리면 결과 목록을 가린다(실측) */
    txt(u, '▶ 국가별 메달', VW-8, VH-28, 9, PAL.gold, 'right');
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
