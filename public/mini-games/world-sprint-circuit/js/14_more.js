/* ══════════════════════════════════════════════════════════════════
   추가 종목 — 세단뛰기 · 포환 · 원반
   기존 종목의 조작 문법을 재사용한다:
     세단뛰기 = 멀리뛰기의 타이밍 창 3연속
     포환     = 창던지기의 충전/릴리스 (조주 없음, 서클 안에서)
     원반     = 해머의 회전 리듬 + 각도 릴리스 (더 짧고 각도가 관대)
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* ── 세단뛰기 ─────────────────────────────────────────────
   홉(같은 발) → 스텝(반대 발) → 점프. 세 번을 리듬으로 이어야 한다. */
class TripleJumpEvent extends LongJumpEvent {
  newAttempt(){
    super.newAttempt();
    this.hops = [];              // 각 도약의 품질 0~1
    this.hopPhase = 0;           // 0=홉 1=스텝 2=점프
    this.hopT = 0;
    this.airT = 0;
  }
  onAction(tMs){
    if(this.phase==='RUNUP'){
      // 첫 도약 — 구름판 판정은 멀리뛰기와 같다
      this.boardAt = this.runner.distM;
      this.takeoffSpeed = this.runner.speed;
      this.foul = this.boardAt > RULES.boardPositionM + RULES.foulToleranceM;
      const over = this.boardAt - RULES.boardPositionM;
      this.boardQuality = clamp(1 - Math.abs(over)/2.5, 0, 1);
      this.hops = [this.boardQuality];
      this.hopPhase = 0; this.airT = 0;
      this.phase = 'HOP';
      if(this.foul) this.say('파울 — 구름판을 넘었다', true);
      else this.say('홉!', false);
      return;
    }
    if(this.phase==='HOP'){
      /* 각 도약은 '공중에서 정점일 때' 눌러야 한다.
         너무 이르거나 늦으면 다음 도약이 짧아진다. */
      const p = clamp(this.airT/this.hopDur(), 0, 1.4);
      const q = clamp(1 - Math.abs(p-0.62)/0.45, 0.12, 1);
      this.hops.push(q);
      this.hopPhase++;
      this.airT = 0;
      if(this.hopPhase >= 3){
        this.finishJump();
      } else {
        this.say(this.hopPhase===1 ? `스텝! ${Math.round(q*100)}%` : `점프! ${Math.round(q*100)}%`,
                 q<0.45);
      }
    }
  }
  onActionUp(){}
  hopDur(){ return 0.42 + this.takeoffSpeed*0.028; }
  finishJump(){
    const g=9.81;
    const v = this.takeoffSpeed * 0.86;
    const avg = this.hops.reduce((a,b)=>a+b,0)/this.hops.length;
    /* 세 번을 이어 뛴다. 한 번의 최대 도약보다 각 홉은 짧지만 셋을 더하면 훨씬 멀다.
       ⚠ 예전엔 비율(0.35+0.30+0.35=1.0)을 곱해 **한 번 뛴 거리**가 나왔다(7.13m).
          실제 세단뛰기는 멀리뛰기의 약 2배다(18.29m vs 8.95m). */
    const th = lerp(15, 21, avg) * Math.PI/180;
    const one = v*v*Math.sin(2*th)/g;
    this.range = Math.max(0, one*2.15*lerp(0.78,1.06,avg) + 0.5);
    this.angleDeg = th*180/Math.PI;
    this.flightDur = Math.max(0.4, 2*v*Math.sin(th)/g);
    this.landM = this.boardAt + this.range;
    this.jumpDist = this.foul ? 0 : Math.max(0, this.landM - RULES.boardPositionM);
    this.phase='RESULT'; this.resultAt=this.t;
    this.pending = this.foul ? null : +this.jumpDist.toFixed(2);
    this.foul ? Sfx.fail() : Sfx.beep(1046,0.2,'square',0.14);
  }
  update(dt){
    this.t += dt*1000;
    if(this.phase==='RUNUP'){
      this.runner.simulate(dt, this.t);
      if(this.runner.distM > RULES.boardPositionM + 3){
        this.foul=true; this.say('파울 — 구름판을 지나쳤다', true);
        this.phase='RESULT'; this.resultAt=this.t; this.pending=null;
      }
    } else if(this.phase==='HOP'){
      this.airT += dt;
      // 너무 오래 안 누르면 실패로 친다
      if(this.airT > this.hopDur()*1.5){
        this.hops.push(0.12); this.hopPhase++; this.airT=0;
        this.say('놓쳤다', true);
        if(this.hopPhase>=3) this.finishJump();
      }
    } else if(this.phase==='RESULT'){
      if(this.t - this.resultAt > 1500) this.nextAttempt(this.pending===undefined?null:this.pending);
    }
    const p = this.phase==='RUNUP' ? this.runner.distM : RULES.boardPositionM;
    this.camM += (Math.max(0, p - VW*this.mPerPx*0.42) - this.camM) * Math.min(1, dt*8);
    Sfx.crowd(this.phase==='RUNUP' ? clamp(this.runner.speed/12,0,1)*0.7 : 0.35);
  }
  draw(ctx){
    const gt = Track.fieldBack(ctx, this.camM);
    const GROUND = Track.fieldGround(ctx, { grassTop: gt });
    const px=(m)=>Math.round((m-this.camM)/this.mPerPx);
    const BX=px(RULES.boardPositionM);
    // 모래밭 (더 멀리)
    const sx=px(RULES.boardPositionM+8), sw=px(RULES.boardPositionM+22)-sx;
    if(!Art.tile(ctx,'sandpit-tile',GROUND-8,-sx,sx+sw)){
      ctx.fillStyle='#c4ae78'; ctx.fillRect(sx, GROUND-6, sw, 6);
      ctx.fillStyle='#d9c48f'; ctx.fillRect(sx, GROUND-5, sw, 4);
    }
    for(let m=2;m<=22;m+=2){
      const x=px(RULES.boardPositionM+m); if(x<-4||x>VW+4) continue;
      ctx.fillStyle='rgba(5,6,10,.45)'; ctx.fillRect(x, GROUND-6, 1, 6);
      if(m%4===0){ ctx.fillStyle='rgba(5,6,10,.6)'; Track.num(ctx, x+2, GROUND-14, m); }
    }
    if(BG.obj(BG.ctx(),'takeoff-board-hd',BX,GROUND,14)){ /* HD */ }
    else if(!Art.blit(ctx,'board-takeoff',BX,GROUND)){
      ctx.fillStyle=PAL.white; ctx.fillRect(BX-7, GROUND-7, 12, 7);
      ctx.fillStyle=PAL.red;   ctx.fillRect(BX+5,  GROUND-7, 3, 7);
    }
    // 선수
    let x, y=GROUND;
    if(this.phase==='RUNUP') x=px(this.runner.distM);
    else if(this.phase==='HOP'){
      const done = this.hops.length-1;
      const seg = this.range ? 0 : 0;
      const base = this.boardAt + done*2.6;
      const p = clamp(this.airT/this.hopDur(),0,1);
      x = px(base + p*2.6);
      y -= Math.sin(p*Math.PI)*20;
    } else {
      const p=clamp(this.flightT/this.flightDur,0,1);
      x = px(this.boardAt + (this.range||0)*p);
      y -= Math.sin(p*Math.PI)*26;
    }
    const air = this.phase==='HOP' || this.phase==='RESULT';
    if(CharHD.enabled) CharHD.draw(Screen.uctx, 'monkey', x, y, 0.25, { airborne:air, rare:1, t:this.t });
    else drawRunner(ctx, x, y, this.phase==='RUNUP'?this.runner.stridePhase:0.25, '#ffd75e', { airborne:air });
  }
  drawUI(u){
    plate(u,0,0,VW,30,0.72);
    txt(u,'시기', 8,3,8,PAL.dim);
    txt(u,`${Math.min(this.attempt+1,3)} / 3`, 8,12,15,PAL.gold,'left',700);
    txt(u,'SPEED',66,3,8,PAL.dim);
    txt(u,(this.phase==='RUNUP'?this.runner.speed:this.takeoffSpeed).toFixed(1)+' m/s',66,13,11,PAL.white);
    txt(u,'BEST',150,3,8,PAL.dim);
    txt(u,this.best>0?this.best.toFixed(2)+'m':'--.--',150,13,11,PAL.blue);
    txt(u,'QUALIFY',VW-8,3,8,PAL.dim,'right');
    txt(u,this.qualify.toFixed(2)+'m',VW-8,12,13,this.best>=this.qualify?PAL.green:PAL.red,'right',700);
    for(let i=0;i<3;i++){ const m=this.marks[i];
      txt(u, i+1+'차 '+(m===undefined?'-':(m===null?'파울':m.toFixed(2))), 250+i*70, 13, 9,
          m===null?PAL.red:(m===undefined?PAL.dim:PAL.white)); }

    if(this.phase==='RUNUP'){
      const left = RULES.boardPositionM - this.runner.distM;
      const near = left < 4 && left > -0.5;
      txt(u, near?'지금 홉!':`구름판까지 ${Math.max(0,left).toFixed(1)}m`,
          VW/2, 44, near?16:12, near?PAL.green:PAL.white,'center',700);
      const now=this.t, tgt=this.runner.targetIntervalMs();
      const err = this.runner.lastInputMs<-1e8?0:clamp(((now-this.runner.lastInputMs)-tgt)/tgt,-1,1);
      HUD.rhythm(u, { strides:(this.player&&this.player.combo)||0, nextSide:-this.runner.lastSide||1, phaseErr:err, form:this.runner.form});
    } else if(this.phase==='HOP'){
      /* ⚠ hopPhase 는 0=홉·1=스텝·2=점프 인데 HOP_NAMES[0] 은 **구름판**이다 —
         두 인덱스는 한 칸 어긋나 있다. 그 관계를 여기 적어 둔다(hopName 하나로 통일). */
      txt(u, K(hopName(this.hopPhase+1))+' — '+K('정점에서 누르세요'), VW/2, 44, 14, PAL.gold,'center',700);
      // 타이밍 막대
      plate(u,0,Track.GAUGE_Y,VW,Track.GAUGE_H,0.82);
      const w=200,x=(VW-w)/2,y=Track.GAUGE_Y+9;
      u.fillStyle='rgba(242,245,250,.14)'; u.fillRect(x,y,w,10);
      u.fillStyle='rgba(92,255,156,.5)'; u.fillRect(x+w*0.50, y, w*0.24, 10);
      const p=clamp(this.airT/(this.hopDur()*1.4),0,1);
      u.fillStyle=PAL.white; u.fillRect(x+w*p-1,y-3,2,16);
      /* ⚠ hops[0] 은 **구름판** 품질이고 그다음이 홉·스텝·점프다(총 4개).
         이름표를 3개만 두고 같은 인덱스로 읽어서 화면이 통째로 한 칸씩 밀려 있었다 —
         구름판을 '홉'이라 부르고 마지막 점프는 이름이 없어 `undefined 90%` 로 나갔다. */
      this.hops.forEach((q,i)=>{
        txt(u, K(hopName(i))+' '+Math.round(q*100)+'%', 12, 44+i*11, 9,
            q>0.7?PAL.green:q>0.4?PAL.gold:PAL.red);
      });
    } else if(this.phase==='RESULT'){
      const m=this.pending;
      txt(u, m===null?'파울':m.toFixed(2)+'m', VW/2, 100, 28, m===null?PAL.red:PAL.gold,'center',700);
      txt(u, this.hops.map((q,i)=>K(hopName(i))+' '+Math.round(q*100)+'%').join('  ·  '),
          VW/2, 132, 10, PAL.dim,'center');
    }
    if(this.msg && this.t-this.msgAt<900){
      const a=1-(this.t-this.msgAt)/900; u.save(); u.globalAlpha=a;
      txt(u,this.msg,VW/2,68,12,this.msgBad?PAL.red:PAL.green,'center',700); u.restore();
    }
  }
}

const HOP_NAMES = ['구름판','홉','스텝','점프'];   /* hops 배열과 **같은 순서** */
function hopName(i){ return HOP_NAMES[i] || ''; }

/* ── 포환던지기 ───────────────────────────────────────────
   조주가 없다. 서클 안에서 힘을 모아 각도를 맞춰 민다. */
class ShotPutEvent extends JavelinEvent {
  newAttempt(){
    super.newAttempt();
    this.phase='CHARGE';
    this.holdStart=-1; this.angle=38;
    this.angleDir=1;
  }
  onStride(side, tMs){
    /* 좌우 두드림이 '몸통 회전'을 만든다 — 많이 돌릴수록 더 멀리 */
    if(this.phase!=='CHARGE') return;
    this.spinWork = (this.spinWork||0) + 1;
    Sfx.beep(200+this.spinWork*18, 0.04, 'square', 0.07);
  }
  onAction(tMs){ if(this.phase==='CHARGE' && this.holdStart<0){ this.holdStart=tMs; } }
  onActionUp(tMs){
    if(this.phase!=='CHARGE'||this.holdStart<0) return;
    const held=tMs-this.holdStart; this.holdStart=-1;
    let charge=clamp(held/700, 0.2, 1.3);
    if(charge>1) charge = Math.max(0.4, 1-(charge-1)*1.6);
    const work = clamp((this.spinWork||0)/14, 0, 1.15);
    const th = this.angle*Math.PI/180;
    /* ⚠ 예전 계수는 27.18m 을 냈다 — 세계기록이 23.56m 다. */
    const v = 5.4 + 6.1*charge + 2.7*work;
    this.vx=v*Math.cos(th); this.vy=v*Math.sin(th);
    this.px=0; this.py=2.0; this.releaseV=v;
    this.foul=false;
    this.phase='FLIGHT';
    Sfx.beep(660,0.14,'square',0.14);
  }
  update(dt){
    this.t += dt*1000;
    if(this.phase==='CHARGE'){
      // 각도 바늘이 오르내린다 — 원하는 각에서 놓아야 한다
      this.angle += this.angleDir*dt*26;
      if(this.angle>52){ this.angle=52; this.angleDir=-1; }
      if(this.angle<24){ this.angle=24; this.angleDir=1; }
      if(this.holdStart>=0 && this.t-this.holdStart>1400) this.onActionUp(Math.round(this.t));
    } else if(this.phase==='FLIGHT'){
      this.px += this.vx*dt; this.vy -= 9.81*dt; this.py += this.vy*dt;
      if(this.py<=0){
        this.range=this.px;
        this.phase='RESULT'; this.resultAt=this.t;
        this.pending=+this.range.toFixed(2);
        Sfx.beep(1046,0.2,'square',0.14);
      }
    } else if(this.phase==='RESULT'){
      if(this.t-this.resultAt>1500) this.nextAttempt(this.pending===undefined?null:this.pending);
    }
    Sfx.crowd(this.phase==='FLIGHT'?0.8:0.3);
  }
  draw(ctx){
    this.mPerPx = 0.09;
    const gt=Track.fieldBack(ctx, 20);
    const GROUND=Track.fieldGround(ctx,{grassTop:gt, surface:PAL.grass});
    const CX=70;
    const px=(m)=>Math.round(CX + m/this.mPerPx);
    ctx.fillStyle=PAL.wallDark; ctx.fillRect(CX-22, GROUND-4, 44, 4);
    ctx.fillStyle=PAL.wall;     ctx.fillRect(CX-22, GROUND-4, 44, 2);
    for(let m=5;m<=25;m+=5){ const x=px(m); if(x<=CX||x>=VW) continue;
      ctx.fillStyle='rgba(242,245,250,.4)';  ctx.fillRect(x,GROUND-8,1,8);
      ctx.fillStyle='rgba(242,245,250,.65)'; Track.num(ctx,x+2,GROUND-16,m); }
    if(CharHD.enabled) CharHD.draw(Screen.uctx,'hippo',CX,GROUND,0.25,{throwing:true,rare:3,t:this.t});
    else drawRunner(ctx, CX, GROUND, 0.25, '#ff6b8a', { throwing:true });
    // 포환
    const sx = this.phase==='CHARGE' ? CX+8 : px(this.px);
    /* (해머 자리 — 폴은 아래 PoleVault 에서 따로 그린다) */
    const sy = this.phase==='CHARGE' ? GROUND-26 : GROUND - this.py/this.mPerPx;
    if(!Art.blit(ctx,'hammer',sx,Math.min(GROUND-2,Math.round(sy)),'center')){
      ctx.fillStyle='#c9cede'; ctx.beginPath();
      ctx.arc(sx, Math.min(GROUND-2,Math.round(sy)), 3.5, 0, Math.PI*2); ctx.fill();
    }
  }
  drawUI(u){
    plate(u,0,0,VW,30,0.72);
    txt(u,'시기',8,3,8,PAL.dim); txt(u,`${Math.min(this.attempt+1,3)} / 3`,8,12,15,PAL.gold,'left',700);
    txt(u,'회전',66,3,8,PAL.dim); txt(u,String(this.spinWork||0),66,13,11,PAL.white);
    txt(u,'BEST',150,3,8,PAL.dim); txt(u,this.best>0?this.best.toFixed(2)+'m':'--.--',150,13,11,PAL.blue);
    txt(u,'QUALIFY',VW-8,3,8,PAL.dim,'right');
    txt(u,this.qualify.toFixed(1)+'m',VW-8,12,13,this.best>=this.qualify?PAL.green:PAL.red,'right',700);
    for(let i=0;i<3;i++){ const m=this.marks[i];
      txt(u,i+1+'차 '+(m===undefined?'-':(m===null?'파울':m.toFixed(2))),250+i*70,13,9,
          m===null?PAL.red:(m===undefined?PAL.dim:PAL.white)); }

    if(this.phase==='CHARGE'){
      plate(u,0,Track.GAUGE_Y,VW,Track.GAUGE_H,0.82);
      txt(u,'좌·우로 몸을 비틀고, 액션을 쥐었다 놓으세요',VW/2,44,12,PAL.white,'center',700);
      // 각도
      const ax=250, aw=180, y=Track.GAUGE_Y+9;
      u.fillStyle='rgba(242,245,250,.14)'; u.fillRect(ax,y,aw,10);
      u.fillStyle='rgba(92,255,156,.45)'; u.fillRect(ax+aw*(36-24)/28, y, aw*8/28, 10);
      u.fillStyle=PAL.white; u.fillRect(ax+aw*clamp((this.angle-24)/28,0,1)-1,y-3,2,16);
      txt(u,`각도 ${this.angle.toFixed(0)}° — 초록에서 놓기`,ax,y+12,8,PAL.dim);
      // 충전
      const w=140,x=24;
      u.fillStyle='rgba(242,245,250,.14)'; u.fillRect(x,y,w,10);
      if(this.holdStart>=0){
        const p=clamp((this.t-this.holdStart)/700,0,1.3);
        u.fillStyle = p<=1?PAL.green:PAL.red;
        u.fillRect(x,y,Math.round(w*Math.min(p,1.3)/1.3),10);
      }
      txt(u,'힘',x,y+12,8,PAL.dim);
    } else if(this.phase==='FLIGHT'){
      txt(u,this.px.toFixed(1)+'m',VW/2,44,20,PAL.gold,'center',700);
    } else if(this.phase==='RESULT'){
      txt(u,(this.pending||0).toFixed(2)+'m',VW/2,92,28,PAL.gold,'center',700);
    }
  }
}

/* ── 원반던지기 ───────────────────────────────────────────
   해머와 같은 회전이지만 더 짧고 각도 창이 넓다. */
class DiscusEvent extends HammerEvent {
  newAttempt(){
    super.newAttempt();
    this.sectorLo = 28; this.sectorHi = 60; this.optAngle = 36;
  }
  release(tMs){
    const deg=((this.angle*180/Math.PI)%360+360)%360;
    const shot = deg>90 ? 90-(deg-90) : deg;
    this.releaseAngle=shot;
    this.foul = shot < this.sectorLo || shot > this.sectorHi;
    const th=shot*Math.PI/180;
    /* 원반은 해머보다 가볍다 — 같은 회전에서 더 멀리 난다.
       예전 계수는 55m 로 세계기록(74.35m)의 74% 에 그쳤다. */
    const v = 3.6 + this.spin*3.30;
    this.vx=v*Math.cos(th); this.vy=v*Math.sin(th);
    this.px=0; this.py=1.7;
    this.phase='FLIGHT';
    if(this.foul) this.say(`섹터 밖 (${shot.toFixed(0)}°)`, true);
    else Sfx.beep(620,0.16,'square',0.14);
  }
}

/* ── 장대높이뛰기 ─────────────────────────────────────────
   높이뛰기와 다르다: 조주로 속도를 얻고 → **폴을 박스에 꽂는 타이밍** →
   폴이 휘었다 펴지는 동안 몸을 끌어올린다(연타) → 바를 넘는다.
   속도가 곧 높이다 — 달리기를 못하면 높이뛰기보다 못 넘는다. */
class PoleVaultEvent extends FieldEvent {
  constructor(def){ super(def); this.attemptsTotal = Infinity; }
  reset(){
    this.t=0; this.bar=RULES.pvStartM||3.60; this.best=0; this.misses=0;
    this.marks=[]; this.result=null; this.doneAt=0; this.camM=0;
    this.msg=''; this.msgAt=-1e9;
    this.newAttempt();
  }
  newAttempt(){
    this.phase='RUNUP';
    this.runner=new Runner(1,{},true, 40);
    this.runner.reset(0); this.runner.started=true;
    this.plantQ=0; this.pulls=0; this.flightT=0; this.flightDur=1.5;
    this.cleared=null; this.reach=0; this.planted=false;
  }
  onStride(side,tMs){
    if(this.phase==='RUNUP'){ const j=this.runner.stride(side,tMs,'off'); if(j) Sfx.step(j); }
    else if(this.phase==='FLIGHT'){ this.pulls=Math.min(8,this.pulls+1);
      Sfx.beep(700+this.pulls*55,0.04,'square',0.07); }
  }
  onAction(tMs){
    if(this.phase!=='RUNUP' || this.planted) return;
    const box = 34;                              // 폴 박스 위치(m)
    const off = Math.abs(this.runner.distM - box);
    this.plantQ = clamp(1 - off/2.2, 0.08, 1);
    this.planted=true; this.phase='FLIGHT'; this.flightT=0;
    this.takeoffSpeed = this.runner.speed;
    this.say(this.plantQ>0.75?'완벽한 꽂기!':'폴을 꽂았다', this.plantQ<0.4);
    Sfx.beep(520,0.12,'square',0.13);
  }
  update(dt){
    this.t += dt*1000;
    if(this.phase==='RUNUP'){
      this.runner.simulate(dt, this.t);
      if(this.runner.distM > 38){ this.say('박스를 지나쳤다', true); this.fail(); }
    } else if(this.phase==='FLIGHT'){
      this.flightT += dt;
      if(this.flightT >= this.flightDur){
        /* 높이 = 속도² 기여 + 꽂기 + 끌어올리기 */
        const v=this.takeoffSpeed;
        /* ⚠ 한때 0.78/0.11 로 올렸다가 도달 7.49m 가 나왔다 — 실제 세계기록 6.26m 다.
           "아무도 기준을 못 넘는다"는 관측이 사실은 **측정 창이 짧아서**였다
           (바가 0.12m 씩 오르니 끝까지 가는 데 80초가 넘는다). 원래 값으로 되돌린다. */
        this.reach = 1.30 + (v*v)/(2*9.81)*0.72*lerp(0.62,1.0,this.plantQ)
                   + this.pulls*0.075;
        this.cleared = this.reach >= this.bar;
        this.phase='RESULT'; this.resultAt=this.t;
        this.cleared ? (Sfx.finish(), this.best=Math.max(this.best,this.bar)) : Sfx.fail();
      }
    } else if(this.phase==='RESULT'){
      if(this.t-this.resultAt>1600){
        if(this.cleared){ this.marks.push(this.bar); this.misses=0;
          this.bar=+(this.bar+0.20).toFixed(2); this.newAttempt(); }   // 0.12 는 너무 잘아 한 판이 80초를 넘겼다
        else this.fail(true);
      }
    }
    const p = this.phase==='RUNUP' ? this.runner.distM : 34;
    this.camM += (Math.max(0, p - VW*this.mPerPx*0.45) - this.camM)*Math.min(1,dt*8);
    Sfx.crowd(this.phase==='FLIGHT'?0.75:0.3);
  }
  fail(fromResult){
    this.misses++;
    if(this.misses>=3){
      this.phase='DONE'; this.doneAt=this.t;
      const pass=this.best>=this.qualify;
      this.result={status:this.best>0?(pass?'OK':'MISSED_QUALIFY'):'ALL_FOUL', value:this.best, rank:1};
      pass?Sfx.finish():Sfx.fail();
    } else if(!fromResult){ this.phase='RESULT'; this.resultAt=this.t; this.cleared=false; }
    else this.newAttempt();
  }
  draw(ctx){
    const gt=Track.fieldBack(ctx, this.camM);
    const GROUND=Track.fieldGround(ctx,{grassTop:gt});
    const px=(m)=>Math.round((m-this.camM)/this.mPerPx);
    const PXPM=26;                              // 1m = 26px (6m 바가 화면에)
    const BOXX=px(34);
    /* 폴 박스 */
    ctx.fillStyle='#3a3346'; ctx.fillRect(BOXX-5, GROUND-4, 12, 4);
    /* 매트 */
    ctx.fillStyle='#2b3152'; ctx.fillRect(BOXX+14, GROUND-16, 92, 16);
    ctx.fillStyle='#3b4270'; ctx.fillRect(BOXX+14, GROUND-16, 92, 12);
    /* 지주 + 바 */
    const barY=GROUND-this.bar*PXPM;
    ctx.fillStyle='#c9cede'; ctx.fillRect(BOXX+18, barY-2, 3, GROUND-barY+2);
    ctx.fillRect(BOXX+100, barY-2, 3, GROUND-barY+2);
    if(!(function(){ const img=BG.get('crossbar-hd'); const bg=BG.ctx();
      if(!img||!bg) return false; bg.drawImage(img, BOXX+20, barY-3, 82, 7); return true; })()){
      ctx.fillStyle = (this.phase==='RESULT'&&this.cleared===false)?PAL.red:PAL.gold;
      ctx.fillRect(BOXX+20, barY, 82, 3);
    }
    /* 선수 + 폴 */
    let x,y=GROUND;
    if(this.phase==='RUNUP'){
      x=px(this.runner.distM);
      /* 손에 든 폴 — HD 어셋이 있으면 그쪽으로 */
      if(!BG.obj(BG.ctx(), 'pole-hd', x+18, y-6, 30)){
        ctx.strokeStyle='#d8d2c2'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(x+4, y-22); ctx.lineTo(x+30, y-30); ctx.stroke();
      }
    } else {
      const p=clamp(this.flightT/this.flightDur,0,1);
      x = BOXX + p*84;
      const apex = this.reach || (1.3 + this.takeoffSpeed*0.28 + this.pulls*0.075);
      y = GROUND - 4*apex*PXPM*p*(1-p) - (p>0.5?(p-0.5)*20:0);
      /* 휘는 폴 */
      ctx.strokeStyle='#d8d2c2'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(BOXX, GROUND-2);
      ctx.quadraticCurveTo(BOXX+(x-BOXX)*0.5 - 14*Math.sin(p*Math.PI), (y+GROUND)/2, x, y);
      ctx.stroke();
    }
    const air=this.phase!=='RUNUP';
    if(CharHD.enabled) CharHD.draw(Screen.uctx,'squirrel',x,y,
      this.phase==='RUNUP'?this.runner.stridePhase:0.25,
      {airborne:air, rare:1, t:this.t});
    else drawRunner(ctx, x, y, this.phase==='RUNUP'?this.runner.stridePhase:0.25, '#5aaaff', {airborne:air});
  }
  drawUI(u){
    plate(u,0,0,VW,30,0.72);
    txt(u,'바 높이',8,3,8,PAL.dim); txt(u,this.bar.toFixed(2)+'m',8,12,15,PAL.gold,'left',700);
    txt(u,'실패',86,3,8,PAL.dim);
    txt(u,'●'.repeat(this.misses)+'○'.repeat(3-this.misses),86,13,12,PAL.red);
    txt(u,'BEST',160,3,8,PAL.dim); txt(u,this.best>0?this.best.toFixed(2)+'m':'--.--',160,13,11,PAL.blue);
    txt(u,'QUALIFY',VW-8,3,8,PAL.dim,'right');
    txt(u,this.qualify.toFixed(2)+'m',VW-8,12,13,this.best>=this.qualify?PAL.green:PAL.red,'right',700);

    if(this.phase==='RUNUP'){
      const left=34-this.runner.distM;
      const near=left<3 && left>-0.5;
      txt(u, near?'지금 꽂아!':`박스까지 ${Math.max(0,left).toFixed(1)}m`,
          VW/2,44,near?16:12,near?PAL.green:PAL.white,'center',700);
      txt(u,'속도가 곧 높이입니다',VW/2,60,9,PAL.dim,'center');
      const now=this.t,tg=this.runner.targetIntervalMs();
      const err=this.runner.lastInputMs<-1e8?0:clamp(((now-this.runner.lastInputMs)-tg)/tg,-1,1);
      HUD.rhythm(u, { strides:(this.player&&this.player.combo)||0, nextSide:-this.runner.lastSide||1,phaseErr:err,form:this.runner.form});
    } else if(this.phase==='FLIGHT'){
      txt(u,'좌·우를 두드려 몸을 끌어올리세요',VW/2,44,13,PAL.gold,'center',700);
      txt(u,`${this.pulls} / 8`,VW/2,62,15,this.pulls>=8?PAL.green:PAL.white,'center',700);
      txt(u,`꽂기 ${Math.round(this.plantQ*100)}%`,VW/2,80,10,
          this.plantQ>0.7?PAL.green:PAL.gold,'center');
    } else if(this.phase==='RESULT'){
      txt(u,this.cleared?'성공!':'실패',VW/2,92,26,this.cleared?PAL.green:PAL.red,'center',700);
      if(this.reach) txt(u,`도달 ${this.reach.toFixed(2)}m / 바 ${this.bar.toFixed(2)}m`,VW/2,124,11,PAL.dim,'center');
    }
    if(this.msg && this.t-this.msgAt<900){
      const a=1-(this.t-this.msgAt)/900; u.save(); u.globalAlpha=a;
      txt(u,this.msg,VW/2,68,12,this.msgBad?PAL.red:PAL.green,'center',700); u.restore();
    }
  }
}
