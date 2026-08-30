/* ══════════════════════════════════════════════════════════════════
   100m 달리기 — 이 게임의 기본형.
   상태: SET(제자리) → 총성 → RUN → 결승 → RESULT
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const AI_NAMES = ['KIM','ADEBAYO','SILVA','MÜLLER','TANAKA','OKONKWO','DUBOIS','REYES'];

class SprintEvent {
  constructor(def){
    this.def = def;
    this.trackM = def.distanceM || 100;
    /* 거리가 길수록 넓게 본다 — 400m 를 100m 축척으로 그리면 화면이 못 따라간다.
       480px 창에 대략 트랙의 1/5 이 들어오게 잡는다. */
    this.mPerPx = clamp(this.trackM/100 * 0.16, 0.16, 0.62);
    this.reset();
  }
  reset(){
    this.phase = 'SET';                       // SET | GO | RUN | DONE
    this.t = 0;                               // ms
    this.gunMs = 1400 + Math.random()*1600;   // 총성까지 — 매번 달라야 미리 못 누른다
    this.setBeeps = 0;
    /* ── 사람 선수들 ──────────────────────────────────
       ⚠ 동시 대결이면 사람이 최대 4명. 레인 수도 그만큼 늘린다.
          예전엔 사람 1 + AI 2 로 3레인 고정이었다. */
    const versus = (typeof Party!=='undefined') && Party.on && Party.modeFor(this.def)==='versus';
    const humans = versus ? Party.count : 1;
    const lanes  = Math.max(3, humans);
    if(typeof Track!=='undefined' && Track.setLanes) Track.setLanes(lanes);
    this.humans = [];   /* 정본 접근자는 get people() */
    for(let p=0; p<humans; p++){
      const r = new Runner(p, {}, true, this.trackM);
      r.pIndex = p;
      r.onTierUp = (t)=>{
        this.tierMsg = t; this.tierMsgAt = this.t||0; this.tierWho = p;
        if(typeof Track!=='undefined' && Track.cheer) Track.cheer(0.6 + t*0.08);
        Sfx.beep(660 + t*110, 0.12, 'square', 0.14);
      };
      r.reset(this.gunMs);
      this.humans.push(r);
    }
    this.player = this.humans[0];             // 옛 호출부 호환
    this.rivals = [];
    for(let i=humans; i<lanes; i++){
      /* ⛔ 예전엔 실력값을 직접 뽑았다(0.62 + i*0.16). 그런데 실력→기록 곡선은
         0.78 위에서 포화한다 — 가장 빠른 라이벌이 9.10~9.28s 로 **사람의 상한(9.57s) 바깥**
         이었고, 실측 1위 확률이 쉬움·보통·어려움 **전부 0%** 였다. 이길 수 없는 종목이었다.
         이제 '사람 기록의 몇 배로 뛰나' 로 정하고 실력값으로 되돌린다(0E_paceskill).
         난이도도 거기서 준다 — 기록·메달에는 여전히 안 닿는다. */
      const nRiv  = lanes - humans;
      const ratio = ((typeof AI!=='undefined') ? AI.parRatio() : 1.045)
                    * (1 + (nRiv-1-(i-humans))*0.05 + Math.random()*0.02);
      const made  = (typeof PaceSkill!=='undefined') ? PaceSkill.rivalFor(ratio, this.trackM)
                                                     : { skill:0.55+(i-humans)*0.05, jitter:40 };
      const skill = made.skill;
      const r = new Runner(i, { speed:45+skill*45, acceleration:45+skill*40,
        stamina:50, technique:50, rhythm:50 }, false, this.trackM);
      r.reset(this.gunMs); r.name = AI_NAMES[(Math.random()*AI_NAMES.length)|0];
      /* ⛔ 예전엔 여기에 AI.jitter 를 또 걸었다 — 난이도가 **두 번** 들어가
         어려움 라이벌이 목표보다 0.3초 빨랐고(9.34s vs 목표 9.65s) 1위 확률이 0% 였다.
         난이도는 위의 배수 하나로 끝난다. 손떨림은 실력에서만 나온다. */
      /* ⛔ 손떨림도 라이벌 설계의 일부다 — 쉬움(아이용)은 실력 바닥에 닿아
         **손떨림으로만** 더 느려질 수 있다(0E_paceskill.rivalFor). */
      r.aiJitter = made.jitter; r.aiNext = 0; r.aiSide = 1;
      this.rivals.push(r);
    }
    this.all = [...this.humans, ...this.rivals];
    this.doneAt = 0;
    this.result = null;
    this.camM = 0;
    this.flash = 0;
  }

  get people(){ return this.humans; }
  get qualify(){ return this.def.qualify; }
  /* 린(피니시 젖히기) 구간은 거리에 비례한다 */
  get leanStart(){ return this.trackM * (RULES.leanWindowStartM/100); }
  get leanEnd(){   return this.trackM * (RULES.leanWindowEndM/100); }
  /* 지금 시각 기준 경과(초). 총성 전엔 음수 */
  get elapsed(){ return (this.t - this.gunMs)/1000; }

  /* ── 입력 ── */
  onStride(side, tMs, pIdx){
    const P = this.humans[pIdx||0] || this.player;
    if(this.phase==='DONE') return;
    if(this.phase!=='RUN'){
      /* 총성 전 입력 = 부정출발.
         ⚠ 여러 명일 땐 **누른 사람만** 실격이다 — 남의 실수로 내가 죽으면 안 된다. */
      if(tMs < this.gunMs && tMs > this.gunMs - 1200){
        P.falseStart = true; P.dq = true;
        Sfx.fail();
        /* 혼자면 그대로 경기 종료(예전과 같다) */
        if(!this.humans || this.humans.length<2){
          this.phase='DONE'; this.doneAt=this.t;
          this.result = { status:'FALSE_START', value:DNF, rank:3 };
        }
      }
      return;
    }
    if(P.dq) return;
    const j = P.stride(side, tMs, 'off');
    if(j){
      Sfx.step(j, P.tier);
      /* 타격 순간을 남긴다 — 발밑 고리와 미세 펀치가 이걸 읽는다.
         ⚠ 러너에 붙여야 사람이 여럿일 때 각자 자기 타이밍으로 튄다. */
      P.hitAt = this.t; P.hitJ = j;
    }
  }
  onAction(tMs, pIdx){
    const P = this.humans[pIdx||0] || this.player;
    if(this.phase!=='RUN' || P.dq) return;
    const j = P.lean();
    if(j==='LEAN'){ Sfx.beep(1568,0.14,'square',0.16); P.lastJudge='LEAN'; P.lastJudgeMs=tMs; }
    else if(j==='LEAN_EARLY'){ Sfx.beep(160,0.16,'sawtooth',0.14); P.lastJudge='LEAN_EARLY'; P.lastJudgeMs=tMs; }
  }

  /* ── 진행 ── */
  update(dt){
    this.t += dt*1000;
    const now = this.t;

    if(this.phase==='SET'){
      // "제자리에" 신호음 3번
      const want = Math.min(3, Math.floor((this.gunMs - now > 0 ? 3 - (this.gunMs-now)/450 : 3)));
      if(want > this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(now >= this.gunMs){ this.phase='RUN'; Sfx.gun(); this.flash=1; this._metroAt=now;
        this._dust=[]; }
    }

    if(this.phase==='RUN'){
      /* 박자 안내 — 목표 간격마다 딸깍. 설정에서 끌 수 있다(Sfx.metroOn).
         ⚠ 잘 치는 사람에게는 잔소리다 — **콤보가 붙으면 스스로 물러난다**.
            (박자를 이미 아는 사람에게 계속 울리면 그게 방해다) */
      if(Sfx.metroOn !== false && this._metroAt !== undefined){
        const iv = this.player.targetIntervalMs();
        while(now >= this._metroAt){
          this._metroAt += iv;
          if((this.player.combo||0) < 8) Sfx.metro();
        }
      }
      this.aiStep(now);
      for(const r of this.all) r.simulate(dt, now);
      /* ⚠ 여러 명이면 **전원이 들어와야** 끝난다. 1등이 들어오자마자 끊으면
         나머지는 자기 기록을 못 본다. 실격(부정출발)은 끝난 것으로 친다. */
      const allDone = this.humans.every(h=>h.finished || h.dq);
      if(allDone){
        this.phase='DONE'; this.doneAt=now;
        const v = this.player.dq ? DNF : this.player.finishTimeS;
        const passed = !this.player.dq && v <= this.qualify;
        this.result = { status: this.player.dq?'FALSE_START':(passed?'OK':'MISSED_QUALIFY'),
                        value:v, rank:this.rankOf(this.player) };
        /* ── 두 순간을 잡아 둔다. 지금은 둘 다 조용히 지나간다 ──
           ⚠ 자기 최고기록은 HUD 에 작은 글씨로만 있었다. 육상 게임에서
              개인 최고는 등수보다 중요한 순간인데 그게 안 보였다. */
        const prev = Save.data.best[this.def.id];
        this.isPB = !this.player.dq && v < DNF && (prev===undefined || v < prev);
        /* 사진 판정 — 1·2위가 0.05초 안이면. 육상에서 이게 제일 짜릿한 장면이다 */
        const times = this.all.filter(r=>r.finished).map(r=>r.finishTimeS).sort((a,b)=>a-b);
        this.isPhoto = times.length>=2 && (times[1]-times[0]) <= 0.05;
        if(this.isPB || this.isPhoto) this.fxAt = now;
        passed ? Sfx.finish() : Sfx.fail();
      } else if(this.elapsed > this.qualify + timeGrace(Math.max(8, this.qualify*0.5))){
        // 기준기록을 크게 넘기면 경기 종료 — 무한정 끌지 않는다
        this.phase='DONE'; this.doneAt=now;
        this.result = { status:'TIMEOUT', value:DNF, rank:3 };
        Sfx.fail();
      }
    }

    // 카메라 — 선수를 화면 1/3 지점에 둔다
    /* 카메라는 **선두**를 따라간다 — 여러 명일 때 내 선수만 보면 남이 화면 밖으로 나간다 */
    const lead = this.all.reduce((m,a)=>a.distM>m.distM?a:m, this.all[0]);
    const target = Math.max(0, lead.distM - VW*this.mPerPx*0.32);
    this.camM += (target - this.camM) * Math.min(1, dt*8);
    this.flash = Math.max(0, this.flash - dt*4);
    Sfx.crowd(clamp(this.player.speed/12, 0, 1) * (this.phase==='RUN'?1:0.3));
  }

  aiStep(now){
    for(const r of this.rivals){
      if(r.aiNext===0) r.aiNext = this.gunMs + 90 + Math.random()*140;
      while(now >= r.aiNext && !r.finished){
        r.stride(r.aiSide, Math.round(r.aiNext), 'off');
        r.aiSide = -r.aiSide;
        r.aiNext += r.targetIntervalMs() + (Math.random()*2-1)*r.aiJitter;
      }
      if(!r.leanDone && r.distM > RULES.leanWindowStartM + 2) r.lean();
    }
  }

  rankOf(who){
    const sorted = this.all.slice().sort((a,b)=>{
      if(a.finished && b.finished) return a.finishTimeS - b.finishTimeS;
      if(a.finished) return -1; if(b.finished) return 1;
      return b.distM - a.distM;
    });
    return sorted.indexOf(who)+1;
  }

  /* ── 그리기 ── */
  draw(ctx){
    Track.drawBack(ctx, this.camM, this.trackM);
    Track.drawLanes(ctx, this.camM, this.mPerPx);
    Track.drawMarks(ctx, this.camM, this.mPerPx);
    Track.drawFinish(ctx, this.camM, this.mPerPx, this.trackM);

    // 선수 — 레인 순서대로 (아래 레인이 앞)
    const laneColor = (typeof PARTY_COLOR!=='undefined') ? PARTY_COLOR : ['#5aaaff','#ffd75e','#ff6b8a'];
    for(let i=0;i<Track.LANE_Y.length;i++){
      const r = this.all.find(a=>a.lane===i); if(!r) continue;
      const y = Track.laneFoot(i);
      const x = Math.round((r.distM - this.camM)/this.mPerPx);
      if(x < -20 || x > VW+20) continue;
      if(this.phase==='SET' && !BG.obj(BG.ctx(),'starting-block-hd',x-6,y,Math.round(20*Track.laneScale(i))))
        Art.blit(ctx,'block-start',x-6,y);
      const leaning = r.leanDone && r.distM > this.leanStart;
      /* 발밑 흙먼지 — 속도가 붙을수록 자주. 발이 땅을 찬다는 느낌을 준다. */
      if(this.phase==='RUN' && r.speed>4){
        const per = Math.max(6, 22 - Math.round(r.speed*1.4));
        if((this.t|0) % per < 2)
          BG.fx(BG.ctx(), 'dust-puff', x-6, y+2, Math.round(11*Track.laneScale(i)),
                ((this.t/220)%1), 4);
      }
      /* 고해상도 캐릭터는 UI 캔버스에 그린다 — 나중에 drawUI 에서 처리 */
      if(CharHD.enabled){
        /* 사람 선수는 자기 종족으로 — 누가 나인지 알아야 한다.
           AI 는 남는 종족을 돌려 쓴다. */
        let sp = (r.pIndex!==undefined && typeof Party!=='undefined')
          ? Party.species(r.pIndex)
          : ['cheetah','elephant','kangaroo','ostrich'][i%4];
        /* 튜토리얼은 **전설 종족**으로 시작한다 — 게임이 뭘 주는지 먼저 보여 준다 */
        if(r===this.player && typeof Tutorial!=='undefined' && Tutorial.on && Tutorial.forceSpecies)
          sp = Tutorial.forceSpecies;
        (this._hd=this._hd||[]).push(
        { sp, x, y, ph:r.stridePhase,
          o:{ lean:leaning, crouch:this.phase==='SET',
              /* 원근 — 먼 레인 선수는 작게, 가까운 레인은 크게 */
              /* 잘 친 순간 살짝 튄다 — 발이 땅을 밀어낸 느낌.
                 ⚠ 6% 이상은 스프라이트가 출렁여 보인다(작게 유지). */
              scale: Track.laneScale(i) * (
                (r.hitJ==='PERFECT' && (this.t-(r.hitAt||-9999)) < 120)
                  ? 1 + 0.06*(1-(this.t-r.hitAt)/120) : 1),
              rare:(SPECIES[sp]&&SPECIES[sp].rare)||1, moving:this.phase==='RUN', t:this.t },
          speedFrac: clamp((r.speed||0)/11, 0, 1),
          hitAge: (r.hitAt!==undefined) ? (this.t - r.hitAt) : 9999, hitJ: r.hitJ,
          me: r===this.player,
          /* 연출 판단에 필요한 것들 — 그리는 쪽이 러너를 다시 안 찾아도 되게 */
          fatigue: r.fatigue||0, tier: r.tier||0,
          started: r.started, gunAge: this.t - this.gunMs });
        if(r===this.player) this._hdMeY = y;
        /* ⛔ 1인용에서 **셋 중 누가 나인지 표시가 없었다**(실측: 처음 플레이).
           2인용은 P1/P2 색 막대가 있는데 1인용만 없다 — 제일 자주 하는 판이 제일 불친절했다.
           머리 위에 작은 삼각 표시 하나. 2인 이상이면 이미 색으로 갈리니 안 그린다. */
        if(r===this.player && !(this.humans && this.humans.length>1))
          this._meMark = { x, y };   /* 그리기는 drawUI 에서 — 여기엔 UI 캔버스가 없다 */
        }
      else drawRunner(ctx, x, y, r.stridePhase, laneColor[i%laneColor.length],
        { lean:leaning, crouch:this.phase==='SET' });
    }

    // 총성 섬광
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.5})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(uctx){
    // 캐릭터를 먼저 (HUD 아래에)
    if(this._hd){
      /* 발밑 흙먼지 — 달리는 무게를 눈에 보이게 한다(빠를수록 자주) */
      for(const c of this._hd){
        if(c.speedFrac>0.35)
          BG.fx(uctx, 'dust-kick', c.x-6, c.y+2, 9, ((this.t*0.006)+c.x*0.01)%1, 4);
        /* 두드린 자리에서 퍼지는 고리 — 사람이 여럿이면 각자 자기 타이밍으로 튄다.
           ⚠ 기준(잘 친 타에만·수명 160ms)은 HUD.tap 과 같아야 한다. 여기는 여러 명을
              동시에 그려야 해서 고리만 따로 부른다 — 값이 갈라지지 않게 조심할 것. */
        if(c.hitAge < 160 && (c.hitJ==='PERFECT' || c.hitJ==='GOOD'))
          BG.fx(uctx, 'fx-tap-ring', c.x, c.y+2,
                c.hitJ==='PERFECT' ? 20 : 14, clamp(c.hitAge/160, 0, 0.999), 4);
        /* 출발 연기 — 총성 직후 스타팅블록에서. 0.5초만 산다 */
        if(c.started && c.gunAge>=0 && c.gunAge<500)
          BG.fx(uctx, 'fx-startsmoke', c.x, c.y+3, 14, clamp(c.gunAge/500,0,0.999), 4);
        /* 땀 — 지친 게 숫자가 아니라 눈에 보여야 한다 */
        if(c.fatigue>0.55)
          BG.fx(uctx, 'fx-sweat', c.x+4, c.y-14, 10,
                ((this.t*0.004)+c.x*0.02)%1, 3);
        /* 집중선 — 콤보 단이 높을 때 내 선수 뒤로. '지금 잘 하고 있다'를 몸으로 */
        if(c.me && c.tier>=3)
          BG.fx(uctx, 'fx-focus', c.x, c.y-2, 26, ((this.t*0.005)%1), 4);
      }
      for(const c of this._hd) CharHD.draw(uctx, c.sp, c.x, c.y, c.ph, c.o); this._hd=null;
    }
    /* 사진 판정 — 화면 전체를 덮는 한 장(480×270). 0.9초. */
    if(this.isPhoto && this.fxAt!==undefined){
      const age = this.t - this.fxAt;
      if(age < 900){
        const im = BG.get('fx-photofinish');
        if(im){ uctx.save(); uctx.globalAlpha = Math.min(1, (900-age)/400);
                uctx.drawImage(im, 0, 0, VW, VH); uctx.restore(); }
        txt(uctx, K('사진 판정'), VW/2, 30, 15, PAL.white, 'center', 700);
      }
    }
    /* 개인 최고 — 등수보다 중요한 순간이다 */
    if(this.isPB && this.fxAt!==undefined){
      const age = this.t - this.fxAt;
      if(age < 1400)
        BG.fx(uctx, 'fx-record', VW/2, VH-70, 54, clamp(age/1400, 0, 0.999), 4);
    }
    /* ⛔ 1인용에서 **셋 중 누가 나인지 표시가 없었다**(실측: 처음부터 플레이).
       2인용은 P1/P2 색 막대가 있는데 1인용만 없다 — 제일 자주 하는 판이 제일 불친절했다.
       머리 위 작은 삼각 하나. 2인 이상이면 이미 색으로 갈리니 안 그린다.
       ⚠ 러너를 그리는 자리엔 UI 캔버스(uctx)가 없다 — 좌표만 넘기고 여기서 그린다. */
    if(this._meMark && this.phase!=='DONE'){
      const m = this._meMark, bob = Math.sin(this.t*0.006)*1.5;
      const my = m.y - Math.round(CharHD.DRAW_H*0.95) + bob;
      uctx.fillStyle = PAL.gold;
      uctx.beginPath();
      uctx.moveTo(m.x, my+6); uctx.lineTo(m.x-4, my); uctx.lineTo(m.x+4, my);
      uctx.closePath(); uctx.fill();
    }
    HUD.race(uctx, {
      timeS: Math.max(0, this.elapsed),
      speed: this.player.speed,
      distM: this.player.distM,
      trackM: this.trackM,
      qualify: this.qualify,
      best: Save.data.best[this.def.id],
      /* 들어온 뒤에는 **자기 기록**으로 판정한다 — 경기 시계는 남은 사람을 기다리며 계속 간다 */
      myTimeS: this.player.finished ? this.player.finishTimeS : undefined,
      /* 2인 이상이면 위 띠에 **사람별 진행**을 얹는다 — 속도·거리 한 벌로는
         누가 앞선지 알 수 없다(트랙만 보면 카메라가 선두를 따라가서 더 헷갈린다). */
      party: (this.humans && this.humans.length>1)
        ? this.humans.map((r,i)=>({ i, distM:r.distM,
            timeS: r.finishTimeS, done: !!r.finished })) : null,
    });

    if(this.phase==='SET'){
      /* ⛔ 총성까지 **얼마나 기다리는지 아무 신호가 없었다.** 부정 출발 위험만 있고
         준비할 방법이 없다(실측: 처음부터 플레이).
         ⚠ 총성 시각은 1400~3000ms **일부러 무작위**다 — 미리 못 누르게 하려고.
            그래서 남은 시간을 보여 주면 안 된다. 대신 이미 나고 있는 **신호음 3번**을
            눈으로도 보여 준다 — 구조(셋 다음에 총성)를 알려 주되 순간은 안 알려 준다. */
      plate(uctx, VW/2-70, VH/2-28, 140, 48, 0.7);
      txt(uctx, '제자리에', VW/2, VH/2-22, 15, PAL.gold, 'center', 700);
      txt(uctx, '총성을 기다리세요', VW/2, VH/2-4, 10, PAL.dim, 'center');
      for(let k=0;k<3;k++){
        const lit = k < (this.setBeeps|0);
        uctx.fillStyle = lit ? PAL.gold : 'rgba(242,245,250,.20)';
        uctx.fillRect(VW/2-14+k*11, VH/2+11, 7, 4);
      }
    } else if(this.phase==='RUN'){
      const now=this.t;
      const target=this.player.targetIntervalMs();
      const since=now-this.player.lastInputMs;
      const err = this.player.lastInputMs<-1e8 ? 0 : clamp((since-target)/target, -1, 1);
      /* ⛔ 사람이 둘 이상이면 게이지도 사람 수만큼 — 한 벌만 그리면 P2 는
         자기 박자가 맞는지 볼 방법이 없다(리듬 게임에서 그건 조작이 없는 것과 같다). */
      if(this.humans && this.humans.length > 1){
        HUD.rhythm2(uctx, this.humans.map(r=>{
          const tgt=r.targetIntervalMs(), sinceR=now-r.lastInputMs;
          return { nextSide: -r.lastSide||1,
                   phaseErr: r.lastInputMs<-1e8 ? 0 : clamp((sinceR-tgt)/tgt, -1, 1),
                   form: r.form, done: !!r.finished,
                   timeText: r.finishTimeS ? fmtTime(r.finishTimeS) : '' };
        }));
      } else
      HUD.rhythm(uctx, { strides:(this.player&&this.player.combo)||0, nextSide: -this.player.lastSide||1, phaseErr: err, form:this.player.form });
      /* 판정 수명 = 목표 간격의 0.8 배. 다음 타가 오기 전에 사라진다. */
      /* 판정 수명 = 목표 간격의 0.8 배. 다음 타가 오기 전에 사라진다.
         자리는 **내 선수 바로 위** — 시선이 튀지 않아야 한 타 한 타가 붙는다. */
      /* 판정은 **각자 자기 선수 위**에 뜬다 — 2인이면 두 개가 각 레인 위로 간다.
         ⚠ 한 자리에 겹쳐 띄우면 누구 판정인지 알 수 없다(실측 전엔 P1 것만 떴다). */
      if(this.humans && this.humans.length > 1){
        for(const r of this.humans){
          if(r.finished) continue;
          const ly = Track.laneFoot(r.lane) - 26;
          HUD.judge(uctx, r.lastJudge, now - r.lastJudgeMs,
                    Math.min(620, r.targetIntervalMs()*0.8), ly);
        }
      } else {
        const myY = (this._hdMeY!==undefined) ? this._hdMeY - 26 : 38;
        HUD.judge(uctx, this.player.lastJudge, now - this.player.lastJudgeMs,
                  Math.min(620, this.player.targetIntervalMs()*0.8), myY);
      }
      /* 콤보 단계 — 지금 몇 단인지, 방금 올랐는지 */
      const P=this.player;
      if(P.tier>0){
        const age = this.t - (this.tierMsgAt||-999);
        const fresh = age < 60;
        const sz = fresh ? 16 : 12;
        /* 단이 오른 순간 — 글자가 커지는 것만으로는 잘 안 보인다(빠른 판이라 60프레임).
           ⚠ 어셋이 없으면 예전처럼 글자만 커진다. */
        if(age < 45)
          BG.fx(uctx, 'fx-tierup', VW-28, 50, 30, clamp(age/45, 0, 0.999), 4);
        txt(uctx, 'TIER '+P.tier, VW-10, 44, sz,
            fresh ? PAL.gold : 'rgba(255,215,94,.55)', 'right', 700);
        txt(uctx, P.combo+' 연속', VW-10, 44+sz+2, 8, PAL.dim, 'right');
      }
      // 린 안내
      if(this.player.distM >= this.leanStart && !this.player.leanDone){
        txt(uctx, '지금 액션! (LEAN)', VW/2, 56, 13, PAL.green, 'center', 700);
      }
    }
  }
}
