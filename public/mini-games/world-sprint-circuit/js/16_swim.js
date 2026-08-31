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
  mashKick: 0.42,                // 연타 한 번이 남은 여유의 몇 할을 채우나
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
  /* 1번 선수의 상태를 this 위로 끌어올린다. 옛 코드가 this.dist 를 그대로 쓴다. */
  static proxy(ev){
    const KEYS=['dist','speed','lap','lastStroke','side','judge','lastJudge','lastJudgeMs',
                'form','fatigue','breath','lastBreath','turns','turnDone','finished','finishTimeS','dq'];
    for(const k of KEYS){
      if(Object.getOwnPropertyDescriptor(ev, k)) continue;
      Object.defineProperty(ev, k, {
        configurable:true,
        get(){ return this.swimmers[0][k]; },
        set(v){ this.swimmers[0][k]=v; },
      });
    }
  }

  constructor(def){
    this.def=def;
    this.strokeKey = def.stroke || 'free';
    /* ⚠ 예전엔 this.S 를 생성자에서 고정했다. 개인혼영은 **한 경기 안에서 영법이 세 번
       바뀌므로** 고정할 수가 없다 — 선수의 현재 바퀴로 계산하는 게터로 바꾼다.
       기존 7곳은 그대로 두고, 선수별로 달라야 하는 자리만 strokeFor(선수) 로 넘긴다. */
    this.medley = !!def.medley;
    this.trackM = def.distanceM || 100;
    this.reset();
  }
  reset(){
    this.phase='SET'; this.t=0;
    this.gunMs = 1400 + Math.random()*1600;
    this.setBeeps=0;
    /* ── 선수 상태를 사람 수만큼 ─────────────────────────
       ⚠ 예전엔 dist·speed·form 같은 걸 this 에 직접 달아서 한 명만 헤엄칠 수 있었다.
          객체로 묶고, this.<이름> 은 1번 선수를 가리키는 프록시로 남긴다 —
          기존 그리기·판정 코드(88곳)를 한 줄도 안 고쳐도 그대로 돈다. */
    const versus = (typeof Party!=='undefined') && Party.on && Party.modeFor(this.def)==='versus';
    const humans = versus ? Party.count : 1;
    const mk=(lane)=>({ lane, dist:0, speed:0, lap:0, lastStroke:-1e9, side:0,
      judge:{PERFECT:0,GOOD:0,EARLY:0,LATE:0,REPEAT:0,SPAM:0},
      lastJudge:'', lastJudgeMs:-1e9, form:1.0, fatigue:0, breath:1, lastBreath:0,
      turns:[], turnDone:0, finished:false, finishTimeS:null, dq:false });
    this.swimmers=[]; for(let p=0;p<humans;p++) this.swimmers.push(mk(p));
    SwimEvent.proxy(this);           // this.dist → swimmers[0].dist
    this.doneAt=0; this.result=null;
    this.flash=0; this.msg=''; this.msgAt=-1e9;
    /* 상대 2명 */
    const lanes = Math.max(3, humans);
    if(typeof Track!=='undefined' && Track.setLanes) Track.setLanes(lanes);
    this.rivals=[];
    for(let i=humans;i<lanes;i++){
      const sk=AI.skill(0.66+(i-humans)*0.13+Math.random()*0.08);
      /* ⚠ 상대 속도를 qualify 로 계산하면 기준을 조일 때 상대까지 빨라진다.
         상대는 '사람이 낼 만한 기록' 을 기준으로 잡는다 — 기준선과 분리한다. */
      const parS = this.def.parS || this.def.qualify;
      this.rivals.push({ lane:i, dist:0, target:(this.trackM)/(parS*(1.02-sk*0.16)) });
    }
    this.camNone=true;
  }
  get people(){ return this.swimmers; }
  /* 개인혼영 순서 — 접영 → 배영 → 평영 → 자유형 (실제 순서) */
  strokeFor(sw){
    if(!this.medley) return SWIM.stroke[this.strokeKey];
    const lap = Math.min(3, Math.floor((sw ? sw.dist : 0) / SWIM.poolM));
    return SWIM.stroke[['fly','back','breast','free'][lap]];
  }
  get S(){ return this.strokeFor(this.swimmers && this.swimmers[0]); }
  get qualify(){ return this.def.qualify; }
  get elapsed(){ return (this.t-this.gunMs)/1000; }
  get targetIv(){ return 1000/(3.1*this.S.speed); }
  targetIvOf(sw){ return 1000/(3.1*this.strokeFor(sw).speed); }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }

  onStride(side, tMs, pIdx){
    const S = this.swimmers[pIdx||0] || this.swimmers[0];
    if(this.phase==='DONE') return;
    if(this.phase!=='RUN'){
      /* ⚠ 부정출발은 누른 사람만 — 여럿일 때 남의 실수로 내가 죽으면 안 된다 */
      if(tMs<this.gunMs && tMs>this.gunMs-1200){
        S.dq = true; Sfx.fail();
        if(this.swimmers.length<2){
          this.phase='DONE'; this.doneAt=this.t;
          this.result={status:'FALSE_START', value:DNF, rank:3};
        }
      }
      return;
    }
    if(S.dq || S.finished) return;
    const dt=tMs-S.lastStroke;
    let j='GOOD';
    /* ⛔ 연타 모드 — 물에서도 **빨리 저을수록 빠르다.** 박자로 벌하지 않는다.
       실측(고치기 전): 초당 5타 이상이면 **완주 자체가 불가능**했다(3타에서만 됐다).
       단거리에서 "연타하라" 고 가르쳐 놓고 수영은 연타하면 못 끝내는 게임이었다.
       규칙은 하나만 남는다: 좌·우 교대. 제한은 **숨**이 맡는다 —
       빨리 저을수록 숨이 빨리 차고(아래 fatigue), 숨을 안 쉬면 속도가 60% 로 깎인다. */
    if(RULES.mashMode){
      if(S.side===side){ j='REPEAT'; S.form=Math.max(0.6,S.form-0.035); }
      else { j='PERFECT'; S.form=Math.min(1.12,S.form+0.02);
             S.fatigue=Math.min(1, S.fatigue+0.0016); }   // 한 번 저을 때마다 조금씩 찬다
    }
    else if(dt < 70){ j='SPAM'; S.fatigue=Math.min(1,S.fatigue+0.02); }
    else if(S.side===side){ j='REPEAT'; S.form=Math.max(0.6,S.form-0.07); }
    else if(S.lastStroke<-1e8){ j='GOOD'; }
    else {
      /* 개인혼영에서는 사람마다 지금 영법이 다를 수 있다 — 자기 영법으로 판정한다 */
      const iv=this.targetIvOf(S);
      const err=Math.abs(dt-iv)/iv;
      /* 물에서는 창이 좁다 — 기술이 곧 물잡기다 */
      if(err<=0.10){ j='PERFECT'; S.form=Math.min(1.12,S.form+0.028); }
      else if(err<=0.22){ j='GOOD'; S.form=Math.min(1.12,S.form+0.01); }
      else if(dt<iv){ j='EARLY'; S.form=Math.max(0.62,S.form-0.035); }
      else { j='LATE'; S.form=Math.max(0.62,S.form-0.035); }
    }
    S.judge[j]++; S.lastJudge=j; S.lastJudgeMs=tMs;
    S.side=side; S.prevStroke=S.lastStroke; S.lastStroke=tMs;
    /* 콤보 단계는 없지만 연속 PERFECT 를 세면 같은 '쌓이는 소리'를 줄 수 있다 */
    S.streak = (j==='PERFECT'||j==='GOOD') ? Math.min(60,(S.streak||0)+1) : 0;
    Sfx.step(j, [0,6,10,20,40,60].filter(n=>S.streak>=n).length-1);
    /* 추진 */
    const mult={PERFECT:1.0,GOOD:0.80,EARLY:0.62,LATE:0.62,REPEAT:0.40,SPAM:0.18}[j];
    /* ⚠ 2.35 로는 완벽하게 저어도 100m 62초였다(세계기록 46.4초).
       아케이드는 감독 모드와 별도 물리라 따로 맞춰야 한다. */
    const base = 2.72 * this.strokeFor(S).speed;
    const target = base * S.form * (1-S.fatigue*0.3) * (0.6+S.breath*0.4) * mult;
    if(RULES.mashMode){
      /* 남은 여유에 비례해 더한다 — 빨리 저을수록 평형 속도가 올라간다.
         물 저항(update 의 -dt*0.55)이 감속을 맡으므로 안 저으면 곧 느려진다. */
      const room = Math.max(0, 1 - S.speed/Math.max(target, 0.1));
      S.speed = clamp(S.speed + target*SWIM.mashKick*room, 0, 3.2);
    } else {
      S.speed = clamp(lerp(S.speed, target, 0.55), 0, 3.2);
    }
  }
  /* 액션 = 턴 (벽 앞) 또는 숨쉬기 */
  onAction(tMs, pIdx){
    const S = this.swimmers[pIdx||0] || this.swimmers[0];
    if(this.phase!=='RUN' || S.dq || S.finished) return;
    const wall = SWIM.poolM*(S.lap+1);
    const left = wall - S.dist;
    if(S.lap < Math.floor(this.trackM/SWIM.poolM)-1 && left <= SWIM.turnWindowM+1.2 && left > -0.6){
      /* 턴 — 벽에 가까울수록 좋다 */
      const q = clamp(1 - Math.abs(left-0.5)/SWIM.turnWindowM, 0.1, 1);
      S.turns.push(q);
      S.lap++;
      S.speed = lerp(S.speed*0.72, S.speed*1.55, q);
      this.say(q>0.75?`완벽한 턴! ${Math.round(q*100)}%`:`턴 ${Math.round(q*100)}%`, q<0.45);
      Sfx.beep(q>0.75?1320:700, 0.12,'square',0.14); Sfx.water(false);
      return;
    }
    /* 숨쉬기 */
    S.breath=1; S.lastBreath=tMs;
    S.speed *= (1 - 0.04*this.strokeFor(S).breath);   // 숨쉬면 살짝 느려진다
    Sfx.beep(420,0.06,'sine',0.08);
  }
  update(dt){
    this.t += dt*1000;
    const now=this.t;
    if(this.phase==='SET'){
      const want=Math.min(3, Math.floor((this.gunMs-now>0? 3-(this.gunMs-now)/450 : 3)));
      if(want>this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(now>=this.gunMs){ this.phase='RUN'; Sfx.gun(); this.flash=1;
        for(const S of this.swimmers){ if(S.dq) continue; S.speed=1.9*this.strokeFor(S).speed; S.lastBreath=now; } }
    }
    if(this.phase==='RUN'){
      /* 선수마다 따로 굴린다 */
      for(const S of this.swimmers){
        if(S.dq || S.finished) continue;
        const since=now-S.lastBreath;
        S.breath = clamp(1 - (since/SWIM.breathEvery)*this.strokeFor(S).breath, 0, 1);
        S.speed = Math.max(0, S.speed - dt*0.55);     // 물 저항
        S.fatigue = Math.min(1, S.fatigue + dt*0.0075);
        S.dist += S.speed*dt;
        /* 턴을 놓치면 벽에 부딪힌다 */
        const wall=SWIM.poolM*(S.lap+1);
        if(S.lap < Math.floor(this.trackM/SWIM.poolM)-1 && S.dist > wall+0.8){
          S.lap++; S.turns.push(0.05);
          S.speed*=0.35;
          if(S===this.swimmers[0]){ this.say('턴을 놓쳤다', true); Sfx.beep(180,0.2,'sawtooth',0.14); }
        }
        if(S.dist>=this.trackM){
          S.dist=this.trackM; S.finished=true;
          S.finishTimeS=(now-this.gunMs)/1000;
        }
      }
      /* ⚠ 전원이 들어와야 끝난다 — 1등이 들어오자마자 끊으면 나머지가 기록을 못 본다 */
      if(this.swimmers.every(S=>S.finished || S.dq)){
        const me=this.swimmers[0];
        const total = me.dq ? DNF : me.finishTimeS;
        this.phase='DONE'; this.doneAt=now;
        const pass = !me.dq && total<=this.qualify;
        this.result={status: me.dq?'FALSE_START':(pass?'OK':'MISSED_QUALIFY'),
                     value:total, rank:this.rankOf()};
        pass?Sfx.finish():Sfx.fail();
      }
      for(const rv of this.rivals) rv.dist += rv.target*dt;
      if(this.elapsed > this.qualify+timeGrace(20)){   // 기준을 조였으니 종료 여유는 늘린다
        this.phase='DONE'; this.doneAt=now;
        this.result={status:'TIMEOUT', value:DNF, rank:3}; Sfx.fail();
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
    /* 레인은 사람 수를 따라간다 */
    const n=Math.max(3, this.swimmers.length);
    const LH=Math.round(114/n), LY=[]; for(let i=0;i<n;i++) LY.push(118+i*LH);
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
      this.blob(ctx, x, y, '#7a9ab0', (this.t*0.006+i)%1, false, { speed:rv.target||1 });
    });
    /* 사람 선수들 — 각자 자기 레인, 자기 색 */
    this.swimmers.forEach((S,p)=>{
      const lane = Math.min(S.lane, LY.length-1);
      const y=LY[lane]+LH/2-4, mx=posOf(Math.min(S.dist,this.trackM));
      const col = (this.swimmers.length>1 && typeof PARTY_COLOR!=='undefined')
        ? PARTY_COLOR[p] : this.strokeFor(this.swimmers[p]||this.swimmers[0]).color;
      /* ⚠ 팔 위상은 **실제 스트로크**에서 뽑는다 — 시계가 아니라 손이 정한다 */
      const iv = this.targetIvOf(S) || 320;
      const swPh = S.lastStroke>-1e8 ? clamp((this.t - S.lastStroke)/iv, 0, 1) : 0;
      this.blob(ctx, mx, y, S.dq? '#5a5f70' : col, swPh, true,
                { stroke:this.strokeKeyOf ? this.strokeKeyOf(S) : (S.stroke||this.strokeKey),
                  breath:S.breath, speed:S.speed });
      /* 물보라 — 스트로크마다. 물을 젓고 있다는 게 보여야 한다. */
      if(this.phase==='RUN' && S.speed>0.6)
        BG.fx(BG.ctx(), 'water-splash', mx+6, y+8, 14, ((this.t - S.lastStroke)/260)%1, 4);
      if(this.swimmers.length>1)
        txt(Screen.uctx, 'P'+(p+1), mx, y-18, 8, col, 'center', 700);
      if(p===0){ this._meX=mx; this._meY=y; }
    });

    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.5})`; ctx.fillRect(0,0,VW,VH); }
  }
  /* ⛔ 수영 선수를 **아예 안 그리고 있었다** — 타원 하나 + 작은 원 하나였다.
     CK: "수영 픽셀 모드 구려요 아메바 같은 게 나와서 액션 동작도 없고 너무 심심해요". 맞다.
     위에서 내려다본 레인이니 **위에서 본 수영**을 그린다:
       ① 길쭉한 몸통과 머리(진행 방향을 향한다)
       ② **팔이 번갈아 돈다** — 하나는 물 위로 넘어오고(밝게·크게) 하나는 물속을 당긴다(어둡게)
       ③ 다리는 뒤에서 물장구 · 머리 앞에 뱃머리 물살(bow wave)
     ⚠ 팔의 위상은 **실제 스트로크**를 따라간다 — 손이 하는 일이 화면에 보여야 한다.
     ⚠ 영법마다 팔이 다르다: 접영은 두 팔이 **같이** 돈다(fly). */
  blob(ctx, x, y, color, ph, mine, opt){
    opt = opt || {};
    const fly = opt.stroke === 'fly';
    const bob = Math.sin(ph*Math.PI*2)*1.6;
    const yy  = y + bob;
    const dark = (c)=>{ /* 물속은 어둡고 흐리다 */ return c; };

    /* ── 물속 그림자 — 몸이 물에 잠긴 만큼 */
    ctx.fillStyle='rgba(10,30,50,.28)';
    ctx.beginPath(); ctx.ellipse(x-1, yy+2, 11, 4, 0, 0, Math.PI*2); ctx.fill();

    /* ── 다리 물장구 — 뒤쪽에서 위아래로 */
    const kick = Math.sin(ph*Math.PI*4)*2.6;
    ctx.strokeStyle=color; ctx.lineWidth=2; ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(x-7, yy);
    ctx.lineTo(x-13, yy + (fly ? Math.abs(kick)*0.9 : kick));
    ctx.stroke();
    if(!fly){
      ctx.beginPath(); ctx.moveTo(x-7, yy); ctx.lineTo(x-13, yy - kick); ctx.stroke();
    }

    /* ── 몸통 — 진행 방향으로 길쭉하게 */
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.ellipse(x, yy, 8, 3.2, 0, 0, Math.PI*2); ctx.fill();

    /* ── 팔 — 번갈아(접영은 같이). 물 위 팔은 밝고 길게, 물속 팔은 어둡고 짧게 */
    const armPh = fly ? [ph, ph] : [ph, (ph+0.5)%1];
    armPh.forEach((a,i)=>{
      const sgn = i ? -1 : 1;                       // 위/아래 레인 방향
      const up  = a < 0.5;                          // 앞쪽 절반은 물 위 리커버리
      const t   = up ? a*2 : (a-0.5)*2;
      const ax  = x + (up ? (-2 + t*10) : (6 - t*12));
      const ay  = yy + sgn*(up ? (3.4 + Math.sin(t*Math.PI)*2.2) : 2.2);
      ctx.strokeStyle = up ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.42)';
      ctx.lineWidth = up ? 2 : 1.5;
      ctx.beginPath(); ctx.moveTo(x+2, yy + sgn*2); ctx.lineTo(ax, ay); ctx.stroke();
      /* 손이 물에 들어가는 순간의 물보라 */
      if(up && t>0.82){ ctx.fillStyle='rgba(255,255,255,.7)';
        ctx.fillRect(Math.round(ax)-1, Math.round(ay)-1, 2, 2); }
    });

    /* ── 머리 — 앞쪽. 숨 쉴 땐 옆으로 돌린다 */
    const breathing = opt.breath !== undefined && opt.breath > 0.86;
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.beginPath(); ctx.arc(x+7, yy + (breathing? -2.2 : 0), 2.4, 0, Math.PI*2); ctx.fill();
    /* 수영모 색 한 줄 — 누구인지 보인다 */
    ctx.fillStyle=color; ctx.fillRect(Math.round(x+6), Math.round(yy + (breathing?-4:-1.8)), 3, 1);

    /* ── 뱃머리 물살 — 빠를수록 크다 */
    const wake = clamp((opt.speed||1)/2.6, 0.2, 1);
    ctx.fillStyle='rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.moveTo(x+10, yy);
    ctx.lineTo(x+6, yy-2.4*wake); ctx.lineTo(x+6, yy+2.4*wake); ctx.closePath(); ctx.fill();
    /* 뒤로 흐르는 거품 */
    ctx.fillStyle='rgba(255,255,255,.32)';
    for(let i=0;i<3;i++){
      const p=(ph+i/3)%1;
      ctx.fillRect(x-11-p*7, yy-2+Math.sin(p*6+i)*2.4, 2, 1);
    }
    if(mine){ ctx.fillStyle=PAL.gold; ctx.fillRect(x-4, yy-14, 8, 2); ctx.fillRect(x-1, yy-12, 2, 3); }
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
      /* ⚠ 타수계가 0 으로 떠 있었다 — 수영엔 strideRate 가 없다.
         스트로크 간격에서 뽑아 넘긴다(바퀴/초 단위라 ×0.5). */
      const S0=this.swimmers[0];
      const sIv = (S0 && S0.lastStroke>-1e8 && S0.prevStroke>-1e8)
        ? Math.max(40, S0.lastStroke - S0.prevStroke) : 0;
      const sRate = sIv ? (0.5/(sIv/1000)) : 0;
      HUD.rhythm(u, { strides:(this.player&&this.player.combo)||0, nextSide:-this.side||1,
                      phaseErr:err, form:this.form, rate:sRate });
      /* 한 타의 피드백 — 판정 수명·타격 고리·자리 기준은 HUD.tap 한 곳에 있다.
         ⚠ 620ms 고정이면 다음 타 전에 안 사라져 매 타가 뭉갠다(달리기 실측: 2.6타 겹침). */
      HUD.tap(u, { j:this.lastJudge, ageMs:now-this.lastJudgeMs,
                   ivMs:this.targetIvOf(this.swimmers[0]),
                   x:this._meX, y:(this._meY!==undefined?this._meY+8:undefined),
                   labelY:(this._meY!==undefined?this._meY-30:undefined) });
      /* 숨 게이지 */
      /* ⛔ 물 위에 어두운 글씨·가는 막대라 안 보였다 — 숨은 이 종목의 목숨줄이다 */
      plate(u, 6, Track.GAUGE_Y-27, 84, 14, 0.72);
      txt(u,'숨',10,Track.GAUGE_Y-24,8, this.breath<0.3?PAL.red:PAL.dim);
      const bw=64;
      u.fillStyle='rgba(242,245,250,.18)'; u.fillRect(26,Track.GAUGE_Y-22,bw,6);
      u.fillStyle = this.breath>0.55?PAL.blue : this.breath>0.25?PAL.gold:PAL.red;
      u.fillRect(26,Track.GAUGE_Y-22,Math.round(bw*this.breath),6);
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
