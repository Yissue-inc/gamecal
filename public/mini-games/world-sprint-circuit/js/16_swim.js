/* ══════════════════════════════════════════════════════════════════
   수영 100m — 아케이드
   ⚠ 달리기와 같은 교대 리듬이지만 물은 다르다:
       · 물잡기(catch)가 어긋나면 그대로 멈춘다 — 기술 비중이 크다
       · 50m 마다 **턴**이 있다. 벽에 닿기 직전 액션을 눌러야 차고 나간다
       · 숨쉬기 — 너무 오래 참으면 속도가 떨어진다 (접영·평영에서 크다)
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const SWIM = {
  poolM: 50,                     // 한 레인 길이 (100m = 2바퀴)
  turnWindowM: 1.6,              // 벽 앞 이 거리 안에서 눌러야 턴
  breathEvery: 2600,             // 이 간격마다 숨을 쉬어야 한다(ms)
  stroke: {
    free  :{ name:'자유형', speed:1.00, tech:1.00, breath:0.55, color:'#5aaaff' },
    back  :{ name:'배영',   speed:0.90, tech:1.10, breath:0.15, color:'#7fc0ff' },
    breast:{ name:'평영',   speed:0.82, tech:1.30, breath:0.85, color:'#5cff9c' },
    fly   :{ name:'접영',   speed:0.94, tech:1.25, breath:1.00, color:'#b06bff' },
  },
};

class SwimEvent {
  constructor(def){
    this.def=def;
    this.strokeKey = def.stroke || 'free';
    this.S = SWIM.stroke[this.strokeKey];
    this.trackM = def.distanceM || 100;
    this.reset();
  }
  reset(){
    this.phase='SET'; this.t=0;
    this.gunMs = 1400 + Math.random()*1600;
    this.setBeeps=0;
    this.dist=0; this.speed=0;
    this.lap=0;                      // 0 → 1 (턴 한 번)
    this.lastStroke=-1e9; this.side=0;
    this.judge={PERFECT:0,GOOD:0,EARLY:0,LATE:0,REPEAT:0,SPAM:0};
    this.lastJudge=''; this.lastJudgeMs=-1e9;
    this.form=1.0; this.fatigue=0;
    this.breath=1;                   // 1=충분, 0=숨참
    this.lastBreath=0;
    this.turns=[];                   // 턴 품질
    this.turnDone=0;
    this.doneAt=0; this.result=null;
    this.flash=0; this.msg=''; this.msgAt=-1e9;
    /* 상대 2명 */
    this.rivals=[];
    for(let i=0;i<2;i++){
      const sk=0.66+i*0.13+Math.random()*0.08;
      this.rivals.push({ lane:i===0?0:2, dist:0, target:(this.trackM)/(this.def.qualify*(1.02-sk*0.16)) });
    }
    this.camNone=true;
  }
  get qualify(){ return this.def.qualify; }
  get elapsed(){ return (this.t-this.gunMs)/1000; }
  get targetIv(){ return 1000/(3.1*this.S.speed); }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }

  onStride(side, tMs){
    if(this.phase==='DONE') return;
    if(this.phase!=='RUN'){
      if(tMs<this.gunMs && tMs>this.gunMs-1200){
        this.phase='DONE'; this.doneAt=this.t;
        this.result={status:'FALSE_START', value:99.99, rank:3}; Sfx.fail();
      }
      return;
    }
    const dt=tMs-this.lastStroke;
    let j='GOOD';
    if(dt < 70){ j='SPAM'; this.fatigue=Math.min(1,this.fatigue+0.02); }
    else if(this.side===side){ j='REPEAT'; this.form=Math.max(0.6,this.form-0.07); }
    else if(this.lastStroke<-1e8){ j='GOOD'; }
    else {
      const err=Math.abs(dt-this.targetIv)/this.targetIv;
      /* 물에서는 창이 좁다 — 기술이 곧 물잡기다 */
      if(err<=0.10){ j='PERFECT'; this.form=Math.min(1.12,this.form+0.028); }
      else if(err<=0.22){ j='GOOD'; this.form=Math.min(1.12,this.form+0.01); }
      else if(dt<this.targetIv){ j='EARLY'; this.form=Math.max(0.62,this.form-0.035); }
      else { j='LATE'; this.form=Math.max(0.62,this.form-0.035); }
    }
    this.judge[j]++; this.lastJudge=j; this.lastJudgeMs=tMs;
    this.side=side; this.lastStroke=tMs;
    Sfx.step(j);
    /* 추진 */
    const mult={PERFECT:1.0,GOOD:0.80,EARLY:0.62,LATE:0.62,REPEAT:0.40,SPAM:0.18}[j];
    /* ⚠ 2.35 로는 완벽하게 저어도 100m 62초였다(세계기록 46.4초).
       아케이드는 감독 모드와 별도 물리라 따로 맞춰야 한다. */
    const base = 2.72 * this.S.speed;
    const target = base * this.form * (1-this.fatigue*0.3) * (0.6+this.breath*0.4) * mult;
    this.speed = clamp(lerp(this.speed, target, 0.55), 0, 3.2);
  }
  /* 액션 = 턴 (벽 앞) 또는 숨쉬기 */
  onAction(tMs){
    if(this.phase!=='RUN') return;
    const wall = SWIM.poolM*(this.lap+1);
    const left = wall - this.dist;
    if(this.lap < Math.floor(this.trackM/SWIM.poolM)-1 && left <= SWIM.turnWindowM+1.2 && left > -0.6){
      /* 턴 — 벽에 가까울수록 좋다 */
      const q = clamp(1 - Math.abs(left-0.5)/SWIM.turnWindowM, 0.1, 1);
      this.turns.push(q);
      this.lap++;
      this.speed = lerp(this.speed*0.72, this.speed*1.55, q);
      this.say(q>0.75?`완벽한 턴! ${Math.round(q*100)}%`:`턴 ${Math.round(q*100)}%`, q<0.45);
      Sfx.beep(q>0.75?1320:700, 0.12,'square',0.14);
      return;
    }
    /* 숨쉬기 */
    this.breath=1; this.lastBreath=tMs;
    this.speed *= (1 - 0.04*this.S.breath);     // 숨쉬면 살짝 느려진다
    Sfx.beep(420,0.06,'sine',0.08);
  }
  update(dt){
    this.t += dt*1000;
    const now=this.t;
    if(this.phase==='SET'){
      const want=Math.min(3, Math.floor((this.gunMs-now>0? 3-(this.gunMs-now)/450 : 3)));
      if(want>this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(now>=this.gunMs){ this.phase='RUN'; Sfx.gun(); this.flash=1;
        this.speed=1.9*this.S.speed; this.lastBreath=now; }   // 다이빙 입수
    }
    if(this.phase==='RUN'){
      /* 숨 — 시간이 지나면 줄어든다 */
      const since=now-this.lastBreath;
      this.breath = clamp(1 - (since/SWIM.breathEvery)*this.S.breath, 0, 1);
      this.speed = Math.max(0, this.speed - dt*0.55);     // 물 저항
      this.fatigue = Math.min(1, this.fatigue + dt*0.0075);
      this.dist += this.speed*dt;
      /* 턴을 놓치면 벽에 부딪힌다 */
      const wall=SWIM.poolM*(this.lap+1);
      if(this.lap < Math.floor(this.trackM/SWIM.poolM)-1 && this.dist > wall+0.8){
        this.lap++; this.turns.push(0.05);
        this.speed*=0.35; this.say('턴을 놓쳤다', true); Sfx.beep(180,0.2,'sawtooth',0.14);
      }
      if(this.dist>=this.trackM){
        this.dist=this.trackM;
        const total=(now-this.gunMs)/1000;
        this.phase='DONE'; this.doneAt=now;
        const pass=total<=this.qualify;
        this.result={status:pass?'OK':'MISSED_QUALIFY', value:total, rank:this.rankOf()};
        pass?Sfx.finish():Sfx.fail();
      }
      for(const rv of this.rivals) rv.dist += rv.target*dt;
      if(this.elapsed > this.qualify+12){
        this.phase='DONE'; this.doneAt=now;
        this.result={status:'TIMEOUT', value:99.99, rank:3}; Sfx.fail();
      }
    }
    this.flash=Math.max(0,this.flash-dt*4);
    Sfx.crowd(clamp(this.speed/2.6,0,1)*(this.phase==='RUN'?0.9:0.3));
  }
  rankOf(){ let r=1; for(const rv of this.rivals) if(rv.dist>this.dist) r++; return r; }

  /* ── 그리기 — 수영장 ── */
  draw(ctx){
    /* 관중·벽 */
    Track.drawBack(ctx, 40, 100);
    const LY=[118,158,198], LH=38;
    /* 물 */
    ctx.fillStyle='#0e3a5a'; ctx.fillRect(0, LY[0]-8, VW, VH-LY[0]+8);
    for(let i=0;i<3;i++){
      const y=LY[i];
      ctx.fillStyle = i===1? '#12507a' : '#104466';
      ctx.fillRect(0, y, VW, LH-6);
      /* 레인 로프 */
      ctx.fillStyle='#e8dcc0';
      const off=Math.round(-this.t*0.02)%14;
      for(let x=off-14;x<VW;x+=14){ ctx.fillRect(x, y-2, 7, 2); }
      ctx.fillStyle='rgba(255,255,255,.10)'; ctx.fillRect(0, y+LH-8, VW, 1);
    }
    /* 바닥 표시선 */
    ctx.fillStyle='rgba(255,255,255,.08)';
    for(let i=0;i<3;i++) ctx.fillRect(0, LY[i]+LH/2-4, VW, 2);

    /* 코스 — 100m 를 화면 폭에 접어 보여준다(왕복) */
    const seg = VW-64;
    const posOf=(d)=>{
      const lapN=Math.min(1, Math.floor(d/SWIM.poolM));
      const within=(d - lapN*SWIM.poolM)/SWIM.poolM;
      return lapN===0 ? 32+within*seg : 32+(1-within)*seg;
    };
    /* 벽 */
    ctx.fillStyle='#c9cede'; ctx.fillRect(24, LY[0]-8, 6, VH-LY[0]+8);
    ctx.fillRect(VW-30, LY[0]-8, 6, VH-LY[0]+8);

    /* 상대 */
    this.rivals.forEach((rv,i)=>{
      const y=LY[rv.lane]+LH/2-4, x=posOf(Math.min(rv.dist,this.trackM));
      this.blob(ctx, x, y, '#7a9ab0', (this.t*0.006+i)%1);
    });
    /* 나 */
    const my=LY[1]+LH/2-4, mx=posOf(this.dist);
    this.blob(ctx, mx, my, this.S.color, (this.t*0.008)%1, true);

    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.5})`; ctx.fillRect(0,0,VW,VH); }
  }
  /* 물 위의 선수 — 물보라와 함께 */
  blob(ctx, x, y, color, ph, mine){
    const bob=Math.sin(ph*Math.PI*2)*2;
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.ellipse(x, y+bob, 9, 4.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(x+ (ph<0.5?6:-6), y+bob-2, 2.2, 0, Math.PI*2); ctx.fill();
    /* 물보라 */
    ctx.fillStyle='rgba(255,255,255,.35)';
    for(let i=0;i<3;i++){
      const p=(ph+i/3)%1;
      ctx.fillRect(x-10-p*8, y+bob-3+Math.sin(p*6)*3, 2, 2);
    }
    if(mine){ ctx.fillStyle=PAL.gold; ctx.fillRect(x-4, y+bob-14, 8, 2); ctx.fillRect(x-1, y+bob-12, 2, 3); }
  }
  drawUI(u){
    HUD.race(u, { timeS:Math.max(0,this.elapsed), speed:this.speed, distM:this.dist,
      trackM:this.trackM, qualify:this.qualify, best:Save.data.best[this.def.id] });
    txt(u, this.S.name, VW/2, 4, 12, this.S.color, 'center', 700);

    if(this.phase==='SET'){
      plate(u,VW/2-76,VH/2-24,152,42,.72);
      txt(u,'제자리에',VW/2,VH/2-18,15,PAL.gold,'center',700);
      txt(u,'총성을 기다리세요',VW/2,VH/2,10,PAL.dim,'center');
      return;
    }
    if(this.phase==='RUN'){
      const now=this.t;
      const err = this.lastStroke<-1e8?0:clamp(((now-this.lastStroke)-this.targetIv)/this.targetIv,-1,1);
      HUD.rhythm(u,{nextSide:-this.side||1, phaseErr:err, form:this.form});
      HUD.judge(u, this.lastJudge, now-this.lastJudgeMs);
      /* 숨 게이지 */
      txt(u,'숨',8,Track.GAUGE_Y-24,8,PAL.dim);
      const bw=64;
      u.fillStyle='rgba(242,245,250,.14)'; u.fillRect(24,Track.GAUGE_Y-22,bw,6);
      u.fillStyle = this.breath>0.55?PAL.blue : this.breath>0.25?PAL.gold:PAL.red;
      u.fillRect(24,Track.GAUGE_Y-22,Math.round(bw*this.breath),6);
      if(this.breath<0.3) txt(u,'액션으로 숨쉬기', 94, Track.GAUGE_Y-24, 9, PAL.red);
      /* 턴 안내 */
      const laps=Math.floor(this.trackM/SWIM.poolM);
      if(this.lap < laps-1){
        const wall=SWIM.poolM*(this.lap+1), left=wall-this.dist;
        if(left < 6){
          const near = left<=SWIM.turnWindowM+1.2 && left>-0.6;
          txt(u, near?'지금 턴!':`턴까지 ${left.toFixed(1)}m`, VW/2, 56,
              near?16:12, near?PAL.green:PAL.gold,'center',700);
        }
      }
      if(this.turns.length)
        txt(u, '턴 '+this.turns.map(q=>Math.round(q*100)+'%').join(' · '), VW-8, 40, 9, PAL.dim, 'right');
    }
    if(this.msg && this.t-this.msgAt<900){
      const a=1-(this.t-this.msgAt)/900; u.save(); u.globalAlpha=a;
      txt(u,this.msg,VW/2,76,13,this.msgBad?PAL.red:PAL.green,'center',700); u.restore();
    }
  }
}
