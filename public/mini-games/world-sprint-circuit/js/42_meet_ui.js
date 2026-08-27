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
      const names=ids.map(id=>{ const a=this.mg.club.byId(id); return a? a.name : '?'; });
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
    txt(u,'출전 선수를 고르세요. 컨디션이 나쁘면 기록이 크게 떨어집니다',8,27,9,PAL.dim);
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
      return { label:(on?'● ':'○ ')+a.name+(a.injury?' (부상)':''),
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
    if(this.isTrack){
      const camM = Math.max(0, Math.max(...this.lanes.map(l=>l.dist)) - VW*0.16*0.34);
      Track.drawBack(ctx, camM, this.ev.distanceM);
      Track.drawLanes(ctx, camM, 0.16);
      Track.drawMarks(ctx, camM, 0.16);
      /* 허들 종목이면 허들을 그린다 — 없으면 화면이 종목과 어긋난다(실측: 110mH 에 허들이 없었다) */
      if(this.ev.id==='hurdles110'){
        for(let i=0;i<RULES.hurdleCount;i++){
          const m=RULES.hurdleFirstM+i*RULES.hurdleSpacingM;
          const x=Math.round((m-camM)/0.16);
          if(x<-8||x>VW+8) continue;
          for(let L=0;L<3;L++){
            const hy=Track.LANE_Y[L]+Track.LANE_H-10;
            if(Art.blit(ctx,'hurdle',x,hy)) continue;
            ctx.fillStyle='#e8e2d6'; ctx.fillRect(x-4,hy-13,9,2);
            ctx.fillStyle='#c9cede'; ctx.fillRect(x-3,hy-11,1,11); ctx.fillRect(x+3,hy-11,1,11);
          }
        }
      }
      Track.drawFinish(ctx, camM, 0.16, this.ev.distanceM);
      const col=['#5aaaff','#ffd75e','#ff6b8a'];
      this.lanes.forEach((l,i)=>{
        const y=Track.LANE_Y[i]+Track.LANE_H-10;
        const x=Math.round((l.dist-camM)/0.16);
        if(x<-20||x>VW+20) return;
        const mine=this.mg.club.has(l.row.athlete);
        let ry=y, air=false;
        if(this.ev.id==='hurdles110'){
          for(let k=0;k<RULES.hurdleCount;k++){
            const m=RULES.hurdleFirstM+k*RULES.hurdleSpacingM;
            const d=l.dist-m;
            if(d>-1.1 && d<1.1){ air=true; ry -= Math.cos(d/1.1*Math.PI/2)*15; break; }
          }
        }
        drawRunner(ctx, x, ry, (this.raceT*4.2+i*0.3)%1, mine?'#ffd75e':col[i], { airborne:air });
        if(mine){ ctx.fillStyle=PAL.gold; ctx.fillRect(x-4,ry-40,8,2); ctx.fillRect(x-1,ry-38,2,4); }
      });
    } else {
      /* 필드 종목 — 시기별 기록을 실제로 보여준다.
         예전엔 선수 하나만 서 있어서 무슨 일이 일어나는지 알 수 없었다. */
      const gt=Track.fieldBack(ctx, 20);
      const GROUND=Track.fieldGround(ctx,{grassTop:gt});
      const marks=(this.mineRow.res.marks)||[];
      const done=Math.min(this.attempt, 3);
      const jump = this.ev.id==='longJump' || this.ev.id==='highJump';
      const best=Math.max(this.ev.qualify*1.35, ...marks.filter(m=>m!==null));
      const SX=64, SW=VW-96;
      // 거리 자
      ctx.fillStyle='rgba(242,245,250,.30)'; ctx.fillRect(SX, GROUND+4, SW, 1);
      for(let i=1;i<=5;i++){
        const x=SX+SW*i/5;
        ctx.fillStyle='rgba(242,245,250,.35)'; ctx.fillRect(x,GROUND+4,1,5);
        ctx.fillStyle='rgba(242,245,250,.55)'; Track.num(ctx, x+2, GROUND+7, Math.round(best*i/5));
      }
      // 확정된 시기 표시
      marks.slice(0,done).forEach((m,i)=>{
        if(m===null){ ctx.fillStyle=PAL.red; ctx.fillRect(SX-3, GROUND-8-i*7, 5, 5); return; }
        const x=SX+SW*clamp(m/best,0,1);
        ctx.fillStyle= m===this.mineRow.res.best ? PAL.gold : 'rgba(255,255,255,.55)';
        ctx.fillRect(Math.round(x)-1, GROUND-10-i*7, 2, 8);
        ctx.fillRect(Math.round(x)-3, GROUND-10-i*7, 6, 2);
      });
      // 진행 중인 시기 — 날아가는 궤적
      if(this.phase==='RUN' && done<3){
        const m=marks[done];
        const p=clamp(this.attemptT/1.2,0,1);
        if(m!==null && m!==undefined){
          const x=SX+SW*clamp(m/best,0,1)*p;
          const y=GROUND-8 - Math.sin(p*Math.PI)*(jump?26:44);
          ctx.fillStyle=PAL.gold; ctx.fillRect(Math.round(x)-2, Math.round(y)-2, 4, 4);
        }
      }
      drawRunner(ctx, SX-14, GROUND, (this.t*3)%1, '#ffd75e', { throwing:!jump, airborne:jump&&this.phase==='RUN' });
    }
  }
  drawUI(u){
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
  constructor(mg, meet){ super(mg); this.meet=meet; }
  update(now){ if(Input.pressed('action')||Input.pressed('back')){ Sfx.ui(); this.mg.afterMeet(); } }
  draw(u){
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
  }
}
