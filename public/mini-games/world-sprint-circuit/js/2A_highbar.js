/* ══════════════════════════════════════════════════════════════════
   기계체조 — 철봉

   도마는 한 번의 손 짚기로 끝난다. 트램폴린은 매트가 매번 받아 준다.
   철봉은 **놓았다가 다시 잡아야** 한다 — 이 게임에서 유일하게 '공중에서 잡는' 종목이다.
     ① 흔들기  좌·우를 리듬에 맞춰 → 스윙이 커진다(가만 두면 줄어든다)
     ② 이탈    스윙이 충분할 때 액션 → 봉을 놓고 공중 동작에 들어간다
     ③ 잡기    회전 중 다시 액션 → 봉을 잡는다. 놓치면 **추락**(크게 감점)
     ④ 내리기  마지막엔 잡지 말고 비틀어 내려선다
   점수 = 난도(이탈 기술 수 + 내리기 비틀기) + 수행(스윙·잡기·착지).
   ⚠ 스윙이 얕으면 이탈해도 잡을 시간이 없다. 난도는 **스윙이 허락하는 만큼**만 올릴 수 있다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const BAR = {
  swingIv: 420,          // 한 번 흔드는 목표 간격(ms)
  swingWindow: 95,
  gain: 0.092,           // 잘 흔들었을 때 진폭 증가
  decay: 0.25,           // 초당 비례 감쇠 (균형점 = 이득/이 값)
  releaseMin: 0.52,      // 이만큼은 되어야 이탈할 수 있다
  airBase: 0.55,         // 이탈 후 체공(초) — 진폭이 클수록 길다
  airPerAmp: 0.95,
  catchWindow: 0.16,     // 잡기 창(초)
  catchPerfect: 0.06,
  twistPerTap: 0.5,
  maxRelease: 3,         // 이탈 기술은 세 번까지
  attempts: 1,
  routineMs: 40000,      /* 연기에는 끝이 있다. 없었을 땐 이탈↔잡기만 반복하며 판이 안 끝났다 */
};

class HighBarEvent {
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.t=0; this.phase='SWING';   // SWING → AIR → DISMOUNT → MARK → DONE
    this.amp=0.18; this.side=0; this.lastSwing=-1e9;
    this.releases=0; this.twist=0; this.opened=false;
    this.airT=0; this.airDur=0; this.catching=false;
    this.swingQ=[]; this.catches=[]; this.fell=false;
    this.landQ=0; this.mark=null; this.markAt=-1e9;
    this.msg=''; this.msgAt=-1e9; this.msgBad=false; this.flash=0;
    this.result=null; this.doneAt=0;
    this.dismount=false;
  }
  get qualify(){ return this.def.qualify; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }
  get toCatch(){ return this.airDur - this.airT; }
  /* 스윙의 위상 — 0.5 근처가 정점(놓기 좋은 때) */
  get swingPhase(){ return ((this.t-this.lastSwing)/BAR.swingIv)%1; }

  onStride(side, tMs){
    if(this.phase==='SWING'){
      const dt=tMs-this.lastSwing;
      let j='GOOD';
      if(this.side===side) j='MISS';
      else if(this.lastSwing<-1e8) j='GOOD';
      else j = Math.abs(dt-BAR.swingIv)<=BAR.swingWindow ? 'PERFECT'
             : Math.abs(dt-BAR.swingIv)<=BAR.swingWindow*2.2 ? 'GOOD' : 'MISS';
      this.side=side; this.lastSwing=tMs;
      const q={PERFECT:1,GOOD:0.66,MISS:0.2}[j];
      this.swingQ.push(q); if(this.swingQ.length>8) this.swingQ.shift();
      this.amp = clamp(this.amp + BAR.gain*q, 0, 1);
      /* ⚠ 판정을 **계산해 놓고 저장도 표시도 안 했다** — 흔드는 내내 잘하고 있는지
         알 길이 없었다(10종목 전수 점검에서 잡힌 나머지 하나). */
      this.lastJudge=j; this.lastJudgeMs=tMs;
      this.streak = (j==='PERFECT'||j==='GOOD') ? Math.min(60,(this.streak||0)+1) : 0;
      Sfx.step(j, [0,6,10,20,40,60].filter(n=>this.streak>=n).length-1);
      return;
    }
    /* 공중 비틀기 */
    if(this.phase==='AIR' && !this.opened && this.toCatch>0.22){
      this.twist=Math.min(3, this.twist+BAR.twistPerTap);
      Sfx.step('GOOD');
    }
  }
  onAction(tMs){
    if(this.phase==='SWING'){
      if(this.amp < BAR.releaseMin){ this.say('스윙이 얕다', true); return; }
      /* ⚠ 이탈을 다 쓰면 액션이 아무것도 안 해서, 내려설 방법을 모르는 사람은 갇힌다.
         남은 기술이 없으면 액션이 곧 내려서기다(▲ 는 언제든 조기 내려서기). */
      if(this.releases>=BAR.maxRelease) this.dismount=true;
      /* 정점에서 놓아야 높이 뜬다 */
      const ph=this.swingPhase;
      const atTop = Math.min(Math.abs(ph-0.5), Math.abs(ph-0.5)) < 0.18;
      this.release(atTop);
      return;
    }
    if(this.phase==='AIR'){
      const d=this.toCatch;
      /* 아직 여유가 있으면 자세 펴기, 창 안이면 잡기 */
      if(d>BAR.catchWindow*2.4 && !this.opened && this.twist>0){
        this.opened=true; this.say('자세 폄'); Sfx.beep(980,0.07,'sine',0.11); return;
      }
      if(Math.abs(d)<=BAR.catchWindow*2.4) this.catchBar(Math.abs(d));
      return;
    }
  }
  onActionUp(){}
  /* ▲ = 마지막 기술을 '내리기'로 — 잡지 않고 착지한다 */
  onUp(){
    if(this.phase==='SWING' && this.amp>=BAR.releaseMin){
      this.dismount=true; this.say('내리기'); this.release(true);
    }
  }

  release(atTop){
    this.phase='AIR'; this.airT=0; this.twist=0; this.opened=false;
    const q = atTop ? 1 : 0.55;
    this.airDur = (BAR.airBase + BAR.airPerAmp*this.amp) * (0.7+0.3*q);
    if(!this.dismount) this.releases++;
    this.say(atTop?'이탈!':'놓는 때가 어긋났다', !atTop);
    Sfx.beep(atTop?1120:640, 0.09,'square',0.13);
    /* ⚠ 0.72/0.5 로 깎았더니 이탈 뒤 진폭이 **이탈 문턱(0.52)까지 다시 못 올라와**
       내려서지도 못하고 판이 안 끝났다(실측: 0.43~0.46 을 오갔다). 덜 깎는다. */
    this.amp *= atTop ? 0.84 : 0.66;
  }
  catchBar(err){
    let q = err<=BAR.catchPerfect ? 1 : err<=BAR.catchWindow ? 0.7 : 0.3;
    /* ⚠ 접힌 채로 돌면서 봉을 잡을 수는 없다. 이걸 안 걸었더니 **안 펴는 쪽이 더 높은
       점수**를 받았다(난도만 오르고 대가가 착지에만 있었다) — 비틀기는 펴야 값이 된다. */
    if(!this.opened && this.twist>0) q = Math.min(q, 0.3);
    this.catches.push(q);
    if(q<=0.3){ this.fell=true; this.say('봉을 놓쳤다 — 추락', true); Sfx.fail(); this.flash=0.7; this.finishRoutine(); return; }
    this.say(q>=1?'완벽하게 잡았다!':'잡았다');
    Sfx.step(q>=1?'PERFECT':'GOOD');
    this.phase='SWING'; this.lastSwing=-1e9; this.side=0;
    this.amp = clamp(this.amp*0.85 + 0.1*q, 0, 1);
    if(this.releases>=BAR.maxRelease){ this.say('이제 내려서세요'); }
  }
  land(err){
    const w=BAR.catchWindow;
    this.landQ = err<=w*0.45 ? 1 : err<=w ? 0.7 : 0.3;
    if(!this.opened && this.twist>0) this.landQ*=0.5;
    this.finishRoutine();
  }
  finishRoutine(){
    const avgSwing = this.swingQ.length? this.swingQ.reduce((a,b)=>a+b,0)/this.swingQ.length : 0.5;
    const avgCatch = this.catches.length? this.catches.reduce((a,b)=>a+b,0)/this.catches.length : 0;
    const D = 1 + this.releases*0.62 + this.twist*0.45;
    const E = this.fell ? 2.0
            : 3.0 + 2.2*avgSwing + 2.2*avgCatch + 2.6*this.landQ;
    this.mark = +(D+E).toFixed(2);
    this.phase='MARK'; this.markAt=this.t;
    this.flash=Math.max(this.flash, this.fell?0.2:0.6);
    this.fell? Sfx.fail() : Sfx.finish();
    Track.cheer(clamp(this.mark/14,0,1));
  }

  update(dt){
    this.t+=dt*1000;
    this.flash=Math.max(0,this.flash-dt*3);
    /* 연기 제한 시간 */
    if(this.phase!=='MARK' && this.phase!=='DONE' && this.t>BAR.routineMs){
      this.say('연기 시간 초과', true);
      if(this.phase==='AIR'){ this.fell=true; }
      this.landQ=Math.max(this.landQ,0.2); this.finishRoutine();
      return;
    }
    if(this.phase==='SWING'){
      this.amp -= this.amp*dt*BAR.decay;
      if(this.amp<0.04 && this.releases>0){ this.say('스윙이 죽었다', true); this.landQ=0.2; this.finishRoutine(); }
    }
    else if(this.phase==='AIR'){
      this.airT+=dt;
      if(this.airT >= this.airDur + BAR.catchWindow*2.4){
        if(this.dismount) this.land(BAR.catchWindow*3);
        else { this.fell=true; this.say('그냥 떨어졌다', true); this.finishRoutine(); }
      }
    }
    else if(this.phase==='MARK'){
      if(this.t-this.markAt>1800){
        this.phase='DONE'; this.doneAt=this.t;
        const pass=this.mark>=this.qualify;
        this.result={status:pass?'OK':'MISSED_QUALIFY', value:this.mark, rank:pass?1:2};
        pass?Sfx.finish():Sfx.fail();
      }
    }
    Track.crowdTick();
    Sfx.crowd(this.phase==='SWING'?clamp(this.amp,0,1)*0.6:0.35);
  }

  draw(ctx){
    /* 실내 체조장 */
    if(BG.tile(BG.ctx(),'hall-wall', 90, 78, 0)) BG.hallFloor(ctx, 90, 168);
    else {
      const gt=Track.fieldBack(ctx, 18);
      Track.fieldGround(ctx,{grassTop:gt, surface:'#4a4550'});
      ctx.fillStyle='rgba(8,10,16,.8)'; ctx.fillRect(0,0,VW,VH);
    }
    const cx=VW/2, barY=96, floorY=VH-46;
    this._v={cx, barY, floorY};
    /* 매트 */
    ctx.fillStyle='#3f5a86'; ctx.fillRect(cx-70, floorY-4, 140, 10);
    ctx.fillStyle='rgba(255,255,255,.14)'; ctx.fillRect(cx-70, floorY-4, 140, 1);
    /* 지주 */
    ctx.fillStyle='#4d5768';
    ctx.fillRect(cx-56, barY, 4, floorY-barY);
    ctx.fillRect(cx+52, barY, 4, floorY-barY);
    /* 봉 */
    ctx.fillStyle='#d8d2c4'; ctx.fillRect(cx-58, barY-2, 118, 3);
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.4})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    const V=this._v; if(!V) return;
    /* 한 타의 피드백 — 기준은 HUD.tap(05_hud) 한 곳에 있다 */
    if(this.phase==='SWING' && this.lastJudge)
      HUD.tap(u, { j:this.lastJudge, ageMs:this.t-this.lastJudgeMs, ivMs:BAR.swingIv,
                   labelY:V.barY-26 });
    let x=V.cx, y=V.barY+16, rot=0, tuck=false;
    if(this.phase==='SWING'){
      /* 봉을 중심으로 매달려 흔들린다 — 진폭이 클수록 크게 */
      const a=Math.sin(this.t/BAR.swingIv*Math.PI*2)*this.amp*1.45;
      x = V.cx + Math.sin(a)*38;
      y = V.barY + Math.cos(a)*26;
      rot = a*0.8;
    } else if(this.phase==='AIR' || this.phase==='MARK'){
      const k=clamp(this.airT/Math.max(0.01,this.airDur),0,1);
      const peak = this.dismount ? 0 : 26;
      y = V.barY + 16 - Math.sin(k*Math.PI)*(28+this.amp*26) + (this.dismount? k*k*(V.floorY-V.barY-16) : 0);
      x = V.cx + (this.dismount? k*30 : 0);
      tuck = !this.opened && this.twist>0;
      if(tuck) rot = this.twist*k*Math.PI*2;
      if(this.fell && this.phase==='MARK'){ y=V.floorY-6; rot=1.4; }
    }
    u.save();
    if(rot){ u.translate(x,y); u.rotate(rot); u.translate(-x,-y); }
    /* ⛔ 0.2 고정이었다. 이 종목은 **스윙 위상**을 이미 갖고 있다(swingPhase). */
    if(!CharHD.draw(u,'lemur', x, y+14, this.swingPhase,
        {act:'swing', rare:3, t:this.t, scale:0.8, crouch:tuck, airborne:this.phase==='AIR'}))
      { u.fillStyle=PAL.gold; u.fillRect(x-5,y,10,16); }
    u.restore();

    /* 스윙 막대 — 이 종목의 계기판 */
    const bw=140, bx=VW/2-bw/2, by=Track.botY(32);
    u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(bx,by,bw,9);
    u.fillStyle='rgba(92,255,156,.30)';
    u.fillRect(bx+bw*BAR.releaseMin, by, bw*(1-BAR.releaseMin), 9);
    u.fillStyle = this.amp>=BAR.releaseMin?PAL.green:PAL.gold;
    u.fillRect(bx,by,Math.round(bw*this.amp),9);
    u.fillStyle='rgba(255,255,255,.7)'; u.fillRect(bx+bw*BAR.releaseMin-1, by-3, 2, 15);
    txt(u,K('스윙'), bx-8, by, 9, PAL.dim,'right');
    txt(u, this.amp>=BAR.releaseMin? K('이탈 가능') : K('더 흔들어라'),
        bx+bw+8, by, 9, this.amp>=BAR.releaseMin?PAL.green:PAL.dim,'left',700);

    if(this.phase==='AIR'){
      txt(u, (this.twist*0.5).toFixed(1)+K('바퀴'), VW/2, 44, 13,
          this.opened?PAL.green:(this.twist>0?PAL.red:PAL.white),'center',700);
      const d=this.toCatch;
      if(d<0.7){
        const k=clamp(1-d/0.7,0,1);
        u.strokeStyle = Math.abs(d)<=BAR.catchWindow?PAL.green:'rgba(255,255,255,.45)';
        u.lineWidth=2; u.beginPath();
        u.arc(V.cx, this.dismount? V.floorY-4 : V.barY, Math.max(5,20-k*14), 0, 6.284); u.stroke();
        txt(u, this.dismount? K('착지') : K('잡기'), V.cx, (this.dismount?V.floorY-24:V.barY-26),
            10, Math.abs(d)<=BAR.catchWindow?PAL.green:PAL.dim,'center',700);
      }
    }
    /* HUD */
    SB.tally(u, {
      name: this.def.name,
      progress: K('이탈')+' '+this.releases+' / '+BAR.maxRelease,
      mine: this.mark, fmt: v => (v==null? '—' : (+v).toFixed(2)),
      cuts: medalCuts(this.def), higher: !!this.def.higher,
    });
    if(this.releases>0) txt(u,'▲ '+K('내려서기'), 8, 36, 9, PAL.gold,'left');
    if(this.phase==='SWING' && this.releases===0 && this.amp<BAR.releaseMin)
      txt(u,'좌·우를 리듬에 맞춰 — 스윙이 커지면 액션으로 이탈', VW/2, Track.tipY(), 10, PAL.white,'center');
    if(this.phase==='MARK' && this.mark!=null){
      u.fillStyle='rgba(5,6,10,.72)'; u.fillRect(0,72,VW,54);
      txt(u, this.mark.toFixed(2), VW/2, 78, 24, this.fell?PAL.red:PAL.gold,'center',700);
      txt(u, this.fell? K('추락') : K('난도')+' '+(1+this.releases*0.62+this.twist*0.45).toFixed(2),
          VW/2, 106, 10, PAL.dim,'center');
    }
    if(this.t-this.msgAt<900)
      txt(u, this.msg, VW/2, 60, 12, this.msgBad?PAL.red:PAL.green,'center',700);
  }
}
