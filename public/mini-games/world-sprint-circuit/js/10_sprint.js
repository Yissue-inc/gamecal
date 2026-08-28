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
    this.player = new Runner(1, {}, true, this.trackM);
    this.player.reset(this.gunMs);
    this.rivals = [];
    for(let i=0;i<2;i++){
      const skill = 0.62 + i*0.16 + Math.random()*0.1;
      const r = new Runner(i===0?0:2, { speed:45+skill*45, acceleration:45+skill*40,
        stamina:50, technique:50, rhythm:50 }, false, this.trackM);
      r.reset(this.gunMs); r.name = AI_NAMES[(Math.random()*AI_NAMES.length)|0];
      r.aiJitter = (1-skill)*90; r.aiNext = 0; r.aiSide = 1;
      this.rivals.push(r);
    }
    this.all = [this.player, ...this.rivals];
    this.doneAt = 0;
    this.result = null;
    this.camM = 0;
    this.flash = 0;
  }

  get qualify(){ return this.def.qualify; }
  /* 린(피니시 젖히기) 구간은 거리에 비례한다 */
  get leanStart(){ return this.trackM * (RULES.leanWindowStartM/100); }
  get leanEnd(){   return this.trackM * (RULES.leanWindowEndM/100); }
  /* 지금 시각 기준 경과(초). 총성 전엔 음수 */
  get elapsed(){ return (this.t - this.gunMs)/1000; }

  /* ── 입력 ── */
  onStride(side, tMs){
    if(this.phase==='DONE') return;
    if(this.phase!=='RUN'){
      // 총성 전 입력 = 부정출발
      if(tMs < this.gunMs && tMs > this.gunMs - 1200){
        this.player.falseStart = true;
        this.phase='DONE'; this.doneAt=this.t;
        this.result = { status:'FALSE_START', value:99.99, rank:3 };
        Sfx.fail();
      }
      return;
    }
    const j = this.player.stride(side, tMs, 'off');
    if(j) Sfx.step(j);
  }
  onAction(tMs){
    if(this.phase!=='RUN') return;
    const j = this.player.lean();
    if(j==='LEAN'){ Sfx.beep(1568,0.14,'square',0.16); this.player.lastJudge='LEAN'; this.player.lastJudgeMs=tMs; }
    else if(j==='LEAN_EARLY'){ Sfx.beep(160,0.16,'sawtooth',0.14); this.player.lastJudge='LEAN_EARLY'; this.player.lastJudgeMs=tMs; }
  }

  /* ── 진행 ── */
  update(dt){
    this.t += dt*1000;
    const now = this.t;

    if(this.phase==='SET'){
      // "제자리에" 신호음 3번
      const want = Math.min(3, Math.floor((this.gunMs - now > 0 ? 3 - (this.gunMs-now)/450 : 3)));
      if(want > this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(now >= this.gunMs){ this.phase='RUN'; Sfx.gun(); this.flash=1; }
    }

    if(this.phase==='RUN'){
      this.aiStep(now);
      for(const r of this.all) r.simulate(dt, now);
      if(this.player.finished){
        this.phase='DONE'; this.doneAt=now;
        const v = this.player.finishTimeS;
        const passed = v <= this.qualify;
        this.result = { status: passed?'OK':'MISSED_QUALIFY', value:v, rank:this.rankOf(this.player) };
        passed ? Sfx.finish() : Sfx.fail();
      } else if(this.elapsed > this.qualify + Math.max(8, this.qualify*0.5)){
        // 기준기록을 크게 넘기면 경기 종료 — 무한정 끌지 않는다
        this.phase='DONE'; this.doneAt=now;
        this.result = { status:'TIMEOUT', value:99.99, rank:3 };
        Sfx.fail();
      }
    }

    // 카메라 — 선수를 화면 1/3 지점에 둔다
    const target = Math.max(0, this.player.distM - VW*this.mPerPx*0.32);
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
    const laneColor = ['#5aaaff', '#ffd75e', '#ff6b8a'];
    for(let i=0;i<3;i++){
      const r = this.all.find(a=>a.lane===i); if(!r) continue;
      const y = Track.LANE_Y[i] + Track.LANE_H - 10;
      const x = Math.round((r.distM - this.camM)/this.mPerPx);
      if(x < -20 || x > VW+20) continue;
      if(this.phase==='SET') Art.blit(ctx,'block-start',x-6,y);
      const leaning = r.leanDone && r.distM > this.leanStart;
      /* 고해상도 캐릭터는 UI 캔버스에 그린다 — 나중에 drawUI 에서 처리 */
      if(CharHD.enabled){
        const sp=['cheetah','elephant','kangaroo'][i];
        (this._hd=this._hd||[]).push(
        { sp, x, y, ph:r.stridePhase,
          o:{ lean:leaning, crouch:this.phase==='SET',
              rare:(SPECIES[sp]&&SPECIES[sp].rare)||1, moving:this.phase==='RUN', t:this.t } }); }
      else drawRunner(ctx, x, y, r.stridePhase, laneColor[i],
        { lean:leaning, crouch:this.phase==='SET' });
    }

    // 총성 섬광
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.5})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(uctx){
    // 캐릭터를 먼저 (HUD 아래에)
    if(this._hd){ for(const c of this._hd) CharHD.draw(uctx, c.sp, c.x, c.y, c.ph, c.o); this._hd=null; }
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
      // 린 안내
      if(this.player.distM >= this.leanStart && !this.player.leanDone){
        txt(uctx, '지금 액션! (LEAN)', VW/2, 56, 13, PAL.green, 'center', 700);
      }
    }
  }
}
