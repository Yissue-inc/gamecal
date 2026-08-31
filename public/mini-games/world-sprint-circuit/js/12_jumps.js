/* ══════════════════════════════════════════════════════════════════
   멀리뛰기 · 높이뛰기 — 3회 시기, 최고 기록으로 판정
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 여러 종목이 공유하는 뼈대: 조주(달리기) → 도약 → 결과 → 다음 시기 */
class FieldEvent {
  constructor(def){
    this.def = def;
    this.mPerPx = 0.16;
    this.attemptsTotal = 3;
    this.reset();
  }
  reset(){
    this.t = 0;
    this.attempt = 0;
    this.marks = [];                 // 시기별 기록 (null = 파울)
    this.best = 0;
    this.result = null;
    this.doneAt = 0;
    this.camM = 0;
    this.msg=''; this.msgAt=-1e9;
    this.newAttempt();
  }
  say(m, bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad;
    bad ? Sfx.beep(200,0.14,'sawtooth',0.12) : Sfx.beep(1046,0.10,'square',0.12); }

  get qualify(){ return this.def.qualify; }
  get phase(){ return this._phase; }
  set phase(v){ this._phase = v; }

  finishEvent(){
    this.phase='DONE'; this.doneAt=this.t;
    const passed = this.best >= this.qualify;
    this.result = { status: this.best>0 ? (passed?'OK':'MISSED_QUALIFY') : 'ALL_FOUL',
                    value: this.best, rank: 1 };
    passed ? Sfx.finish() : Sfx.fail();
  }
  nextAttempt(record){
    this.marks.push(record);
    if(record!==null) this.best = Math.max(this.best, record);
    this.attempt++;
    if(this.attempt >= this.attemptsTotal) this.finishEvent();
    else { this.newAttempt(); }
  }
}

/* ── 멀리뛰기 ─────────────────────────────────────────────
   조주로 속도를 올리고 → 구름판(40m) 직전에 액션으로 도약
   → 공중에서 액션을 쥐었다 놓아 자세를 잡는다. */
class LongJumpEvent extends FieldEvent {
  newAttempt(){
    this.phase='RUNUP';
    this.runner = new Runner(1, {}, true, RULES.boardPositionM + 12);
    this.runner.reset(0); this.runner.started = true;
    this.takeoffSpeed=0; this.boardAt=0; this.foul=false;
    this.holdStart=-1; this.form=0.5;
    this.flightT=0; this.flightDur=0; this.jumpDist=0;
    this.landX=0;
  }
  onStride(side, tMs){
    if(this.phase!=='RUNUP') return;
    const j=this.runner.stride(side, tMs, 'off'); if(j) Sfx.step(j);
  }
  onAction(tMs){
    if(this.phase==='RUNUP'){
      this.boardAt = this.runner.distM;
      this.takeoffSpeed = this.runner.speed;
      this.foul = this.boardAt > RULES.boardPositionM + RULES.foulToleranceM;
      this.phase='FLIGHT'; this.flightT=0; this.holdStart=tMs;
      // 도약 지점이 구름판에 가까울수록 좋다
      const over = this.boardAt - RULES.boardPositionM;
      this.boardQuality = clamp(1 - Math.abs(over)/2.5, 0, 1);
      /* 실제 포물선으로 계산한다. 예전 임의 공식은 13.81m 를 뱉었다 — 세계기록이 8.95m 다.
         도약각은 자세(form)에 따라 18°~24°. 사거리 = v²·sin(2θ)/g */
      this.angleDeg = 0;                       // 자세가 정해질 때 확정
      this.flightDur = 0.9;                    // 임시 — 아래 recompute 에서 다시 잡는다
      this.recompute();
      if(this.foul) this.say('파울 — 구름판을 넘었다', true);
      else this.say(this.boardQuality>0.8?'완벽한 발구름!':'도약', false);
    } else if(this.phase==='FLIGHT'){
      this.holdStart = tMs;
    }
  }
  onActionUp(tMs){
    if(this.phase!=='FLIGHT' || this.holdStart<0) return;
    const held = tMs - this.holdStart;
    this.form = clamp(1 - Math.abs(held - RULES.ljFlightOptHoldMs)/RULES.ljFlightOptHoldMs, 0.2, 1);
    this.holdStart=-1;
    this.recompute();
    this.say(`자세 ${Math.round(this.form*100)}%`, this.form<0.5);
  }
  /* 사거리·체공시간을 포물선으로 다시 계산한다 */
  recompute(){
    const g = 9.81;
    const th = lerp(18, 24, this.form) * Math.PI/180;
    /* 발구름에서 수평속도의 일부를 수직으로 바꾸며 잃는다. 이걸 빼면 도약속도가
       최고속(12.5m/s) 그대로라 10m 넘는 기록이 나온다 — 세계기록은 8.95m. */
    /* 이중 처벌 금지: 기록을 구름판 기준으로 재므로 일찍 뛰면 이미 손해다.
       속도까지 크게 깎으면 회복 불가능해진다. */
    const v  = this.takeoffSpeed * 0.85 * lerp(0.94, 1.0, this.boardQuality);
    this.angleDeg = th*180/Math.PI;
    this.flightDur = Math.max(0.35, 2*v*Math.sin(th)/g);
    this.range = Math.max(0, v*v*Math.sin(2*th)/g + 0.35);   // 0.35 = 착지 시 다리 뻗음
  }
  update(dt){
    this.t += dt*1000;
    if(this.phase==='RUNUP'){
      this.runner.simulate(dt, this.t);
      // 구름판을 그냥 지나치면 파울
      if(this.runner.distM > RULES.boardPositionM + 3){
        this.foul=true; this.say('파울 — 구름판을 지나쳤다', true);
        this.phase='RESULT'; this.resultAt=this.t; this.pending=null;
      }
    } else if(this.phase==='FLIGHT'){
      this.flightT += dt;
      if(this.flightT >= this.flightDur){
        /* 기록은 도약 지점이 아니라 **구름판**부터 잰다 — 육상 규칙이 그렇고,
           그래야 구름판 타이밍이 이 종목의 핵심이 된다.
           (실측 버그: 예전엔 6.5m 앞에서 뛰고도 3.65m 가 기록으로 잡혔다) */
        this.landM = this.boardAt + this.range;
        this.jumpDist = this.foul ? 0 : Math.max(0, this.landM - RULES.boardPositionM);
        this.phase='RESULT'; this.resultAt=this.t;
        this.pending = this.foul ? null : +this.jumpDist.toFixed(2);
        if(!this.foul) Sfx.beep(880,0.18,'square',0.14);
      }
    } else if(this.phase==='RESULT'){
      if(this.t - this.resultAt > 1500) this.nextAttempt(this.pending===undefined?null:this.pending);
    }
    const p = this.phase==='RUNUP' ? this.runner.distM : RULES.boardPositionM;
    this.camM += (Math.max(0, p - VW*this.mPerPx*0.42) - this.camM) * Math.min(1, dt*8);
    Sfx.crowd(this.phase==='RUNUP' ? clamp(this.runner.speed/12,0,1)*0.7 : 0.25);
  }

  draw(ctx){
    const gt = Track.fieldBack(ctx, this.camM);
    const GROUND = Track.fieldGround(ctx, { grassTop: gt });
    const px=(m)=>Math.round((m-this.camM)/this.mPerPx);
    const BX = px(RULES.boardPositionM);

    // 모래밭 — 바닥에 파묻힌 것처럼 그린다(발 라인과 같은 높이에서 시작)
    const sx=px(RULES.boardPositionM+0.6), sw=px(RULES.boardPositionM+10.5)-sx;
    if(!Art.tile(ctx,'sandpit-tile',GROUND-8,-sx,sx+sw)){
      ctx.fillStyle='#c4ae78'; ctx.fillRect(sx, GROUND-6, sw, 6);
      ctx.fillStyle='#d9c48f'; ctx.fillRect(sx, GROUND-5, sw, 4);
      ctx.fillStyle='#b09a66'; ctx.fillRect(sx, GROUND-6, sw, 1);
    }
    // 1m 눈금 + 숫자
    for(let m=1;m<=10;m++){
      const x=px(RULES.boardPositionM+m); if(x<-4||x>VW+4) continue;
      ctx.fillStyle='rgba(5,6,10,.45)'; ctx.fillRect(x, GROUND-6, 1, 6);
      if(m%2===0){ ctx.fillStyle='rgba(5,6,10,.6)'; Track.num(ctx, x+2, GROUND-14, m); }
    }
    // 구름판 — 발 라인에 딱 붙이고 빨간 파울 끝을 크게
    if(BG.obj(BG.ctx(),'takeoff-board-hd',BX,GROUND,14)){ /* HD */ }
    else if(!Art.blit(ctx,'board-takeoff',BX,GROUND)){
      ctx.fillStyle=PAL.white; ctx.fillRect(BX-7, GROUND-7, 12, 7);
      ctx.fillStyle=PAL.red;   ctx.fillRect(BX+5,  GROUND-7, 3, 7);
    }
    ctx.fillStyle=PAL.white; ctx.fillRect(BX+5,  GROUND-16, 1, 9);   // 파울선 표시 기둥

    // 선수
    let x, y=GROUND;
    if(this.phase==='RUNUP'){ x=px(this.runner.distM); }
    else {
      const p=clamp(this.flightT/this.flightDur,0,1);
      const dist=this.foul?1.5:this.range;
      x=px(this.boardAt + dist*p);
      const th=this.angleDeg*Math.PI/180, v=this.takeoffSpeed;
      const apexM=v*v*Math.sin(th)**2/(2*9.81);
      y -= (4*apexM*p*(1-p))/this.mPerPx*0.55;
    }
    drawRunner(ctx, x, y, this.phase==='RUNUP'?this.runner.stridePhase:0.25, '#ffd75e',
      { lean:this.phase!=='RUNUP', airborne:this.phase==='FLIGHT' });
    // 착지 자국
    if(this.phase==='RESULT' && this.pending){
      const lx=px(this.landM!==undefined?this.landM:(this.boardAt+this.range));
      ctx.fillStyle=PAL.red; ctx.fillRect(lx-1, GROUND-9, 2, 9);
    }
    this.queueMan(GROUND, px);
  }

  /* ⛔ 멀리뛰기에 **선수가 없었다** — 도움닫기도 도약도 그림이 없이 숫자만 움직였다
     (48종목 전수 감사에서 잡혔다: 37종목은 그리는데 이 종목은 CharHD 호출이 0 이었다).
     달릴 땐 달리는 자세, 공중에선 접은 자세 — 다른 종목과 같은 규칙으로 그린다. */
  queueMan(GROUND, px){
    const runup = this.phase==='RUNUP';
    const x = runup ? clamp(px(this.runner.distM), 12, VW-12)
                    : clamp(px(this.boardAt + (this.airT!==undefined ? this.range*0.5 : 0)), 12, VW-12);
    const air = !runup && this.phase!=='MARK' && this.phase!=='DONE';
    (this._hd=this._hd||[]).push({ sp:'hare', x, y:GROUND, ph:(this.runner.stridePhase||0),
      /* ⚠ scale 1.25 는 이 화면에서 **너무 컸다**(트랙 종목과 배율이 다르다).
         그리고 lean 을 함께 주면 몸이 늘어나 보였다 — 도움닫기엔 안 쓴다. */
      o:{ air, rare:2, t:this.t, scale:0.82 } });
  }
  drawUI(uctx){
    if(this._hd){ for(const c of this._hd) CharHD.draw(uctx, c.sp, c.x, c.y, c.ph, c.o); this._hd=null; }
    plate(uctx,0,0,VW,30,0.72);
    txt(uctx,'시기', 8,3,8,PAL.dim);
    txt(uctx,`${Math.min(this.attempt+1,3)} / 3`, 8,12,15,PAL.gold,'left',700);
    txt(uctx,K('속도'),66,3,8,PAL.dim);
    txt(uctx,(this.phase==='RUNUP'?this.runner.speed:this.takeoffSpeed).toFixed(1)+' m/s',66,13,11,PAL.white);
    txt(uctx,K('최고'),150,3,8,PAL.dim);
    txt(uctx,this.best>0?this.best.toFixed(2)+'m':'--.--',150,13,11,PAL.blue);
    txt(uctx,K('기준'),VW-30,3,8,PAL.dim,'right');
    txt(uctx,this.qualify.toFixed(2)+'m',VW-30,12,13,this.best>=this.qualify?PAL.green:PAL.red,'right',700);
    // 시기별 기록
    for(let i=0;i<3;i++){
      const m=this.marks[i];
      txt(uctx, i+1+'차 '+(m===undefined?'-':(m===null?'파울':m.toFixed(2))),
          250+i*70, 13, 9, m===null?PAL.red:(m===undefined?PAL.dim:PAL.white));
    }

    if(this.phase==='RUNUP'){
      const left = RULES.boardPositionM - this.runner.distM;
      const near = left < 4 && left > -0.5;
      txt(uctx, near?'지금 도약!':`구름판까지 ${Math.max(0,left).toFixed(1)}m`,
          VW/2, 44, near?16:12, near?PAL.green:PAL.white,'center',700);
      if(!near) txt(uctx,'기록은 구름판부터 잽니다 — 일찍 뛰면 손해', VW/2, 62, 9, PAL.dim,'center');
      const now=this.t, tgt=this.runner.targetIntervalMs();
      const err = this.runner.lastInputMs<-1e8?0:clamp(((now-this.runner.lastInputMs)-tgt)/tgt,-1,1);
      HUD.rhythm(uctx, { strides:(this.player&&this.player.combo)||0, nextSide:-this.runner.lastSide||1, phaseErr:err, form:this.runner.form, rate:(this.runner.strideRate||0)});
      HUD.judge(uctx, this.runner.lastJudge, now-this.runner.lastJudgeMs);
    } else if(this.phase==='FLIGHT'){
      txt(uctx,'액션을 눌렀다 놓아 자세를 잡으세요', VW/2, 44, 12, PAL.gold,'center',700);
      if(this.holdStart>=0){
        const held=this.t-this.holdStart, w=160, x=(VW-w)/2, y=Track.GAUGE_Y+8;
        plate(uctx,0,Track.GAUGE_Y,VW,Track.GAUGE_H,0.82);
        uctx.fillStyle='rgba(242,245,250,.16)'; uctx.fillRect(x,y,w,10);
        const opt=RULES.ljFlightOptHoldMs;
        uctx.fillStyle='rgba(92,255,156,.5)'; uctx.fillRect(x+w*0.42,y,w*0.16,10);
        uctx.fillStyle=PAL.white; uctx.fillRect(clamp(x+w*(held/(opt*2)),x,x+w)-1,y-3,2,16);
        txt(uctx,'놓을 타이밍',VW/2,y+12,8,PAL.dim,'center');
      }
    } else if(this.phase==='RESULT'){
      const m=this.pending;
      txt(uctx, m===null?'파울':m.toFixed(2)+'m', VW/2, 100, 28, m===null?PAL.red:PAL.gold,'center',700);
    }
    if(this.msg && this.t-this.msgAt<900){
      const a=1-(this.t-this.msgAt)/900; uctx.save(); uctx.globalAlpha=a;
      txt(uctx,this.msg,VW/2,68,12,this.msgBad?PAL.red:PAL.green,'center',700); uctx.restore();
    }
  }
}

/* ── 높이뛰기 ─────────────────────────────────────────────
   조주(고정 길이) → 발구름 창(液션) → 공중에서 좌우 두드려 몸 넘기기.
   성공하면 바를 5cm 올린다. 3번 실패하면 끝. */
class HighJumpEvent extends FieldEvent {
  constructor(def){ super(def); this.attemptsTotal = Infinity; }
  reset(){
    this.t=0; this.bar = RULES.hjStartHeightM; this.best=0; this.misses=0;
    this.marks=[]; this.result=null; this.doneAt=0; this.camM=0;
    this.msg=''; this.msgAt=-1e9;
    this.newAttempt();
  }
  newAttempt(){
    this.phase='APPROACH';
    this.approachT=0;
    this.plantOpenAt = RULES.hjApproachDurationS;      // 이 시점부터 창이 열린다
    this.planted=false; this.plantQuality=0;
    this.airTaps=0; this.flightT=0; this.flightDur=1.35;
    this.cleared=null; this.holdStart=-1; this.holdMs=0;
    this.reachM=0;
  }
  onStride(side,tMs){
    if(this.phase==='FLIGHT'){ this.airTaps=Math.min(6,this.airTaps+1); Sfx.beep(1200+this.airTaps*60,0.04,'square',0.07); }
  }
  onAction(tMs){
    if(this.phase!=='APPROACH' || this.planted) return;
    const early = this.plantOpenAt - this.approachT;    // 양수면 이르다
    const win = RULES.hjPlantWindowMs/1000;
    if(early > win){ this.say('너무 일찍 뛰었다', true); this.plantQuality=0.15; }
    else this.plantQuality = clamp(1 - Math.abs(early)/win, 0.15, 1);
    this.planted=true; this.phase='FLIGHT'; this.flightT=0; this.holdStart=tMs;
    Sfx.beep(660,0.10,'square',0.13);
  }
  onActionUp(tMs){
    if(this.phase!=='FLIGHT'||this.holdStart<0) return;
    this.holdMs = tMs-this.holdStart; this.holdStart=-1;
  }
  update(dt){
    this.t += dt*1000;
    if(this.phase==='APPROACH'){
      this.approachT += dt;
      // 창을 놓치면 실패
      if(this.approachT > this.plantOpenAt + RULES.hjPlantWindowMs/1000){
        this.say('발구름을 놓쳤다', true); this.fail();
      }
    } else if(this.phase==='FLIGHT'){
      this.flightT += dt;
      if(this.flightT >= this.flightDur){
        const holdQ = clamp(1 - Math.abs(this.holdMs - RULES.hjOptHoldMs)/RULES.hjOptHoldMs, 0, 1);
        this.reachM = RULES.hjBaseReachM
          + this.plantQuality*0.42
          + this.airTaps*RULES.hjAirTapBonusM
          + holdQ*0.10;
        this.cleared = this.reachM >= this.bar;
        this.phase='RESULT'; this.resultAt=this.t;
        if(this.cleared){ Sfx.finish(); this.best=Math.max(this.best,this.bar); }
        else Sfx.fail();
      }
    } else if(this.phase==='RESULT'){
      if(this.t-this.resultAt > 1600){
        if(this.cleared){ this.marks.push(this.bar); this.misses=0; this.bar=+(this.bar+RULES.hjStepM).toFixed(2); this.newAttempt(); }
        else this.fail(true);
      }
    }
    Sfx.crowd(this.phase==='FLIGHT'?0.7:0.25);
  }
  fail(fromResult){
    this.misses++;
    if(this.misses >= RULES.hjMaxMisses){
      this.phase='DONE'; this.doneAt=this.t;
      const passed = this.best >= this.qualify;
      this.result = { status: this.best>0?(passed?'OK':'MISSED_QUALIFY'):'ALL_FOUL', value:this.best, rank:1 };
      passed?Sfx.finish():Sfx.fail();
    } else if(!fromResult){ this.phase='RESULT'; this.resultAt=this.t; this.cleared=false; }
    else this.newAttempt();
  }
  draw(ctx){
    const gt = Track.fieldBack(ctx, 30);
    const GROUND = Track.fieldGround(ctx, { grassTop: gt });
    const BAR_X = 300;
    const PXPM = 58;                      // 1m = 58px — 2.2m 바가 화면 안에 들어온다
    // 매트 — 바닥에 놓인 두께감
    if(!Art.blit(ctx,'highbar-mat',BAR_X+60,GROUND)){
      ctx.fillStyle='#2b3152'; ctx.fillRect(BAR_X+8, GROUND-20, 104, 20);
      ctx.fillStyle='#3b4270'; ctx.fillRect(BAR_X+8, GROUND-20, 104, 15);
      ctx.fillStyle='#4d5480'; ctx.fillRect(BAR_X+8, GROUND-20, 104, 3);
    }
    // 지주 + 바
    const barY = GROUND - this.bar*PXPM;
    if(!Art.blit(ctx,'highbar-stand',BAR_X,GROUND)){
      ctx.fillStyle='#c9cede'; ctx.fillRect(BAR_X-2, barY-2, 4, GROUND-barY+2); }
    if(!Art.blit(ctx,'highbar-stand',BAR_X+102,GROUND)){
      ctx.fillStyle='#c9cede'; ctx.fillRect(BAR_X+100, barY-2, 4, GROUND-barY+2); }
    ctx.fillStyle = this.phase==='RESULT'&&this.cleared===false ? PAL.red : PAL.gold;
    ctx.fillRect(BAR_X, barY, 104, 3);
    // 선수
    let x, y=GROUND;
    if(this.phase==='APPROACH'){
      const p = clamp(this.approachT/this.plantOpenAt, 0, 1.2);
      x = 40 + p*(BAR_X-84);
      drawRunner(ctx, x, y, (this.approachT*3)%1, '#5aaaff');
    } else {
      const p=clamp(this.flightT/this.flightDur,0,1);
      x = (BAR_X-40) + p*100;
      const apex = (this.reachM || (RULES.hjBaseReachM + this.plantQuality*0.42 + this.airTaps*RULES.hjAirTapBonusM));
      y = GROUND - 4*apex*PXPM*p*(1-p) - (p>0.5 ? (p-0.5)*24 : 0);
      drawRunner(ctx, x, y, 0.25, '#5aaaff', { lean:true, airborne:true });
    }
  }
  drawUI(uctx){
    plate(uctx,0,0,VW,30,0.72);
    txt(uctx,'바 높이',8,3,8,PAL.dim);
    txt(uctx,this.bar.toFixed(2)+'m',8,12,15,PAL.gold,'left',700);
    txt(uctx,'실패',86,3,8,PAL.dim);
    txt(uctx,'●'.repeat(this.misses)+'○'.repeat(RULES.hjMaxMisses-this.misses),86,13,12,PAL.red);
    txt(uctx,K('최고'),160,3,8,PAL.dim);
    txt(uctx,this.best>0?this.best.toFixed(2)+'m':'--.--',160,13,11,PAL.blue);
    txt(uctx,K('기준'),VW-30,3,8,PAL.dim,'right');
    txt(uctx,this.qualify.toFixed(2)+'m',VW-30,12,13,this.best>=this.qualify?PAL.green:PAL.red,'right',700);

    if(this.phase==='APPROACH'){
      const left = this.plantOpenAt - this.approachT;
      const win = RULES.hjPlantWindowMs/1000;
      const near = left < win && left > -win;
      txt(uctx, near?'지금 발구름!':'조주 중…', VW/2, 44, near?17:12, near?PAL.green:PAL.white,'center',700);
      // 발구름 창 게이지
      plate(uctx,0,Track.GAUGE_Y,VW,Track.GAUGE_H,0.82);
      const w=200,x=(VW-w)/2,y=Track.GAUGE_Y+9;
      uctx.fillStyle='rgba(242,245,250,.14)'; uctx.fillRect(x,y,w,10);
      uctx.fillStyle='rgba(92,255,156,.5)';
      uctx.fillRect(x+w*(this.plantOpenAt/(this.plantOpenAt+win*2))-w*win/(this.plantOpenAt+win*2), y,
                    w*2*win/(this.plantOpenAt+win*2), 10);
      const pp = clamp(this.approachT/(this.plantOpenAt+win*2),0,1);
      uctx.fillStyle=PAL.white; uctx.fillRect(x+w*pp-1,y-3,2,16);
      txt(uctx,'초록 구간에서 액션',VW/2,y+12,8,PAL.dim,'center');
    } else if(this.phase==='FLIGHT'){
      txt(uctx,'좌·우를 두드려 몸을 넘기세요', VW/2, 44, 13, PAL.gold,'center',700);
      txt(uctx,`${this.airTaps} / 6`, VW/2, 62, 15, this.airTaps>=6?PAL.green:PAL.white,'center',700);
    } else if(this.phase==='RESULT'){
      txt(uctx, this.cleared?'성공!':'실패', VW/2, 92, 26, this.cleared?PAL.green:PAL.red,'center',700);
      if(this.reachM) txt(uctx, `도달 ${this.reachM.toFixed(2)}m / 바 ${this.bar.toFixed(2)}m`, VW/2,124,11,PAL.dim,'center');
    }
    if(this.msg && this.t-this.msgAt<900){
      const a=1-(this.t-this.msgAt)/900; uctx.save(); uctx.globalAlpha=a;
      txt(uctx,this.msg,VW/2,68,12,this.msgBad?PAL.red:PAL.green,'center',700); uctx.restore();
    }
  }
}
