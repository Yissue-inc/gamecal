/* ══════════════════════════════════════════════════════════════════
   유도 — 격투기가 통째로 비어 있었다. 서른여덟 종목 중 **맞붙는 종목**이 펜싱뿐이었다.

   펜싱은 거리를 재는 종목이고, 탁구는 주고받는 종목이다.
   유도는 **붙잡고 버티다가 한순간에 뒤집는** 종목이다.
     · 좌·우를 번갈아 두드려 **깃 싸움**을 한다 — 이기면 저울이 내 쪽으로 기운다
     · 저울이 기울어 있을 때만 기술이 들어간다. 많이 기울수록 판정 창이 넓다
     · 액션 = 메치기. 기울기가 클수록 한판, 작으면 절반, 없으면 **역습당한다**
     · 한판이면 그 자리에서 끝. 절반 둘이면 한판.
   ⚠ 그래서 '계속 두드리기'가 답이 아니다 — 언제 지르느냐가 이 종목이다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const JUDO = {
  toWin: 10,             // 한판 = 10점 · 절반 = 5점 (둘이면 한판)
  /* ⚠ 처음엔 gain 0.052 · decay 0.30 이었다. 260ms 간격으로 완벽하게 두드려도
     초당 0.20 이 차는데 0.30 이 빠져나가 **저울이 절대 안 기울었다** —
     다섯 판 전부 기술 없이 시간 만료(1:0)로 끝났다. 차는 쪽이 이겨야 종목이 성립한다. */
  gripGain: 0.085,
  gripDecay: 0.20,       // **비례** 감쇠. 균형점 = 순이익 / 이 값
  gripIv: 260,           // 깃 싸움 목표 간격(ms)
  gripWindow: 55,        // 이 안이면 제대로 잡았다(90 은 너무 넓어 실력이 안 갈렸다)
  /* ⚠ 0.62 는 균형점(0.68) 아래라 잘하는 사람이 **8초 만에** 한판으로 끝냈다.
     문턱을 균형점 위로 올려, 한판은 흐름이 확 넘어간 순간에만 나오게 한다.
     보통은 절반 두 번으로 이기게 되고, 그만큼 경기가 이어진다. */
  ipponAt: 0.66,
  wazaAt: 0.36,          // 이만큼이면 절반
  counterAt: 0.14,       // 이보다 적게 기울었는데 지르면 역습
  throwMs: 700,          // 메치기 연출
  resetMs: 1100,
  /* ⚠ 2분은 **서툰 사람에게 복권을 너무 많이 준다** — 잘하는 사람은 13~25초에 끝내는데
     서툰 쪽이 2분 동안 한 번 튀어서 절반을 따고 이기는 판이 3판 중 2판이었다.
     능숙·보통이 끝내기엔 충분하고 운이 끼어들 틈은 줄이는 길이로 줄인다. */
  matchMs: 60000,
};

class JudoEvent {
  static proxy(ev){
    for(const k of Object.keys(ev.fighters[0])){
      if(Object.getOwnPropertyDescriptor(ev,k)) continue;
      Object.defineProperty(ev, k, { configurable:true,
        get(){ return this.fighters[0][k]; }, set(v){ this.fighters[0][k]=v; } });
    }
  }
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.t=0; this.phase='SET';        // SET → GRIP → THROW → DONE
    this.startAt=1000;
    const two = (typeof Party!=='undefined' && Party.on && Party.count===2
                 && Party.modeFor(this.def)==='versus');
    this.humanCount = two ? 2 : 1;
    const mk=(i,ai)=>({ idx:i, ai, pts:0, waza:0, lastGrip:-1e9, side:0,
                        msg:'', msgAt:-1e9, msgBad:false });
    this.fighters=[mk(0,false), mk(1, this.humanCount<2)];
    JudoEvent.proxy(this);
    /* 저울 — +1 이면 1P 가 완전히 잡은 것, -1 이면 상대 */
    this.grip=0; this.dominance=0;
    this.throwAt=-1e9; this.thrower=null; this.resetUntil=-1e9;
    this.result=null; this.doneAt=0; this.flash=0;
    this.lastCall=''; this.lastCallAt=-1e9;
    /* ⛔ 듀얼에는 AI 난이도를 안 건다 — 상대를 바꾸면 내 기록(이긴 시간)이 바뀐다.
       실측: 쉬움 9.08s → 어려움 15.72s. 자세한 이유는 1F_fencing.js 같은 자리에. */
    this.aiSkill=0.60+Math.random()*0.12;
    this.aiNext=0;
  }
  get people(){ return this.fighters; }
  get qualify(){ return this.def.qualify; }
  get elapsed(){ return Math.max(0,(this.t-this.startAt)/1000); }
  R(p){ return this.fighters[p|0] || this.fighters[0]; }
  other(f){ return this.fighters[f.idx===0?1:0]; }
  say(m,bad,p){ const f=this.R(p); f.msg=m; f.msgAt=this.t; f.msgBad=!!bad; }
  /* 그 사람 기준으로 저울이 얼마나 자기 쪽인가 (0~1) */
  edgeOf(f){ return f.idx===0 ? this.grip : -this.grip; }
  busy(){ return this.t < this.resetUntil || this.phase==='THROW'; }

  onStride(side, tMs, p){
    if(this.phase!=='GRIP' || this.busy()) return;
    const f=this.R(p); if(f.ai) return;
    this.gripPull(f, side, tMs);
  }
  /* q 를 직접 주면 그 값을 쓴다 — AI 는 자기 실력만큼만 당긴다.
     ⚠ 예전엔 AI 도 사람과 **같은 판정**을 통과해서 늘 q=1 이었다. 그래서 아무리 잘해도
        저울이 상쇄돼 0 근처를 맴돌았고, 다섯 판 전부 기술 없이 끝났다.
        붙잡는 힘에 실력 차가 안 들어가면 '깃 싸움'이 아니라 그냥 대기다. */
  gripPull(f, side, tMs, forceQ){
    const dt=tMs-f.lastGrip;
    let q;
    if(forceQ!==undefined) q=forceQ;
    else
    if(f.side===side) q=0.15;                         // 같은 손만 — 힘이 안 실린다
    else if(f.lastGrip<-1e8) q=0.7;
    else q = Math.abs(dt-JUDO.gripIv)<=JUDO.gripWindow ? 1 : 0.42;
    if(forceQ!==undefined && f.side===side) q=0.15;    // AI 도 손이 꼬이면 힘이 빠진다
    f.side=side; f.lastGrip=tMs;
    const dir = f.idx===0 ? 1 : -1;
    this.grip = clamp(this.grip + dir*JUDO.gripGain*q, -1, 1);
    if(!f.idx) Sfx.step(q===1?'PERFECT':q>0.4?'GOOD':'LATE');
  }
  onAction(tMs, p){
    if(this.phase!=='GRIP' || this.busy()) return;
    const f=this.R(p); if(f.ai) return;
    this.attempt(f);
  }
  onActionUp(){}
  attempt(f){
    const e=this.edgeOf(f);
    this.phase='THROW'; this.throwAt=this.t; this.thrower=f;
    if(e < JUDO.counterAt){
      /* 붙잡지도 못했는데 질렀다 — 상대가 되치기한다 */
      const foe=this.other(f);
      this.award(foe, 'ippon', '역습 한판');
      return;
    }
    if(e >= JUDO.ipponAt) this.award(f, 'ippon', '한판');
    else if(e >= JUDO.wazaAt) this.award(f, 'waza', '절반');
    else { this.say('걸리지 않았다', true, f.idx); this.lastCall='기술이 안 걸렸다';
           this.lastCallAt=this.t; this.grip*= -0.2; Sfx.fail(); }
  }
  award(f, kind, why){
    this.lastCall = (f.idx===0? (this.humanCount>1?'1P':'나') : (f.ai?'상대':'2P')) + ' — ' + why;
    this.lastCallAt=this.t; this.flash=0.8;
    if(kind==='ippon'){ f.pts=JUDO.toWin; }
    else { f.waza++; f.pts+=5; if(f.waza>=2) f.pts=JUDO.toWin; }
    f.idx===0 ? Sfx.finish() : Sfx.fail();
    Track.cheer(kind==='ippon'?0.8:0.5);
    if(f.pts>=JUDO.toWin){ this.finish(); return; }
    /* ⚠ 메친 뒤 저울을 0 으로 두면 잘하는 사람이 4~5초마다 절반을 따서 한 판이 9초에
       끝났다. 기술을 걸었다는 건 몸을 던졌다는 뜻이다 — 다시 잡을 때는 **불리하게** 선다.
       그래야 한 번의 기술이 값지고, 경기가 이어진다. */
    const dir = f.idx===0 ? 1 : -1;
    this.grip = -dir*0.30;
    this.resetUntil = this.t + JUDO.resetMs;
  }
  finish(timeUp){
    if(this.result) return;
    this.phase='DONE'; this.doneAt=this.t;
    const me=this.fighters[0], foe=this.fighters[1];
    const won = me.pts>foe.pts;
    this.result={ status: won?'OK':'MISSED_QUALIFY',
                  value: won? this.elapsed : DNF, rank: won?1:2 };
    if(this.drawn){ this.lastCall='시간 만료 — 기술이 나오지 않았다'; this.lastCallAt=this.t; }
    won?Sfx.finish():Sfx.fail();
    if(this.humanCount>1 && typeof Party!=='undefined' && Party.on){
      this.humanResults=this.fighters.map((f,i)=>({p:i, ok:f.pts>this.other(f).pts,
        value: f.pts>this.other(f).pts ? this.elapsed : DNF})).sort((a,b)=>a.value-b.value);
    }
  }

  /* AI — 저울이 자기 쪽으로 충분히 기울면 지른다. 실력이 낮으면 성급하다. */
  think(f, dt){
    if(this.phase!=='GRIP' || this.busy()) return;
    if(this.t < this.aiNext) return;
    const iv = JUDO.gripIv * (1 + (1-this.aiSkill)*0.5);
    this.gripPull(f, f.side>0?-1:1, this.t, this.aiSkill);
    this.aiNext = this.t + iv + (Math.random()*2-1)*((1-this.aiSkill)*180);
    const e=this.edgeOf(f);
    /* 실력이 높을수록 한판이 나올 때까지 참는다 */
    const patience = lerp(JUDO.wazaAt, JUDO.ipponAt+0.06, this.aiSkill);
    if(e >= patience && Math.random()<0.35) this.attempt(f);
  }

  update(dt){
    this.t += dt*1000;
    this.flash=Math.max(0,this.flash-dt*3);
    if(this.phase==='DONE') return;
    if(this.phase==='SET'){ if(this.t>=this.startAt){ this.phase='GRIP'; Sfx.gun(); } return; }
    if(this.phase==='THROW'){
      if(this.t-this.throwAt > JUDO.throwMs){
        this.phase='GRIP';
        /* 득점 뒤에는 award() 가 저울을 이미 잡아 놨다 — 덮어쓰지 않는다 */
        if(!this.lastCall || this.t-this.lastCallAt > JUDO.throwMs+50) this.grip=0;
        for(const f of this.fighters){ f.lastGrip=-1e9; f.side=0; }
      }
      return;
    }
    /* 저울은 가만두면 가운데로 돌아간다 — 잡은 걸 유지하는 것도 일이다.
       ⚠ 예전엔 크기와 무관한 **고정 감쇠**(0.15/초)였다. 실측: 5초에 내가 +1.16,
          상대가 -0.83 을 넣어 순이익 +0.33 이었는데 감쇠가 0.75 를 빼가서 저울이
          **0.000 에 붙어 있었다** — 그래서 다섯 판 전부 기술 없이 끝났다.
          기울기에 비례하게 두면, 조금 기울었을 땐 천천히 돌아오고 많이 기울수록 버티기 힘들다. */
    this.grip -= this.grip * dt * JUDO.gripDecay;
    /* 우세 누적 — 시간이 다 됐을 때 '누가 경기를 지배했나'로 가린다 */
    this.dominance += this.grip * dt;
    for(const f of this.fighters) if(f.ai) this.think(f, dt);
    if(this.elapsed > JUDO.matchMs/1000){
      /* 시간이 다 되면 점수로 가린다.
         ⚠ 같을 때 **그 순간 저울이 기운 쪽**을 주면, 한 번도 못 메친 사람이 부저 직전
            운으로 이긴다(실측: 서툰이 0:0 으로 두 판 다 이겼다).
            경기 내내 쌓인 우세(누적)로 가린다 — 실제 유도의 우세승과 같은 취지다. */
      /* ⚠ 우세 누적으로 가려 봤지만, 서툴러도 상대보다 조금만 자주 당기면 우세가 쌓여
         **한 번도 못 메친 사람이 이겼다**(3판 중 2판). 유도는 기술로 이기는 종목이다.
         다른 종목이 전부 '기준을 넘어야 통과'인 것과 같게 — 못 메치면 통과가 아니다. */
      this.drawn = this.fighters[0].pts===this.fighters[1].pts;
      this.finish(true);
    }
    Track.crowdTick();
    Sfx.crowd(clamp(Math.abs(this.grip),0,1)*0.6);
  }

  draw(ctx){
    if(!BG.fill(BG.ctx(),'hall-judo', 0, VH)){
      const gt=Track.fieldBack(ctx, 20);
      Track.fieldGround(ctx,{grassTop:gt, surface:'#3a3040'});
      ctx.fillStyle='rgba(8,10,16,.84)'; ctx.fillRect(0,0,VW,VH);
    }
    /* 다다미 — 안쪽 경기장과 바깥 안전지대 */
    /* ⚠ 250x76 매트에 0.95배 선수 둘을 26px 떨어뜨려 놨더니 **맞붙은 걸로 안 보였다** —
       유도는 붙잡는 종목이라 둘이 닿아 있어야 한다. 매트를 줄이고 선수를 키워 붙인다. */
    /* ⚠ 매트를 직사각형으로 그렸더니 실내 배경이 붙는 순간 **바닥에 놓인 게 아니라
       공중에 붙인 판때기**로 보였다. 배경은 원근이 있는데 매트만 정면이었다.
       사다리꼴로 그려 바닥에 눕힌다(먼 쪽을 좁게). */
    const cx=VW/2, cy=172, MW=186, MH=62;
    /* HD 다다미 — 안전지대까지 한 장이다. 판정에 쓰는 _mat 좌표는 그대로 둔다. */
    if(BG.obj(BG.ctx(),'judo-tatami', cx, cy+MH/2+11, MH+22)){
      this._mat={cx, cy, MW, MH};
      if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.4})`; ctx.fillRect(0,0,VW,VH); }
      return;
    }
    const trap=(halfW, halfH, colr)=>{
      const yT=cy-halfH, yB=cy+halfH, wT=halfW*0.84, wB=halfW*1.20;
      ctx.fillStyle=colr; ctx.beginPath();
      ctx.moveTo(cx-wT, yT); ctx.lineTo(cx+wT, yT);
      ctx.lineTo(cx+wB, yB); ctx.lineTo(cx-wB, yB); ctx.closePath(); ctx.fill();
      return {wT, wB, yT, yB};
    };
    trap(MW/2+18, MH/2+9, '#4a6b52');
    const m=trap(MW/2, MH/2, '#c8a86a');
    ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1; ctx.stroke();
    /* 다다미 결 — 평면이라는 걸 눈에 알려 준다 */
    ctx.strokeStyle='rgba(255,255,255,.10)';
    for(let i=1;i<4;i++){
      const k=i/4, y=m.yT+(m.yB-m.yT)*k, w=m.wT+(m.wB-m.wT)*k;
      ctx.beginPath(); ctx.moveTo(cx-w, y); ctx.lineTo(cx+w, y); ctx.stroke();
    }
    this._mat={cx, cy, MW, MH};
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.4})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    const M=this._mat; if(!M) return;
    /* 두 선수 — 저울이 기울면 밀린다 */
    const push = this.grip*22;
    const thrown = this.phase==='THROW' && this.thrower;
    this.fighters.forEach((f,i)=>{
      const dir = i===0 ? 1 : -1;
      let x = M.cx - dir*15 + push*dir*0.55;
      let y = M.cy+16;
      let crouch=true;
      if(thrown){
        const k=clamp((this.t-this.throwAt)/JUDO.throwMs,0,1);
        if(f===this.thrower){ x += dir*8*Math.sin(k*Math.PI); }
        else { y -= Math.sin(k*Math.PI)*16; x += dir*-14*k; crouch=false; }
      }
      const sp = i===0 ? 'bear' : 'gorilla';
      u.save(); if(dir<0){ u.translate(x*2,0); u.scale(-1,1); }
      /* ⛔ 0.1 고정이었다. 유도는 **깃 싸움의 밀고 당김**이 곧 움직임이다(grip −1~1). */
      const gripPh = 0.25 + this.edgeOf(f)*0.2;
      if(!CharHD.draw(u, sp, x, y, gripPh, {act:'grip', rare:i?2:3, t:this.t, scale:1.3, crouch, lean:!crouch}))
        { u.fillStyle=i?'#8fa0b4':PAL.gold; u.fillRect(x-7,y-30,14,30); }
      u.restore();
      if(this.humanCount>1)
        txt(u,(i+1)+'P', M.cx - dir*34, M.cy-M.MH/2-10, 9,
            Party.color?Party.color(i):PAL.white,'center',700);
    });
    /* 깃 저울 — 이 종목의 전부라 화면 한가운데에 크게 */
    const bw=190, bx=VW/2-bw/2, by=VH-38;
    u.fillStyle='rgba(255,255,255,.12)'; u.fillRect(bx,by,bw,10);
    const half=bw/2, g=clamp(this.grip,-1,1);
    u.fillStyle = g>0 ? PARTY_COLOR[0] : (this.humanCount>1?PARTY_COLOR[1]:'#8fa0b4');
    if(g>=0) u.fillRect(bx+half, by, half*g, 10);
    else     u.fillRect(bx+half+half*g, by, -half*g, 10);
    /* 한판·절반 문턱을 눈금으로 — 언제 질러야 하는지 보여야 한다 */
    for(const [v,c] of [[JUDO.wazaAt,'rgba(255,215,94,.75)'],[JUDO.ipponAt,'rgba(92,255,156,.85)']]){
      u.fillStyle=c;
      u.fillRect(bx+half+half*v-1, by-3, 2, 16);
      u.fillRect(bx+half-half*v-1, by-3, 2, 16);
    }
    u.fillStyle='rgba(255,255,255,.5)'; u.fillRect(bx+half-1, by-4, 2, 18);
    txt(u,'깃 싸움', bx-8, by+1, 9, PAL.dim,'right');
    if(Math.abs(this.dominance)>0.8)
      txt(u, this.dominance>0?'우세':'열세', bx+bw+8, by+1, 9,
          this.dominance>0?PAL.green:PAL.red,'left',700);
    const myEdge=this.edgeOf(this.fighters[0]);
    txt(u, myEdge>=JUDO.ipponAt?'지금! 한판이 걸린다'
         : myEdge>=JUDO.wazaAt?'절반은 걸린다'
         : myEdge>=JUDO.counterAt?'아직 얕다'
         : '지금 지르면 역습당한다',
        VW/2, VH-22, 10,
        myEdge>=JUDO.ipponAt?PAL.green:myEdge>=JUDO.wazaAt?PAL.gold:PAL.red,'center',700);

    /* 점수판 */
    plate(u, 0,0, VW, 28, .78);
    const A=this.fighters[0], B=this.fighters[1];
    const score=(f)=> f.pts>=JUDO.toWin ? '한판' : (f.waza? '절반'+(f.waza>1?' '+f.waza:'') : '0');
    /* 맞붙는 종목이라 versus 판을 쓴다 — 펜싱·탁구와 같은 얼굴(05_scoreboard).
       ⚠ 유도 점수는 숫자가 아니라 '한판/절반' 이라 문자열을 그대로 넘긴다. */
    SB.versus(u, {
      myLabel: this.humanCount>1?'1P':'나', mine: score(A),
      foeLabel: this.humanCount>1?'2P':'상대', foe: score(B),
      target: '한판 선취', note: fmtTime(this.elapsed),
      first: JUDO.toWin, lead: A.pts - B.pts,
    });

    if(this.phase==='SET') txt(u,'하지메', VW/2, 52, 15, PAL.white,'center',700);
    else if(A.pts===0 && B.pts===0 && this.elapsed<4)
      txt(u,'좌·우를 번갈아 두드려 깃을 잡고, 기울면 액션', VW/2, VH-52, 10, PAL.white,'center');
    if(this.t-this.lastCallAt<1200)
      txt(u, this.lastCall, VW/2, 52, 15, PAL.gold,'center',700);
    else if(this.t-A.msgAt<800)
      txt(u, A.msg, VW/2, 52, 12, A.msgBad?PAL.red:PAL.green,'center',700);
  }
}
