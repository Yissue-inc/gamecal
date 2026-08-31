/* ══════════════════════════════════════════════════════════════════
   카누 슬라럼 — 이 게임에 없던 **가로 조종**.

   조정은 앞으로만 간다(일정함이 전부다). 카누 슬라럼은 물살이 배를 **옆으로 민다**.
   내려가는 건 저절로 되고, 문제는 정해진 문(게이트)을 정해진 방향으로 통과하는 것이다.
     · 좌·우 = 노 젓는 쪽. 그쪽으로 배가 밀린다(가로 이동)
     · 물살은 구간마다 다른 방향으로 흐른다 — 가만 두면 떠내려간다
     · 초록 문은 아래로, **빨간 문은 거슬러 올라가서** 통과한다(업스트림)
     · 문 봉을 건드리면 +2초, 아예 놓치면 +50초
   ⚠ 그래서 이 종목의 시간은 '빨리 내려간 시간'이 아니라 **벌점을 더한 시간**이다.
      급류를 타고 빨리 가면 문을 놓치고, 천천히 가면 시간이 는다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const CANOE = {
  courseM: 250,
  laneW: 3.2,            // 강 폭(±)
  drift: 1.55,           // 노 한 번의 가로 이동(m/s 로 환산)
  paddleIv: 260,
  paddleWindow: 70,
  flowBase: 3.9,         // 아래로 흐르는 속도(m/s)
  flowBoost: 1.35,       // 잘 저으면 이만큼 빨라진다
  gateW: 1.15,           // 문 폭(±)
  touchPenalty: 2,
  missPenalty: 50,
  upstreamSlow: 0.45,    // 업스트림 문은 흐름을 거슬러야 한다
};

class CanoeEvent {
  constructor(def){ this.def=def; this.trackM=def.distanceM||CANOE.courseM; this.reset(); }
  reset(){
    this.phase='SET'; this.t=0; this.gunMs=1100+Math.random()*900; this.setBeeps=0;
    this.dist=0; this.x=0; this.vx=0; this.flow=CANOE.flowBase;
    this.lastPaddle=-1e9; this.side=0;
    this.judge={PERFECT:0,GOOD:0,MISS:0};
    this.penalty=0; this.touched=0; this.missed=0;
    this.msg=''; this.msgAt=-1e9; this.msgBad=false; this.flash=0;
    this.result=null; this.doneAt=0;
    /* 코스 — 문 18개. 빨간 문(업스트림)이 4개 섞인다. */
    this.gates=[];
    let m=22;
    for(let i=0;i<18;i++){
      const up = (i>=4) && (i%5===3);
      this.gates.push({ m, x:(Math.random()*2-1)*(CANOE.laneW*0.62), up, done:false, ok:false });
      m += up ? 18 : 12 + Math.random()*4;
    }
    this.trackM = m + 18;
    /* 물살 구간 — 방향이 바뀐다 */
    this.currents=[];
    for(let s=0;s<10;s++) this.currents.push((Math.random()*2-1)*0.85);
  }
  get qualify(){ return this.def.qualify; }
  get raw(){ return (this.t-this.gunMs)/1000; }
  get total(){ return this.raw + this.penalty; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }
  currentAt(m){ return this.currents[Math.min(this.currents.length-1, Math.floor(m/this.trackM*this.currents.length))]; }
  get nextGate(){ return this.gates.find(g=>!g.done); }

  onStride(side, tMs){
    if(this.phase!=='RUN'){
      if(this.phase==='SET' && tMs<this.gunMs && tMs>this.gunMs-1000){
        this.phase='DONE'; this.doneAt=this.t;
        this.result={status:'FALSE_START', value:DNF, rank:2}; Sfx.fail();
      }
      return;
    }
    const dt=tMs-this.lastPaddle;
    /* ⚠ 처음엔 같은 쪽을 연속으로 저으면 벌을 줬다(MISS). 그런데 배는 **저은 반대쪽**으로
       가므로 좌우를 번갈으면 가로 이동이 서로 상쇄된다 — 힘을 실으려면 번갈아야 하고
       방향을 잡으려면 한쪽만 저어야 하는, 서로 모순된 요구였다(실측: 18문 중 15문 놓침).
       실제 카누처럼 **추진과 조향을 나눈다**:
         · 번갈아 젓기 = 빠르게 내려간다(직진)
         · 한쪽만 젓기 = 그쪽 반대로 크게 돈다. 대신 속도를 잃는다
       리듬 판정은 간격만 본다. */
    const same = (this.side===side);
    let j='GOOD';
    if(this.lastPaddle<-1e8) j='GOOD';
    else j = Math.abs(dt-CANOE.paddleIv)<=CANOE.paddleWindow ? 'PERFECT'
           : Math.abs(dt-CANOE.paddleIv)<=CANOE.paddleWindow*2.2 ? 'GOOD' : 'MISS';
    this.judge[j]++; this.side=side; this.lastPaddle=tMs;
    Sfx.step(j);
    const q={PERFECT:1,GOOD:0.7,MISS:0.32}[j];
    this.vx += -side * CANOE.drift * (same ? 1.45 : 0.5) * q;
    this.flow = CANOE.flowBase * (1 + (CANOE.flowBoost-1)*q*(same ? 0.3 : 1));
    if(same) this.flow *= 0.9;                     // 스위프는 속도를 깎는다
  }
  onAction(){ /* 쓰지 않는다 — 조종만으로 충분히 바쁘다 */ }
  onActionUp(){}

  update(dt){
    this.t += dt*1000;
    this.flash=Math.max(0,this.flash-dt*3);
    if(this.phase==='SET'){
      const want=Math.min(3, Math.floor(3-(this.gunMs-this.t)/380));
      if(want>this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(this.t>=this.gunMs){ this.phase='RUN'; Sfx.gun(); this.flash=1; }
      return;
    }
    if(this.phase!=='RUN') return;
    /* 가로 — 노 저은 힘 + 물살 */
    this.vx += this.currentAt(this.dist)*dt*2.4;
    this.vx -= this.vx*dt*2.2;                      // 물의 저항
    this.x = clamp(this.x + this.vx*dt, -CANOE.laneW, CANOE.laneW);
    if(Math.abs(this.x)>=CANOE.laneW-0.01) this.vx*=0.3;
    /* 세로 — 업스트림 문 앞에서는 느려진다 */
    const g=this.nextGate;
    const near = g && g.up && Math.abs(g.m-this.dist)<6;
    const speed = this.flow * (near?CANOE.upstreamSlow:1);
    this.dist += speed*dt;
    this.flow = Math.max(CANOE.flowBase*0.7, this.flow - dt*1.4);
    /* 문 통과 판정 */
    for(const gt of this.gates){
      if(gt.done || this.dist < gt.m) continue;
      gt.done=true;
      const off=Math.abs(this.x-gt.x);
      if(off<=CANOE.gateW*0.72){ gt.ok=true; this.judge.PERFECT++; Sfx.paddle(), Sfx.step('PERFECT'); Track.cheer(0.25); }
      else if(off<=CANOE.gateW){ gt.ok=true; gt.touch=true; this.penalty+=CANOE.touchPenalty; this.touched++;
        this.say('봉을 건드렸다 +2초', true); Sfx.step('LATE'); }
      else { this.penalty+=CANOE.missPenalty; this.missed++;
        this.say('문을 놓쳤다 +50초', true); Sfx.fail(); this.flash=0.5; }
    }
    if(this.dist>=this.trackM){
      this.phase='DONE'; this.doneAt=this.t;
      const pass=this.total<=this.qualify;
      this.result={status:pass?'OK':'MISSED_QUALIFY', value:this.total, rank:pass?1:2};
      pass?Sfx.finish():Sfx.fail();
    } else if(this.raw > this.qualify*2.2){
      this.phase='DONE'; this.doneAt=this.t;
      this.result={status:'TIMEOUT', value:DNF, rank:2}; Sfx.fail();
    }
    Track.crowdTick();
    Sfx.crowd(0.35);
  }

  /* ── 그리기 — 위에서 내려다본 강. 이 게임에서 유일한 시점. ── */
  draw(ctx){
    /* ⚠ 카누는 강에서 한다. 어셋이 오기 전까지는 야외 경기장을 **거의 지워** 강가처럼 만든다
       (사격·역도·트램폴린과 같은 처리 — 두 세계가 섞이면 안 된다). */
    const gt=Track.fieldBack(ctx, 16);
    Track.fieldGround(ctx,{grassTop:gt, surface:'#243a2c'});
    ctx.fillStyle='rgba(6,12,10,.88)'; ctx.fillRect(0,0,VW,VH);
    /* 강 — 화면 세로가 코스의 앞뒤다. 좁으면 좌우 여백만 남아 조종이 안 보인다 */
    const RW=210, cx=VW/2, top=26, bot=VH-34;
    this._riv={RW, cx, top, bot};
    if(!BG.tile(BG.ctx(),'rapids-water', top, bot-top, this.dist*6)){
      ctx.fillStyle='#123b52'; ctx.fillRect(cx-RW/2, top, RW, bot-top);
      ctx.fillStyle='rgba(255,255,255,.07)';
      for(let i=0;i<26;i++){
        const y=top+((i*37 + (this.dist*9))%(bot-top));
        ctx.fillRect(cx-RW/2+((i*53)%RW), y, 10, 1);
      }
    }
    /* 강둑 — 어셋이 오면 잔디·나무가 있는 둑, 없으면 예전 색 띠.
       ⚠ 강은 세로로 흐른다(위→아래). river-bank 은 가로로 이어지는 띠라
          좌우 둑에는 **세로로 세워** 쓴다. */
    const bank = BG.get('river-bank');
    if(bank){
      const bw = 14, ih = bank.height, iw = bank.width;
      for(const [bx, flip] of [[cx-RW/2-bw, 1], [cx+RW/2, -1]]){
        ctx.save();
        ctx.translate(bx + (flip<0?bw:0), top); ctx.scale(flip, 1);
        /* 세로로 이어 붙인다 — 흐름에 맞춰 스크롤 */
        const seg = bw*(iw/ih), off = (this.dist*6) % seg;
        for(let y=-off; y<bot-top; y+=seg){
          ctx.save(); ctx.translate(0, y); ctx.rotate(Math.PI/2);
          ctx.drawImage(bank, 0, 0, iw, ih, 0, -bw, seg, bw);
          ctx.restore();
        }
        ctx.restore();
      }
    } else {
      ctx.fillStyle='#3a4a3a'; ctx.fillRect(cx-RW/2-6, top, 6, bot-top);
      ctx.fillRect(cx+RW/2, top, 6, bot-top);
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,120,90,${this.flash*0.35})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    const R=this._riv; if(!R) return;
    const AHEAD=42;                                   // 앞으로 보이는 거리(m)
    const toY=(m)=> R.bot - ((m-this.dist)/AHEAD)*(R.bot-R.top);
    const toX=(x)=> R.cx + (x/CANOE.laneW)*(R.RW/2-6);
    /* 물살 화살표 — 어디로 밀리는지 보여야 조종이 가능하다 */
    const cur=this.currentAt(this.dist);
    if(Math.abs(cur)>0.08){
      for(let i=0;i<3;i++){
        const y=R.top+30+i*44, dir=Math.sign(cur), w=Math.abs(cur)*26;
        u.strokeStyle='rgba(120,190,255,.35)'; u.lineWidth=1;
        u.beginPath(); u.moveTo(R.cx-dir*w, y); u.lineTo(R.cx+dir*w, y);
        u.lineTo(R.cx+dir*w-dir*4, y-3); u.stroke();
      }
    }
    /* 문 */
    for(const g of this.gates){
      const y=toY(g.m);
      if(y<R.top-12 || y>R.bot+12) continue;
      const col = g.done ? (g.ok? (g.touch?PAL.gold:PAL.green) : PAL.red)
                         : (g.up? '#ff7b6b' : '#5cff9c');
      const x0=toX(g.x-CANOE.gateW), x1=toX(g.x+CANOE.gateW);
      /* HD 봉 — 색은 규칙(초록=순방향·빨강=역방향)이라 어셋 위에 얇게 덧칠한다 */
      const hd = BG.obj(u,'slalom-gate', x0, y+7, 14) && BG.obj(u,'slalom-gate', x1, y+7, 14);
      u.strokeStyle=col; u.lineWidth=hd?1:2; u.globalAlpha=hd?0.55:1;
      u.beginPath(); u.moveTo(x0, y-7); u.lineTo(x0, y+7); u.stroke();
      u.beginPath(); u.moveTo(x1, y-7); u.lineTo(x1, y+7); u.stroke();
      u.globalAlpha=1;
      u.strokeStyle=col; u.globalAlpha=0.45; u.lineWidth=1;
      u.beginPath(); u.moveTo(x0, y); u.lineTo(x1, y); u.stroke(); u.globalAlpha=1;
      if(g.up && !g.done) txt(u,'▲', toX(g.x), y-16, 9, '#ff7b6b','center',700);
    }
    /* 배 */
    const bx=toX(this.x), by=R.bot-14;
    u.save(); u.translate(bx,by); u.rotate(clamp(this.vx*0.10,-0.5,0.5));
    if(!BG.obj(u,'canoe-boat', 0, 7, 20)){
      u.fillStyle='#f0e0b4';
      u.beginPath(); u.moveTo(0,-11); u.lineTo(4,6); u.lineTo(-4,6); u.closePath(); u.fill();
      u.fillStyle='rgba(0,0,0,.3)'; u.fillRect(-4,4,8,2);
    }
    u.restore();
    /* ⛔ 0.2 고정이라 **노를 젓는데 몸이 안 움직였다.** 마지막 스트로크부터 풀어 준다. */
    { const strokePh = 0.15 + clamp((this.t - this.lastPaddle)/420, 0, 1)*0.35;
      CharHD.draw(u,'otter', bx, by+2, strokePh, {act:'paddle', rare:3, t:this.t, scale:0.5, crouch:true}); }
    /* 노 — 어느 쪽을 저었는지 */
    if(this.t-this.lastPaddle<200){
      u.strokeStyle='rgba(255,255,255,.8)'; u.lineWidth=2;
      const d=this.side>0?1:-1;
      u.beginPath(); u.moveTo(bx, by-4); u.lineTo(bx+d*13, by+4); u.stroke();
    }

    /* HUD */
    const doneG = this.gates.filter(g=>g.done).length;
    /* 합계(=기록+벌점)가 내 점수다. 기준은 레일 위 자리로 보인다(05_scoreboard). */
    SB.tally(u, {
      name: this.def.name,
      progress: doneG+' / '+this.gates.length+K('문'),
      mine: Math.max(0, this.total), fmt: v => fmtTime(v),
      cuts: medalCuts(this.def), higher: !!this.def.higher,
    });
    /* 기록과 벌점을 갈라 보여 준다 — 합계만 보면 왜 나빠졌는지 모른다 */
    txt(u, fmtTime(Math.max(0,this.raw)) + '  ' + (this.penalty? '+'+this.penalty : '+0'),
        8, 36, 10, this.penalty? PAL.red : PAL.dim, 'left');
    if(this.missed) txt(u, K('놓침')+' '+this.missed, 120, 36, 9, PAL.red,'left',700);
    else if(this.touched) txt(u, K('접촉')+' '+this.touched, 120, 36, 9, PAL.gold,'left');  /* ⚠ 8 은 바로 윗줄 기록/벌점(8,36)과 **같은 자리**였다 — 놓침 갈래만 120 으로 옮기고 이쪽을 안 옮겼다 */

    if(this.phase==='SET') txt(u,'출발 신호를 기다리세요', VW/2, 60, 12, PAL.white,'center',700);
    else if(doneG<3) txt(u,'번갈아 저으면 빨라지고, 한쪽만 저으면 그 반대로 돈다', VW/2, Track.botY(30), 10, PAL.white,'center');
    const ng=this.nextGate;
    if(ng && ng.up && Math.abs(ng.m-this.dist)<14)
      txt(u,'빨간 문 — 거슬러 올라간다', VW/2, 44, 12, '#ff7b6b','center',700);
    if(this.t-this.msgAt<900)
      txt(u, this.msg, VW/2, 60, 12, this.msgBad?PAL.red:PAL.green,'center',700);
  }
}
