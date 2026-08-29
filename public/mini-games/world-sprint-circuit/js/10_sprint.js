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
      const skill = 0.62 + (i-humans)*0.16 + Math.random()*0.1;
      const r = new Runner(i, { speed:45+skill*45, acceleration:45+skill*40,
        stamina:50, technique:50, rhythm:50 }, false, this.trackM);
      r.reset(this.gunMs); r.name = AI_NAMES[(Math.random()*AI_NAMES.length)|0];
      r.aiJitter = (1-skill)*90; r.aiNext = 0; r.aiSide = 1;
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
    if(j) Sfx.step(j);
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
        passed ? Sfx.finish() : Sfx.fail();
      } else if(this.elapsed > this.qualify + Math.max(8, this.qualify*0.5)){
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
        const sp = (r.pIndex!==undefined && typeof Party!=='undefined')
          ? Party.species(r.pIndex)
          : ['cheetah','elephant','kangaroo','ostrich'][i%4];
        (this._hd=this._hd||[]).push(
        { sp, x, y, ph:r.stridePhase,
          o:{ lean:leaning, crouch:this.phase==='SET',
              /* 원근 — 먼 레인 선수는 작게, 가까운 레인은 크게 */
              scale: Track.laneScale(i),
              rare:(SPECIES[sp]&&SPECIES[sp].rare)||1, moving:this.phase==='RUN', t:this.t },
          speedFrac: clamp((r.speed||0)/11, 0, 1) }); }
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
      }
      for(const c of this._hd) CharHD.draw(uctx, c.sp, c.x, c.y, c.ph, c.o); this._hd=null;
    }
    HUD.race(uctx, {
      timeS: Math.max(0, this.elapsed),
      speed: this.player.speed,
      distM: this.player.distM,
      trackM: this.trackM,
      qualify: this.qualify,
      best: Save.data.best[this.def.id],
    });

    if(this.phase==='SET'){
      const left = Math.max(0, this.gunMs - this.t);
      plate(uctx, VW/2-70, VH/2-24, 140, 40, 0.7);
      txt(uctx, '제자리에', VW/2, VH/2-18, 15, PAL.gold, 'center', 700);
      txt(uctx, '총성을 기다리세요', VW/2, VH/2, 10, PAL.dim, 'center');
    } else if(this.phase==='RUN'){
      const now=this.t;
      const target=this.player.targetIntervalMs();
      const since=now-this.player.lastInputMs;
      const err = this.player.lastInputMs<-1e8 ? 0 : clamp((since-target)/target, -1, 1);
      HUD.rhythm(uctx, { nextSide: -this.player.lastSide||1, phaseErr: err, form:this.player.form });
      HUD.judge(uctx, this.player.lastJudge, now - this.player.lastJudgeMs);
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
