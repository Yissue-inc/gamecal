/* ══════════════════════════════════════════════════════════════════
   양궁 — 이 게임 유일의 '정지 조준' 종목.

   다른 종목이 리듬·연타라면 양궁은 **숨을 참고 멈추는 것**이다.
   조작
     ① 당기기  액션을 누르고 있으면 시위가 당겨진다 (충분히 당겨야 사거리가 난다)
     ② 조준    당기는 동안 조준점이 흔들린다. 좌우로 미세 보정한다.
               ⚠ 오래 당길수록 숨이 차서 흔들림이 커진다 — 빨리 쏠수록 안정적이지만
                 덜 당기면 아래로 떨어진다. 그 사이를 고르는 게 이 종목이다.
     ③ 발사    액션을 떼면 쏜다
   6발 합계. 10점 만점 x 6 = 60점.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const ARCH = {
  arrows: 6,
  drawFullMs: 900,        // 완전히 당기는 데 걸리는 시간
  steadyMs: 1400,         // 이때까지는 흔들림이 작다
  swayBase: 0.16,         // 기본 흔들림(과녁 반지름 대비)
  swayGrow: 0.55,         // 숨이 차면서 커지는 속도(초당)
  aimNudge: 0.075,        // 좌우 보정 한 번의 크기
  ringR: 1.0,             // 정규화 반지름 (0 = 정중앙)
};

class ArcheryEvent {
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.t=0; this.arrow=1;
    this.scores=[]; this.total=0;
    this.result=null; this.doneAt=0;
    this.msg=''; this.msgAt=-1e9; this.flash=0;
    this.newArrow();
  }
  newArrow(){
    this.phase='AIM';                 // AIM → SHOT → RESULT
    this.drawStart=-1; this.drawMs=0;
    this.aimX=(Math.random()*2-1)*0.10; this.aimY=(Math.random()*2-1)*0.10;
    this.swayPhase=Math.random()*6.28;
    this.hit=null;
  }
  get qualify(){ return this.def.qualify; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }

  /* 좌우 = 조준 미세 보정 */
  onStride(side, tMs){
    if(this.phase!=='AIM' || this.drawStart<0) return;
    this.aimX -= side*ARCH.aimNudge;
    Sfx.beep(880,0.02,'sine',0.05);
  }
  onAction(tMs){
    if(this.phase==='AIM' && this.drawStart<0){ this.drawStart=tMs; Sfx.beep(300,0.08,'sawtooth',0.09); }
  }
  onActionUp(tMs){
    if(this.phase!=='AIM' || this.drawStart<0) return;
    this.drawMs = tMs - this.drawStart;
    this.shoot();
  }
  /* 지금 흔들리는 정도 */
  swayAmt(){
    const held = this.drawStart<0 ? 0 : (this.t - this.drawStart);
    const over = Math.max(0, held - ARCH.steadyMs)/1000;
    return ARCH.swayBase + over*ARCH.swayGrow;
  }
  shoot(){
    const drawQ = clamp(this.drawMs / ARCH.drawFullMs, 0, 1.2);
    /* 덜 당기면 아래로 떨어진다 */
    const drop = drawQ < 1 ? (1-drawQ)*0.9 : 0;
    const sw = this.swayAmt();
    const ox = this.aimX + Math.cos(this.swayPhase)*sw;
    const oy = this.aimY + Math.sin(this.swayPhase*1.3)*sw + drop;
    const r = Math.hypot(ox, oy);
    /* 10점(중앙) ~ 1점, 과녁 밖은 0 */
    const score = r>=ARCH.ringR ? 0 : Math.max(1, Math.ceil((1 - r/ARCH.ringR)*10));
    this.hit = {x:ox, y:oy, score};
    this.scores.push(score); this.total += score;
    this.phase='RESULT'; this.resultAt=this.t; this.flash=1;
    this.say(score===10?'정중앙!':score===0?'과녁을 벗어났다':`${score}점`, score<=4);
    Sfx.bow();
    Sfx.beep(score>=9?1320:score>=6?880:420, 0.12,'square',0.12);
  }
  update(dt){
    this.t += dt*1000;
    if(this.phase==='AIM'){
      this.swayPhase += dt*2.4;
      if(this.drawStart>=0 && this.t-this.drawStart > 4200){
        this.drawMs = this.t-this.drawStart; this.shoot();   // 너무 오래 — 손이 풀린다
        this.say('너무 오래 당겼다', true);
      }
    } else if(this.phase==='RESULT'){
      if(this.t-this.resultAt > 1100){
        if(this.arrow >= ARCH.arrows){
          const passed = this.total >= this.qualify;
          this.phase='DONE'; this.doneAt=this.t;
          this.result={ status:passed?'OK':'MISSED_QUALIFY', value:this.total, rank:1 };
          passed?Sfx.finish():Sfx.fail();
        } else { this.arrow++; this.newArrow(); }
      }
    }
    this.flash=Math.max(0,this.flash-dt*3);
    Sfx.crowd(this.phase==='AIM' ? 0.25 : 0.6);
  }

  draw(ctx){
    /* ⚠ 양궁장 어셋은 '낮'이다. 밤 경기장(관중·조명)을 함께 그리면 두 세계가 섞인다.
       어셋이 있으면 그것만 쓰고, 없을 때만 기존 무대를 그린다. */
    let GROUND=214;
    if(BG.fill(BG.ctx(),'range-archery', 0, VH)){ /* HD 한 장이 화면을 채운다 */ }
    else {
      const gt=Track.fieldBack(ctx, 12);
      GROUND = Track.fieldGround(ctx,{grassTop:gt, surface:PAL.grass});
    }
    /* 과녁 — 화면 오른쪽 */
    const TX=VW-92, TY=GROUND-64, TR=40;
    if(!BG.obj(BG.ctx(),'target-hd', TX, TY+TR, TR*2)){
      const cols=['#f2f5fa','#f2f5fa','#0d5eaf','#0d5eaf','#e03c31','#ffd75e'];
      for(let i=5;i>=0;i--){
        ctx.fillStyle=cols[i];
        ctx.beginPath(); ctx.arc(TX, TY, TR*(i+1)/6, 0, Math.PI*2); ctx.fill();
      }
    }
    /* 꽂힌 화살들 */
    this.scores.forEach((sc,i)=>{
      if(sc===0) return;
      const h=this._hits && this._hits[i]; if(!h) return;
      ctx.fillStyle='#2a2418';
      ctx.fillRect(Math.round(TX+h.x*TR)-1, Math.round(TY+h.y*TR)-1, 3, 3);
    });
    /* 선수 — 왼쪽 */
    const SX=64;
    if(CharHD.enabled){
      (this._hd=this._hd||[]).push({ sp:'eagle', x:SX, y:GROUND, ph:0.25,
        o:{ throwing:true, rare:3, t:this.t, scale:1.35 } });
    } else { ctx.fillStyle='#5aaaff'; ctx.fillRect(SX-6, GROUND-26, 12, 26); }
    /* 활 */
    const pull = this.drawStart<0 ? 0 : clamp((this.t-this.drawStart)/ARCH.drawFullMs, 0, 1);
    if(!BG.obj(BG.ctx(),'bow-hd', SX+12, GROUND-6, 26)){
      ctx.strokeStyle='#a8763a'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(SX+14, GROUND-18, 11, -1.2, 1.2); ctx.stroke();
      ctx.strokeStyle='#e8e2d6'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(SX+18, GROUND-28);
      ctx.lineTo(SX+14-pull*7, GROUND-18); ctx.lineTo(SX+18, GROUND-8); ctx.stroke();
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.25})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    if(this._hd){ for(const c of this._hd) CharHD.draw(u, c.sp, c.x, c.y, c.ph, c.o); this._hd=null; }
    if(this.hit){ this._hits=this._hits||[]; this._hits[this.scores.length-1]=this.hit; }
    txt(u, this.def.name, 8, 6, 12, PAL.gold, 'left', 700);
    txt(u, `${this.arrow} / ${ARCH.arrows}발`, VW/2, 6, 11, PAL.white, 'center');
    txt(u, this.qualify+'점', VW-8, 6, 12, this.total>=this.qualify?PAL.green:PAL.red, 'right', 700);
    txt(u, `합계 ${this.total}`, VW-8, 20, 11, PAL.gold, 'right', 700);
    txt(u, this.scores.join(' '), 8, 22, 10, PAL.dim, 'left');

    if(this.phase==='AIM'){
      const TX=VW-92, TY=214-64, TR=40;
      /* 조준점 — 흔들린다 */
      const sw=this.swayAmt();
      const cx=TX + (this.aimX + Math.cos(this.swayPhase)*sw)*TR;
      const cy=TY + (this.aimY + Math.sin(this.swayPhase*1.3)*sw)*TR;
      u.strokeStyle = sw>0.30 ? PAL.red : sw>0.20 ? PAL.gold : PAL.green;
      u.lineWidth=1.5;
      u.beginPath(); u.arc(cx, cy, 6, 0, Math.PI*2); u.stroke();
      u.beginPath(); u.moveTo(cx-9,cy); u.lineTo(cx-3,cy); u.moveTo(cx+3,cy); u.lineTo(cx+9,cy);
      u.moveTo(cx,cy-9); u.lineTo(cx,cy-3); u.moveTo(cx,cy+3); u.lineTo(cx,cy+9); u.stroke();
      /* 당김 게이지 */
      const pull = this.drawStart<0?0:clamp((this.t-this.drawStart)/ARCH.drawFullMs,0,1);
      const bw=150, bx=VW/2-bw/2, by=VH-26;
      u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(bx,by,bw,8);
      u.fillStyle = pull>=1?PAL.green:PAL.gold; u.fillRect(bx,by,Math.round(bw*pull),8);
      txt(u, this.drawStart<0 ? '액션을 누르고 있으면 당겨집니다'
            : (pull<1 ? '더 당기세요' : '흔들림이 작을 때 떼세요'),
          VW/2, VH-40, 10, this.drawStart<0?PAL.white:(pull<1?PAL.gold:PAL.green), 'center', 700);
      if(this.drawStart>=0) txt(u,'좌·우로 조준 보정', VW/2, VH-12, 8, PAL.dim,'center');
    }
    if(this.t-this.msgAt<1000)
      txt(u, this.msg, VW/2, 44, 14, this.msgBad?PAL.red:PAL.green, 'center', 700);
  }
}
