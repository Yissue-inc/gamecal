/* ══════════════════════════════════════════════════════════════════
   승마 장애물 — 허들과 겹치지 않게 **보폭 계산**을 축으로 삼는다.

   허들은 간격이 일정하다. 리듬만 맞추면 된다.
   장애물 비월은 간격이 **제각각**이다. 그래서 실제 선수가 하는 일은 달리는 게 아니라
   "여기서 세 걸음, 저기서 네 걸음" 하고 **걸음 수를 세는 것**이다 — 라인을 본다고 한다.
     · ▲▼ 로 보폭을 바꾼다(짧게 3.2m · 보통 3.7m · 길게 4.3m)
     · 좌·우를 번갈아 = 한 걸음. 도약대(장애물 앞 2.2m)에 발이 맞아야 뛴다
     · 액션 = 도약. 맞으면 넘고, 어긋나면 **막대를 떨어뜨리거나(4벌점) 거부한다(4벌점+시간)**
     · 제한 시간을 넘기면 초당 1벌점
   기록 = 벌점 + 초과 시간. 적을수록 좋다.
   ⚠ 그래서 빨리 달리는 게 답이 아니다. **다음 장애물에 발이 맞게** 보폭을 미리 고르는 것이다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const EQU = {
  strides: [
    { name:'짧게', m:3.2 },
    { name:'보통', m:3.7 },
    { name:'길게', m:4.3 },
  ],
  strideIv: 300,          // 한 걸음의 목표 간격(ms)
  strideWindow: 80,
  takeoffAt: 2.2,         // 장애물 앞 이 지점이 도약대
  takeoffWindow: 0.85,    // 이 안에서 액션이면 깨끗이 넘는다
  knockWindow: 1.7,       // 여기까지는 넘되 막대를 건드린다
  faultKnock: 4,
  faultRefuse: 4,
  refuseSetback: 6,       // 거부하면 이만큼 물러난다
  maxRefusals: 3,         /* ⚠ 실제 규칙대로 3회면 실격. 없었을 땐 같은 장애물 앞에서
                             **153번** 거부하며 판이 안 끝났다(실측). */
  timeAllowed: 62,
  landAfter: 2.6,         // 착지 지점(장애물 뒤)
};

class EquestrianEvent {
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.phase='SET'; this.t=0; this.gunMs=1000+Math.random()*800; this.setBeeps=0;
    this.dist=0; this.stride=1; this.lastStep=-1e9; this.side=0; this.speed=0;
    this.faults=0; this.knocks=0; this.refusals=0; this.cleared=0;
    this.jumping=false; this.jumpT=0; this.jumpDur=0.62; this.jumpFrom=0; this.jumpTo=0;
    this.balance=1;   // 최근 걸음의 리듬 — 흐트러지면 도약 창이 좁아진다
    this.msg=''; this.msgAt=-1e9; this.msgBad=false; this.flash=0;
    this.result=null; this.doneAt=0;
    /* 코스 — 간격이 제각각인 게 이 종목의 전부다 */
    this.fences=[]; let m=16;
    const gaps=[19.5, 14.8, 22.4, 17.1, 25.0, 15.6, 20.8, 18.3];
    for(let i=0;i<9;i++){
      this.fences.push({ m, h: 1.1 + (i%3)*0.12, done:false, ok:false });
      m += gaps[i%gaps.length] + (i%2?1.2:-0.9);
    }
    this.courseM = m + 12;
  }
  get qualify(){ return this.def.qualify; }
  get elapsed(){ return Math.max(0,(this.t-this.gunMs)/1000); }
  get timeFault(){ return Math.max(0, Math.ceil(this.elapsed - EQU.timeAllowed)); }
  get total(){ return this.faults + this.timeFault; }
  get S(){ return EQU.strides[this.stride]; }
  get next(){ return this.fences.find(f=>!f.done); }
  /* 다음 장애물의 도약대까지 남은 거리 */
  get toTakeoff(){ const f=this.next; return f ? (f.m-EQU.takeoffAt) - this.dist : 1e9; }
  /* 지금 보폭으로 몇 걸음이 남았나 — 이게 화면에 보여야 '라인을 본다'가 가능하다 */
  get stepsLeft(){ return this.toTakeoff / this.S.m; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }

  onUp(){ if(this.phase==='RUN' && !this.jumping && this.stride<2){ this.stride++; Sfx.ui(); } }
  onDown(){ if(this.phase==='RUN' && !this.jumping && this.stride>0){ this.stride--; Sfx.ui(); } }
  onStride(side, tMs){
    if(this.phase!=='RUN' || this.jumping) return;
    const dt=tMs-this.lastStep;
    let j='GOOD';
    if(this.side===side) j='MISS';
    else if(this.lastStep<-1e8) j='GOOD';
    else j = Math.abs(dt-EQU.strideIv)<=EQU.strideWindow ? 'PERFECT'
           : Math.abs(dt-EQU.strideIv)<=EQU.strideWindow*2.2 ? 'GOOD' : 'MISS';
    this.side=side; this.lastStep=tMs;
    Sfx.step(j);
    /* 한 걸음 = 지금 보폭만큼 전진. 리듬이 나쁘면 덜 나간다 */
    const q={PERFECT:1,GOOD:0.85,MISS:0.55}[j];
    /* ⚠ 보폭 계산만으로 결과가 정해지면 **리듬이 아무 의미가 없다** — 능숙과 보통이
       똑같이 무결점(0벌점)이 나왔다. 흐트러진 걸음으로 달려온 말은 도약대에 발을 맞춰도
       깨끗이 못 넘는다. 최근 리듬을 누적해 도약 창을 좁힌다. */
    this.balance = clamp(this.balance*0.72 + q*0.28, 0, 1);
    this.dist += this.S.m * q;
    this.speed = this.S.m / (EQU.strideIv/1000);
  }
  onAction(){
    if(this.phase!=='RUN' || this.jumping) return;
    const f=this.next; if(!f) return;
    const off=Math.abs(this.toTakeoff);
    const win=EQU.takeoffWindow*(0.42+0.58*this.balance);
    if(off<=win){ this.jump(f, true); }
    else if(off<=EQU.knockWindow){ this.jump(f, false); }
    else if(this.toTakeoff>EQU.knockWindow){ this.say('아직 멀다', true); }
    else { /* 이미 지나쳤다 — 거부 */ this.refuse(f); }
  }
  onActionUp(){}
  jump(f, clean){
    this.jumping=true; this.jumpT=0;
    this.jumpFrom=this.dist; this.jumpTo=f.m+EQU.landAfter;
    f.done=true; f.ok=true;
    if(clean){ this.cleared++; this.say('깨끗하게!'); Sfx.step('PERFECT'); Track.cheer(0.35); }
    else { f.knock=true; this.knocks++; this.faults+=EQU.faultKnock;
           this.say('막대를 떨어뜨렸다 +4', true); Sfx.fail(); this.flash=0.5; }
  }
  refuse(f){
    this.refusals++; this.faults+=EQU.faultRefuse;
    if(this.refusals>=EQU.maxRefusals){
      this.phase='DONE'; this.doneAt=this.t;
      this.say('거부 3회 — 실격', true); Sfx.fail();
      this.result={status:'DQ', value:DNF, rank:2, reason:'거부 3회 — 말이 장애물 앞에서 멈췄습니다'};
      return;
    }
    this.dist = Math.max(0, (f.m-EQU.takeoffAt) - EQU.refuseSetback);
    this.say('거부 +4 — 다시 접근', true); Sfx.fail(); this.flash=0.6;
    this.lastStep=-1e9; this.side=0;
  }

  update(dt){
    this.t+=dt*1000;
    this.flash=Math.max(0,this.flash-dt*3);
    if(this.phase==='SET'){
      const want=Math.min(3, Math.floor(3-(this.gunMs-this.t)/360));
      if(want>this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(this.t>=this.gunMs){ this.phase='RUN'; Sfx.gun(); }
      return;
    }
    if(this.phase!=='RUN') return;
    if(this.jumping){
      this.jumpT+=dt;
      const k=clamp(this.jumpT/this.jumpDur,0,1);
      this.dist = lerp(this.jumpFrom, this.jumpTo, k);
      if(k>=1){ this.jumping=false; this.lastStep=-1e9; this.side=0; }
      return;
    }
    /* 장애물을 그냥 지나쳤다 — 거부로 친다 */
    const f=this.next;
    if(f && this.dist > f.m + 0.5) this.refuse(f);
    if(!f && this.dist>=this.courseM){
      this.phase='DONE'; this.doneAt=this.t;
      const v=this.total, pass=v<=this.qualify;
      this.result={status:pass?'OK':'MISSED_QUALIFY', value:v, rank:pass?1:2};
      pass?Sfx.finish():Sfx.fail();
    }
    if(!f) this.dist += this.S.m*0.85*(dt/(EQU.strideIv/1000));   // 마지막 구간은 흘러간다
    if(this.elapsed > EQU.timeAllowed*2.4){
      this.phase='DONE'; this.doneAt=this.t;
      this.result={status:'TIMEOUT', value:DNF, rank:2}; Sfx.fail();
    }
    Track.crowdTick();
    Sfx.crowd(0.4);
  }

  draw(ctx){
    const gt=Track.fieldBack(ctx, 20);
    const G=Track.fieldGround(ctx,{grassTop:gt, surface:'#4a7a44'});
    this._g=G-2;
    const mPerPx=0.13;
    const cam=Math.max(0,this.dist-12);
    const px=(m)=>Math.round((m-cam)/mPerPx);
    this._px=px;
    /* 장애물 */
    for(const f of this.fences){
      const x=px(f.m); if(x<-40||x>VW+40) continue;
      const h=Math.round(f.h*26);
      if(!BG.obj(BG.ctx(),'showjump-fence', x, this._g, h)){
        ctx.fillStyle='#e8e2d4';
        for(let b=0;b<3;b++) ctx.fillRect(x-13, this._g-h+b*(h/3), 26, 3);
        ctx.fillStyle='#8a6a3c'; ctx.fillRect(x-15, this._g-h-2, 3, h+2);
        ctx.fillRect(x+12, this._g-h-2, 3, h+2);
      }
      if(f.knock){ ctx.fillStyle='rgba(255,90,74,.75)'; ctx.fillRect(x-13, this._g-3, 26, 3); }
      else if(f.ok){ ctx.fillStyle='rgba(92,255,156,.5)'; ctx.fillRect(x-13, this._g+1, 26, 2); }
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,120,90,${this.flash*0.35})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    if(!this._px) return;
    const px=this._px, G=this._g;
    /* 말 */
    let y=G;
    if(this.jumping){
      const k=clamp(this.jumpT/this.jumpDur,0,1);
      y = G - Math.sin(k*Math.PI)*42;
    }
    const x=px(this.dist);
    if(!CharHD.draw(u,'horse', x, y, (this.t*0.005)%1,
        {rare:3, t:this.t, scale:1.0, moving:!this.jumping, lean:this.jumping}))
      { u.fillStyle=PAL.gold; u.fillRect(x-8,y-22,16,22); }

    /* 도약대 표시 — 다음 장애물 앞 어디서 뛰어야 하는지 */
    const f=this.next;
    if(f && !this.jumping){
      const tx=px(f.m-EQU.takeoffAt);
      const inWin=Math.abs(this.toTakeoff)<=EQU.takeoffWindow;
      u.strokeStyle = inWin?PAL.green:'rgba(255,255,255,.35)';
      u.lineWidth = inWin?2:1;
      u.beginPath(); u.moveTo(tx, G-16); u.lineTo(tx, G+4); u.stroke();
      /* 걸음 수 — 이게 이 종목의 계기판이다 */
      const n=this.stepsLeft;
      const near=Math.round(n);
      const err=Math.abs(n-near);
      txt(u, n>0? K('남은 걸음')+' '+n.toFixed(1) : K('지금 뛰어라!'),
          VW/2, 44, n<=1.2?15:12,
          n<=1.2? PAL.green : (err<0.18?PAL.green:err<0.36?PAL.gold:PAL.red),'center',700);
      if(n>0.8)
        txt(u, err<0.18? K('발이 맞는다') : K('발이 어긋난다 — 보폭을 바꿔라'),
            VW/2, 60, 10, err<0.18?PAL.green:PAL.gold,'center');
    }
    /* 보폭 3단 */
    const bw=44, x0=VW/2-(bw*3+8)/2, by=VH-30;
    EQU.strides.forEach((s,i)=>{
      const on=i===this.stride, bx=x0+i*(bw+4);
      u.fillStyle = on?PAL.gold:'rgba(255,255,255,.10)';
      u.fillRect(bx,by,bw,15);
      txt(u, K(s.name), bx+bw/2, by+3, 10, on?'#0d1017':'rgba(255,255,255,.5)','center',on?700:400);
      txt(u, s.m.toFixed(1)+'m', bx+bw/2, by+17, 8, PAL.dim,'center');
    });
    txt(u,'▲▼', x0-8, by+4, 9, PAL.dim,'right');
    /* 말의 리듬 — 이게 좁아지면 도약 창도 좁아진다.
       ⛔ 자리 계산이 **버튼 간격(+4씩)을 빼먹었다**(bw*3 이 아니라 bw*3+8 이 실제 폭이다).
          그래서 '리듬' 라벨이 세 번째 보폭 버튼 위에 겹쳐 찍혔다(실측 캡처).
       ⚠ 라벨을 왼쪽에 두면 버튼과 다투므로 **막대 위**로 올린다 — 자리를 안 뺏는다. */
    const rw=64, rx=x0+bw*3+8+40;
    txt(u,K('리듬'), rx, by-9, 9, PAL.dim,'left');
    u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(rx, by+3, rw, 7);
    u.fillStyle = this.balance>0.8?PAL.green : this.balance>0.55?PAL.gold : PAL.red;
    u.fillRect(rx, by+3, Math.round(rw*this.balance), 7);

    /* HUD */
    /* 벌점이 곧 점수다(낮을수록 좋다) — 기준은 레일 위 자리로(05_scoreboard) */
    SB.tally(u, {
      name: this.def.name,
      progress: this.cleared+' / '+this.fences.length,
      mine: this.total || 0, unit: K('벌점'),
      cuts: medalCuts(this.def), higher: !!this.def.higher,
    });
    txt(u, fmtTime(this.elapsed), 8, 36, 10,
        this.elapsed>EQU.timeAllowed?PAL.red:PAL.dim, 'left');
    if(this.knocks||this.refusals)
      txt(u, (this.knocks?K('낙마봉')+' '+this.knocks+'  ':'')+(this.refusals?K('거부')+' '+this.refusals:''),
          70, 36, 9, PAL.red,'left');
    if(this.phase==='SET') txt(u,'출발 신호를 기다리세요', VW/2, 76, 12, PAL.white,'center',700);
    else if(this.cleared===0 && !this.knocks)
      /* ⚠ VH-48(222) 은 2인용 **차례 배지**(20_screens.drawTurnBadge, x6~118 · y222~239)와
         같은 줄이다 — 2인으로 켜야만 보인다(1인 감사로는 영영 못 본다). 한 줄 올린다. */
      txt(u,'▲▼ 보폭 · 좌우 한 걸음 · 도약대에서 액션', VW/2, Track.tipY(), 10, PAL.white,'center');
    if(this.t-this.msgAt<1000)
      txt(u, this.msg, VW/2, 76, 13, this.msgBad?PAL.red:PAL.green,'center',700);
  }
}
