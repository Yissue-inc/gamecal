/* ══════════════════════════════════════════════════════════════════
   중장거리 (800 · 1500 · 5000 · 20km 경보)

   ⚠ 이 다섯 종목은 **감독 모드에는 있는데 플레이할 수 없었다.** 선수를 뽑고
      훈련시키고 대회에 내보내면서, 정작 그 경기는 한 번도 못 뛰었다.

   스프린트를 길게 늘이면 안 된다 — 4분 동안 좌우 연타는 종목이 아니라 노동이다.
   중장거리의 실체는 **페이스 배분**이다.
     · 페이스 3단(여유 · 유지 · 승부)을 ▲▼ 로 고른다 — 이게 조작의 중심
     · 리듬(좌우)은 그대로지만 창이 넓다. 대신 **어긋나면 체력이 더 샌다**
     · 액션 = 스퍼트. 체력을 몰아 쓴다. 남은 거리를 못 버티면 무너진다
     · 라이벌도 각자 페이스가 있다 — 앞사람 등을 보고 따라갈지 지금 나갈지
   경보는 규칙이 하나 더 붙는다: **너무 빠른 케이던스는 반칙**. 3회 경고면 실격.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const MID = {
  PACE: [
    { name:'여유', spd:0.82, drain:0.55, ivMul:1.34, color:'#7fd4a0' },
    { name:'유지', spd:1.00, drain:1.00, ivMul:1.00, color:'#ffd75e' },
    { name:'승부', spd:1.16, drain:1.85, ivMul:0.76, color:'#ff7b6b' },
  ],
  baseIv: 300,           // 유지 페이스의 스트로크 간격(ms)
  /* ══ 연타 + 배분 (CK 확정 2026-08-31) ══════════════════════════════
     CK: "중장거리는 연타가 있되 체력이 깎이는 것도 있어서 밸런스 배분이 중요한 걸로"
     ⛔ 예전엔 한 번 디딜 때 상한의 16% 를 채웠다 — **일곱 번이면 최고속**이라
        그 뒤로는 아무리 빨리 쳐도 같았다(실측: 14타 149.6s vs 7타 152.4s, 1.9%).
     이제 ① 디딤은 남은 여유에 비례해 더하고 ② 안 치면 감속이 이긴다
          ③ **페이스가 정한 박자보다 빨리 치면 그만큼 체력이 더 깎인다.**
        빨리 치면 지금 빨라지지만 뒤가 없다 — 그 균형이 이 종목이다.
     ⚠ 값을 한 번 과하게 걸었다가 되잡았다(kick 0.50·decay 0.50·overCost 0.0016).
        그 값이면 800m 가 190~266초가 되고 체력이 전부 0 이었고,
        **4타(194초)가 7타(266초)보다 빨랐다** — 연타가 손해면 그건 배분이 아니라 처벌이다.
        지금 값: 4~14타에서 상한의 92~97.5% (속도 차 ~6%) + 체력 대가가 뒤에서 작동한다. */
  mashKick: 0.62,        // 디딤 한 번이 남은 여유의 몇 할을 채우나
  mashDecay: 0.22,       // 안 치면 초당 이만큼 빠진다(1/s)
  overCost: 0.0004,      // 제 박자보다 빨리 친 대가(체력) — 페이스 drain 이 곱해진다
  goodMs: 72,            // 판정 창 — 스프린트(±19ms)보다 훨씬 넓다
  perfectMs: 26,
  maxSpeed: 8.4,         // 유지 페이스 최고속(m/s) — 종목별로 곱해진다
  spurtMul: 1.22,
  spurtDrain: 2.0,
  targetWallSec: 110,    // 어느 거리든 한 판이 이 정도가 되도록 시간을 압축한다
  cruiseRun: 7.14,       // 실측 순항 속도(m/s) — 압축비 계산에만 쓴다
  walkMinIvMs: 111,     // 연타 모드 걷기 한계 — 초당 9타를 넘으면 '뛴 것'
  cruiseWalk: 2.55,
  graceMs: 12000,        // 선두 완주 후 나머지에게 주는 시간
};

class MiddleEvent {
  /* ⚠ dist·speed·stamina 를 this 에 직접 달면 **한 명만 뛸 수 있다.** 수영이 겪은 것과
     같은 문제라 같은 방식으로 푼다 — 객체로 묶고 this.<이름>은 1번 주자를 가리키는
     프록시로 남긴다. 기존 참조를 한 줄도 안 고치고 다인 플레이가 붙는다. */
  /* ⚠ 키 목록을 손으로 적으면 상태를 추가할 때 빠뜨린다(클라이밍에서 실제로 그랬고
     모든 판이 시간초과로 죽었다). 목록은 주자 객체에서 뽑는다. */
  static proxy(ev){
    for(const k of Object.keys(ev.runners[0])){
      if(Object.getOwnPropertyDescriptor(ev, k)) continue;
      Object.defineProperty(ev, k, { configurable:true,
        get(){ return this.runners[0][k]; }, set(v){ this.runners[0][k]=v; } });
    }
  }
  constructor(def){
    this.def=def; this.trackM=def.distanceM;
    this.walk = def.kind==='walk';
    /* ⚠ 20km 를 실시간으로 두면 한 판이 90분이다. 시간을 압축하고, 기록은 압축을
       되돌려 **실제 초**로 낸다. 안 그러면 기준표가 전부 거짓말이 된다.
       압축비는 손으로 고르지 않는다 — **어느 거리든 한 판이 110초쯤** 되도록 계산한다
       (예전엔 3.2/26 을 눈대중으로 박았고, 5000m 는 6.7분을 뛰어도 14% 밖에 못 갔다). */
    /* 순항 속도는 **실측값**이다 — 최고속에서 계산하면 경보가 20km 를 200초 걸린다 */
    const cruise = this.walk ? MID.cruiseWalk : MID.cruiseRun;
    /* 그릇 종목(철인3종)은 구간을 더 짧게 굴려야 한다 — def.wallSec 로 덮어쓴다 */
    const wall = this.def.wallSec || MID.targetWallSec;
    this.scale = Math.max(1, this.trackM/(wall*cruise));
    this.reset();
  }
  reset(){
    this.phase='SET'; this.t=0;
    this.gunMs=1200+Math.random()*1200; this.setBeeps=0;
    /* ⚠ 마라톤·20km 경보는 트랙 경기가 아니다 — '9 / 22 바퀴'는 없는 단위다
       (42195m 를 22등분한 1918m 짜리 '바퀴'였다). 도로 종목은 남은 km 로 말한다. */
    this.road = this.trackM > 10000;
    this.lapM = this.trackM<=5000 ? 400 : 2000;
    const humans = (typeof Party!=='undefined' && Party.on && Party.modeFor(this.def)==='versus')
                   ? Party.count : 1;
    /* ⚠ 'humans' 는 달리기에서 **선수 배열**의 이름이다. 여기에 숫자를 담으면
       결과 화면이 숫자를 map 하려다 터진다 — 이름을 갈라 놓는다. */
    this.humanCount = humans;
    this.runners = [];
    for(let i=0;i<humans;i++) this.runners.push({
      lane:i, dist:0, speed:0, stamina:1, pace:1, lastStroke:-1e9, side:0,
      judge:{PERFECT:0,GOOD:0,MISS:0,REPEAT:0},
      spurting:false, spurtLeft:this.walk?0:1, warns:0, dq:false, lap:0,
      finished:false, finishTimeS:0, msg:'', msgAt:-1e9, msgBad:false });
    MiddleEvent.proxy(this);              // this.dist → runners[0].dist
    this.flash=0; this.result=null; this.doneAt=0; this.camM=0; this.graceAt=undefined;
    /* 레인 — 사람 + 라이벌이 다 들어가야 한다 */
    const lanes = Math.max(3, humans+1);
    if(Track.setLanes) Track.setLanes(lanes);
    this.rivals=[];
    /* ⚠ 라이벌을 **기준 기록(qualify)** 으로 계산하면 기준을 조일 때 라이벌까지 빨라진다
       — 수영이 이미 겪고 parS(사람이 낼 만한 기록)로 분리해 뒀다. 같은 걸 쓴다.
       최고속에서 뽑던 시절엔 라이벌이 플레이어 상한보다 빨라 **모든 플레이가 3위**였다. */
    const parS = this.def.parS || this.def.qualify;
    for(let i=humans;i<lanes;i++){
      /* ⛔ 예전엔 AI.pace(실력폭 비례) 를 썼다 — 시간으로 ±17.5% 를 움직인다.
         그런데 사람의 성능 띠는 그보다 훨씬 좁다. 실측(800m): 사람 최선 127.3s 인데
         어려움 라이벌이 110.4s 로 **13% 빨라 이길 수 없었고**, 쉬움은 151.8s 로 너무 헐거웠다.
         단거리와 같은 종류의 사고다 → 사람 기록 대비 배수(AI.parRatio)로 옮긴다.
         ⚠ 여기선 parS 가 실측과 잘 맞는다(800m parS 127.0 · 사람 최선 127.3). */
      const k = AI.parRatio() * (1 + (i-humans)*0.05 + Math.random()*0.02);
      this.rivals.push({ lane:i, dist:0, sk:0.86+(i-humans)*0.06,
        base: this.trackM/(parS*k),
        kickAt: 0.62+Math.random()*0.26, kicked:false });
    }
  }
  R(p){ return this.runners[p|0] || this.runners[0]; }
  /* 사람 목록의 정본 이름 — 결과 화면은 이것만 본다 */
  get people(){ return this.runners; }
  get qualify(){ return this.def.qualify; }
  get P(){ return MID.PACE[this.pace]; }
  paceOf(r){ return MID.PACE[r.pace]; }
  get elapsed(){ return (this.t-this.gunMs)/1000*this.scale; }   // 실제 초
  get targetIv(){ return MID.baseIv*this.P.ivMul; }
  ivOf(r){ return MID.baseIv*MID.PACE[r.pace].ivMul; }
  get remain(){ return 1 - this.dist/this.trackM; }
  say(m,bad,p){ const r=this.R(p); r.msg=m; r.msgAt=this.t; r.msgBad=!!bad; }

  onUp(tMs, p){ if(this.phase!=='RUN') return; const r=this.R(p);
    if(r.pace<2){ r.pace++; this.say('페이스 ↑ '+MID.PACE[r.pace].name,false,p); Sfx.beep(940,0.06,'square',0.11); } }
  onDown(tMs, p){ if(this.phase!=='RUN') return; const r=this.R(p);
    if(r.pace>0){ r.pace--; this.say('페이스 ↓ '+MID.PACE[r.pace].name,false,p); Sfx.beep(660,0.06,'square',0.11); } }

  onStride(side, tMs, p){
    if(this.phase==='DONE') return;
    const r=this.R(p);
    if(this.phase!=='RUN'){
      if(tMs<this.gunMs && tMs>this.gunMs-1100){
        r.dq=true; r.finished=true; r.falseStart=true;
        this.say('부정 출발', true, p); Sfx.fail();
        if(this.runners.every(x=>x.finished)) this.finish();
      }
      return;
    }
    if(r.finished||r.dq) return;
    const dt=tMs-r.lastStroke, iv=this.ivOf(r);
    let j;
    if(r.side===side) j='REPEAT';
    else if(r.lastStroke<-1e8) j='GOOD';
    /* ⛔ 연타 모드에서는 **박자로 벌하지 않는다** — 그러면 연타가 곧 MISS 였다.
       실측: 유지 페이스에서 4타 154.9s < 10타 208.7s — **더 치면 더 느렸다.**
       CK 가 원한 건 그 반대다("연타가 있되 체력이 깎여 배분이 중요"). 제한은 **체력**이 맡는다.
       규칙은 하나만 남는다: 좌·우를 번갈아 칠 것(같은 쪽은 REPEAT). */
    else if(RULES.mashMode) j='PERFECT';
    else {
      const err=Math.abs(dt-iv);
      j = err<=MID.perfectMs ? 'PERFECT' : err<=MID.goodMs ? 'GOOD' : 'MISS';
      /* 경보 — 케이던스가 규정보다 빠르면 반칙(로스 오브 컨택트) */
      /* ⛔ 연타 모드에서는 iv*0.62(≈148ms) 기준이 **모든 타를 반칙으로** 만든다 —
         실측: 20km 경보가 7·10·14타 전부 실격이었다. 걷기의 규칙은 살리되(너무 빠르면 반칙)
         기준을 연타 눈금으로 옮긴다. 초당 9타(111ms)를 넘으면 '뛴 것'으로 본다. */
      const walkLimit = RULES.mashMode ? MID.walkMinIvMs : iv*0.62;
      if(this.walk && dt < walkLimit) this.warn(r, p);
    }
    r.judge[j]++; r.side=side; r.lastStroke=tMs;
    /* ⚠ 판정을 **세기만 하고 마지막 값을 안 남겼다** — 그래서 1500m·5000m 를 치는
       내내 타당 피드백이 하나도 없었다(10종목 전수 점검에서 잡힌 제일 큰 구멍).
       화면이 읽을 수 있게 남긴다. */
    r.lastJudge = j; r.lastJudgeMs = tMs;
    if(!p) Sfx.step(j, r.tier);     // 콤보 단계마다 반음 오른다 — 귀로도 쌓이는 게 보인다
    /* ⚠ 속도 비례 저항으로 바꾼 뒤 MISS 0.30 은 너무 비쌌다 — 보통 실력이 135초에서
       181초로 무너졌다. 중장거리는 스프린트만큼 정밀할 이유가 없다. */
    const gain={PERFECT:1.0,GOOD:0.80,MISS:0.46,REPEAT:0.12}[j];
    const P = MID.PACE[r.pace];
    const top = MID.maxSpeed*P.spd*(this.walk?0.42:1)
              * (0.55+0.45*r.stamina) * (r.spurting?MID.spurtMul:1);
    /* 연타 추진 — 남은 여유에 비례해 더한다(단거리와 같은 규칙) */
    const room = Math.max(0, 1 - r.speed/Math.max(top, 0.1));
    r.speed = Math.min(top, r.speed + top*MID.mashKick*gain*room);
    /* ⛔ 제 박자보다 빨리 치면 체력이 더 깎인다 — **이게 배분이다.**
       over 1.0 = 페이스가 정한 박자의 두 배로 치는 중. 페이스가 셀수록 대가도 크다. */
    const natIv = MID.baseIv*P.ivMul;
    const over = clamp(natIv/Math.max(dt, 40) - 1, 0, 2);
    if(over > 0) r.stamina = Math.max(0, r.stamina - MID.overCost*over*P.drain);
    /* ⚠ 리듬을 놓치면 '느려질' 뿐 아니라 **체력이 더 샌다**. 넓은 창을 준 대신
       엉망으로 달리면 대가를 치른다 — 안 그러면 아무렇게나 눌러도 완주한다. */
    if(j==='MISS'||j==='REPEAT') r.stamina=Math.max(0, r.stamina-0.006);
  }
  warn(r, p){
    if(r.dq) return;
    r.warns++;
    if(r.warns>=3){
      r.dq=true; r.finished=true;
      this.say('실격 — 경고 3회', true, p); Sfx.fail();
      if(this.runners.every(x=>x.finished)) this.finish();
    } else { this.say('경고 '+r.warns+'/3 — 뛰지 마세요', true, p); Sfx.fail(); }
  }
  onAction(tMs, p){
    if(this.phase!=='RUN' || this.walk) return;
    const r=this.R(p); if(r.finished||r.dq) return;
    if(r.spurtLeft<=0){ this.say('스퍼트는 한 번뿐', true, p); return; }
    r.spurtLeft--; r.spurting=true;
    this.say('스퍼트!',false,p); Sfx.beep(1200,0.16,'square',0.16); Track.cheer(0.6);
  }
  onActionUp(){}

  update(dt){
    this.t += dt*1000;
    if(this.phase==='SET'){
      const want=Math.min(3, Math.floor(3-(this.gunMs-this.t)/420));
      if(want>this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(this.t>=this.gunMs){ this.phase='RUN'; Sfx.gun(); this.flash=1; }
      return;
    }
    if(this.phase!=='RUN') return;
    const sdt = dt*this.scale;                       // 압축된 경기 시간
    for(const r of this.runners){
      if(r.finished||r.dq) continue;
      /* ⚠ 감속을 고정 1.5 m/s² 로 뒀더니 최고속이 낮은 **경보에서만 깨졌다**.
         달리기는 스트로크 한 번의 가속(top×0.16=1.34)이 감속을 압도하지만, 경보는
         top 이 1/2.4 라 가속(0.48)과 감속(0.45)이 맞먹어 속도가 안 붙었다.
         속도에 비례하는 저항으로 두면 종목의 최고속이 뭐든 같은 비율로 수렴한다. */
      r.speed = Math.max(0, r.speed - dt*r.speed*0.55);
      r.dist += r.speed*sdt;
      /* 체력 — 페이스가 곧 소모율이다.
         ⚠ 시간 기준으로 깎았더니 종목마다 의미가 달라졌고(800m 는 거의 안 닳고 5000m 는
            즉사) '처음부터 승부'와 '배분해서 승부'가 3초밖에 차이 안 났다.
            **간 거리** 기준으로 깎는다 — 유지 페이스로 전 구간을 가면 결승선에서 딱 바닥난다.
            계수 1.00 은 모두를 바닥으로 보내 전략이 뭉쳤다(128~142초). 0.78 이면 유지로
            완주했을 때 0.22 가 남고, 그 여유분을 어디에 쓸지가 선택이 된다. */
      /* 안 치면 느려진다 — 이게 있어야 '타수 = 속도'가 성립한다 */
      r.speed *= Math.exp(-MID.mashDecay*sdt);
      const frac = (r.speed*sdt)/this.trackM;
      r.stamina = Math.max(0, r.stamina
        - frac*(0.78*MID.PACE[r.pace].drain + (r.spurting?MID.spurtDrain:0)));
      if(r.spurting && r.stamina<=0.08){ r.spurting=false; r.msg='힘이 다 떨어졌다'; r.msgAt=this.t; r.msgBad=true; }
      const nl=Math.floor(r.dist/this.lapM);
      if(nl>r.lap){ r.lap=nl; if(r===this.runners[0]) Sfx.beep(880,0.06,'sine',0.10); }
      if(r.dist>=this.trackM){
        r.dist=this.trackM; r.finished=true; r.finishTimeS=this.elapsed;
        if(r===this.runners[0]) Sfx.finish();
      }
    }
    for(const rv of this.rivals){
      if(!rv.kicked && rv.dist/this.trackM > rv.kickAt){ rv.kicked=true; rv.base*=1.13; }
      rv.dist += rv.base*(0.94+0.12*Math.sin(this.t*0.0004+rv.sk))*sdt;
    }
    /* ⚠ 다인전에서 한 사람이 헤매면 **모두가 그를 기다린다** — 800m 한 판이 4분이 된다.
       선두가 들어오면 제한 시간을 걸고, 그 안에 못 들어오면 미완주로 끊는다. */
    const leadIn = this.runners.some(r=>r.finished);
    if(leadIn && this.graceAt===undefined) this.graceAt=this.t;
    if(this.runners.every(r=>r.finished)) this.finish();
    else if((leadIn && this.t-this.graceAt > MID.graceMs) || this.elapsed > this.qualify+timeGrace(this.qualify*0.7)){
      for(const r of this.runners) if(!r.finished){ r.finished=true; r.timedOut=true; }
      this.finish();
    }
    this.camM=Math.max(0, Math.max(...this.runners.map(r=>r.dist))-16);
    this.flash=Math.max(0,this.flash-dt*4);
    Track.crowdTick();
    Sfx.crowd(clamp(this.runners[0].speed/(MID.maxSpeed*(this.walk?0.42:1)),0,1)*0.7);
  }
  finish(){
    if(this.result) return;
    this.phase='DONE'; this.doneAt=this.t;
    const r0=this.runners[0];
    const bad = r0.dq || r0.timedOut || r0.falseStart;
    const total = bad ? 99999 : r0.finishTimeS;
    const status = r0.falseStart ? 'FALSE_START' : r0.dq ? 'DQ' : r0.timedOut ? 'TIMEOUT'
                 : (total<=this.qualify ? 'OK' : 'MISSED_QUALIFY');
    /* ⚠ '실격' 세 글자만 뜨고 왜인지 안 나왔다 — 경보는 경고 3회로 실격되는데
       그 규칙을 모르는 사람은 무엇을 잘못했는지 영영 모른다. 사유를 같이 보낸다. */
    const reason = r0.falseStart ? '총성 전에 움직였습니다'
                 : r0.dq ? (this.walk ? '케이던스 경고 3회 — 걷기를 유지해야 합니다' : '실격되었습니다')
                 : r0.timedOut ? '제한 시간 안에 들어오지 못했습니다' : null;
    this.result={status, value:total, rank:this.rankOf(), reason};
    if(status!=='OK') Sfx.fail();
    /* 다인전 기록판 — 완주 시각 순 */
    if(this.humanCount>1 && typeof Party!=='undefined' && Party.on){
      this.humanResults = this.runners.map((r,i)=>({
        p:i, ok:!(r.dq||r.timedOut||r.falseStart), value:(r.dq||r.timedOut||r.falseStart)?99999:r.finishTimeS }))
        .sort((a,b)=>a.value-b.value);
    }
  }
  rankOf(p){ const me=this.R(p);
    let r=1;
    for(const rv of this.rivals) if(rv.dist>me.dist) r++;
    for(const o of this.runners) if(o!==me && o.dist>me.dist) r++;
    return r; }

  draw(ctx){
    const mPerPx=0.26;
    Track.drawBack(ctx, this.camM*0.3, this.trackM);
    Track.drawLanes(ctx, this.camM, mPerPx, this.trackM);
    /* 마라톤·경보는 도로 경기다 — 붉은 우레탄 트랙 위를 42km 도는 그림은 틀렸다.
       도로 어셋이 오면 레인 위에 깔아 덮는다(없으면 지금처럼 트랙 그대로). */
    if(this.road) BG.tile(BG.ctx(), 'road-marathon', Track.LANE_Y[0]-6, 40, this.camM/mPerPx);
    const px=(m)=>Math.round((m-this.camM)/mPerPx);
    Track.drawFinish(ctx, this.camM, mPerPx, this.trackM);
    this._hd=[];
    this.rivals.forEach((rv,i)=>{
      const x=px(rv.dist); if(x<-40||x>VW+40) return;
      this._hd.push({sp:['gazelle','antelope','pronghorn','caribou'][i%4], x,
        y:Track.laneFoot(rv.lane), ph:(this.t*0.004+i*0.3)%1,
        o:{rare:2, t:this.t, moving:true, scale:Track.laneScale(rv.lane)}});
    });
    const SP = this.walk ? ['ostrich','swan','cormorant','duck'] : ['horse','wolf','hound','husky'];
    this.runners.forEach((r,i)=>{
      const x=px(r.dist); if(x<-40||x>VW+40) return;
      this._hd.push({sp:SP[i%4], x, y:Track.laneFoot(r.lane),
        ph:(this.t*0.005*(r.speed/4+0.5)+i*0.2)%1,
        o:{rare:3, t:this.t, moving:true, lean:r.spurting, scale:Track.laneScale(r.lane)}});
      if(i===0){ this._meX=x; this._meY=Track.laneFoot(r.lane); }
    });
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.5})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    if(this._hd){ for(const c of this._hd) CharHD.draw(u, c.sp, c.x, c.y, c.ph, c.o); this._hd=null; }
    /* 한 타의 피드백 — 기준은 HUD.tap 한 곳에 있다(05_hud). */
    { const r=this.runners[0];
      if(r && r.lastJudge && this._meX!==undefined)
        HUD.tap(u, { j:r.lastJudge, ageMs:this.t-r.lastJudgeMs, ivMs:this.ivOf(r),
                     x:this._meX, y:this._meY+2, labelY:this._meY-26 }); }
    /* 다인전이면 사람마다 레인 위에 번호와 페이스를 띄운다 — 누가 누구인지.
       ⚠ 카메라가 선두를 따라가서 뒤처진 사람은 **화면에서 사라졌다**. 1500m 에서 86m
          벌어지면 330px 라 아예 안 보인다 — 밀린 사람은 화면 가장자리에 격차와 함께
          표시한다. 안 보이면 따라잡을 마음도 안 생긴다. */
    if(this.humanCount>1){
      const mPerPx=0.26;
      this.runners.forEach((r,i)=>{
        const col = Party.color ? Party.color(i) : PAL.white;
        const x=Math.round((r.dist-this.camM)/mPerPx);
        const y=Track.laneFoot(r.lane)-44;   /* 캐릭터 머리 위로 — 32 는 스프라이트를 덮었다 */
        if(x>=-30 && x<=VW+30){
          txt(u, (i+1)+'P', x, y, 9, col, 'center', 700);
          txt(u, MID.PACE[r.pace].name, x, y+9, 8, MID.PACE[r.pace].color, 'center');
          return;
        }
        /* 화면 밖 — 가장자리에 격차를 적는다 */
        const lead = Math.max(...this.runners.map(o=>o.dist));
        const gap = Math.round(lead - r.dist);
        const ex = x<0 ? 12 : VW-12, ey = Math.min(VH-56, Math.max(44, y));
        u.fillStyle='rgba(6,10,18,.72)'; u.fillRect(ex-11, ey-2, 22, 20);
        txt(u, (i+1)+'P', ex, ey, 9, col, 'center', 700);
        txt(u, (x<0?'◀':'▶')+gap+'m', ex, ey+9, 8, PAL.dim, 'center');
      });
    }
    const me=this.runners[0];
    HUD.race(u, { def:this.def, timeS:Math.max(0,this.elapsed), speed:me.speed,
                  distM:me.dist, trackM:this.trackM, qualify:this.qualify,
                  best:Save.data.best[this.def.id] });
    /* 페이스 3단 — 이 종목 조작의 중심이니 화면에서도 중심에 둔다 */
    const bw=44, x0=VW/2-(bw*3+8)/2, y=VH-30;
    for(let i=0;i<3;i++){
      const P=MID.PACE[i], on=i===this.pace, bx=x0+i*(bw+4);
      u.fillStyle = on ? P.color : 'rgba(255,255,255,.10)';
      u.fillRect(bx, y, bw, 15);
      txt(u, P.name, bx+bw/2, y+3, 10, on?'#0d1017':'rgba(255,255,255,.5)','center',on?700:400);
    }
    txt(u,'▲▼', x0-8, y+4, 9, PAL.dim,'right');
    /* 체력 — 페이스 줄 위에 한 칸 띄워 놓는다(라벨이 막대를 덮고 있었다) */
    /* ⚠ y-17 은 **복합종목의 구간 띠**(216~238)와 같은 자리다 —
       철인3종 달리기 구간에서 '체력' 라벨이 'Run' 위에 겹쳤다(2026-08-31 겹침 감시).
       띠가 두 줄(22px)로 커지면서 한 번 더 올렸다. 단독 종목에선 한 칸 더 뜰 뿐이다. */
    const sw=110, sx=VW/2-sw/2, sy=y-38;
    u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(sx,sy,sw,6);
    u.fillStyle=me.stamina>0.5?PAL.green:me.stamina>0.22?PAL.gold:PAL.red;
    u.fillRect(sx,sy,Math.round(sw*me.stamina),6);
    txt(u,'체력', sx-8, sy-1, 9, PAL.dim,'right');
    /* 랩 · 스퍼트 — 좌우로 갈라 놓는다 */
    if(this.road){
      const km = (v)=> (v/1000).toFixed(1);
      txt(u, K('남은 %1km').replace('%1', km(Math.max(0, this.trackM-me.dist))),
          VW-10, sy-14, 10, PAL.white,'right',700);
    } else {
      const laps=Math.ceil(this.trackM/this.lapM);
      txt(u, (me.lap+1)+' / '+laps+' 바퀴', VW-10, sy-14, 10, PAL.white,'right',700);
    }
    if(this.walk) txt(u,'경고 '+me.warns+' / 3', 10, sy-14, 10,
                      me.warns?PAL.red:PAL.dim,'left',700);
    else if(me.spurting) txt(u,'스퍼트 중', 10, sy-14, 10, PAL.red,'left',700);
    else if(me.spurtLeft>0) txt(u,'액션 = 스퍼트 1회', 10, sy-14, 9, PAL.gold,'left');

    if(this.phase==='SET') txt(u,'총성을 기다리세요', VW/2, 46, 12, PAL.white,'center',700);
    if(this.t-me.msgAt<900)
      txt(u, me.msg, VW/2, 62, 12, me.msgBad?PAL.red:PAL.green,'center',700);
  }
}
