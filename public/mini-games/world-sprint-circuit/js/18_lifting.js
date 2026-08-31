/* ══════════════════════════════════════════════════════════════════
   역도 — 힘 종목의 정수. 투척과 달리 '거리'가 아니라 **버티기**다.

   조작 세 박자
     ① 그립     좌우를 번갈아 눌러 자세를 잡는다 (서두르면 자세가 나쁘다)
     ② 들어올림 액션을 **누르고 있는다** — 게이지가 오르지만 너무 오래면 힘이 샌다
     ③ 버티기   위에서 좌우를 번갈아 눌러 흔들림을 잡는다 (3초)
   실패하면 그 시기는 무효. 3시기 중 최고 중량.

   ⚠ 다른 종목과 달리 '한 번의 타이밍'이 아니라 **세 구간의 연속**이다.
     그래서 중간에 망쳐도 회복할 여지를 준다 — 버티기에서 만회할 수 있다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const LIFT = {
  gripNeed: 4,          // 그립 횟수
  gripIdealMs: 240,     // 그립 사이 이상 간격
  pullMaxMs: 1500,      // 들어올림 최대 시간
  pullBestMs: 900,      // 최적
  holdDur: 3.0,         // 버티는 시간(초)
  swayRate: 2.4,        // 흔들림 속도
  /* 3시기니까 폭을 크게 — 110 → 140 → 170 */
  startKg: 110, stepKg: 30,
};

class LiftingEvent {
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.t=0;
    this.attempt=1; this.attemptsTotal=3;
    this.kg = LIFT.startKg;
    this.best=0; this.marks=[];
    this.result=null; this.doneAt=0;
    this.msg=''; this.msgAt=-1e9; this.flash=0;
    this.newAttempt();
  }
  newAttempt(){
    this.phase='GRIP';           // GRIP → PULL → HOLD → RESULT
    this.grips=0; this.lastGrip=-1e9; this.lastSide=0;
    this.gripQ=0; this.pullQ=0; this.holdQ=1;
    this.holdT=0; this.sway=0; this.swayDir=1;
    this.pullStart=-1; this.pullMs=0;
    this.failed=false;
  }
  get qualify(){ return this.def.qualify; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }

  onStride(side, tMs){
    if(this.phase==='GRIP'){
      if(side===this.lastSide) return;
      const dt = tMs - this.lastGrip;
      if(this.lastGrip>-1e8){
        /* 이상 간격에 가까울수록 좋은 자세 */
        const err = Math.abs(dt - LIFT.gripIdealMs)/LIFT.gripIdealMs;
        this.gripQ += clamp(1-err, 0, 1);
      }
      this.lastGrip=tMs; this.lastSide=side; this.grips++;
      Sfx.beep(300+this.grips*70, 0.05,'square',0.09);
      if(this.grips>=LIFT.gripNeed){
        this.gripQ = clamp(this.gripQ/(LIFT.gripNeed-1), 0, 1);
        this.phase='PULL'; this.say('들어올리세요 — 게이지가 꽉 찰 때 놓는다');
      }
    } else if(this.phase==='HOLD'){
      /* 흔들림 잡기 — 기우는 반대쪽을 눌러야 한다 */
      /* ⚠ 이 게임엔 sign 헬퍼가 없다(천로역정 쪽 것과 혼동했다) */
      /* ⚠ 한 번 눌러 45% 를 지우면 손이 느려도 버틸 수 있다(실측: 전 실력 3/3 성공).
         26% 만 지운다 — 꾸준히 눌러야 버틴다. */
      if(Math.sign(this.sway) === -side) this.sway *= 0.68;
      else this.sway += side*0.06;
      Sfx.beep(760,0.03,'square',0.05);
    }
  }
  onAction(tMs){
    if(this.phase==='PULL' && this.pullStart<0) this.pullStart=tMs;
  }
  onActionUp(tMs){
    if(this.phase!=='PULL' || this.pullStart<0) return;
    this.pullMs = tMs - this.pullStart;
    const err = Math.abs(this.pullMs - LIFT.pullBestMs)/LIFT.pullBestMs;
    this.pullQ = clamp(1-err, 0, 1);
    this.pullStart=-1;
    if(this.pullQ < 0.18){ this.fail('들어올리지 못했다'); return; }
    /* ⛔ pullQ 를 **계산만 하고 안 썼다**(2026-08-31 실측): 0.4초·0.9초·1.6초를 당겨도
       결과가 똑같이 170kg 이었다. 세 박자 중 가운데가 결과에 닿지 않으면 그건 박자가 아니다.
       gripQ 와 같은 방식으로 잇는다 — 급하게 뽑은 바벨은 **기울어진 채로 올라온다.** */
    this.phase='HOLD'; this.holdT=0;
    this.sway=(Math.random()*2-1) * lerp(0.42, 0.10, this.pullQ);
    this.say(this.pullQ>0.8?'깨끗한 인상!':'들었다');
    Sfx.beep(560,0.14,'square',0.14);
  }
  fail(msg){
    this.failed=true; this.say(msg||'실패', true); Sfx.fail();
    this.phase='RESULT'; this.resultAt=this.t;
  }
  finishAttempt(){
    if(!this.failed){
      this.marks.push(this.kg);
      this.best = Math.max(this.best, this.kg);
      this.kg += LIFT.stepKg;          // 성공하면 무게를 올린다
    }
    /* ⚠ 실패만 시기를 쓰게 했더니 잘하는 사람은 **영영 안 끝났다**(실측 270kg 까지).
       실제 역도처럼 성공·실패 모두 한 시기를 쓴다 — 3번 들고 최고 중량이 기록이다. */
    this.attempt++;
    if(this.attempt > this.attemptsTotal){
      const passed = this.best >= this.qualify;
      this.phase='DONE'; this.doneAt=this.t;
      this.result = { status: passed?'OK':'MISSED_QUALIFY', value:this.best, rank:1 };
      passed ? (Sfx.thud(), Sfx.finish()) : Sfx.fail();
    } else this.newAttempt();
  }
  update(dt){
    this.t += dt*1000;
    if(this.phase==='PULL'){
      if(this.pullStart>=0 && this.t-this.pullStart > LIFT.pullMaxMs){
        this.onActionUp(Math.round(this.t));      // 너무 오래 — 자동으로 놓는다
      }
    } else if(this.phase==='HOLD'){
      this.holdT += dt;
      /* 무게가 클수록·자세가 나쁠수록 더 흔들린다 */
      const load = (this.kg - LIFT.startKg)/120;
      /* ⚠ 폭(1.4~0.6)은 그대로 두고 **무엇이 그 폭을 정하는가**만 바꾼다 —
         자세(그립)와 인상(당김)을 55:45 로 섞는다. 어려워지는 게 아니라 이어지는 것이다. */
      const liftQ = this.gripQ*0.55 + this.pullQ*0.45;
      this.sway += this.swayDir * dt * LIFT.swayRate * (0.6 + load*1.5) * lerp(1.4, 0.6, liftQ);
      if(Math.random()<0.03) this.swayDir *= -1;
      this.sway = clamp(this.sway, -1.6, 1.6);
      if(Math.abs(this.sway) >= 1.0){ this.fail('바벨이 넘어갔다'); return; }
      this.holdQ = clamp(1 - Math.abs(this.sway), 0, 1);
      if(this.holdT >= LIFT.holdDur){
        this.phase='RESULT'; this.resultAt=this.t; this.flash=1;
        this.say(`성공 ${this.kg}kg`); Sfx.finish();
      }
    } else if(this.phase==='RESULT'){
      if(this.t-this.resultAt > 1300) this.finishAttempt();
    }
    this.flash=Math.max(0,this.flash-dt*3);
    Sfx.crowd(this.phase==='HOLD' ? 0.85 : 0.35);
  }

  draw(ctx){
    /* 실내 무대 */
    /* ⚠ 역도는 실내다. 밤 야외 경기장을 겹쳐 그리면 두 세계가 섞인다. */
    let GROUND = 214;
    if(BG.fill(BG.ctx(),'platform-lift', 0, VH)){ /* HD 한 장 */ }
    else {
      const gt = Track.fieldBack(ctx, 20);
      GROUND = Track.fieldGround(ctx,{grassTop:gt, surface:'#6b5442'});
    }
    const CX = VW/2;
    /* 선수 — 흔들림에 따라 기운다 */
    const tilt = (this.phase==='HOLD') ? this.sway*0.30 : 0;
    let y = GROUND;
    if(this.phase==='PULL' && this.pullStart>=0)
      y -= clamp((this.t-this.pullStart)/LIFT.pullMaxMs,0,1)*4;
    if(CharHD.enabled){
      (this._hd=this._hd||[]).push({ sp:'gorilla', x:CX, y, ph:0.25,
        o:{ act:'press', throwing:this.phase!=='GRIP', rare:4, t:this.t, rot:tilt, scale:1.45 } });
    } else { ctx.fillStyle='#8a6a4a'; ctx.fillRect(CX-7, y-26, 14, 26); }
    /* 힘주기 — 버티는 동안 머리 위에 3단계로. 기울수록 세게 표시된다.
       ⚠ HOLD 단계에서만. 흔들림(sway)이 클수록 높은 단계를 쓴다. */
    if(this.phase==='HOLD'){
      const strain = clamp(Math.abs(this.sway||0)*1.6, 0, 0.999);
      BG.fx(BG.ctx(), 'strain-mark', CX, y-46, 20, strain, 3);
    }
    /* 탄마 가루 — 잡기 단계에서 손을 턴다. 역도의 시작 의식이다.
       ⚠ 4프레임 시트다(BG.fx 가 진행도 0~1 로 고른다). 잡기 단계에서만 돈다. */
    if(this.phase==='GRIP'){
      const cyc = (this.t % 1600) / 1600;
      if(cyc < 0.45) BG.fx(BG.ctx(), 'chalk-puff', CX-18, y-16, 22, cyc/0.45, 4);
    }
    /* 원판 거치대 — 무대의 소품. 선수 뒤 양옆에 놓아 '역도장'이라는 걸 말한다.
       ⚠ 선수(CX)와 겹치지 않게 좌우로 충분히 물린다. 어셋이 없으면 아무것도 안 그린다. */
    BG.obj(BG.ctx(), 'plate-rack-hd', CX-96, y+2, 30);
    BG.obj(BG.ctx(), 'plate-rack-hd', CX+96, y+2, 30);
    /* 바벨 — 선수 키(42) 기준으로 손 위치를 잡는다.
       ⚠ 예전 값은 선수 머리 위로 붕 떠 있었다(실측 스크린샷). */
    const barY = (this.phase==='HOLD') ? y-52 : (this.phase==='PULL' ? y-26 : y-8);
    const bx = CX + (this.phase==='HOLD' ? this.sway*10 : 0);
    /* 원판 — 무게가 오르면 눈에 보여야 한다(어셋이 있으면 바 위에 얹는다) */
    if(BG.obj(BG.ctx(),'barbell-hd', bx, barY+8, 16)){
      const plates = clamp((this.weight||0)/220, 0.3, 1);
      BG.obj(BG.ctx(),'barbell-plates', bx-13, barY+8, 10*plates+6);
      BG.obj(BG.ctx(),'barbell-plates', bx+13, barY+8, 10*plates+6);
    } else if(true){
      ctx.fillStyle='#c9cede'; ctx.fillRect(Math.round(bx)-24, Math.round(barY), 48, 3);
      ctx.fillStyle='#8a90a6';
      ctx.fillRect(Math.round(bx)-28, Math.round(barY)-6, 6, 15);
      ctx.fillRect(Math.round(bx)+22, Math.round(barY)-6, 6, 15);
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.35})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    if(this._hd){ for(const c of this._hd) CharHD.draw(u, c.sp, c.x, c.y, c.ph, c.o); this._hd=null; }
    SB.tally(u, {
      name: this.def.name,
      /* 지금 드는 무게가 진행 상황이다 — 시기와 함께 보여 준다 */
      progress: `${this.kg}kg · ${this.attempt}/${this.attemptsTotal}차`,
      mine: this.best, unit: 'kg',
      cuts: medalCuts(this.def), higher: !!this.def.higher,
      history: this.marks || [],
    });

    if(this.phase==='GRIP'){
      txt(u,'좌·우를 고르게 번갈아 눌러 자세를 잡으세요', VW/2, VH-40, 10, PAL.white,'center');
      for(let i=0;i<LIFT.gripNeed;i++){
        u.fillStyle = i<this.grips ? PAL.green : 'rgba(255,255,255,.18)';
        u.fillRect(VW/2-34+i*18, Track.botY(26), 14, 7);
      }
    } else if(this.phase==='PULL'){
      const held = this.pullStart>=0 ? this.t-this.pullStart : 0;
      const bw=170, bx=VW/2-bw/2, by=Track.botY(26);
      u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(bx,by,bw,9);
      const best=LIFT.pullBestMs/LIFT.pullMaxMs;
      u.fillStyle='rgba(92,255,156,.45)'; u.fillRect(bx+bw*(best-0.11), by, bw*0.22, 9);
      u.fillStyle='#ffffff'; u.fillRect(bx+Math.round(bw*clamp(held/LIFT.pullMaxMs,0,1))-1, by-3, 2, 15);
      txt(u,'누르고 있다가 초록에서 떼세요', VW/2, VH-40, 10, PAL.gold,'center',700);
    } else if(this.phase==='HOLD'){
      txt(u,`버티기 ${(LIFT.holdDur-this.holdT).toFixed(1)}초`, VW/2, VH-40, 11, PAL.white,'center',700);
      const bw=180, bx=VW/2-bw/2, by=Track.botY(24);
      u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(bx,by,bw,8);
      u.fillStyle='rgba(255,138,138,.30)';
      u.fillRect(bx,by,bw*0.12,8); u.fillRect(bx+bw*0.88,by,bw*0.12,8);
      const px2 = bx+bw/2 + (this.sway/1.6)*(bw/2);
      u.fillStyle = Math.abs(this.sway)>0.7 ? PAL.red : PAL.green;
      u.fillRect(px2-3, by-3, 6, 14);
      txt(u,'기우는 반대쪽을 누르세요', VW/2, Track.botY(11), 8, PAL.dim,'center');
    }
    if(this.t-this.msgAt < 1100)
      txt(u, this.msg, VW/2, 44, 13, this.msgBad?PAL.red:PAL.green, 'center', 700);
    this.marks.forEach((m,i)=> txt(u, `${m}kg`, 8, 24+i*12, 9, PAL.green, 'left'));
  }
}
