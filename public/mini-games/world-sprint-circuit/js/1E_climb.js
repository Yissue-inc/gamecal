/* ══════════════════════════════════════════════════════════════════
   스포츠 클라이밍 — 스피드 (15m)

   이 종목을 고른 이유는 **실제 형식이 이미 1대1**이기 때문이다. 똑같은 벽 두 개를
   나란히 놓고 둘이 동시에 오른다. 한 키보드 2인 플레이에 이보다 잘 맞는 종목이 없다.
   (LA 2028 정식 종목이기도 하다.)

   조작
     · 좌·우 번갈아 = 다음 홀드를 잡는다. 리듬이 곧 속도다
     · 창을 크게 벗어나면 **미끄러진다** — 손이 빠지고 그 자리에서 다시 잡아야 한다
     · 두 번 미끄러지면 추락(실격). 빨리 가려다 떨어지는 게 이 종목의 긴장이다
     · 액션 = 데드포인트(도약). 홀드 두 칸을 한 번에 건너뛴다 — 성공하면 크게 벌지만
       리듬이 어긋난 상태에서 뛰면 그대로 미끄러진다

   ⚠ 한 판이 7초쯤이다. 이 게임에서 가장 짧다 — 그래서 다시 하기 쉽다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const CLIMB = {
  wallM: 15,
  holds: 20,              // 15m 를 20개 홀드로
  baseIv: 300,            // 홀드 간 **처음** 목표 간격(ms)
  minIv: 208,             // 흐름을 타면 여기까지 빨라진다
  tempoGain: 7,           // PERFECT 한 번당 당겨지는 ms
  tempoLoss: 26,          // GOOD 한 번당 되돌아가는 ms
  perfectMs: 42,
  goodMs: 96,
  slipMs: 520,            // 미끄러졌을 때 잃는 시간
  maxSlips: 2,
  dynoSkip: 2,            // 데드포인트로 건너뛰는 홀드 수
  dynoWindow: 55,         // 이 안에서 눌러야 성공
  climbPerHold: 0.75,     // m
};

class ClimbEvent {
  /* ⚠ 키 목록을 손으로 적었더니 새 상태(iv)를 넣으면서 **빠뜨렸다** — ev.iv 가
     undefined 가 되어 모든 판이 시간초과로 죽었다. 목록은 객체에서 뽑는다. */
  static proxy(ev){
    for(const k of Object.keys(ev.climbers[0])){
      if(Object.getOwnPropertyDescriptor(ev,k)) continue;
      Object.defineProperty(ev, k, { configurable:true,
        get(){ return this.climbers[0][k]; }, set(v){ this.climbers[0][k]=v; } });
    }
  }
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.phase='SET'; this.t=0;
    this.gunMs=1100+Math.random()*1100; this.setBeeps=0;
    const humans = (typeof Party!=='undefined' && Party.on && Party.modeFor(this.def)==='versus')
                   ? Party.count : 1;
    this.humanCount = humans;
    this.climbers=[];
    for(let i=0;i<humans;i++) this.climbers.push({
      lane:i, hold:0, h:0, lastGrab:-1e9, side:0, slips:0, fell:false, iv:CLIMB.baseIv,
      finished:false, finishTimeS:0, dynoUsed:false, shake:0,
      judge:{PERFECT:0,GOOD:0,SLIP:0,DYNO:0},
      msg:'', msgAt:-1e9, msgBad:false });
    ClimbEvent.proxy(this);
    this.result=null; this.doneAt=0; this.flash=0; this.graceAt=undefined;
    /* 상대 — 실제 스피드 클라이밍처럼 옆 벽에 한 명 */
    const parS = this.def.parS || this.def.qualify;
    this.rivals=[];
    for(let i=0;i<Math.max(1, 3-humans);i++)
      this.rivals.push({ lane:humans+i, h:0, done:false,
        rate: CLIMB.wallM/(parS*(1.00+i*0.10+Math.random()*0.05)) });
  }
  get people(){ return this.climbers; }
  get qualify(){ return this.def.qualify; }
  get elapsed(){ return (this.t-this.gunMs)/1000; }
  R(p){ return this.climbers[p|0] || this.climbers[0]; }
  say(m,bad,p){ const c=this.R(p); c.msg=m; c.msgAt=this.t; c.msgBad=!!bad; }

  grab(c, p, n){
    c.hold = Math.min(CLIMB.holds, c.hold + n);
    c.h = Math.min(CLIMB.wallM, c.hold*CLIMB.climbPerHold);
    if(c.hold >= CLIMB.holds){
      c.finished=true; c.finishTimeS=this.elapsed;
      if(!p) Sfx.finish();
      if(this.climbers.every(x=>x.finished||x.fell)) this.finish();
    }
  }
  slip(c, p, why){
    c.slips++; c.judge.SLIP++; c.shake=1; c.iv=CLIMB.baseIv;   // 흐름이 끊긴다
    c.lastGrab = this.t + CLIMB.slipMs;      // 다시 잡을 때까지 손이 없다
    if(c.slips > CLIMB.maxSlips){
      c.fell=true; c.finished=true;
      this.say('추락 — 실격', true, p); Sfx.fail();
      if(this.climbers.every(x=>x.finished||x.fell)) this.finish();
    } else {
      this.say(why+' — 미끄러졌다 ('+c.slips+'/'+CLIMB.maxSlips+')', true, p);
      Sfx.fail();
    }
  }
  onStride(side, tMs, p){
    if(this.phase==='DONE') return;
    const c=this.R(p);
    if(this.phase!=='RUN'){
      if(tMs<this.gunMs && tMs>this.gunMs-1000){
        c.fell=true; c.finished=true; c.falseStart=true;
        this.say('부정 출발', true, p); Sfx.fail();
        if(this.climbers.every(x=>x.finished||x.fell)) this.finish();
      }
      return;
    }
    if(c.finished||c.fell) return;
    if(this.t < c.lastGrab) return;                 // 미끄러진 직후엔 못 잡는다
    /* ⚠ 예전엔 목표 간격이 고정이라 PERFECT 든 GOOD 이든 홀드 하나씩만 올랐다 —
       능숙(5.83)과 보통(5.91)이 구별되지 않았다. **정확하면 빨라져야** 실력이 기록이 된다.
       흐름을 타면 창이 좁아지고, 흐트러지면 도로 느려진다. */
    const dt = tMs - c.lastGrab, iv = c.iv;
    let j;
    if(c.side===side) j='SLIP';                     // 같은 손으로 두 번 — 몸이 꼬인다
    else if(c.lastGrab<-1e8) j='GOOD';
    else {
      const err=Math.abs(dt-iv);
      j = err<=CLIMB.perfectMs ? 'PERFECT' : err<=CLIMB.goodMs ? 'GOOD' : 'SLIP';
    }
    if(j==='SLIP'){
      const twisted = (c.side===side);      // 판정 전 값으로 사유를 정한다
      c.side=side; this.slip(c, p, twisted?'손이 꼬였다':'리듬이 어긋났다'); return;
    }
    c.judge[j]++; c.side=side; c.lastGrab=tMs;
    c.iv = j==='PERFECT' ? Math.max(CLIMB.minIv, c.iv - CLIMB.tempoGain)
                         : Math.min(CLIMB.baseIv, c.iv + CLIMB.tempoLoss);
    if(!p) Sfx.step(j);
    this.grab(c, p, 1);
  }
  /* 데드포인트 — 두 칸을 한 번에. 리듬이 맞을 때만 붙는다. */
  onAction(tMs, p){
    if(this.phase!=='RUN') return;
    const c=this.R(p); if(c.finished||c.fell) return;
    if(c.dynoUsed){ this.say('도약은 한 번뿐', true, p); return; }
    if(this.t < c.lastGrab) return;
    c.dynoUsed=true;
    const err = Math.abs((tMs - c.lastGrab) - c.iv);
    if(err <= CLIMB.dynoWindow){
      /* ⚠ 도약이 손 순서를 뒤집으면, 플레이어는 **알 수 없는 이유로** 다음 입력에서
         반드시 미끄러진다(실측: 도약을 쓴 모든 판이 실격). 화면에 없는 상태로 벌을 주면
         안 된다 — 도약은 같은 손이 이어서 잡는 것으로 둔다. */
      c.judge.DYNO++; c.lastGrab=tMs;
      this.say('데드포인트!', false, p); Sfx.beep(1280,0.13,'square',0.16); Track.cheer(0.6);
      this.grab(c, p, CLIMB.dynoSkip);
    } else {
      this.slip(c, p, '도약이 빗나갔다');
    }
  }
  onActionUp(){}

  update(dt){
    this.t += dt*1000;
    if(this.phase==='SET'){
      const want=Math.min(3, Math.floor(3-(this.gunMs-this.t)/380));
      if(want>this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(this.t>=this.gunMs){ this.phase='RUN'; Sfx.gun(); this.flash=1; }
      return;
    }
    if(this.phase!=='RUN') return;
    for(const rv of this.rivals){
      if(rv.done) continue;
      rv.h += rv.rate*dt;
      if(rv.h>=CLIMB.wallM){ rv.h=CLIMB.wallM; rv.done=true; }
    }
    for(const c of this.climbers) c.shake=Math.max(0, c.shake-dt*3);
    const leadIn = this.climbers.some(c=>c.finished);
    if(leadIn && this.graceAt===undefined) this.graceAt=this.t;
    if(this.climbers.every(c=>c.finished||c.fell)) this.finish();
    else if((leadIn && this.t-this.graceAt>4000) || this.elapsed > this.qualify*3.5){
      for(const c of this.climbers) if(!c.finished){ c.finished=true; c.timedOut=true; }
      this.finish();
    }
    this.flash=Math.max(0,this.flash-dt*4);
    Track.crowdTick();
    Sfx.crowd(clamp(this.climbers[0].h/CLIMB.wallM,0,1)*0.8);
  }
  finish(){
    if(this.result) return;
    this.phase='DONE'; this.doneAt=this.t;
    const c0=this.climbers[0];
    const bad = c0.fell || c0.timedOut || c0.falseStart;
    const total = bad ? DNF : c0.finishTimeS;
    const status = c0.falseStart ? 'FALSE_START' : c0.fell ? 'DQ'
                 : c0.timedOut ? 'TIMEOUT' : (total<=this.qualify ? 'OK':'MISSED_QUALIFY');
    /* ⚠ '실격'만 뜨고 왜인지 안 나오면 다음 판에 같은 실수를 한다 */
    const reason = c0.falseStart ? '총성 전에 움직였습니다'
                 : c0.fell ? '미끄러졌습니다 — 리듬이 어긋나면 손이 빠집니다'
                 : c0.timedOut ? '제한 시간 안에 완등하지 못했습니다' : null;
    this.result={ status, value:total, rank:this.rankOf(), reason };
    if(status!=='OK') Sfx.fail();
    if(this.humanCount>1 && typeof Party!=='undefined' && Party.on){
      this.humanResults = this.climbers.map((c,i)=>({
        p:i, ok:!(c.fell||c.timedOut||c.falseStart),
        value:(c.fell||c.timedOut||c.falseStart)?DNF:c.finishTimeS }))
        .sort((a,b)=>a.value-b.value);
    }
  }
  rankOf(p){
    const me=this.R(p); let r=1;
    for(const rv of this.rivals) if(rv.h>me.h) r++;
    for(const o of this.climbers) if(o!==me && o.h>me.h) r++;
    return r;
  }

  /* ── 그리기 — 벽은 세로다. 이 게임에서 유일하게 위로 가는 종목. ── */
  draw(ctx){
    const gt = Track.fieldBack(ctx, 24);
    Track.fieldGround(ctx,{grassTop:gt, surface:'#3b3f4d'});
    /* ⚠ 바닥선을 그대로 쓰면 벽이 짧고 아래 들판이 화면 1/4 를 먹는다.
       이 종목은 **세로가 전부**다 — 벽에 화면을 준다. */
    const GROUND = VH-46;
    ctx.fillStyle='#2a2f3c'; ctx.fillRect(0, GROUND-6, VW, VH-GROUND+6);
    this._ground = GROUND;
    const n = this.climbers.length + this.rivals.length;
    const wallW = Math.min(64, Math.floor((VW-40)/n) - 10);
    const gap = (VW - n*wallW)/(n+1);
    /* ⚠ top=26 은 상단 HUD 판(0~30) 아래로 들어가 벽 꼭대기와 1P/2P 라벨이 가려졌다 */
    this._wall = { w:wallW, gap, top:46, bottom:GROUND-2 };
    for(let i=0;i<n;i++){
      const x = gap + i*(wallW+gap);
      if(!BG.tile(BG.ctx(),'climb-wall', this._wall.top, this._wall.bottom-this._wall.top, -x)){
        ctx.fillStyle = '#2a3040'; ctx.fillRect(x, this._wall.top, wallW, this._wall.bottom-this._wall.top);
        ctx.fillStyle = 'rgba(255,255,255,.05)';
        ctx.fillRect(x, this._wall.top, 2, this._wall.bottom-this._wall.top);
        ctx.fillRect(x+wallW-2, this._wall.top, 2, this._wall.bottom-this._wall.top);
        /* 홀드 — 20개가 지그재그로 */
        for(let k=1;k<=CLIMB.holds;k++){
          const hy = this._wall.bottom - (k/CLIMB.holds)*(this._wall.bottom-this._wall.top);
          const hx = x + wallW/2 + (k%2? -1:1)*wallW*0.24;
          ctx.fillStyle = k%5===0 ? '#ffd75e' : '#6c7a90';
          ctx.fillRect(Math.round(hx)-3, Math.round(hy)-2, 6, 3);
        }
      }
      /* 꼭대기 버저판 */
      ctx.fillStyle='#c8402f'; ctx.fillRect(x+wallW/2-6, this._wall.top-4, 12, 5);
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.5})`; ctx.fillRect(0,0,VW,VH); }
  }
  yOf(h){ const W=this._wall; return W.bottom - (h/CLIMB.wallM)*(W.bottom-W.top); }
  xOf(lane){ const W=this._wall; return W.gap + lane*(W.w+W.gap) + W.w/2; }

  drawUI(u){
    if(!this._wall) return;
    const SP=CLIMB_SP;
    this.rivals.forEach((rv,i)=>{
      const x=this.xOf(rv.lane), y=this.yOf(rv.h);
      if(!CharHD.draw(u,'monkey',x,y,(this.t*0.006+i)%1,{rare:2,t:this.t,scale:0.62,crouch:true})){
        u.fillStyle='#8fa0b4'; u.fillRect(x-4,y-11,8,11);
      }
    });
    this.climbers.forEach((c,i)=>{
      const x=this.xOf(c.lane)+ (c.shake>0 ? Math.sin(this.t*0.05)*c.shake*3 : 0);
      const y=this.yOf(c.h);
      if(!CharHD.draw(u, SP[i%SP.length], x, y, (this.t*0.008)%1,
          {rare:3, t:this.t, scale:0.7, crouch:true}))
        { u.fillStyle=PAL.gold; u.fillRect(x-4,y-12,8,12); }
      if(this.humanCount>1){
        /* ⚠ 라벨을 선수 머리 위에 붙였더니 높이 올라간 사람은 **라벨이 캐릭터에 겹쳐**
           안 보였다. 벽 위 고정 자리에 둔다 — 누구 벽인지는 항상 보여야 한다. */
        const lx=this.xOf(c.lane), ly=this._wall.top-13;
        u.fillStyle='rgba(8,11,18,.8)'; u.fillRect(lx-16, ly-1, 32, 10);
        txt(u,(i+1)+'P', lx-4, ly, 9, Party.color?Party.color(i):PAL.white,'center',700);
        for(let k=0;k<CLIMB.maxSlips;k++){
          u.fillStyle = k<c.slips ? PAL.red : 'rgba(255,255,255,.28)';
          u.fillRect(lx+4+k*5, ly+2, 4, 4);
        }
      }
    });
    u.fillStyle='rgba(8,11,18,.72)'; u.fillRect(0, VH-46, VW, 46);
    const me=this.climbers[0];
    HUD.race(u, { timeS:Math.max(0,this.elapsed), speed:me.h,
                  distM:me.h, trackM:CLIMB.wallM, qualify:this.qualify,
                  best:Save.data.best[this.def.id] });
    /* 남은 미끄러짐 — 이 종목의 목숨 */
    txt(u,'미끄러짐', 10, VH-40, 9, PAL.dim,'left');
    for(let k=0;k<CLIMB.maxSlips;k++){
      u.fillStyle = k<me.slips ? PAL.red : 'rgba(255,255,255,.28)';
      u.fillRect(10+k*12, VH-28, 9, 6);
    }
    /* 템포 — 화면에 없으면 '왜 빨라졌는지' 알 수 없다 */
    const tw=86, tx=VW/2-tw/2, ty=VH-30;
    const flow = clamp((CLIMB.baseIv-me.iv)/(CLIMB.baseIv-CLIMB.minIv), 0, 1);
    txt(u,'흐름', tx-8, ty-1, 9, PAL.dim,'right');
    u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(tx,ty,tw,6);
    u.fillStyle= flow>0.6?PAL.green : flow>0.25?PAL.gold : 'rgba(255,255,255,.5)';
    u.fillRect(tx,ty,Math.round(tw*flow),6);
    txt(u, Math.round(me.iv)+'ms', tx+tw+6, ty-1, 8, PAL.dim,'left');
    if(!me.dynoUsed) txt(u,'액션 = 도약 1회 (두 칸)', VW-10, VH-28, 9, PAL.gold,'right');
    txt(u, me.hold+' / '+CLIMB.holds+' 홀드', VW-10, VH-40, 10, PAL.white,'right',700);
    if(this.phase==='SET') txt(u,'총성을 기다리세요', VW/2, 46, 12, PAL.white,'center',700);
    else if(me.hold<3) txt(u,'좌·우를 고르게 번갈아 — 서두르면 미끄러진다', VW/2, VH-52, 10, PAL.white,'center');
    if(this.t-me.msgAt<900)
      txt(u, me.msg, VW/2, 60, 12, me.msgBad?PAL.red:PAL.green,'center',700);
  }
}

/* 등장 동물 — 'gecko' 는 종족표에 없는 이름이었다(어셋도 없다) */
const CLIMB_SP = cast('스피드 클라이밍', ['lemur','lynx','squirrel','monkey']);
