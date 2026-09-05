/* ══════════════════════════════════════════════════════════════════
   던지기 — 창던지기 · 해머던지기. 둘 다 3회 시기.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* ── 창던지기 ─────────────────────────────────────────────
   조주로 속도 → 액션을 쥐어 힘을 모으고 → 파울선 앞에서 놓는다. */
class JavelinEvent extends FieldEvent {
  newAttempt(){
    this.phase='RUNUP';
    this.runner = new Runner(1,{},true, RULES.javelinFoulLineM + 8);
    this.runner.reset(0); this.runner.started=true;
    this.holdStart=-1; this.charge=0; this.foul=false;
    this.vx=0; this.vy=0; this.px=0; this.py=0; this.flying=false;
    this.throwFrom=0; this.range=0;
  }
  onStride(side,tMs){ if(this.phase!=='RUNUP') return;
    const j=this.runner.stride(side,tMs,'off'); if(j) Sfx.step(j, this.runner.tier); }
  onAction(tMs){
    if(this.phase!=='RUNUP') return;
    if(this.holdStart<0){ this.holdStart=tMs; this.say('힘을 모으는 중…'); Sfx.beep(330,0.1,'square',0.1); }
  }
  onActionUp(tMs){
    if(this.phase!=='RUNUP'||this.holdStart<0) return;
    this.release(tMs);
  }
  release(tMs){
    const heldMs = tMs - this.holdStart; this.holdStart=-1;
    let charge = clamp(heldMs/RULES.javelinChargeMs, 0.2, 1.4);
    if(charge>1) charge = Math.max(0.35, 1-(charge-1)*1.4);   // 너무 오래 쥐면 손해
    this.charge = charge;
    this.foul = this.runner.distM > RULES.javelinFoulLineM + RULES.foulToleranceM;
    // 파울선에 가까울수록 각도가 최적에 붙는다
    const near = clamp(1 - Math.abs(this.runner.distM - RULES.javelinFoulLineM)/3, 0, 1);
    const angle = RULES.javelinOptAngleDeg - (1-near)*11;
    /* 최대 출력이 기준기록보다 낮으면 그 종목은 영영 통과 못 한다.
       실측: 예전 계수로 최대 ~49m 인데 기준이 52m 였다. 완벽한 던지기가 ~85m 가 되게 잡는다
       (실제 세계기록 98.48m). */
    const v = this.runner.speed*0.50 + 24.0*charge;
    const th = angle*Math.PI/180;
    this.vx = v*Math.cos(th); this.vy = v*Math.sin(th);
    this.throwFrom = this.runner.distM;
    this.px = 0; this.py = 1.8;                     // 손 높이에서 출발
    this.angle = angle; this.releaseV = v;
    this.phase='FLIGHT'; this.flying=true;
    if(this.foul) this.say('파울 — 선을 넘었다', true);
    else Sfx.beep(880,0.12,'square',0.13);
  }
  update(dt){
    this.t += dt*1000;
    if(this.phase==='RUNUP'){
      this.runner.simulate(dt, this.t);
      if(this.holdStart>=0 && this.t-this.holdStart > RULES.javelinChargeMs*2){
        this.release(Math.round(this.t));           // 안 놓으면 자동으로 놓아 준다
      }
      if(this.runner.distM > RULES.javelinFoulLineM + 4){
        this.foul=true; this.say('파울 — 선을 지나쳤다', true);
        this.phase='RESULT'; this.resultAt=this.t; this.pending=null;
      }
    } else if(this.phase==='FLIGHT'){
      this.px += this.vx*dt; this.vy -= 9.81*dt; this.py += this.vy*dt;
      if(this.py <= 0){
        this.range = this.foul ? 0 : this.px;
        this.phase='RESULT'; this.resultAt=this.t;
        this.pending = this.foul ? null : +this.range.toFixed(2);
        this.foul ? Sfx.fail() : Sfx.beep(1046,0.2,'square',0.14);
      }
    } else if(this.phase==='RESULT'){
      if(this.t-this.resultAt>1600) this.nextAttempt(this.pending===undefined?null:this.pending);
    }
    const focus = this.phase==='FLIGHT' ? this.throwFrom + this.px*0.55 : this.runner.distM;
    this.camM += (Math.max(0, focus - VW*this.mPerPx*0.4) - this.camM)*Math.min(1,dt*6);
    Sfx.crowd(this.phase==='FLIGHT'?0.8:0.3);
  }
  draw(ctx){
    // 던지기는 멀리 보여야 한다 — 축척을 늘린다
    const scale = this.phase==='FLIGHT' ? 0.30 : 0.16;
    this.mPerPx += (scale-this.mPerPx)*0.06;
    const gt = Track.fieldBack(ctx, this.camM);
    const GROUND = Track.fieldGround(ctx, { grassTop: gt });
    const px=(m)=>Math.round((m-this.camM)/this.mPerPx);
    // 파울선 — 땅에 그은 선 + 눈에 띄는 기둥
    const fx=px(RULES.javelinFoulLineM);
    ctx.fillStyle=PAL.white; ctx.fillRect(fx, GROUND-34, 2, 34);
    ctx.fillStyle=PAL.red;   ctx.fillRect(fx, GROUND-40, 2, 6);
    // 10m 눈금
    for(let m=10;m<=100;m+=10){ const x=px(RULES.javelinFoulLineM+m); if(x<=0||x>=VW) continue;
      ctx.fillStyle='rgba(242,245,250,.4)'; ctx.fillRect(x,GROUND-8,1,8);
      ctx.fillStyle='rgba(242,245,250,.65)'; Track.num(ctx,x+2,GROUND-16,m); }
    /* 선수 — ⛔ 이 파일(창·해머·원반)만 **HD 캐릭터를 아예 안 쓰고** 있었다.
       60종 300장을 갖춰 놓고 세 종목이 저해상도 폴백으로 그려졌다(실측: 14_more 의
       포환·장대·세단은 CharHD 를 쓴다 — 같은 던지기인데 파일이 달라 빠졌다).
       ⚠ 폴백은 남긴다. 어셋이 없으면 예전 그림이 그대로 돈다. */
    const rx = px(this.phase==='RUNUP'?this.runner.distM:this.throwFrom);
    const ph = this.phase==='RUNUP' ? this.runner.stridePhase : 0.25;
    if(!(CharHD.enabled && CharHD.draw(Screen.uctx, 'gazelle', rx, GROUND, ph,
          { throwing:this.phase!=='RUNUP', rare:3, t:this.t, scale:1.25 })))
      drawRunner(ctx, rx, GROUND, ph, '#ffd75e',
        { lean:this.phase!=='RUNUP', throwing:this.phase!=='RUNUP' });
    // 창
    if(this.phase==='RUNUP'){
      ctx.fillStyle='#e8e2d6'; ctx.fillRect(rx-6, GROUND-24, 16, 1);
    } else if(this.phase==='FLIGHT'||this.phase==='RESULT'){
      const jx = px(this.throwFrom + this.px), jy = GROUND - this.py/this.mPerPx;
      const ang = Math.atan2(-this.vy, this.vx);
      ctx.save(); ctx.translate(jx, Math.min(GROUND, jy)); ctx.rotate(-ang);
      if(BG.obj(BG.ctx(),'javelin-hd',0,0,16)){ /* 없으면 아래로 */ }
      else if(!Art.blit(ctx,'javelin',0,0,'center')){
        ctx.fillStyle='#e8e2d6'; ctx.fillRect(-10,0,20,1);
        ctx.fillStyle=PAL.gold; ctx.fillRect(8,-1,4,2);
      }
      ctx.restore();
    }
  }
  drawUI(uctx){
    /* 런업 판정 — Runner 가 이미 lastJudge 를 들고 있는데 화면에 안 나오고 있었다.
       ⚠ 이 파일엔 drawUI 가 **둘**이다(창던지기·해머). 해머는 창 판정이 없는
          연타형이라 fx-tap-ring 만 쓴다 — 여기(창던지기)에만 붙인다. */
    if(this.phase==='RUNUP' && this.runner && this.runner.lastJudge)
      /* ⚠ labelY:44 는 바로 아래 '파울선까지 %m'(y=44) 과 **같은 줄**이다 —
         'PERFECT!' 가 그 위에 82px 겹쳤다. 도약(12_jumps)에서 이미 같은 이유로
         96 으로 내렸는데 투척은 안 내렸다. 두 곳이 같은 병이면 같이 고친다. */
      HUD.tap(uctx, { j:this.runner.lastJudge, ageMs:this.t-this.runner.lastJudgeMs,
                      ivMs:this.runner.targetIntervalMs(), labelY:96 });
    /* ⛔ 예전엔 **기준이 크고(13px 색) 내 최고가 작았다**(11px) — 양궁·사격과 같은
       위계 뒤집힘이다. 화면에서 제일 큰 숫자는 내 것이어야 한다(05_scoreboard). */
    SB.tally(uctx, {
      name: this.def.name,
      progress: `${Math.min(this.attempt+1,3)} / 3` + K('차'),
      mine: this.best, fmt: v => v > 0 ? v.toFixed(1)+'m' : '--.--',
      cuts: medalCuts(this.def), higher: !!this.def.higher,
      /* 파울은 'F' 로 — 칩 한 칸에 '파울' 두 글자는 안 들어간다 */
      history: (this.marks||[]).filter(m => m !== undefined)
                 .map(m => m === null ? 'F' : +(+m).toFixed(2)),
    });
    /* 속도는 점수가 아니라 **조작 정보**다 — 점수판 아래 한 줄로 내린다 */
    txt(uctx, K('속도')+' '+(this.runner.speed.toFixed(1)+' m/s'), 8, 36, 9, PAL.dim, 'left');
    /* ⛔ 옛 '시기별 기록' 루프 제거 — SB.tally 의 칩과 중복이고 메달 레일을 덮었다 */

    if(this.phase==='RUNUP'){
      const left = RULES.javelinFoulLineM - this.runner.distM;
      plate(uctx,0,Track.GAUGE_Y,VW,Track.GAUGE_H,0.82);
      if(this.holdStart<0){
        txt(uctx, left<8?'액션을 쥐어 힘을 모으세요':`파울선까지 ${Math.max(0,left).toFixed(1)}m`,
            VW/2,44,13,left<8?PAL.gold:PAL.white,'center',700);
        const now=this.t,tg=this.runner.targetIntervalMs();
        const err=this.runner.lastInputMs<-1e8?0:clamp(((now-this.runner.lastInputMs)-tg)/tg,-1,1);
        HUD.rhythm(uctx, { strides:(this.player&&this.player.combo)||0, nextSide:-this.runner.lastSide||1,phaseErr:err,form:this.runner.form, rate:(this.runner.strideRate||0)});
      } else {
        const held=this.t-this.holdStart;
        const w=200,x=(VW-w)/2,y=Track.GAUGE_Y+9;
        uctx.fillStyle='rgba(242,245,250,.14)'; uctx.fillRect(x,y,w,10);
        const p=clamp(held/(RULES.javelinChargeMs*1.4),0,1);
        uctx.fillStyle = held<=RULES.javelinChargeMs ? PAL.green : PAL.red;
        uctx.fillRect(x,y,Math.round(w*p),10);
        uctx.fillStyle=PAL.white; uctx.fillRect(x+Math.round(w/1.4)-1,y-3,2,16);
        txt(uctx,'가득 찼을 때 놓으세요',VW/2,y+12,8,PAL.dim,'center');
        txt(uctx, left<0.5&&left>-0.5?'지금 놓아!':`파울선까지 ${Math.max(0,left).toFixed(1)}m`,
            VW/2,44,14,Math.abs(left)<1?PAL.green:PAL.gold,'center',700);
      }
    } else if(this.phase==='FLIGHT'){
      txt(uctx, this.px.toFixed(1)+'m', VW/2, 44, 20, PAL.gold,'center',700);
    } else if(this.phase==='RESULT'){
      const m=this.pending;
      txt(uctx, m===null?'파울':m.toFixed(2)+'m', VW/2, 92, 28, m===null?PAL.red:PAL.gold,'center',700);
    }
    if(this.msg && this.t-this.msgAt<900){ const a=1-(this.t-this.msgAt)/900;
      uctx.save(); uctx.globalAlpha=a;
      txt(uctx,this.msg,VW/2,68,12,this.msgBad?PAL.red:PAL.green,'center',700); uctx.restore(); }
  }
}

/* ── 해머던지기 ───────────────────────────────────────────
   좌·우를 번갈아 두드려 회전을 올리고 → 각도 바늘이 최적일 때 놓는다. */
class HammerEvent extends FieldEvent {
  newAttempt(){
    this.phase='SPIN';
    this.spin=0;            // 회전 각속도 (rad/s)
    this.angle=0;           // 해머 각도
    this.turns=0;
    this.lastSide=0; this.lastTapMs=-1e9;
    this.kick=0; this.kickAt=-1e9;          // 연타 튐
    this.spinStart=-1;
    this.range=0; this.px=0; this.py=0; this.vx=0; this.vy=0;
    this.releaseAngle=0; this.foul=false;
    this.runner = new Runner(1,{},true,1);   // 판정 재사용
    this.runner.reset(0);
  }
  onStride(side,tMs){
    if(this.phase!=='SPIN') return;
    if(this.spinStart<0) this.spinStart=tMs;
    if(this.lastSide===side){
      this.say('같은 쪽!', true); this.spin=Math.max(0,this.spin-0.5);
      /* 실수도 손에 느껴져야 한다 — 회전이 풀리는 감각 */
      Sfx.beep(140, 0.09, 'sawtooth', 0.12); Screen.shake(0.25); this.kick=-1; this.kickAt=tMs;
    }
    else {
      const dt=tMs-this.lastTapMs;
      const gain = this.lastTapMs<-1e8 ? 0.9 : clamp(420/Math.max(60,dt), 0.25, 1.5);
      this.spin = Math.min(RULES.hammerMaxSpin, this.spin + gain*0.62);
      this.turns += 0.5;
      /* ── 연타 손맛 ────────────────────────────────────────
         이 종목은 **연타가 곧 기믹**이다(빨리 칠수록 회전이 오른다).
         그런데 반응이 짧은 삑 소리 하나뿐이라 '두드리는 맛'이 없었다.
         누를 때마다 즉시 튀고, 회전이 오를수록 화면이 같이 달아오르게 한다. */
      const hot = clamp(this.spin/RULES.hammerMaxSpin, 0, 1);
      this.kick = 1;                                   // 이번 타의 튐(그리기에서 쓴다)
      this.kickAt = tMs;
      Sfx.beep(220+this.spin*70, 0.05,'square',0.09+hot*0.06);
      if(hot>0.35){ Screen.shake(0.15 + hot*0.55); Sfx.whoosh(hot); }
      Track.cheer(hot*0.5);
    }
    this.lastSide=side; this.lastTapMs=tMs;
  }
  onAction(tMs){
    if(this.phase!=='SPIN') return;
    if(this.spin < RULES.hammerMinSpin){ this.say('회전이 부족하다', true); return; }
    this.release(tMs);
  }
  /* ⛔ **화면은 7.0 이 최적이라고 말하는데 물리는 8.5까지 보상하고 있었다.**
     회전 게이지는 `spin >= RULES.hammerOptSpin` 이면 초록으로 바뀐다 — 즉 '여기가 목표'라고
     알려 준다. 그런데 `release` 는 `spin` 을 그대로 곱해서, 초록을 지나 상한까지 돌리면
     훨씬 멀리 난다. 실측(2026-09-04): 회전 7.0 → 원반 74.0m(세계기록 74.35m) ·
     **회전 8.5 → 100.7m**. 화면을 믿은 사람이 손해를 본다.
     `hammerOptSpin` 은 그때까지 **그림 색칠에만** 쓰이고 물리에는 안 닿아 있었다
     (링의 `overshoot` 와 같은 병 — 선언은 있고 배선이 없다).
     넘긴 만큼 깎는다. 창던지기의 과충전 벌(charge>1 이면 되돌아온다)과 같은 모양이다. */
  effSpin(){
    const opt = RULES.hammerOptSpin, s = this.spin;
    return s <= opt ? s : Math.max(RULES.hammerMinSpin, opt - (s-opt)*0.8);
  }
  release(tMs){
    // 각도 바늘이 24°~66° 안에 있어야 유효, 45°가 최적
    const deg = ((this.angle*180/Math.PI) % 360 + 360) % 360;
    const shot = deg > 90 ? 90 - (deg-90) : deg;         // 0~90 으로 접는다
    this.releaseAngle = shot;
    this.foul = shot < RULES.hammerMinAngleDeg || shot > RULES.hammerMaxAngleDeg;
    const th = shot*Math.PI/180;
    const v = 4.2 + this.effSpin()*3.1;
    this.vx = v*Math.cos(th); this.vy = v*Math.sin(th);
    this.px=0; this.py=1.6;
    this.phase='FLIGHT';
    if(this.foul) this.say(`섹터 밖 (${shot.toFixed(0)}°)`, true);
    else Sfx.beep(660,0.16,'square',0.14);
  }
  update(dt){
    this.t += dt*1000;
    if(this.phase==='SPIN'){
      this.angle += this.spin*dt;
      this.spin = Math.max(0, this.spin - dt*0.55);        // 안 두드리면 회전이 죽는다
      if(this.spinStart>=0 && this.t - this.spinStart > RULES.hammerAutoReleaseMs){
        this.release(Math.round(this.t));                  // 시간 초과 시 자동 릴리스
      }
    } else if(this.phase==='FLIGHT'){
      this.px += this.vx*dt; this.vy -= 9.81*dt; this.py += this.vy*dt;
      if(this.py<=0){
        this.range = this.foul?0:this.px;
        this.phase='RESULT'; this.resultAt=this.t;
        this.pending = this.foul?null:+this.range.toFixed(2);
        this.foul?Sfx.fail():Sfx.beep(1046,0.2,'square',0.14);
      }
    } else if(this.phase==='RESULT'){
      if(this.t-this.resultAt>1600) this.nextAttempt(this.pending===undefined?null:this.pending);
    }
    Sfx.crowd(this.phase==='SPIN'?clamp(this.spin/8,0,1)*0.7:0.4);
  }
  draw(ctx){
    const scale = this.phase==='FLIGHT'||this.phase==='RESULT' ? 0.26 : 0.10;
    this.mPerPx += (scale-this.mPerPx||0)*0.06 || 0;
    if(!this.mPerPx || !isFinite(this.mPerPx)) this.mPerPx=0.10;
    const gt = Track.fieldBack(ctx, 20);
    const GROUND = Track.fieldGround(ctx, { grassTop: gt, surface: PAL.grass });
    const CX=76;
    const px=(m)=>Math.round(CX + m/this.mPerPx);
    // 서클(콘크리트)
    ctx.fillStyle=PAL.wallDark; ctx.fillRect(CX-24, GROUND-4, 48, 4);
    ctx.fillStyle=PAL.wall;     ctx.fillRect(CX-24, GROUND-4, 48, 2);
    for(let m=10;m<=90;m+=10){ const x=px(m); if(x<=CX||x>=VW) continue;
      ctx.fillStyle='rgba(242,245,250,.4)';  ctx.fillRect(x,GROUND-8,1,8);
      ctx.fillStyle='rgba(242,245,250,.65)'; Track.num(ctx,x+2,GROUND-16,m); }
    /* 해머·원반 — 위와 같은 이유. 회전 종목이라 곰처럼 무거운 종족을 쓴다. */
    /* ⛔ 위상이 0.25 고정이라 **회전 종목인데 선수가 얼어 있었다.**
       해머·원반은 자기 회전각(this.angle)을 갖고 있다 — 그게 곧 자세다. */
    const spinPh = this.phase==='SPIN'
      ? ((this.angle/(Math.PI*2)) % 1 + 1) % 1 : 0.25;
    if(!(CharHD.enabled && CharHD.draw(Screen.uctx, 'bear', CX, GROUND, spinPh,
          { act:'spin', throwing:this.phase!=='SPIN', rare:3, t:this.t, scale:1.3 })))
      drawRunner(ctx, CX, GROUND, 0.25, '#ff6b8a', { throwing:this.phase!=='SPIN' });
    if(this.phase==='SPIN'){
      const hot = clamp(this.spin/RULES.hammerMaxSpin, 0, 1);
      /* 잔상 — 회전이 빠를수록 지나온 자리가 남는다. 속도를 눈으로 만든다. */
      const r=26;
      if(hot>0.25){
        for(let k=1;k<=3;k++){
          const a2=this.angle - k*0.22*hot;
          const gx=CX+Math.cos(a2)*r, gy=GROUND-16-Math.sin(a2)*r*0.6;
          ctx.globalAlpha = (0.26 - k*0.07) * hot;
          ctx.strokeStyle='#ffd75e'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(CX,GROUND-16); ctx.lineTo(gx,gy); ctx.stroke();
        }
        ctx.globalAlpha=1;
      }
      /* 해머 — 선수를 중심으로 돈다. 한 번 칠 때마다 살짝 늘어난다(튐). */
      const kick = (this.kick && this.t-this.kickAt<120) ? (1-(this.t-this.kickAt)/120)*this.kick : 0;
      const rr = r + kick*4;
      const hx=CX+Math.cos(this.angle)*rr, hy=GROUND-16-Math.sin(this.angle)*rr*0.6;
      /* 연타 링(fx-tap-ring) — 두드린 자리에서 고리가 퍼진다.
         ⚠ 소리와 화면 흔들림만으로는 '내가 쳤다'가 눈에 안 보였다. 타격 지점에
            고리를 띄우면 연타가 손끝에서 화면으로 이어진다. 4프레임 · 180ms. */
      if(this.kick>0){
        const age=this.t-this.kickAt;
        if(age<180) BG.fx(BG.ctx(),'fx-tap-ring', hx, hy+6, 22+kick*10,
                          clamp(age/180,0,0.999), 4);
      }
      ctx.strokeStyle= kick>0 ? '#ffffff' : '#c9cede'; ctx.lineWidth= kick>0?2:1;
      ctx.beginPath(); ctx.moveTo(CX,GROUND-16); ctx.lineTo(hx,hy); ctx.stroke();
      if(BG.obj(BG.ctx(),'shot-hd',hx,hy+8,16)){ /* HD */ }
      else if(!Art.blit(ctx,'hammer',hx,hy,'center')){
        ctx.fillStyle=PAL.gold; ctx.fillRect(Math.round(hx)-3,Math.round(hy)-3,6,6); }
    } else {
      const hx=px(this.px), hy=GROUND-this.py/this.mPerPx;
      /* 날아가는 물체 — 종목마다 다른 어셋 */
      const flyName = (this.def.id==='discus') ? 'discus-hd'
                    : (this.def.id==='shotPut') ? 'shot-hd' : null;
      if(flyName && BG.obj(BG.ctx(), flyName, hx, Math.min(GROUND-2,Math.round(hy))+8, 16)){ /* HD */ }
      else if(!Art.blit(ctx,'hammer',hx,Math.min(GROUND-2,Math.round(hy)),'center')){
        ctx.fillStyle=PAL.gold; ctx.fillRect(hx-3,Math.min(GROUND-2,Math.round(hy))-3,6,6); }
    }
  }
  drawUI(uctx){
/* ⛔ 기준이 크고 내 최고가 작던 위계를 바로잡는다(05_scoreboard) */
    SB.tally(uctx, {
      name: this.def.name,
      progress: `${Math.min(this.attempt+1,3)} / 3` + K('차'),
      mine: this.best, fmt: v => v > 0 ? v.toFixed(1)+'m' : '--.--',
      cuts: medalCuts(this.def), higher: !!this.def.higher,
      history: (this.marks||[]).filter(m => m !== undefined)
                 .map(m => m === null ? 'F' : +(+m).toFixed(2)),
    });
    txt(uctx, K('회전')+' '+(this.spin.toFixed(1)), 8, 36, 9, this.spin>=RULES.hammerOptSpin?PAL.green:(this.spin>=RULES.hammerMinSpin?PAL.gold:PAL.red), 'left');

    if(this.phase==='SPIN'){
      plate(uctx,0,Track.GAUGE_Y,VW,Track.GAUGE_H,0.82);
      txt(uctx,'좌·우를 번갈아 두드려 회전을 올리세요',VW/2,44,12,PAL.white,'center',700);
      // 회전 게이지
      const w=140,x=24,y=Track.GAUGE_Y+9;
      uctx.fillStyle='rgba(242,245,250,.14)'; uctx.fillRect(x,y,w,10);
      const opt=RULES.hammerOptSpin/RULES.hammerMaxSpin;
      uctx.fillStyle='rgba(92,255,156,.4)'; uctx.fillRect(x+w*opt-6,y,20,10);
      const hot2=clamp(this.spin/RULES.hammerMaxSpin,0,1);
      uctx.fillStyle=this.spin>=RULES.hammerMinSpin?PAL.green:PAL.red;
      uctx.fillRect(x,y,Math.round(w*hot2),10);
      /* 최고 회전 근처에서는 게이지가 뛴다 — '지금이다'가 보여야 한다 */
      if(hot2>0.78){
        uctx.globalAlpha = 0.35+0.35*Math.sin(this.t*0.02);
        uctx.fillStyle='#ffffff'; uctx.fillRect(x,y,Math.round(w*hot2),10);
        uctx.globalAlpha=1;
      }
      txt(uctx,'회전',x,y+12,8,PAL.dim);
      // 각도 바늘
      const deg=((this.angle*180/Math.PI)%360+360)%360;
      const shot = deg>90 ? 90-(deg-90) : deg;
      const ax=250, aw=180;
      uctx.fillStyle='rgba(242,245,250,.14)'; uctx.fillRect(ax,y,aw,10);
      const lo=RULES.hammerMinAngleDeg/90, hi=RULES.hammerMaxAngleDeg/90;
      uctx.fillStyle='rgba(92,255,156,.25)'; uctx.fillRect(ax+aw*lo,y,aw*(hi-lo),10);
      uctx.fillStyle='rgba(92,255,156,.7)'; uctx.fillRect(ax+aw*(RULES.hammerOptAngleDeg/90)-3,y,6,10);
      uctx.fillStyle=PAL.white; uctx.fillRect(ax+aw*clamp(shot/90,0,1)-1,y-3,2,16);
      txt(uctx,'각도 — 초록에서 액션',ax,y+12,8,PAL.dim);
      const left=Math.max(0,(RULES.hammerAutoReleaseMs-(this.spinStart<0?0:this.t-this.spinStart))/1000);
      txt(uctx,left.toFixed(1)+'초',VW-8,44,12,left<1.5?PAL.red:PAL.dim,'right',700);
    } else if(this.phase==='FLIGHT'){
      txt(uctx,this.px.toFixed(1)+'m',VW/2,44,20,PAL.gold,'center',700);
    } else if(this.phase==='RESULT'){
      const m=this.pending;
      txt(uctx,m===null?'파울':m.toFixed(2)+'m',VW/2,92,28,m===null?PAL.red:PAL.gold,'center',700);
      if(this.releaseAngle) txtOn(uctx,`릴리스 ${this.releaseAngle.toFixed(0)}°  (최적 45°)`,VW/2,124,11,PAL.dim,'center');
    }
    if(this.msg && this.t-this.msgAt<900){ const a=1-(this.t-this.msgAt)/900;
      uctx.save(); uctx.globalAlpha=a;
      txt(uctx,this.msg,VW/2,68,12,this.msgBad?PAL.red:PAL.green,'center',700); uctx.restore(); }
  }
}
