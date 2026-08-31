/* ══════════════════════════════════════════════════════════════════
   조정 — 리듬 종목이지만 다른 것들과 결이 다르다.

   달리기·수영은 '빠를수록 좋다'에 가깝다. 조정은 **일정함**이 전부다.
     · 한 번의 스트로크가 배를 밀고, 사이에는 감속한다(글라이드)
     · 너무 빨리 저으면 물을 못 잡는다(캐치가 얕다) — 간격이 곧 힘이다
     · 스트로크 간격의 **분산**이 낮을수록 배가 빨라진다
       ⚠ 이게 핵심이다. 평균이 아니라 흔들림을 본다 — 다른 종목엔 없는 축이다.
     · 액션 = 피치 올리기(간격을 좁힌다). 막판에만 쓴다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const ROW = {
  baseIv: 1050,        // 스트로크 간격(ms) — 느리고 길다
  pitchIv: 820,        // 피치를 올렸을 때
  maxSpeed: 6.2,       // m/s
  glideDrag: 0.95,     // 스트로크 사이 감속
  catchMin: 520,       // 이보다 빨리 저으면 캐치가 얕다
  pitchMs: 15000,      // 피치 지속 — 8초로는 88초 레이스에서 0.5초밖에 못 벌어 죽은 장치였다
  smoothN: 6,          // 분산을 보는 최근 스트로크 수
};

class RowingEvent {
  constructor(def){ this.def=def; this.trackM=def.distanceM||500; this.reset(); }
  reset(){
    this.phase='SET'; this.t=0;
    this.gunMs=1300+Math.random()*1300; this.setBeeps=0;
    this.dist=0; this.speed=0;
    this.lastStroke=-1e9; this.side=0;
    this.ivs=[];                       // 최근 간격들
    this.smooth=1.0;                   // 일정함 (0~1)
    this.judge={PERFECT:0,GOOD:0,EARLY:0,LATE:0,REPEAT:0,SPAM:0};
    this.lastJudge=''; this.lastJudgeMs=-1e9;
    this.pitchStart=-1; this.pitchUsed=false;
    this.strokes=0; this.flash=0; this.msg=''; this.msgAt=-1e9;
    this.result=null; this.doneAt=0; this.camM=0;
    this.rivals=[];
    for(let i=0;i<2;i++){
      const sk=AI.skill(0.72+i*0.10+Math.random()*0.07);
      this.rivals.push({ lane:i===0?0:2, dist:0, spd:ROW.maxSpeed*sk });
    }
  }
  get qualify(){ return this.def.qualify; }
  get elapsed(){ return (this.t-this.gunMs)/1000; }
  get pitching(){ return this.pitchStart>=0 && this.t-this.pitchStart < ROW.pitchMs; }
  get targetIv(){ return this.pitching ? ROW.pitchIv : ROW.baseIv; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }

  onStride(side, tMs){
    if(this.phase==='DONE') return;
    if(this.phase!=='RUN'){
      if(tMs<this.gunMs && tMs>this.gunMs-1200){
        this.phase='DONE'; this.doneAt=this.t;
        this.result={status:'FALSE_START', value:DNF, rank:3}; Sfx.fail();
      }
      return;
    }
    const dt = tMs - this.lastStroke;
    let j='GOOD';
    /* ⛔ 연타 모드 — 노도 빨리 저을수록 빠르다. 실측(고치기 전): 초당 5타 이상이면 완주 불가.
       ⚠ 다만 조정의 정체는 **고르게 젓기**다 — 그건 죽이지 않는다.
          smooth(간격의 고름)가 그대로 배 속도의 상한을 정한다.
          빨리 젓되 **고르게** 저어야 빠르다 — 그게 이 종목의 배분이다. */
    if(RULES.mashMode){
      if(this.side===side) j='REPEAT';
      else if(this.lastStroke<-1e8) j='GOOD';
      else { j='PERFECT'; this.ivs.push(dt); if(this.ivs.length>ROW.smoothN) this.ivs.shift(); }
    }
    else if(this.side===side){ j='REPEAT'; }
    else if(this.lastStroke<-1e8){ j='GOOD'; }
    else if(dt < ROW.catchMin){
      /* ⚠ 얕은 캐치는 '약한 스트로크'가 아니라 **손해**다.
         예전엔 배율만 낮췄더니(0.22) 막 저어서 180번 긁는 쪽이 2등 기록을 냈다 —
         조금씩이라도 계속 밀렸기 때문이다. 블레이드가 미끄러지면 배는 오히려 채인다. */
      j='SPAM'; this.say('캐치가 얕다 — 배가 채인다', true);
      this.speed = Math.max(0, this.speed*0.90 - 0.25);
      this.smooth = Math.max(0, this.smooth-0.10);
    }
    else {
      this.ivs.push(dt);
      if(this.ivs.length>ROW.smoothN) this.ivs.shift();
      /* ⚠ 이 종목의 판정은 '목표에 가까운가'가 아니라 **직전과 같은가** 다. */
      const mean = this.ivs.reduce((a,b)=>a+b,0)/this.ivs.length;
      const varc = this.ivs.reduce((a,b)=>a+Math.abs(b-mean),0)/this.ivs.length;
      const cv = varc/mean;                 // 변동계수
      this.smooth = clamp(1 - cv*3.2, 0, 1);
      if(cv<=0.05) j='PERFECT';
      else if(cv<=0.12) j='GOOD';
      else if(dt<mean) j='EARLY';
      else j='LATE';
    }
    this.judge[j]++; this.lastJudge=j; this.lastJudgeMs=tMs;
    this.side=side; this.lastStroke=tMs; this.strokes++;
    Sfx.paddle(), Sfx.step(j);
    const mult={PERFECT:1.0,GOOD:0.84,EARLY:0.58,LATE:0.58,REPEAT:0.0,SPAM:0.0}[j];
    if(j==='REPEAT'){ this.speed=Math.max(0,this.speed-0.35); this.say('같은 쪽만 저었다', true); }
    /* 스트로크 한 번이 배를 민다 — 일정할수록 크게 민다(0.35 → 1.0) */
    const push = ROW.maxSpeed * (0.35 + this.smooth*0.65) * mult * (this.pitching?1.12:1);
    /* ⚠ 상한이 **일정함에 걸린다** — 이게 이 종목의 전부다.
       예전엔 상한이 고정(1.15배)이라 아무리 엉망으로 저어도 횟수만 채우면 헐 스피드에
       닿았다(실측: 기계처럼 75.9 vs 서툰 76.7 — 실력차 0.8초). 노가 물을 제대로 못 잡으면
       배는 애초에 그 속도가 안 나온다. */
    /* 피치는 **상한**을 올린다 — 배율만 올렸더니 상한에 막혀 아무 효과가 없었고
       오히려 리듬만 흔들려 느려졌다(실측: 피치 씀 89.1 vs 안 씀 87.5). */
    const cap = ROW.maxSpeed * (0.45 + this.smooth*0.62 + (this.pitching?0.20:0));
    this.speed = Math.min(cap, this.speed + push*0.42);
  }
  onAction(tMs){
    if(this.phase!=='RUN' || this.pitchUsed) return;
    this.pitchUsed=true; this.pitchStart=this.t;
    this.ivs=[];   /* 목표 간격이 바뀌므로 흔들림 창을 비운다 — 변속 자체를 실수로 세지 않는다 */
    this.say('피치 업!'); Sfx.beep(1180,0.14,'square',0.15);
  }
  onActionUp(){}

  update(dt){
    this.t += dt*1000; const now=this.t;
    if(this.phase==='SET'){
      const want=Math.min(3, Math.floor((this.gunMs-now>0? 3-(this.gunMs-now)/450 : 3)));
      if(want>this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(now>=this.gunMs){ this.phase='RUN'; Sfx.gun(); this.flash=1; }
    }
    if(this.phase==='RUN'){
      this.speed = Math.max(0, this.speed - dt*ROW.glideDrag);
      this.dist += this.speed*dt;
      for(const rv of this.rivals) rv.dist += rv.spd*dt;
      if(this.dist>=this.trackM){
        this.dist=this.trackM;
        const total=(now-this.gunMs)/1000;
        this.phase='DONE'; this.doneAt=now;
        const pass=total<=this.qualify;
        this.result={status:pass?'OK':'MISSED_QUALIFY', value:total, rank:this.rankOf()};
        pass?Sfx.finish():Sfx.fail();
      }
      if(this.elapsed > this.qualify+timeGrace(30)){
        this.phase='DONE'; this.doneAt=now;
        this.result={status:'TIMEOUT', value:DNF, rank:3}; Sfx.fail();
      }
    }
    this.camM = Math.max(0, this.dist-14);
    this.flash=Math.max(0,this.flash-dt*4);
    Sfx.crowd(clamp(this.speed/ROW.maxSpeed,0,1)*(this.phase==='RUN'?0.8:0.3));
  }
  rankOf(){ let r=1; for(const rv of this.rivals) if(rv.dist>this.dist) r++; return r; }

  draw(ctx){
    const mPerPx=0.26;
    Track.drawBack(ctx, this.camM*0.3, this.trackM);
    const lanes=Track.LANE_Y.length;
    for(let i=0;i<lanes;i++){
      const y=Track.LANE_Y[i], LH=Track.laneH(i);
      if(!BG.tile(BG.ctx(),'rowing-lane', y-4, LH, this.camM/mPerPx)){
        ctx.fillStyle = i===1? '#12507a' : '#104466';
        ctx.fillRect(0,y,VW,LH-6);
      }
      BG.tile(BG.ctx(),'buoy-line', y-4, 6, this.camM/mPerPx*1.02);
    }
    const px=(m)=>Math.round((m-this.camM)/mPerPx);
    Track.drawFinish(ctx, this.camM, mPerPx, this.trackM);
    /* ⚠ 폴백 선체가 40x5 짜리 막대라 캐릭터가 **물 위를 달리는 것처럼** 보였다.
       스컬은 길고 낮다 — 사람보다 배가 훨씬 길어야 '탄' 것으로 읽힌다. */
    const boat=(x,y,mine,k,swing)=>{
      const L=Math.round(58*k), H=Math.round(7*k);
      if(!BG.obj(BG.ctx(),'scull-hd', x, y+H, Math.round(20*k))){
        /* 선체 — 앞뒤가 뾰족한 긴 삼각 실루엣 */
        ctx.fillStyle = mine? '#f0e0b4' : '#9fb3c4';
        ctx.beginPath();
        ctx.moveTo(x-L*0.62, y); ctx.lineTo(x+L*0.44, y-H*0.5);
        ctx.lineTo(x+L*0.52, y+H*0.15); ctx.lineTo(x-L*0.55, y+H*0.7);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle='rgba(0,0,0,.28)'; ctx.fillRect(x-L*0.55, y+H*0.55, L*0.98, Math.max(1,H*0.35));
      }
      /* 물자국 */
      ctx.fillStyle='rgba(255,255,255,.16)';
      ctx.fillRect(x-L*0.62-Math.round(16*k), y+H*0.4, Math.round(16*k), Math.max(1,Math.round(2*k)));
    };
    this.rivals.forEach((rv,i)=>{
      const x=px(rv.dist), y=Track.laneFoot(rv.lane);
      if(x<-40||x>VW+40) return;
      const rk=Track.laneScale(rv.lane), rsw=(this.t*0.0009+i*0.37)%1;
      boat(x,y,false,rk,rsw); (this._deck=this._deck||[]).push({x,y,k:rk,mine:false,sw:rsw});
      if(CharHD.enabled) (this._hd=this._hd||[]).push({sp:'otter', x:x-Math.round(4*rk), y:y-Math.round(2*rk),
        ph:rsw, o:{act:'row', rare:2, t:this.t, scale:rk*0.62}});
    });
    const mx=px(this.dist), my=Track.laneFoot(1);
    const mk=Track.laneScale(1);
    /* 노 각도는 마지막 스트로크로부터의 경과로 — 화면이 실제 리듬을 보여 준다 */
    const msw = clamp((this.t-this.lastStroke)/Math.max(300,this.targetIv), 0, 1);
    boat(mx,my,true,mk,msw); (this._deck=this._deck||[]).push({x:mx,y:my,k:mk,mine:true,sw:msw});
    this._meX=mx; this._meY=my;
    if(CharHD.enabled) (this._hd=this._hd||[]).push({sp:'beaver', x:mx-Math.round(4*mk), y:my-Math.round(2*mk),
      ph:msw, o:{act:'row', rare:1, t:this.t, scale:mk*0.66}});
    /* 노 젓는 물결 */
    if(this.phase==='RUN' && this.t-this.lastStroke < 260)
      BG.fx(BG.ctx(),'ripple-ring', mx-14, my+6, 16, (this.t-this.lastStroke)/260, 4);
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.5})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    if(this._hd){ for(const c of this._hd) CharHD.draw(u, c.sp, c.x, c.y, c.ph, c.o); this._hd=null; }
    /* ⚠ 사이클과 똑같이 — 판정을 저장만 하고 안 그리고 있었다. */
    if(this.phase==='RUN' && this._meX!==undefined)
      HUD.tap(u, { j:this.lastJudge, ageMs:this.t-this.lastJudgeMs, ivMs:this.targetIv,
                   x:this._meX, y:this._meY, labelY:this._meY-32 });
    /* ⚠ 선체는 배경 층에 있어 캐릭터를 덮을 수 없다 — 달리기 포즈의 다리가 그대로 드러나
       '물 위를 달리는' 그림이 됐다. 갑판만 UI 층에 한 번 더 그려 하반신을 가린다.
       앉은 포즈 어셋(scull-hd)이 오면 이 덮개는 그냥 그 아래로 들어간다. */
    if(this._deck){
      for(const d of this._deck){
        /* 덮개는 배경 선체보다 **높다** — 엉덩이 아래를 가려야 '앉았다'가 된다.
           7px 짜리로 덮었더니 다리가 그대로 보여 아무것도 달라지지 않았다. */
        const L=Math.round(58*d.k), H=Math.round(7*d.k), TOP=d.y-Math.round(11*d.k);
        u.fillStyle = d.mine? '#f0e0b4' : '#9fb3c4';
        u.beginPath();
        u.moveTo(d.x-L*0.62, TOP+H*0.9); u.lineTo(d.x-L*0.22, TOP);
        u.lineTo(d.x+L*0.30, TOP); u.lineTo(d.x+L*0.52, TOP+H*0.8);
        u.lineTo(d.x+L*0.46, d.y+H*0.35); u.lineTo(d.x-L*0.55, d.y+H*0.7);
        u.closePath(); u.fill();
        u.fillStyle='rgba(0,0,0,.22)'; u.fillRect(d.x-L*0.22, TOP, L*0.52, Math.max(1,Math.round(1.4*d.k)));
        u.fillStyle='rgba(0,0,0,.34)'; u.fillRect(d.x-L*0.55, d.y+H*0.45, L*0.98, Math.max(1,H*0.45));
        /* 노는 갑판 **위**로 — 배경 층에 그렸더니 덮개에 가려 안 보였다 */
        const sw=Math.sin(d.sw*Math.PI*2)*0.6;
        u.strokeStyle = d.mine? 'rgba(255,255,255,.8)' : 'rgba(205,222,238,.55)';
        u.lineWidth=Math.max(1,1.5*d.k); u.lineCap='round';
        for(const s2 of [-1,1]){
          u.beginPath(); u.moveTo(d.x, TOP+H*0.4);
          u.lineTo(d.x - Math.cos(sw)*20*d.k, TOP + s2*(11*d.k) + Math.sin(sw)*5*d.k);
          u.stroke();
        }
      }
      this._deck=null;
    }
    HUD.race(u, { def:this.def, timeS:Math.max(0,this.elapsed), speed:this.speed,
                  distM:this.dist, trackM:this.trackM, qualify:this.qualify,
                  best:Save.data.best[this.def.id] });
    /* 일정함 — 이 종목의 핵심 지표 */
    /* ⛔ 물 위에 어두운 글씨·가는 막대라 안 읽혔다(실측 스크린샷).
       이 종목의 **전부**가 이 값인데 제일 안 보였다 — 받침을 깔고 상태를 말로 붙인다. */
    const bw=120, bx=VW/2-bw/2, by=VH-26;
    plate(u, bx-8, by-15, bw+16, 27, 0.74);
    const sc = this.smooth>0.75?PAL.green:this.smooth>0.5?PAL.gold:PAL.red;
    txt(u,'일정함', bx, by-12, 9, PAL.dim,'left');
    txt(u, this.smooth>0.75?'좋다':this.smooth>0.5?'흔들린다':'들쭉날쭉',
        bx+bw, by-12, 9, sc, 'right', 700);
    u.fillStyle='rgba(255,255,255,.18)'; u.fillRect(bx,by,bw,8);
    u.fillStyle = sc;
    u.fillRect(bx,by,Math.round(bw*this.smooth),8);
    if(this.phase==='SET') txt(u,'총성을 기다리세요', VW/2, 46, 12, PAL.white,'center',700);
    else if(this.strokes<3) txt(u,'좌·우를 천천히 고르게 — 간격을 일정하게', VW/2, VH-56, 10, PAL.white,'center');  /* ⚠ VH-42(228) 는 '일정함' 줄(232)과 문다 */
    else if(!this.pitchUsed) txt(u,'액션 = 피치 업 (한 번)', 8, VH-24, 9, PAL.gold,'left');
    if(this.t-this.msgAt<900)
      txt(u, this.msg, VW/2, 46, 12, this.msgBad?PAL.red:PAL.green,'center',700);
  }
}
