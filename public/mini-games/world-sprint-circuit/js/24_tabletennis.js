/* ══════════════════════════════════════════════════════════════════
   탁구 — 이 게임에 없던 **랠리** 장르.

   펜싱은 거리 싸움이고, 나머지 서른몇 종목은 리듬이다. 탁구는 **주고받기**다:
   내가 친 코스가 상대의 다음 타이밍을 좁히고, 상대가 친 코스가 내 타이밍을 좁힌다.
     · 공이 내 쪽에 닿는 순간 액션 — 창이 좁다
     · ←/→ 로 **코스**를 정한다(왼쪽·가운데·오른쪽). 상대가 서 있는 곳에서 멀수록
       상대의 판정 창이 좁아진다 — 이게 공격이다
     · 완벽한 타이밍으로 치면 공이 빨라진다. 랠리가 길어질수록 서로 빨라진다
     · 11점 선취(2점 차). 놓치거나 창을 벗어나면 상대 점수
   ⚠ 이 종목의 축은 '빨리 누르기'가 아니라 **상대를 어디로 뛰게 만드느냐** 다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const TT = {
  toWin: 11,
  travelMs: 620,          // 처음 왕복 시간(한쪽 → 다른쪽)
  minTravelMs: 240,       // 랠리가 빨라져도 여기까지
  speedUp: 0.965,         // 잘 치면 이만큼 빨라진다
  window: 150,            // 기본 판정 창(±ms)
  windowMin: 62,          // 코스에 흔들렸을 때
  perfect: 46,            // 이 안이면 완벽 — 더 빨라지고 코스가 날카롭다
  courts: [-1, 0, 1],     // 왼쪽·가운데·오른쪽
  moveMs: 190,            // 한 칸 옮기는 데 걸리는 시간
  serveGap: 1100,
  /* ⚠ 0.021 로는 실력자끼리 **140구**가 나왔고 한 판이 4.4분이었다. 실제 탁구 랠리는
     대여섯 구다 — 조임을 세게 걸어 랠리가 스스로 끝나게 한다. */
  rallyTighten: 0.05,
  rallyFloor: 0.28,
};

class TableTennisEvent {
  static proxy(ev){
    for(const k of Object.keys(ev.players[0])){
      if(Object.getOwnPropertyDescriptor(ev,k)) continue;
      Object.defineProperty(ev, k, { configurable:true,
        get(){ return this.players[0][k]; }, set(v){ this.players[0][k]=v; } });
    }
  }
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.t=0; this.phase='SERVE';        // SERVE → RALLY → POINT → DONE
    const two = (typeof Party!=='undefined' && Party.on && Party.count===2
                 && Party.modeFor(this.def)==='versus');
    this.humanCount = two ? 2 : 1;
    const mk=(i,ai)=>({ idx:i, ai, pts:0, at:0, want:0, movedAt:-1e9,
                        aim:0, msg:'', msgAt:-1e9, msgBad:false });
    this.players=[mk(0,false), mk(1, this.humanCount<2)];
    TableTennisEvent.proxy(this);
    this.side=1;            // 공이 향하는 쪽 (0 또는 1)
    this.travel=TT.travelMs; this.hitAt=-1e9; this.arriveAt=-1e9;
    this.rally=0; this.bestRally=0; this.lastCourt=0;
    this.serveAt=0; this.result=null; this.doneAt=0; this.flash=0;
    this.lastPoint=''; this.lastPointAt=-1e9;
    this.aiSkill=0.66+Math.random()*0.10;
    this.startServe(0);
  }
  get people(){ return this.players; }
  get qualify(){ return this.def.qualify; }
  get elapsed(){ return this.t/1000; }
  R(p){ return this.players[p|0] || this.players[0]; }
  other(pl){ return this.players[pl.idx===0?1:0]; }
  say(m,bad,p){ const q=this.R(p); q.msg=m; q.msgAt=this.t; q.msgBad=!!bad; }

  startServe(server){
    this.phase='SERVE'; this.serveAt=this.t; this.server=server;
    this.travel=TT.travelMs; this.rally=0;
    for(const pl of this.players){ pl.at=0; pl.want=0; }
    this.lastCourt=0;
  }
  /* 공을 친다 — court 는 -1·0·1 */
  strike(from, court, quality){
    this.lastCourt=court;
    this.side = from===0 ? 1 : 0;
    this.hitAt=this.t;
    /* 완벽하게 치면 빨라진다 — 랠리가 저절로 조여든다 */
    if(quality==='PERFECT') this.travel=Math.max(TT.minTravelMs, this.travel*TT.speedUp);
    this.arriveAt=this.t+this.travel;
    this.rally++; this.bestRally=Math.max(this.bestRally,this.rally);
    Sfx.hit(quality==='PERFECT'?2100:1650);
  }
  /* 받는 쪽의 판정 창 — 서 있는 곳에서 멀수록, 그리고 **랠리가 길어질수록** 좁다.
     ⚠ 랠리 길이를 안 넣었더니 실력이 비슷하면 **1110구**까지 갔다. 난이도가 평평하면
        경기가 안 끝난다. 실제 탁구도 랠리가 길어질수록 공이 빨라지고 여유가 사라진다. */
  windowFor(pl){
    const gap = Math.abs(TT.courts.indexOf(this.lastCourt) - TT.courts.indexOf(pl.at));
    const k = gap===0 ? 1 : gap===1 ? 0.62 : 0.38;
    const tight = Math.max(TT.rallyFloor, 1 - this.rally*TT.rallyTighten);
    return Math.max(TT.windowMin*TT.rallyFloor, TT.window*k*tight);
  }
  onStride(side, tMs, p){
    const pl=this.R(p); if(pl.ai) return;
    /* 좌우 = 서는 자리 겸 다음 타구 코스 */
    if(this.t - pl.movedAt < TT.moveMs) return;
    pl.at = clamp(pl.at + side, -1, 1);
    pl.aim = pl.at; pl.movedAt=this.t;
  }
  onAction(tMs, p){
    const pl=this.R(p); if(pl.ai) return;
    if(this.phase==='SERVE'){
      if(this.server===pl.idx && this.t-this.serveAt>350){ this.strike(pl.idx, pl.aim, 'GOOD'); this.phase='RALLY'; }
      return;
    }
    if(this.phase!=='RALLY') return;
    if(this.side!==pl.idx) return;                 // 내 차례가 아니다
    this.tryHit(pl);
  }
  onActionUp(){}
  tryHit(pl){
    const err=Math.abs(this.t-this.arriveAt);
    const win=this.windowFor(pl);
    if(err>win){ this.point(this.other(pl), err<win*2?'타이밍을 놓쳤다':'헛스윙'); return; }
    const q = err<=TT.perfect ? 'PERFECT' : 'GOOD';
    /* 완벽하면 원하는 코스로 정확히, 아니면 가운데로 흘린다 */
    const court = q==='PERFECT' ? pl.aim : (pl.aim*0.5|0);
    if(q==='PERFECT') this.say('완벽!', false, pl.idx);
    this.strike(pl.idx, court, q);
  }
  point(winner, why){
    winner.pts++;
    this.lastPoint = (winner.idx===0? (this.humanCount>1?'1P':'나') : (winner.ai?'상대':'2P'))
                   + ' 득점 — ' + why;
    this.lastPointAt=this.t; this.flash=0.6;
    winner.idx===0 ? Sfx.finish() : Sfx.fail();
    Track.cheer(0.4);
    const a=this.players[0], b=this.players[1];
    const done = (a.pts>=TT.toWin || b.pts>=TT.toWin) && Math.abs(a.pts-b.pts)>=2;
    if(done){ this.finish(); return; }
    this.phase='POINT'; this.pointAt=this.t;
  }
  finish(){
    if(this.result) return;
    this.phase='DONE'; this.doneAt=this.t;
    const me=this.players[0], foe=this.players[1];
    const won = me.pts>foe.pts;
    this.result={ status: won?'OK':'MISSED_QUALIFY',
                  value: won? this.elapsed : DNF, rank: won?1:2 };
    won?Sfx.finish():Sfx.fail();
    if(this.humanCount>1 && typeof Party!=='undefined' && Party.on){
      this.humanResults = this.players.map((q,i)=>({ p:i, ok:q.pts>this.other(q).pts,
        value: q.pts>this.other(q).pts ? this.elapsed : DNF })).sort((x,y)=>x.value-y.value);
    }
  }

  /* AI — 공이 오면 자리를 옮기고, 도착 시각에 맞춰 친다 */
  think(pl, dt){
    if(this.phase==='SERVE'){
      if(this.server===pl.idx && this.t-this.serveAt>600+400*(1-this.aiSkill)){
        pl.aim = TT.courts[(Math.random()*3)|0];
        this.strike(pl.idx, pl.aim, 'GOOD'); this.phase='RALLY';
      }
      return;
    }
    if(this.phase!=='RALLY' || this.side!==pl.idx) return;
    /* 자리 옮기기 — 실력이 높을수록 빨리 따라간다 */
    if(pl.at!==this.lastCourt && this.t-pl.movedAt > TT.moveMs*(2.1-this.aiSkill)){
      pl.at += Math.sign(this.lastCourt-pl.at); pl.movedAt=this.t;
    }
    /* 치기 — 도착 시각 근처에서, 실력만큼 정확하게 */
    /* ⚠ 190 이면 AI 오차가 46~65ms 라 사람(보통 90ms)보다 정확했다 — 보통 실력이
       0:11 로 졌다. 상대는 사람과 비슷한 정도로 흔들려야 판이 성립한다. */
    const jitter = (1-this.aiSkill)*330;
    const when = this.arriveAt + (Math.random()*2-1)*jitter;
    if(this.t >= when){
      pl.aim = TT.courts[(Math.random()*3)|0];
      this.tryHit(pl);
    }
  }

  update(dt){
    this.t += dt*1000;
    this.flash=Math.max(0,this.flash-dt*3);
    if(this.phase==='DONE') return;
    if(this.phase==='POINT'){
      if(this.t-this.pointAt>TT.serveGap){
        const a=this.players[0], b=this.players[1];
        this.startServe((a.pts+b.pts)%2);          // 2점마다 서브 교대에 가깝게
      }
      return;
    }
    for(const pl of this.players) if(pl.ai) this.think(pl, dt);
    if(this.phase==='RALLY'){
      /* 공이 지나갔는데 아무도 안 쳤다 */
      const rec=this.players[this.side];
      if(this.t > this.arriveAt + this.windowFor(rec)){
        this.point(this.other(rec), '받지 못했다');
      }
    }
    Track.crowdTick();
    Sfx.crowd(clamp(this.rally/14,0,1)*0.5);
  }

  draw(ctx){
    /* 실내 — 밤 야외를 그대로 두면 두 세계가 섞인다 */
    if(!BG.fill(BG.ctx(),'hall-tabletennis', 0, VH)){
      const gt=Track.fieldBack(ctx, 20);
      Track.fieldGround(ctx,{grassTop:gt, surface:'#2b3040'});
      ctx.fillStyle='rgba(8,11,18,.82)'; ctx.fillRect(0,0,VW,VH);
    }
    /* 탁구대 — 비스듬히 내려다본다.
       ⚠ 처음엔 210x104 직사각형이라 **수영장처럼 보였다.** 먼 쪽을 좁혀 원근을 주고,
          선수 대비 크기를 줄여야 '탁구대'로 읽힌다. */
    const cx=VW/2, cy=146, TW=150, TH=76, FAR=0.66;   // 먼 쪽 폭 비율
    const nx=TW/2, fx=TW*FAR/2, ty=cy-TH/2, by=cy+TH/2;
    /* HD 탁구대 — 네트·라인·다리까지 한 장에 들어 있다.
       ⚠ 판정 좌표(_table)는 어셋과 무관하게 그대로다 — 그림이 바뀌어도 규칙은 안 바뀐다. */
    if(!BG.obj(BG.ctx(),'tt-table', cx, by+12, TH+24)){
      ctx.fillStyle='#12405e';
      ctx.beginPath();
      ctx.moveTo(cx-fx, ty); ctx.lineTo(cx+fx, ty);
      ctx.lineTo(cx+nx, by); ctx.lineTo(cx-nx, by); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=1; ctx.stroke();
      /* 센터라인(세로) — 탁구대는 세로로 갈린다 */
      ctx.strokeStyle='rgba(255,255,255,.45)';
      ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx, by); ctx.stroke();
      /* 네트 — 가운데를 가로지른다 */
      const my=(ty+by)/2, mx=(nx+fx)/2;
      ctx.fillStyle='rgba(232,240,252,.92)'; ctx.fillRect(cx-mx-3, my-5, mx*2+6, 2);
      ctx.fillStyle='rgba(232,240,252,.35)'; ctx.fillRect(cx-mx-3, my-5, mx*2+6, 5);
      /* 다리 */
      ctx.fillStyle='#0d2436';
      ctx.fillRect(cx-nx+6, by, 3, 12); ctx.fillRect(cx+nx-9, by, 3, 12);
    }
    this._table={cx, cy, TW, TH, nx, fx, ty, by};
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.3})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    const T=this._table; if(!T) return;
    /* 원근 — 먼 쪽 선수는 좁은 폭으로 움직인다 */
    const courtX=(c,far)=> T.cx + c*((far?T.fx:T.nx)*0.62);
    /* 선수 */
    this.players.forEach((pl,i)=>{
      const far = i!==0;
      const y = far ? T.ty-6 : T.by+30;
      const x = courtX(pl.at, far);
      const sp = i===0 ? 'hare' : 'jerboa';
      if(!CharHD.draw(u, sp, x, y, 0.1, {rare:i?2:3, t:this.t, scale:far?0.62:0.86, crouch:true}))
        { u.fillStyle=i?'#8fa0b4':PAL.gold; u.fillRect(x-4,y-16,8,16); }
      if(this.humanCount>1)
        txt(u,(i+1)+'P', x, y-(far?20:28), 9, Party.color?Party.color(i):PAL.white,'center',700);
    });
    /* 공 — 두 코트 사이를 난다 */
    if(this.phase==='RALLY'){
      const k=clamp(1-(this.arriveAt-this.t)/Math.max(1,this.travel),0,1);
      const fromY = this.side===1 ? T.by+16 : T.ty-4;
      const toY   = this.side===1 ? T.ty-4   : T.by+16;
      const bx = lerp(courtX(this.lastCourt*-1, this.side===0), courtX(this.lastCourt, this.side===1), k);
      const by = lerp(fromY, toY, k) - Math.sin(k*Math.PI)*10;
      u.fillStyle='#fff4c8'; u.beginPath(); u.arc(bx,by,3,0,6.284); u.fill();
      /* 받는 쪽 판정 창 — 얼마나 급한지 눈에 보여야 한다 */
      const rec=this.players[this.side];
      const win=this.windowFor(rec), tight=win<=TT.window*0.7;
      const bw=90, bx0=VW/2-bw/2, by0=VH-26;
      u.fillStyle='rgba(255,255,255,.12)'; u.fillRect(bx0,by0,bw,6);
      u.fillStyle = tight?PAL.red:PAL.green;
      u.fillRect(bx0, by0, Math.round(bw*(win/TT.window)), 6);
      txt(u,'받는 여유', bx0-6, by0-1, 9, PAL.dim,'right');
    }
    /* 점수판 */
    plate(u, 0,0, VW, 28, .78);
    const A=this.players[0], B=this.players[1];
    txt(u, this.humanCount>1?'1P':'나', 56, 4, 9, PAL.dim,'center');
    txt(u, this.humanCount>1?'2P':'상대', VW-56, 4, 9, PAL.dim,'center');
    txt(u, String(A.pts), 56, 12, 16, PARTY_COLOR[0],'center',700);
    txt(u, String(B.pts), VW-56, 12, 16, this.humanCount>1?PARTY_COLOR[1]:PAL.white,'center',700);
    txt(u, TT.toWin+'점 선취', VW/2, 4, 9, PAL.dim,'center');
    txt(u, this.rally? this.rally+'구째' : '', VW/2, 13, 12, PAL.gold,'center',700);

    if(this.phase==='SERVE'){
      const mine=this.server===0;
      txt(u, mine?'서브 — 액션':'상대 서브', VW/2, 48, 13, mine?PAL.green:PAL.dim,'center',700);
      if(mine) txt(u,'←/→ 로 설 자리와 코스를 고른다', VW/2, VH-42, 10, PAL.white,'center');
    }
    if(this.t-this.lastPointAt<1000)
      txt(u, this.lastPoint, VW/2, 48, 13, PAL.gold,'center',700);
    else if(this.t-A.msgAt<700)
      txt(u, A.msg, VW/2, 48, 12, A.msgBad?PAL.red:PAL.green,'center',700);
  }
}
