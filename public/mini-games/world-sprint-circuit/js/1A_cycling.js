/* ══════════════════════════════════════════════════════════════════
   트랙 사이클 (스프린트) — 달리기와 같은 리듬인데 '기어'가 하나 더 있다.

   달리기가 '한 발 한 발'이라면 사이클은 **페달 회전**이다. 차이:
     · 관성이 크다 — 한 번 붙은 속도는 잘 안 죽는다(그래서 초반 가속이 길다)
     · 기어를 올리면 최고속이 오르지만 케이던스 유지가 어려워진다
       ⚠ 이게 이 종목의 전부다. 낮은 기어로 안전하게 갈지, 올려서 걸지.
     · 마지막 바퀴에 스퍼트(액션 홀드) — 남은 힘을 한 번에 쏟는다
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const CYCLE = {
  mashKick: 0.30,        // 연타 한 번이 남은 여유의 몇 할을 채우나
  gears: [
    { name:'경', mul:0.86, ivMul:1.30, hard:0.70 },
    { name:'중', mul:1.00, ivMul:1.00, hard:1.00 },
    { name:'강', mul:1.16, ivMul:0.78, hard:1.42 },
  ],
  baseIv: 300,          // 중간 기어 페달 간격(ms)
  maxSpeed: 19,         // m/s (트랙 사이클은 빠르다)
  drag: 0.55,
  sprintMs: 2600,       // 스퍼트 지속
  sprintBoost: 1.22,
};

class CyclingEvent {
  constructor(def){ this.def=def; this.trackM=def.distanceM||1000; this.reset(); }
  reset(){
    this.phase='SET'; this.t=0;
    this.gunMs = 1400 + Math.random()*1400;
    this.setBeeps=0;
    this.dist=0; this.speed=0; this.cad=0;
    this.gear=1; this.lastPedal=-1e9; this.side=0;
    this.judge={PERFECT:0,GOOD:0,EARLY:0,LATE:0,REPEAT:0,SPAM:0};
    this.lastJudge=''; this.lastJudgeMs=-1e9;
    this.form=1.0; this.stamina=1.0;
    this.sprintStart=-1; this.sprintUsed=false;
    this.camM=0; this.flash=0; this.msg=''; this.msgAt=-1e9;
    this.result=null; this.doneAt=0;
    /* 상대 2명 */
    this.rivals=[];
    for(let i=0;i<2;i++){
      const sk=AI.skill(0.70+i*0.11+Math.random()*0.08);
      this.rivals.push({ lane:i===0?0:2, dist:0, spd:CYCLE.maxSpeed*sk*0.82 });
    }
  }
  get qualify(){ return this.def.qualify; }
  get elapsed(){ return (this.t-this.gunMs)/1000; }
  get G(){ return CYCLE.gears[this.gear]; }
  get targetIv(){ return CYCLE.baseIv * this.G.ivMul; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }

  /* 좌우 = 페달. 위/아래로 기어 변속. */
  onStride(side, tMs){
    if(this.phase==='DONE') return;
    if(this.phase!=='RUN'){
      if(tMs<this.gunMs && tMs>this.gunMs-1200){
        this.phase='DONE'; this.doneAt=this.t;
        this.result={status:'FALSE_START', value:DNF, rank:3}; Sfx.fail();
      }
      return;
    }
    const dt=tMs-this.lastPedal;
    let j='GOOD';
    /* ⛔ 연타 모드 — 페달도 빨리 밟을수록 빠르다. 제한은 **기어와 체력**이 맡는다.
       무거운 기어는 최고속이 높지만 밟기 어렵고, 가벼운 기어는 반대다(G.mul/ivMul). */
    if(RULES.mashMode){
      if(this.side===side){ j='REPEAT'; this.form=Math.max(0.6,this.form-0.03); }
      else { j='PERFECT'; this.form=Math.min(1.15,this.form+0.02); }
    }
    else if(dt<60){ j='SPAM'; this.form=Math.max(0.55,this.form-0.05); }
    else if(this.side===side){ j='REPEAT'; this.form=Math.max(0.6,this.form-0.06); }
    else if(this.lastPedal<-1e8){ j='GOOD'; }
    else {
      const err=Math.abs(dt-this.targetIv)/this.targetIv;
      /* ⚠ 기어가 셀수록 창이 좁다 — 그게 위험을 감수하는 대가다 */
      const win = 0.14 / this.G.hard;
      if(err<=win){ j='PERFECT'; this.form=Math.min(1.15,this.form+0.03); }
      else if(err<=win*2.2){ j='GOOD'; this.form=Math.min(1.15,this.form+0.01); }
      else if(dt<this.targetIv){ j='EARLY'; this.form=Math.max(0.6,this.form-0.04); }
      else { j='LATE'; this.form=Math.max(0.6,this.form-0.04); }
    }
    this.judge[j]++; this.lastJudge=j; this.lastJudgeMs=tMs;
    this.side=side; this.lastPedal=tMs;
    Sfx.chain(), Sfx.step(j);
    const mult={PERFECT:1.0,GOOD:0.82,EARLY:0.6,LATE:0.6,REPEAT:0.35,SPAM:0.15}[j];
    /* 관성이 크다 — 목표 속도로 천천히 다가간다 */
    const target = CYCLE.maxSpeed * this.G.mul * this.form * this.stamina * mult;
    if(RULES.mashMode){
      const room = Math.max(0, 1 - this.speed/Math.max(target,0.1));
      this.speed = Math.min(target, this.speed + target*CYCLE.mashKick*room);
    } else {
      this.speed = lerp(this.speed, Math.max(this.speed*0.9, target), 0.28);
    }
    this.cad = 1;
  }
  /* 위/아래 = 기어 */
  onUp(){ if(this.phase==='RUN' && this.gear<2){ this.gear++; this.say('기어 '+this.G.name); Sfx.beep(760,0.05,'square',0.09); } }
  onDown(){ if(this.phase==='RUN' && this.gear>0){ this.gear--; this.say('기어 '+this.G.name); Sfx.beep(420,0.05,'square',0.09); } }
  /* 액션 = 스퍼트 (한 번만) */
  onAction(tMs){
    if(this.phase!=='RUN' || this.sprintUsed) return;
    this.sprintUsed=true; this.sprintStart=this.t;
    this.say('스퍼트!'); Sfx.beep(1320,0.16,'square',0.16);
  }
  onActionUp(){}

  update(dt){
    this.t += dt*1000; const now=this.t;
    if(this.phase==='SET'){
      const want=Math.min(3, Math.floor((this.gunMs-now>0? 3-(this.gunMs-now)/450 : 3)));
      if(want>this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(now>=this.gunMs){ this.phase='RUN'; Sfx.gun(); this.flash=1; this.speed=2.5; }
    }
    if(this.phase==='RUN'){
      const sprinting = this.sprintStart>=0 && now-this.sprintStart < CYCLE.sprintMs;
      const boost = sprinting ? CYCLE.sprintBoost : 1;
      this.speed = Math.max(0, this.speed - dt*CYCLE.drag);
      /* 스퍼트는 체력을 빨리 태운다 */
      /* ⚠ 예전엔 소모가 기어에 선형이라 강기어가 무조건 유리했다(실측: 강 64초 vs 중 72초).
         제곱으로 걸어 '강기어로 끝까지'는 체력이 바닥나게 만든다 — 언제 올릴지가 선택이 된다. */
      this.stamina = Math.max(0.40, this.stamina - dt*(0.010 + (sprinting?0.07:0)) * this.G.hard*this.G.hard);
      /* ⚠ 1000m 는 90초가 걸려 어떤 기어를 써도 체력이 다 말랐다 — 선택이 사라졌다.
         트랙 스프린트답게 500m 로 줄이고 소모도 낮췄다. */
      this.dist += this.speed*boost*dt;
      for(const rv of this.rivals) rv.dist += rv.spd*dt;
      if(this.dist>=this.trackM){
        this.dist=this.trackM;
        const total=(now-this.gunMs)/1000;
        this.phase='DONE'; this.doneAt=now;
        const pass=total<=this.qualify;
        this.result={status:pass?'OK':'MISSED_QUALIFY', value:total, rank:this.rankOf()};
        pass?Sfx.finish():Sfx.fail();
      }
      if(this.elapsed > this.qualify+timeGrace(25)){
        this.phase='DONE'; this.doneAt=now;
        this.result={status:'TIMEOUT', value:DNF, rank:3}; Sfx.fail();
      }
    }
    this.camM = Math.max(0, this.dist - 18);
    this.flash=Math.max(0,this.flash-dt*4);
    Sfx.crowd(clamp(this.speed/CYCLE.maxSpeed,0,1)*(this.phase==='RUN'?0.95:0.3));
  }
  rankOf(){ let r=1; for(const rv of this.rivals) if(rv.dist>this.dist) r++; return r; }

  draw(ctx){
    /* 벨로드롬 — 나무 주로 */
    const mPerPx = 0.42;
    Track.drawBack(ctx, this.camM*0.4, this.trackM);
    const lanes=Track.LANE_Y.length;
    /* 벨로드롬 경사면 — 트랙 위로 휘어 올라가는 나무 벽. 실내 트랙이라는 신호다.
       ⚠ 첫 레인 위쪽에 이어 붙인다. 어셋이 없으면 아무것도 안 그린다(예전 화면 그대로). */
    BG.tile(BG.ctx(), 'velodrome-bank', Track.LANE_Y[0]-36, 30, this.camM/mPerPx*0.6);
    for(let i=0;i<lanes;i++){
      const y=Track.LANE_Y[i], LH=Track.laneH(i);
      if(!BG.tile(BG.ctx(),'velodrome-track', y-6, LH, this.camM/mPerPx)){
        ctx.fillStyle='#b08050'; ctx.fillRect(0,y,VW,LH-6);
        ctx.fillStyle='#8a6038'; ctx.fillRect(0,y+LH-10,VW,4);
        ctx.fillStyle='rgba(232,226,214,.5)'; ctx.fillRect(0,y-1,VW,1);
      }
    }
    const px=(m)=>Math.round((m-this.camM)/mPerPx);
    /* 결승선 */
    Track.drawFinish(ctx, this.camM, mPerPx, this.trackM);
    /* 상대 */
    this.rivals.forEach((rv,i)=>{
      const x=px(rv.dist), y=Track.laneFoot(rv.lane);
      if(x<-30||x>VW+30) return;
      if(!BG.obj(BG.ctx(),'bicycle-hd', x, y, Math.round(16*Track.laneScale(rv.lane)))){
        ctx.fillStyle='#7a8290'; ctx.fillRect(x-9,y-7,18,3);
      }
      if(CharHD.enabled) (this._hd=this._hd||[]).push({sp:'hare', x, y:y-6, ph:(this.t*0.006+i)%1,
        o:{act:'pedal', rare:2, moving:true, t:this.t, lean:true, scale:Track.laneScale(rv.lane)}});
    });
    /* 나 */
    const mx=px(this.dist), my=Track.laneFoot(1);
    if(!BG.obj(BG.ctx(),'bicycle-hd', mx, my, 16)){
      ctx.fillStyle='#ffd75e'; ctx.fillRect(mx-9,my-7,18,3);
    }
    this._meX=mx; this._meY=my;
    if(CharHD.enabled) (this._hd=this._hd||[]).push({sp:'cheetah', x:mx, y:my-6, ph:(this.t*0.008)%1,
      o:{act:'pedal', rare:5, moving:this.phase==='RUN', t:this.t, lean:true, scale:Track.laneScale(1)}});
    /* 스퍼트 속도선 */
    if(this.sprintStart>=0 && this.t-this.sprintStart<CYCLE.sprintMs){
      BG.fx(BG.ctx(),'speed-lines', mx-40, my-8, 32, ((this.t/160)%1), 1);
      ctx.fillStyle='rgba(255,215,94,.22)';
      for(let i=0;i<4;i++) ctx.fillRect(mx-30-i*12, my-14+i*3, 10, 1);
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.5})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    if(this._hd){ for(const c of this._hd) CharHD.draw(u, c.sp, c.x, c.y, c.ph, c.o); this._hd=null; }
    /* ⚠ 판정을 lastJudge 에 **저장해 놓고 한 번도 안 그리고 있었다** — 상태는 있는데
       표시만 빠져 있었다(10종목 전수 점검에서 조정과 함께 잡혔다).
       기준은 HUD.tap 한 곳에 있다. */
    if(this.phase==='RUN' && this._meX!==undefined)
      HUD.tap(u, { j:this.lastJudge, ageMs:this.t-this.lastJudgeMs, ivMs:this.targetIv,
                   x:this._meX, y:this._meY, labelY:this._meY-30 });
    HUD.race(u, { def:this.def, timeS:Math.max(0,this.elapsed), speed:this.speed,
                  distM:this.dist, trackM:this.trackM, qualify:this.qualify,
                  best:Save.data.best[this.def.id] });
    /* 기어 */
    /* ⚠ gy=44 면 '기어' 라벨이 y 33~41 인데, 거기는 이제 **메달 레일 받침**(30~41)이다.
       레일을 넣으면서 이 블록을 안 봤다 — 캡처에서 'Gear' 가 레일 밑에 깔렸다. 12px 내린다. */
    const gx=VW-70, gy=56;
    txt(u,'기어', gx+26, gy-11, 8, PAL.dim,'center');
    CYCLE.gears.forEach((g,i)=>{
      const on=i===this.gear;
      u.fillStyle = on? 'rgba(255,215,94,.25)':'rgba(255,255,255,.07)';
      u.fillRect(gx+i*18, gy, 16, 16);
      u.strokeStyle = on?PAL.gold:'#3a4258'; u.lineWidth=1; u.strokeRect(gx+i*18+.5, gy+.5, 15, 15);
      txt(u, g.name, gx+i*18+8, gy+4, 10, on?PAL.gold:PAL.dim,'center', on?700:400);
    });
    txt(u,'▲▼ 변속', gx+26, gy+19, 8, PAL.dim,'center');
    /* 체력 */
    const bw=90, bx=8, by=VH-24;
    txt(u,'체력', bx, by-11, 8, PAL.dim);
    u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(bx,by,bw,7);
    u.fillStyle = this.stamina>0.8?PAL.green:this.stamina>0.65?PAL.gold:PAL.red;
    u.fillRect(bx,by,Math.round(bw*(this.stamina-0.40)/0.60),7);
    if(!this.sprintUsed && this.phase==='RUN')
      txt(u,'액션 = 스퍼트 (한 번)', VW/2, VH-24, 10, PAL.gold,'center',700);
    if(this.phase==='SET') txt(u,'총성을 기다리세요', VW/2, VH-24, 11, PAL.white,'center',700);
    if(this.t-this.msgAt<900)
      txt(u, this.msg, VW/2, 46, 12, this.msgBad?PAL.red:PAL.green,'center',700);
  }
}
