/* ══════════════════════════════════════════════════════════════════
   기계체조 — 도마

   멀리뛰기도 구름판을 밟고, 트램폴린도 공중에서 돈다. 도마가 다른 건 **손 짚기**다.
   달려와서 구름판을 밟고, 도마를 **손으로 밀어내는 그 짧은 순간**에 높이가 정해진다.
   그 뒤는 이미 정해진 몸을 어떻게 접었다 펴느냐의 문제다.

   네 박자
     ① 조주   좌·우 번갈아 — 속도가 붙는다
     ② 구름판 초록 창에서 액션 — 속도가 위로 바뀐다
     ③ 손 짚기 도마에 닿는 **아주 짧은 창**에서 액션 — 여기가 이 종목이다
     ④ 공중·착지 좌·우 연타로 비틀기, 착지 창에서 액션으로 **버티기**

   점수 = 난도(비틀기) + 수행점수(구름판·손짚기·착지) — 10점 만점 근처.
   ⚠ 손 짚기를 놓치면 비틀 시간이 없다. 난도를 올리려면 먼저 높이를 벌어야 한다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const VAULT = {
  runwayM: 25,
  maxSpeed: 9.4,
  strideIv: 190,
  strideWindow: 46,
  boardAtM: 21,          // 구름판 위치
  boardWindowM: 1.5,
  tableAtM: 25,          /* 도마. ⚠ 2m 간격은 화면에서 20px 이라 구름판과 도마가 겹쳐 보였다 */
  blockWindowMs: 130,    // 손 짚기 창 — 아주 짧다
  blockPerfectMs: 52,
  flightBase: 0.95,      // 손 짚기 없이도 이 정도는 뜬다(초)
  flightPerBlock: 0.75,  // 잘 짚으면 여기까지 늘어난다
  twistPerTap: 0.5,      // 연타 한 번 = 반 바퀴
  maxTwist: 3.0,
  landWindow: 0.14,
  attempts: 2,           // 실제 도마도 2차시
};

class VaultEvent {
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.t=0; this.attempt=1; this.marks=[]; this.best=0;
    this.result=null; this.doneAt=0; this.flash=0;
    this.msg=''; this.msgAt=-1e9; this.msgBad=false;
    this.newRun();
  }
  newRun(){
    this.phase='RUN';        // RUN → BOARD → BLOCK → AIR → LAND → MARK
    this.dist=0; this.speed=0; this.side=0; this.lastStride=-1e9;
    this.judge={PERFECT:0,GOOD:0,MISS:0};
    this.boardQ=0; this.blockQ=-1; this.blockAt=-1e9;
    this.flight=0; this.airT=0; this.twist=0; this.opened=false;
    this.landQ=0; this.markAt=-1e9; this.pending=null;
  }
  get qualify(){ return this.def.qualify; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }
  get toBoard(){ return VAULT.boardAtM - this.dist; }
  get toLand(){ return this.flight - this.airT; }

  onStride(side, tMs){
    if(this.phase==='RUN'){
      const dt=tMs-this.lastStride;
      let j='GOOD';
      if(this.side===side) j='MISS';
      else if(this.lastStride<-1e8) j='GOOD';
      else j = Math.abs(dt-VAULT.strideIv)<=VAULT.strideWindow ? 'PERFECT'
             : Math.abs(dt-VAULT.strideIv)<=VAULT.strideWindow*2.4 ? 'GOOD' : 'MISS';
      this.judge[j]++; this.side=side; this.lastStride=tMs;
      Sfx.step(j);
      const gain={PERFECT:1.0,GOOD:0.66,MISS:0.22}[j];
      this.speed=Math.min(VAULT.maxSpeed, this.speed + VAULT.maxSpeed*0.13*gain);
      return;
    }
    /* 공중 비틀기 — 이미 폈으면 안 돈다 */
    if(this.phase==='AIR' && !this.opened && this.toLand>0.28){
      this.twist=Math.min(VAULT.maxTwist, this.twist+VAULT.twistPerTap);
      Sfx.step('GOOD');
    }
  }
  onAction(tMs){
    if(this.phase==='RUN'){
      /* 구름판 — 위치로 판정한다(시간이 아니라) */
      const d=Math.abs(this.toBoard);
      if(d>VAULT.boardWindowM*2.2){ this.say('구름판이 아직 멀다', true); this.speed*=0.9; return; }
      this.boardQ = clamp(1 - d/(VAULT.boardWindowM*1.6), 0, 1);
      this.phase='BLOCK'; this.blockAt=this.t;
      /* 도마까지 남은 거리를 시간으로 — 그 순간이 손 짚는 때다 */
      this.blockDue = this.t + (VAULT.tableAtM-VAULT.boardAtM)/Math.max(1,this.speed)*1000;
      Sfx.beep(700,0.05,'square',0.10);
      return;
    }
    if(this.phase==='BLOCK'){
      const err=Math.abs(this.t-this.blockDue);
      if(err>VAULT.blockWindowMs*2.2){ this.say('손이 미끄러졌다', true); this.blockQ=0; this.launch(); return; }
      this.blockQ = err<=VAULT.blockPerfectMs ? 1
                  : clamp(1-(err-VAULT.blockPerfectMs)/(VAULT.blockWindowMs*2), 0, 0.85);
      if(this.blockQ>=1) this.say('완벽한 손 짚기!');
      Sfx.beep(this.blockQ>=1?1180:820, 0.09,'square',0.14);
      this.launch();
      return;
    }
    if(this.phase==='AIR'){
      /* 착지 창 안이면 버티기, 아니면 자세 펴기 */
      const d=this.toLand;
      if(d>VAULT.landWindow*2.2 && !this.opened && this.twist>0){
        this.opened=true; this.say('자세 폄'); Sfx.beep(960,0.07,'sine',0.11); return;
      }
      if(Math.abs(d)<=VAULT.landWindow*2.4) this.land(Math.abs(d));
    }
  }
  onActionUp(){}
  launch(){
    /* 높이(체공)는 속도와 손 짚기가 만든다 — 여기서 이번 시기의 상한이 정해진다 */
    const sp=this.speed/VAULT.maxSpeed;
    this.flight = VAULT.flightBase*(0.55+sp*0.45)
                + VAULT.flightPerBlock*Math.max(0,this.blockQ)*(0.6+sp*0.4);
    this.phase='AIR'; this.airT=0;
  }
  land(err){
    const w=VAULT.landWindow;
    this.landQ = err<=w*0.45 ? 1 : err<=w ? 0.72 : 0.34;
    if(!this.opened && this.twist>0) this.landQ*=0.5;     // 안 펴고 내려오면 못 버틴다
    /* 난도 — 0.42 로는 2바퀴를 돌아도 0.84점밖에 안 붙어서, 위험을 감수할 이유가 약했다.
       (안 펴고 내려오는 벌점이 1.23점이라 오히려 손해였다.) */
    const D = 1 + this.twist*0.55;
    const E = 3.2 + 2.4*this.boardQ + 2.6*Math.max(0,this.blockQ) + 2.4*this.landQ;  // 수행
    const mark = +(D + E).toFixed(2);
    this.marks.push(mark); this.best=Math.max(this.best, mark);
    this.phase='MARK'; this.markAt=this.t; this.pending=mark;
    this.flash = this.landQ>=1 ? 0.8 : 0.3;
    this.landQ>=1 ? Sfx.finish() : Sfx.step(this.landQ>0.5?'GOOD':'MISS');
    Track.cheer(clamp(mark/14,0,1));
  }

  update(dt){
    this.t += dt*1000;
    this.flash=Math.max(0,this.flash-dt*3);
    if(this.phase==='RUN' || this.phase==='BLOCK'){
      this.speed=Math.max(0,this.speed-dt*1.1);
      this.dist+=this.speed*dt;
      /* 구름판을 지나쳐 버렸다 */
      if(this.phase==='RUN' && this.toBoard < -VAULT.boardWindowM*2.2){
        this.say('구름판을 지나쳤다', true);
        this.boardQ=0; this.blockQ=0; this.launch();
      }
      /* 손을 못 짚고 도마를 넘었다 */
      if(this.phase==='BLOCK' && this.t > this.blockDue + VAULT.blockWindowMs*2.2){
        this.say('손을 못 짚었다', true); this.blockQ=0; this.launch();
      }
    }
    else if(this.phase==='AIR'){
      this.airT+=dt;
      if(this.airT >= this.flight + VAULT.landWindow*2.4){
        this.say('그대로 떨어졌다', true); this.land(VAULT.landWindow*3);
      }
    }
    else if(this.phase==='MARK'){
      if(this.t-this.markAt > 1700){
        if(this.attempt >= VAULT.attempts){
          this.phase='DONE'; this.doneAt=this.t;
          const pass=this.best>=this.qualify;
          this.result={status:pass?'OK':'MISSED_QUALIFY', value:this.best, rank:pass?1:2};
          pass?Sfx.finish():Sfx.fail();
        } else { this.attempt++; this.newRun(); }
      }
    }
    Track.crowdTick();
    Sfx.crowd(this.phase==='RUN'?clamp(this.speed/VAULT.maxSpeed,0,1)*0.7:0.3);
  }

  draw(ctx){
    const gt=Track.fieldBack(ctx, 20);
    const mPerPx=0.085;
    const cam = Math.max(0, this.dist-14);
    const px=(m)=>Math.round((m-cam)/mPerPx);
    this._px=px;
    /* ⚠ 배경층(BG)은 게임 캔버스 **아래**에 있다. 여기서 fieldGround 로 바닥을
       불투명하게 칠한 뒤 조주로·구름판·도마를 배경층에 그리고 있었다 — 즉
       **도착한 어셋 3종을 그려 놓고 곧바로 덮었다**. 실측: 배경층에는 도마가
       (158,158,160)로 있는데 그 자리 게임층이 불투명(61,66,80,255)이었다.
       멀리뛰기(Venue.runway)가 쓰는 규칙을 따른다 — HD 가 있으면 바닥칠을 맡긴다. */
    const hdR = BG.tile(BG.ctx(),'runway-strip', 180, 40, cam/mPerPx);
    const GROUND = hdR ? 214 : Track.fieldGround(ctx,{grassTop:gt, surface:'#3d4250'});
    /* ⚠ HD 조주로는 180~220 만 덮는다. 바닥칠을 통째로 건너뛰었더니 그 위아래
       (160~178 · 220~240)가 **검은 띠**로 남았다 — 실측으로 잡았다. 잔디로 메운다. */
    if(hdR){
      ctx.fillStyle=PAL.grass;
      ctx.fillRect(0, gt, VW, 180-gt); ctx.fillRect(0, 220, VW, VH-220);
      ctx.fillStyle=PAL.grassLine;
      for(let x=0;x<VW;x+=14){ ctx.fillRect(x, gt+2, 7, 2); ctx.fillRect(x, 222, 7, 2); }
    }
    this._g=GROUND-4;
    if(!hdR){
      ctx.fillStyle='#8a5a3c'; ctx.fillRect(0, this._g-4, VW, 8);
      ctx.fillStyle='rgba(255,255,255,.10)';
      for(let m=0;m<=VAULT.runwayM;m+=1){ const x=px(m); if(x>=0&&x<VW) ctx.fillRect(x,this._g-4,1,8); }
    }
    /* 구름판 */
    const bx=px(VAULT.boardAtM);
    if(bx>-30 && bx<VW+30 && !BG.obj(BG.ctx(),'takeoff-board-hd', bx, this._g+3, 9)){
      ctx.fillStyle='#d8c07a'; ctx.fillRect(bx-9, this._g-6, 18, 6);
      ctx.fillStyle='#8c7440'; ctx.fillRect(bx-9, this._g, 18, 3);
    }
    /* 도마 */
    const tx=px(VAULT.tableAtM);
    if(tx>-40 && tx<VW+40 && !BG.obj(BG.ctx(),'vault-table-hd', tx, this._g+2, 26)){
      ctx.fillStyle='#c8a86a'; ctx.fillRect(tx-18, this._g-27, 38, 11);
      ctx.fillStyle='#7a6440'; ctx.fillRect(tx-3, this._g-16, 6, 16);
      ctx.fillStyle='rgba(0,0,0,.3)'; ctx.fillRect(tx-18, this._g-17, 38, 2);
    }
    /* 착지 매트 — 매트도 배경층에 둔다. 게임층에 그리면 그 아래 도마를 덮는다. */
    const lx=px(VAULT.tableAtM+3.2), bgc=BG.ctx();
    if(!BG.obj(bgc,'vault-mat', lx+40, this._g+4, 10)){
      bgc.fillStyle='#3f5a86'; bgc.fillRect(lx-8, this._g-3, 96, 7);
      bgc.fillStyle='rgba(255,255,255,.15)'; bgc.fillRect(lx-8, this._g-3, 96, 1);
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.4})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    if(!this._px) return;
    const px=this._px, G=this._g;
    /* 선수 */
    let x, y=G, rot=0, tuck=false;
    if(this.phase==='RUN'||this.phase==='BLOCK'){ x=px(this.dist); }
    else if(this.phase==='AIR'||this.phase==='MARK'){
      const k = this.phase==='AIR' ? clamp(this.airT/Math.max(0.01,this.flight),0,1) : 1;
      x = px(VAULT.tableAtM + 3.2*k);
      y = G - Math.sin(k*Math.PI)*(this.flight*46);
      tuck = this.phase==='AIR' && !this.opened && this.twist>0;
      if(tuck) rot = this.twist * k * Math.PI*2;
    }
    u.save();
    if(rot){ u.translate(x,y-12); u.rotate(rot); u.translate(-x,-(y-12)); }
    if(!CharHD.draw(u,'lemur', x, y, (this.t*0.006)%1,
        {rare:3, t:this.t, scale:0.85, moving:this.phase==='RUN', crouch:tuck}))
      { u.fillStyle=PAL.gold; u.fillRect(x-5,y-20,10,20); }
    u.restore();

    /* 조주 게이지 — 구름판까지 남은 거리 */
    if(this.phase==='RUN'){
      const left=this.toBoard;
      txt(u, left>0? K('구름판까지 %1m').replace('%1',left.toFixed(1)) : K('지금!'),
          VW/2, 44, left<=VAULT.boardWindowM*1.6?14:11,
          left<=VAULT.boardWindowM*1.6?PAL.green:PAL.white,'center',700);
      HUD.rhythm && HUD.rhythm(u, { strides:(this.player&&this.player.combo)||0, nextSide:-this.side||1,
        phaseErr:clamp(((this.t-this.lastStride)-VAULT.strideIv)/VAULT.strideIv,-1,1), form:1});
    }
    /* 손 짚기 창 — 이 종목의 핵심이라 크게 */
    if(this.phase==='BLOCK'){
      const left=(this.blockDue-this.t)/1000;
      const bw=140, bx=VW/2-bw/2, by=52;
      u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(bx,by,bw,10);
      const wFrac=VAULT.blockWindowMs*2.2/900;
      u.fillStyle='rgba(92,255,156,.4)';
      u.fillRect(bx+bw*0.5-bw*wFrac/2, by, bw*wFrac, 10);
      const k=clamp(1-left/0.9,0,1);
      u.fillStyle=PAL.white; u.fillRect(bx+bw*k-1, by-3, 2, 16);
      txt(u,'손 짚기', VW/2, 38, 13, PAL.gold,'center',700);
    }
    if(this.phase==='AIR'){
      txt(u, (this.twist*0.5).toFixed(1)+K('바퀴'), VW/2, 40, 13,
          this.opened?PAL.green:(this.twist>0?PAL.red:PAL.white),'center',700);
      const d=this.toLand;
      if(d<0.8){
        const k=clamp(1-d/0.8,0,1);
        u.strokeStyle = Math.abs(d)<=VAULT.landWindow?PAL.green:'rgba(255,255,255,.45)';
        u.lineWidth=2; u.beginPath(); u.arc(px(VAULT.tableAtM+3.2), G+3, Math.max(4,18-k*13), 0, 6.284); u.stroke();
      }
    }
    /* 점수판 */
    SB.tally(u, {
      name: this.def.name,
      progress: this.attempt+' / '+VAULT.attempts+'차',
      mine: this.best || 0, fmt: v => v ? (+v).toFixed(2) : '—',
      cuts: medalCuts(this.def), higher: !!this.def.higher,
      history: (this.marks||[]).map(m => +(+m).toFixed(1)),
    });

    if(this.phase==='MARK' && this.pending!=null){
      u.fillStyle='rgba(5,6,10,.72)'; u.fillRect(0, 78, VW, 58);
      txt(u, this.pending.toFixed(2), VW/2, 84, 26, PAL.gold,'center',700);
      txt(u, K('난도')+' '+(1+this.twist*0.55).toFixed(2)+'  ·  '+K('수행')+' '
             +(3.2+2.4*this.boardQ+2.6*Math.max(0,this.blockQ)+2.4*this.landQ).toFixed(2),
          VW/2, 116, 10, PAL.dim,'center');
    }
    if(this.phase==='RUN' && this.dist<3)
      txt(u,'좌·우로 달려 구름판을 밟고, 도마에 닿을 때 다시 액션', VW/2, VH-40, 10, PAL.white,'center');
    if(this.t-this.msgAt<900)
      txt(u, this.msg, VW/2, 64, 12, this.msgBad?PAL.red:PAL.green,'center',700);
  }
}
