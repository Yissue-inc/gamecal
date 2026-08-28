/* ══════════════════════════════════════════════════════════════════
   다이빙 — 수영장을 재사용한다.

   조작 세 박자
     ① 발판 반동   좌우를 번갈아 눌러 반동을 키운다 (3회)
     ② 도약        초록 구간에서 액션 — 높이가 정해진다
     ③ 회전·입수   공중에서 좌우 연타로 회전, 수면 직전에 액션으로 편다
   점수 = 높이 x 회전수 x 입수 정확도 x 난도

   ⚠ 이 게임의 다른 종목은 '거리·시간'이지만 다이빙은 **점수**다.
     higher:true 로 두고 단위를 점으로 쓴다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const DIVE = {
  bounceNeed: 3,          // 발판 반동 횟수
  windowMs: 900,          // 도약 창이 열려 있는 시간
  fallDur: 1.55,          // 입수까지
  entryWindow: 0.16,      // 입수 판정(초)
  maxSpin: 6,
};

class DivingEvent {
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.phase='BOUNCE';      // BOUNCE → LAUNCH → AIR → RESULT
    this.t=0; this.bounces=0; this.lastSide=0;
    this.power=0; this.height=0;
    this.spin=0; this.entryQ=0; this.opened=false;
    this.attempt=1; this.attemptsTotal=3;
    this.marks=[]; this.best=0;
    this.result=null; this.doneAt=0;
    this.msg=''; this.msgAt=-1e9; this.flash=0;
    this.launchAt=0;
  }
  get qualify(){ return this.def.qualify; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }

  onStride(side, tMs){
    if(this.phase==='BOUNCE'){
      if(side===this.lastSide) return;         // 번갈아 눌러야 한다
      this.lastSide=side; this.bounces++;
      this.power = Math.min(1, this.power + 0.34);
      Sfx.beep(420+this.bounces*90, 0.07, 'square', 0.10);
      if(this.bounces>=DIVE.bounceNeed){
        this.phase='LAUNCH'; this.launchAt=this.t; this.say('지금 뛰세요!');
      }
    } else if(this.phase==='AIR'){
      /* 공중 회전 — 연타할수록 회전이 는다 */
      this.spin = Math.min(DIVE.maxSpin, this.spin + 0.5);
      Sfx.beep(900+this.spin*40, 0.03, 'square', 0.06);
    }
  }
  onAction(tMs){
    if(this.phase==='LAUNCH'){
      /* 창 한가운데가 최적 */
      const el = this.t - this.launchAt;
      const q  = clamp(1 - Math.abs(el - DIVE.windowMs*0.5)/(DIVE.windowMs*0.5), 0, 1);
      this.height = clamp(0.45 + this.power*0.35 + q*0.35, 0, 1.15);
      this.phase='AIR'; this.airT=0; this.opened=false;
      this.say(q>0.8?'완벽한 도약!':'도약', q<0.35);
      Sfx.beep(660,0.12,'square',0.14);
    } else if(this.phase==='AIR' && !this.opened){
      /* 입수 — 수면 직전에 펴야 한다 */
      const left = DIVE.fallDur - this.airT;
      this.entryQ = clamp(1 - Math.abs(left - 0.10)/DIVE.entryWindow, 0, 1);
      this.opened = true;
      this.say(this.entryQ>0.75?'물보라 없이!':`입수 ${Math.round(this.entryQ*100)}%`, this.entryQ<0.35);
      Sfx.beep(this.entryQ>0.75?1320:520, 0.10,'square',0.12);
    }
  }
  onActionUp(){}

  finishAttempt(){
    /* 회전이 많을수록 난도가 오르고, 입수가 나쁘면 그만큼 깎인다 */
    const diff = 1.6 + this.spin*0.22;
    const score = this.height*22 * diff * lerp(0.35, 1.0, this.opened? this.entryQ : 0);
    const v = +Math.max(0, score).toFixed(2);
    this.marks.push(v);
    this.best = Math.max(this.best, v);
    this.flash = 1;
    if(this.attempt >= this.attemptsTotal){
      const passed = this.best >= this.qualify;
      this.phase='DONE'; this.doneAt=this.t;
      this.result = { status: passed?'OK':'MISSED_QUALIFY', value:this.best, rank:1 };
      passed ? Sfx.finish() : Sfx.fail();
    } else {
      this.attempt++;
      this.phase='BOUNCE'; this.bounces=0; this.power=0; this.lastSide=0;
      this.spin=0; this.entryQ=0; this.opened=false;
    }
  }

  update(dt){
    this.t += dt*1000;
    if(this.phase==='LAUNCH'){
      /* 창을 놓치면 그냥 떨어진다 */
      if(this.t - this.launchAt > DIVE.windowMs){
        this.height = 0.35; this.phase='AIR'; this.airT=0; this.opened=false;
        this.say('타이밍을 놓쳤다', true);
      }
    } else if(this.phase==='AIR'){
      this.airT = (this.airT||0) + dt;
      if(this.airT >= DIVE.fallDur){
        if(!this.opened){ this.entryQ = 0.08; this.say('배치기!', true); Sfx.fail(); }
        this.phase='RESULT'; this.resultAt=this.t;
        Sfx.splash ? Sfx.splash() : Sfx.beep(240,0.2,'sine',0.12);
      }
    } else if(this.phase==='RESULT'){
      if(this.t - this.resultAt > 1400) this.finishAttempt();
    }
    this.flash = Math.max(0, this.flash - dt*3);
    Sfx.crowd(this.phase==='AIR' ? 0.8 : 0.3);
  }

  draw(ctx){
    /* 수영장 무대를 그대로 쓴다 */
    const V = Venue.pool(ctx, this.t, this.def);
    const boardX = 78, waterY = 150;
    /* 스프링보드 */
    if(!BG.obj(BG.ctx(),'springboard-hd', boardX, waterY-52, 24)){
      ctx.fillStyle='#c9cede'; ctx.fillRect(boardX-26, waterY-54, 54, 4);
      ctx.fillStyle='#8a90a6'; ctx.fillRect(boardX-24, waterY-50, 6, 50);
    }
    /* 선수 */
    let x=boardX+10, y=waterY-58, rot=0;
    if(this.phase==='BOUNCE'){ y += Math.sin(this.t*0.02)*3 - this.power*6; }
    else if(this.phase==='LAUNCH'){ y -= 6; }
    else if(this.phase==='AIR'){
      const p = clamp(this.airT/DIVE.fallDur, 0, 1);
      const up = Math.sin(p*Math.PI) * (26 + this.height*44);
      y = waterY - 58 - up + p*p*70;
      x = boardX + 10 + p*46;
      rot = this.spin * p * Math.PI * 0.9;
      if(this.opened) rot = Math.PI*0.5;      // 편 자세
    } else if(this.phase==='RESULT'){ y = waterY+6; x = boardX+56; }

    if(CharHD.enabled){
      (this._hd=this._hd||[]).push({ sp:'otter', x, y, ph:(this.t*0.01)%1,
        o:{ airborne:this.phase==='AIR', rare:2, t:this.t, rot } });
    } else {
      ctx.fillStyle='#5aaaff'; ctx.fillRect(Math.round(x)-5, Math.round(y)-14, 10, 14);
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.4})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    if(this._hd){ for(const c of this._hd) CharHD.draw(u, c.sp, c.x, c.y, c.ph, c.o); this._hd=null; }
    txt(u, this.def.name, 8, 6, 12, PAL.gold, 'left', 700);
    txt(u, `${this.attempt} / ${this.attemptsTotal}차`, VW/2, 6, 11, PAL.white, 'center');
    txt(u, this.qualify.toFixed(1)+'점', VW-8, 6, 12,
        this.best>=this.qualify?PAL.green:PAL.red, 'right', 700);
    txt(u, `최고 ${this.best.toFixed(2)}`, VW-8, 20, 10, PAL.dim, 'right');

    if(this.phase==='BOUNCE'){
      txt(u,'좌·우를 번갈아 눌러 반동을 키우세요', VW/2, VH-42, 10, PAL.white, 'center');
      const bw=140, bx=VW/2-bw/2, by=VH-28;
      u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(bx,by,bw,7);
      u.fillStyle=PAL.green; u.fillRect(bx,by,Math.round(bw*this.power),7);
    } else if(this.phase==='LAUNCH'){
      const el=this.t-this.launchAt, p=clamp(el/DIVE.windowMs,0,1);
      const bw=160, bx=VW/2-bw/2, by=VH-28;
      u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(bx,by,bw,9);
      u.fillStyle='rgba(92,255,156,.45)'; u.fillRect(bx+bw*0.34,by,bw*0.32,9);   // 초록 구간
      u.fillStyle='#ffffff'; u.fillRect(bx+Math.round(bw*p)-1, by-3, 2, 15);
      txt(u,'초록에서 액션', VW/2, VH-42, 10, PAL.gold, 'center', 700);
    } else if(this.phase==='AIR'){
      txt(u,`회전 ${this.spin.toFixed(1)}`, VW/2, VH-42, 11, PAL.white, 'center', 700);
      if(!this.opened) txt(u,'수면 직전에 액션으로 펴세요', VW/2, VH-28, 9, PAL.dim, 'center');
    }
    if(this.t - this.msgAt < 1100)
      txt(u, this.msg, VW/2, 46, 13, this.msgBad?PAL.red:PAL.green, 'center', 700);
    /* 시기 기록 */
    this.marks.forEach((m,i)=> txt(u, `${i+1}차 ${m.toFixed(2)}`, 8, 24+i*12, 9, PAL.dim, 'left'));
  }
}
