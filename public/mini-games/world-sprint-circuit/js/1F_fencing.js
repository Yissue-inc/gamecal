/* ══════════════════════════════════════════════════════════════════
   펜싱 (에페) — 5투셰 선취

   이 게임의 다른 스물몇 종목은 전부 **리듬**이다. 좌우를 언제 두드리느냐가 전부다.
   펜싱은 다르다 — **거리**가 전부다. 그래서 넣었다. 같은 손맛만 스물몇 번 반복하면
   종목이 늘어도 게임은 안 늘어난다.

   조작
     · ← 물러서기 · → 다가가기   (풋워크. 이게 이 종목의 8할이다)
     · 액션 = 런지. 뻗는 순간 상대가 사거리 안이면 득점
     · 헛치면 몸이 앞으로 나간 채 굳는다 — 그 틈에 맞는다. 이게 유일한 처벌이다
     · 둘이 동시에 뻗으면 **동시 타격**(에페 규칙) — 둘 다 점수

   ⚠ 상대가 뻗기 직전에 **자세를 잡는 예비 동작**이 보인다. 안 보이면 운이지 실력이 아니다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const FENCE = {
  pisteM: 14,          // 피스트 길이
  startGap: 4.6,       // 시작 거리(m)
  minGap: 0.9,
  maxGap: 7.0,
  stepRate: 3.1,       // m/s — 걸음 속도
  lungeRange: 2.15,    // 런지가 닿는 거리
  lungeMs: 190,        // 뻗어 있는 시간
  recoverHitMs: 240,   // 맞혔을 때 회복
  recoverMissMs: 620,  // 헛쳤을 때 회복
  parryWindowMs: 190,  // 상대가 뻗기 시작한 뒤 이 안에 물러서면 받아넘긴다
  recoverParriedMs: 1000, // 받아넘겨진 쪽의 처벌
  riposteMs: 620,      // 받아넘긴 쪽의 반격 권리 — 이 동안은 사거리가 길고 되받아치기 불가
  riposteBonus: 0.55,  // 리포스트 중 늘어나는 사거리(m)
  touchesToWin: 5,
  tellMs: 260,         // AI 예비 동작
  resetMs: 900,        // 득점 후 다시 서기
};

class FencingEvent {
  static proxy(ev){
    for(const k of Object.keys(ev.fencers[0])){
      if(Object.getOwnPropertyDescriptor(ev,k)) continue;
      Object.defineProperty(ev, k, { configurable:true,
        get(){ return this.fencers[0][k]; }, set(v){ this.fencers[0][k]=v; } });
    }
  }
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.phase='SET'; this.t=0; this.gunMs=1100+Math.random()*900; this.setBeeps=0;
    const two = (typeof Party!=='undefined' && Party.on && Party.count===2
                 && Party.modeFor(this.def)==='versus');
    this.humanCount = two ? 2 : 1;
    const mk=(i,ai)=>({ idx:i, ai, x:(i===0? -FENCE.startGap/2 : FENCE.startGap/2),
      touches:0, lungeAt:-1e9, lungeHit:false, recoverUntil:-1e9, riposteUntil:-1e9,
      tellAt:-1e9, plan:0, move:0, msg:'', msgAt:-1e9, msgBad:false });
    this.fencers=[mk(0,false), mk(1, this.humanCount<2)];
    FencingEvent.proxy(this);
    this.resetUntil=-1e9; this.flash=0; this.result=null; this.doneAt=0;
    this.lastTouch=''; this.lastTouchAt=-1e9;
    this.aiSkill = 0.62 + Math.random()*0.10;
  }
  get people(){ return this.fencers; }
  get qualify(){ return this.def.qualify; }
  get elapsed(){ return (this.t-this.gunMs)/1000; }
  get gap(){ return Math.abs(this.fencers[1].x - this.fencers[0].x); }
  R(p){ return this.fencers[p|0] || this.fencers[0]; }
  other(f){ return this.fencers[f.idx===0?1:0]; }
  say(m,bad,p){ const f=this.R(p); f.msg=m; f.msgAt=this.t; f.msgBad=!!bad; }
  busy(f){ return this.t < f.recoverUntil || this.t < this.resetUntil; }
  lunging(f){ return this.t - f.lungeAt < FENCE.lungeMs; }
  /* 뻗은 길이를 더한 실제 사거리 */
  riposting(f){ return this.t < f.riposteUntil; }
  reachOf(f){
    if(!this.lunging(f)) return 0.55;
    /* 리포스트는 팔을 이미 뻗은 채로 나가므로 더 멀리 닿는다 */
    return FENCE.lungeRange + (this.riposting(f) ? FENCE.riposteBonus : 0);
  }

  onStride(side, tMs, p){
    if(this.phase!=='RUN') return;
    const f=this.R(p); if(f.ai||this.busy(f)) return;
    f.move = side;                    // -1 물러서기 · +1 다가가기
    f.moveAt = this.t;
  }
  onAction(tMs, p){
    if(this.phase!=='RUN') return;
    const f=this.R(p); if(f.ai||this.busy(f)||this.lunging(f)) return;
    this.lunge(f);
  }
  onActionUp(){}

  lunge(f){
    f.lungeAt=this.t; f.lungeHit=false;
    if(!f.idx) Sfx.beep(760,0.05,'square',0.10);
  }
  score(f, why){
    f.touches++;
    this.lastTouch = (f.idx===0?'1P':(f.ai?'상대':'2P')) + ' 득점 — ' + why;
    this.lastTouchAt = this.t;
    this.resetUntil = this.t + FENCE.resetMs;
    this.flash = 0.8;
    f.idx===0 ? Sfx.finish() : Sfx.fail();
    Track.cheer(0.55);
    if(f.touches >= FENCE.touchesToWin) this.finish();
  }

  update(dt){
    this.t += dt*1000;
    if(this.phase==='SET'){
      const want=Math.min(3, Math.floor(3-(this.gunMs-this.t)/380));
      if(want>this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(this.t>=this.gunMs){ this.phase='RUN'; Sfx.gun(); this.flash=1; }
      return;
    }
    if(this.phase!=='RUN') return;

    /* 득점 후 다시 서기 */
    if(this.t < this.resetUntil){
      const k = 1 - (this.resetUntil-this.t)/FENCE.resetMs;
      this.fencers[0].x = lerp(this.fencers[0].x, -FENCE.startGap/2, Math.min(1,dt*6));
      this.fencers[1].x = lerp(this.fencers[1].x,  FENCE.startGap/2, Math.min(1,dt*6));
      for(const f of this.fencers){ f.lungeAt=-1e9; f.recoverUntil=-1e9; f.move=0; }
      return;
    }
    for(const f of this.fencers) if(f.ai) this.think(f, dt);

    /* 이동 — 런지 중이거나 굳어 있으면 못 움직인다 */
    for(const f of this.fencers){
      if(this.busy(f) || this.lunging(f)){ continue; }
      if(!f.move) continue;
      const dir = f.idx===0 ? f.move : -f.move;     // 서로 마주 본다
      f.x = clamp(f.x + dir*FENCE.stepRate*dt, -FENCE.pisteM/2, FENCE.pisteM/2);
      /* 입력은 눌린 동안만 — 한 프레임 지나면 멈춘다(연타로 걷는다) */
      if(this.t - (f.moveAt||0) > 130) f.move = 0;
    }
    /* 최소 거리 — 몸이 겹치지 않는다 */
    const g = this.gap;
    if(g < FENCE.minGap){
      const push=(FENCE.minGap-g)/2;
      this.fencers[0].x -= push; this.fencers[1].x += push;
    }

    /* 판정 — 뻗은 순간에만 본다 */
    const A=this.fencers[0], B=this.fencers[1];
    const aL=this.lunging(A), bL=this.lunging(B);
    /* ⚠ 사거리 안에서 그냥 뻗기만 하면 헛칠 일이 없어 **처벌이 없었다** —
       무지성 런지가 5:0 으로 6.5초 만에 이겼다. 펜싱이 아니라 리치 싸움이 된 것이다.
       상대가 뻗기 **시작한 뒤에** 물러서면 받아넘긴다(파리). 미리 물러서 있는 건 안 된다 —
       반응이어야지 상시 자세면 안 그래도 되는 게임이 된다. */
    /* ⚠ 리포스트 중인 공격은 되받아칠 수 없다 — 이미 칼이 뻗어 있다 */
    const parried=(att, def)=>
      !this.riposting(att) &&
      def.move===-1 && def.moveAt>=att.lungeAt &&
      def.moveAt-att.lungeAt <= FENCE.parryWindowMs && !this.busy(def);
    let inA = aL && !A.lungeHit && this.gap <= this.reachOf(A);
    let inB = bL && !B.lungeHit && this.gap <= this.reachOf(B);
    if(inA && parried(A,B)){
      A.lungeHit=true; A.recoverUntil=this.t+FENCE.recoverParriedMs;
      B.riposteUntil=this.t+FENCE.riposteMs; B.move=0;
      this.lastTouch='파리! ' + (B.ai?'상대가':'2P가') + ' 받아넘겼다 — 리포스트';
      this.lastTouchAt=this.t; Sfx.clang(); inA=false;
    }
    if(inB && parried(B,A)){
      B.lungeHit=true; B.recoverUntil=this.t+FENCE.recoverParriedMs;
      A.riposteUntil=this.t+FENCE.riposteMs; A.move=0;
      this.lastTouch='파리! 받아넘겼다 — 리포스트'; this.lastTouchAt=this.t;
      Sfx.clang(); inB=false;
    }
    if(inA && inB){
      /* ⚠ 에페는 동시 타격이 **둘 다 점수**다. 이게 있어야 '같이 죽는' 선택이 생긴다. */
      A.lungeHit=B.lungeHit=true;
      A.touches++; B.touches++;
      this.lastTouch='동시 타격 — 둘 다 득점'; this.lastTouchAt=this.t;
      this.resetUntil=this.t+FENCE.resetMs; this.flash=0.8; Sfx.beep(520,0.16,'square',0.16);
      if(A.touches>=FENCE.touchesToWin || B.touches>=FENCE.touchesToWin) this.finish();
      return;
    }
    if(inA){ A.lungeHit=true; A.recoverUntil=this.t+FENCE.recoverHitMs; this.score(A,'런지'); return; }
    if(inB){ B.lungeHit=true; B.recoverUntil=this.t+FENCE.recoverHitMs; this.score(B,'런지'); return; }

    /* 헛친 런지 — 뻗기가 끝나는 순간 굳는다 */
    for(const f of this.fencers){
      if(f.lungeAt>-1e8 && !f.lungeHit && this.t-f.lungeAt >= FENCE.lungeMs
         && f.recoverUntil < f.lungeAt){
        f.recoverUntil = this.t + FENCE.recoverMissMs;
        if(!f.idx) this.say('헛쳤다 — 자세가 무너졌다', true, 0);
      }
    }
    /* ⚠ 파리를 넣으면 이번엔 **계속 물러서기**가 답이 된다. 실제 규칙대로 뒷선을 넘으면
       상대에게 한 점을 준다 — 피스트에는 끝이 있다. */
    const BACK = FENCE.pisteM/2 - 0.2;
    if(this.fencers[0].x < -BACK){ this.score(this.fencers[1], '피스트 이탈'); return; }
    if(this.fencers[1].x >  BACK){ this.score(this.fencers[0], '피스트 이탈'); return; }
    if(this.elapsed > this.qualify*2.2){
      this.finish(true);
    }
    this.flash=Math.max(0,this.flash-dt*3);
    Track.crowdTick();
    Sfx.crowd(clamp(1-this.gap/FENCE.maxGap,0,1)*0.6);
  }

  /* AI — 예비 동작을 **보여 주고** 뻗는다. 안 보이면 운이지 실력이 아니다. */
  think(f, dt){
    const foe=this.other(f), g=this.gap;
    if(this.busy(f)) return;
    if(this.lunging(f)) return;
    /* 예비 동작 중이면 그 타이밍에 뻗는다 */
    if(f.tellAt>-1e8){
      if(this.t-f.tellAt >= FENCE.tellMs){ f.tellAt=-1e9; this.lunge(f); }
      return;
    }
    /* 리포스트 권리가 있으면 망설이지 않는다 */
    if(this.riposting(f)){ this.lunge(f); return; }
    /* 상대가 뻗는 걸 봤으면 받아넘긴다 — 실력만큼 성공한다 */
    if(this.lunging(foe) && this.t-foe.lungeAt < FENCE.parryWindowMs*0.7
       && Math.random() < this.aiSkill*0.55){
      f.move=-1; f.moveAt=this.t; return;
    }
    /* 상대가 굳어 있으면 무조건 파고든다 */
    if(this.t < foe.recoverUntil){
      if(g > FENCE.lungeRange*0.86) f.move=+1;
      else { f.tellAt=this.t; f.move=0; }
      f.moveAt=this.t; return;
    }
    /* 사거리 안이면 뻗을지 물러설지 — 실력이 높을수록 잘 고른다 */
    if(g <= FENCE.lungeRange*0.96){
      if(Math.random() < this.aiSkill*0.10){ f.tellAt=this.t; f.move=0; }
      else if(Math.random() < 0.06) f.move=-1;
      f.moveAt=this.t; return;
    }
    /* 밖이면 거리를 좁힌다 — 가끔 물러서서 유인한다 */
    f.move = (Math.random()<0.14) ? -1 : +1;
    f.moveAt=this.t;
  }

  finish(timeout){
    if(this.result) return;
    this.phase='DONE'; this.doneAt=this.t;
    const me=this.fencers[0], foe=this.fencers[1];
    const won = me.touches>=FENCE.touchesToWin && me.touches>foe.touches;
    const total = won ? this.elapsed : DNF;
    this.result={ status: won?'OK':(timeout?'TIMEOUT':'MISSED_QUALIFY'),
                  value: won? total : DNF, rank: won?1:2 };
    won ? Sfx.finish() : Sfx.fail();
    if(this.humanCount>1 && typeof Party!=='undefined' && Party.on){
      this.humanResults = this.fencers.map((f,i)=>({
        p:i, ok:f.touches>=FENCE.touchesToWin,
        value:f.touches>=FENCE.touchesToWin? this.elapsed : DNF }))
        .sort((a,b)=>a.value-b.value);
    }
  }

  /* ── 그리기 ─────────────────────────────────────────── */
  draw(ctx){
    const gt=Track.fieldBack(ctx, 22);
    const GROUND=Track.fieldGround(ctx,{grassTop:gt, surface:'#3a3f4c'});
    this._g = GROUND-6;
    /* 피스트 */
    const pw = VW-64, px0=32;
    if(!BG.tile(BG.ctx(),'piste-strip', this._g-16, 22, 0)){
      ctx.fillStyle='#5b6273'; ctx.fillRect(px0, this._g-14, pw, 16);
      ctx.fillStyle='rgba(255,255,255,.16)';
      ctx.fillRect(px0, this._g-14, pw, 1); ctx.fillRect(px0, this._g+1, pw, 1);
      /* 중앙선·경고선 */
      ctx.fillStyle='rgba(255,255,255,.28)'; ctx.fillRect(VW/2-1, this._g-14, 2, 16);
      ctx.fillStyle='rgba(255,120,90,.35)';
      ctx.fillRect(px0+pw*0.18, this._g-14, 1, 16); ctx.fillRect(px0+pw*0.82, this._g-14, 1, 16);
    }
    this._px = (m)=> Math.round(VW/2 + m*(pw/FENCE.pisteM));
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.35})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    if(!this._px) return;
    /* 피스트 위에 선다 — _g 를 그대로 쓰면 매트 아래에 서 있는 것처럼 보였다 */
    const SP=FENCE_SP, y=this._g-1;
    this.fencers.forEach((f,i)=>{
      const lung = this.lunging(f);
      const face = i===0 ? 1 : -1;
      const x = this._px(f.x) + (lung? face*11 : 0);
      const stuck = this.t < f.recoverUntil;
      u.save(); if(stuck) u.globalAlpha=0.62;
      /* ⚠ 둘이 **같은 방향을 보고** 있었다. 펜싱은 마주 보는 종목이라 그것만으로 그림이
         틀린다. CharHD 에 좌우 반전이 없어서 캔버스를 뒤집어 그린다. */
      if(face<0){ u.translate(x*2, 0); u.scale(-1,1); }
      const dx = face<0 ? x : x;
      if(!CharHD.draw(u, SP[i%2], dx, y, lung?0.5:0.05,
          {rare:i?2:3, t:this.t, scale:0.92, lean:lung, crouch:!lung}))
        { u.fillStyle=i?'#8fa0b4':PAL.gold; u.fillRect(dx-5,y-20,10,20); }
      u.restore();
      /* 검 — 사거리를 눈으로 보여 준다. 이게 없으면 거리 감각이 안 생긴다.
         ⚠ 길이는 **사거리 그 자체**다(그림이 아니라 규칙이다). 어셋을 쓸 때도
            그 길이에 맞춰 늘려 그린다 — 안 그러면 보이는 것과 닿는 곳이 어긋난다. */
      const px=(m)=>this._px(m)-this._px(0);
      const bladeLen = Math.abs(px(this.reachOf(f)));
      const blade = BG.get('epee-blade');
      if(blade){
        const bh = 6;
        u.save(); u.globalAlpha = lung ? 1 : 0.7;
        if(face<0){ u.translate((x+face*5)*2, 0); u.scale(-1,1);
                    u.drawImage(blade, x+face*5, y-13-bh/2, bladeLen+5, bh); }
        else u.drawImage(blade, x+5, y-13-bh/2, bladeLen+5, bh);
        u.restore();
      } else {
        u.strokeStyle = lung ? '#ffffff' : 'rgba(220,230,245,.55)';
        u.lineWidth = lung? 2 : 1;
        u.beginPath(); u.moveTo(x+face*5, y-13);
        u.lineTo(x+face*(5+bladeLen), y-13-(lung?1:3)); u.stroke();
      }
      /* 마스크 — 캐릭터 머리 위에 얹는다 */
      BG.obj(u, 'fence-mask', x, y-24, 12);
      /* 예비 동작 — AI 가 뻗기 전에 반드시 보인다 */
      if(f.tellAt>-1e8 && this.t-f.tellAt < FENCE.tellMs){
        u.fillStyle='rgba(255,120,90,.85)';
        u.fillRect(x-7, y-30, 14, 3);
      }
      if(stuck){ txt(u,'굳음', x, y-32, 8, PAL.red,'center',700); }
      else if(this.riposting(f)) txt(u,'리포스트', x, y-32, 8, PAL.green,'center',700);
    });
    /* 점수판 */
    plate(u, 0,0, VW, 30, .76);
    const A=this.fencers[0], B=this.fencers[1];
    txt(u, this.humanCount>1?'1P':'나', 60, 5, 9, PAL.dim,'center');
    txt(u, this.humanCount>1?'2P':'상대', VW-60, 5, 9, PAL.dim,'center');
    txt(u, String(A.touches), 60, 13, 17, PARTY_COLOR[0],'center',700);
    txt(u, String(B.touches), VW-60, 13, 17, this.humanCount>1?PARTY_COLOR[1]:PAL.white,'center',700);
    txt(u, FENCE.touchesToWin+'점 선취', VW/2, 5, 9, PAL.dim,'center');
    txt(u, fmtTime(Math.max(0,this.elapsed)), VW/2, 14, 13, PAL.gold,'center',700);
    /* 거리 — 이 종목의 핵심 지표 */
    const g=this.gap, inR = g<=FENCE.lungeRange;
    u.fillStyle='rgba(8,11,18,.66)'; u.fillRect(0, VH-34, VW, 34);
    txt(u,'거리 '+g.toFixed(2)+'m', VW/2, VH-30, 11, inR?PAL.red:PAL.white,'center',700);
    txt(u, inR? '사거리 안 — 서로 닿는다' : '사거리 밖', VW/2, VH-18, 9, inR?PAL.red:PAL.dim,'center');
    if(this.phase==='SET') txt(u,'앙 갸르드', VW/2, 52, 13, PAL.white,'center',700);
    else if(A.touches+B.touches===0)
      txt(u,'← 물러서기 · → 다가가기 · 액션 = 런지', VW/2, VH-48, 10, PAL.white,'center');
    if(this.t-this.lastTouchAt < 1100)
      txt(u, this.lastTouch, VW/2, 54, 13, PAL.gold,'center',700);
    else if(this.t-A.msgAt < 900)
      txt(u, A.msg, VW/2, 54, 11, A.msgBad?PAL.red:PAL.green,'center',700);
  }
}

/* 등장 동물 — 이름이 틀리면 여기서 바로 터진다(폴백 사각형으로 조용히 넘어가지 않게) */
const FENCE_SP = cast('펜싱', ['greyfox','lynx']);
