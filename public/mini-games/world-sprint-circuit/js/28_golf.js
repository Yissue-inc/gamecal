/* ══════════════════════════════════════════════════════════════════
   골프 — 이 게임에서 유일하게 **여러 번에 나눠** 목표에 다가가는 종목.

   양궁·사격은 한 발이 곧 점수다. 골프는 한 타가 다음 타의 자리를 정한다 —
   멀리 치는 게 아니라 **다음에 치기 좋은 자리에 놓는 것**이 실력이다.
     · ←/→ 조준 · ▲▼ 클럽(거리)
     · 액션 3번: ①게이지 시작 ②세기 결정 ③정확도 결정 (고전 3클릭)
       ⚠ 세기를 100% 로 채울수록 정확도 창을 지나치기 쉽다 — 그게 이 종목의 맞바꿈이다
     · 바람이 공을 민다. 벙커·러프에 빠지면 다음 타가 짧아진다
   3홀 합계를 파 대비로 낸다(적을수록 좋다).
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const GOLF = {
  /* ⚠ 320m 파4 는 드라이버(250)+웨지(80) 로 **매번 이글**이었다 — 전 실력이 언더파를 쳤다.
     실제 파4 는 350~450m 다. 한 클럽으로 딱 떨어지지 않게 길이를 잡는다. */
  holes: [
    { len:385, par:4, wind:[-0.5, 0.5] },
    { len:168, par:3, wind:[-0.9, 0.9] },
    { len:495, par:5, wind:[-0.7, 0.7] },
  ],
  clubs: [
    { name:'드라이버', dist:250, spread:1.35 },
    { name:'우드',     dist:200, spread:1.05 },
    { name:'아이언',   dist:150, spread:0.75 },
    { name:'웨지',     dist:80,  spread:0.5  },
    { name:'퍼터',     dist:22,  spread:0.18 },
  ],
  meterMs: 1150,          // 게이지가 끝까지 가는 시간
  /* ⚠ 0.085 는 한 프레임(게이지의 0.0145)에 비해 너무 넓어서, 대충 눌러도 정확도가
     0.8 이상 나왔다 — 명수(-3.7)와 능숙(-3.3)이 구별되지 않았다. */
  accWindow: 0.055,       // 정확도 창(게이지 비율)
  holeR: 3,               // 홀 반경(m)
  greenR: 26,             // 그린 반경(m)
  bunkerPenalty: 0.62,    // 벙커에서는 비거리가 이만큼
  roughPenalty: 0.80,
  maxStrokes: 9,
};

class GolfEvent {
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.t=0; this.hole=0; this.strokes=0; this.totalPar=0; this.totalStrokes=0;
    this.scores=[]; this.result=null; this.doneAt=0; this.flash=0;
    this.msg=''; this.msgAt=-1e9; this.msgBad=false;
    this.newHole();
  }
  newHole(){
    const H=GOLF.holes[this.hole];
    this.H=H;
    this.ballX=0; this.ballY=0;            // Y = 홀 방향 진행거리(m), X = 좌우 어긋남
    this.strokes=0;
    this.lie='fairway';
    this.wind = lerp(H.wind[0], H.wind[1], Math.random());
    this.club = 0; this.aim = 0;
    this.phase='AIM'; this.accGrace=0;      // AIM → POWER → ACC → FLY → REST → HOLED
    this.meter=0; this.power=0; this.acc=0;
    this.flyT=0; this.flyDur=0; this.from=null; this.to=null;
    this.pickClub();
  }
  get qualify(){ return this.def.qualify; }
  get toHole(){ return Math.hypot(this.H.len-this.ballY, this.ballX); }
  get onGreen(){ return this.toHole <= GOLF.greenR; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }
  /* 남은 거리에 맞는 클럽을 미리 골라 준다 — 매번 다섯 번 넘기게 하지 않는다 */
  pickClub(){
    const d=this.toHole;
    if(this.onGreen){ this.club=4; return; }
    let best=0, bd=1e9;
    GOLF.clubs.forEach((c,i)=>{ if(i===4) return; const e=Math.abs(c.dist-d); if(e<bd){ bd=e; best=i; } });
    this.club=best;
  }
  get C(){ return GOLF.clubs[this.club]; }

  onUp(){ if(this.phase==='AIM' && this.club>0){ this.club--; Sfx.ui(); } }
  onDown(){ if(this.phase==='AIM' && this.club<GOLF.clubs.length-1){ this.club++; Sfx.ui(); } }
  onStride(side){
    if(this.phase!=='AIM') return;
    this.aim = clamp(this.aim + side*0.9, -14, 14);     // 도(°)
  }
  onAction(){
    if(this.phase==='AIM'){ this.phase='POWER'; this.meter=0; this.meterDir=1; Sfx.beep(520,0.05,'square',0.09); return; }
    if(this.phase==='POWER'){
      this.power=clamp(this.meter,0,1); this.phase='ACC'; this.meterDir=-1;
      Sfx.beep(760,0.05,'square',0.10); return;
    }
    if(this.phase==='ACC'){
      if(this.accGrace && this.t < this.accGrace) return;    // 자동 전환 직후의 손가락은 무시
      /* 정확도 — 게이지가 0 으로 돌아올 때 딱 맞춰야 한다 */
      this.acc = 1 - clamp(Math.abs(this.meter)/GOLF.accWindow, 0, 1);
      Sfx.beep(this.acc>0.7?1080:420,0.07,'square',0.12);
      this.swing();
      return;
    }
  }
  onActionUp(){}

  swing(){
    this.strokes++;
    const lieMul = this.lie==='bunker'?GOLF.bunkerPenalty : this.lie==='rough'?GOLF.roughPenalty : 1;
    /* 거리 — 세기 × 클럽 × 라이. 정확도가 낮으면 힘이 덜 실린다 */
    /* ⚠ 정확도 0 이어도 비거리 72% 가 나와서 대충 쳐도 됐다 */
    const dist = this.C.dist * this.power * lieMul * (0.55 + 0.45*this.acc);
    /* 방향 — **홀을 향한 기준선**에서 조준·오차·바람만큼 벗어난다.
       ⚠ 예전엔 방향이 늘 +Y(티에서 홀 쪽) 고정이었다. 그래서 홀을 한 번 지나치면
          되돌아갈 방법이 아예 없었다 — 실측: 남은 6m 에서 7 → 14 → 27 → 55 → 99 → 163
          → 282 → 481m 로 **멀어지기만 하다가** 9타 상한에 걸렸다.
          실제 골프처럼 늘 홀을 보고 서고, 지나쳤으면 돌아서서 친다. */
    const base = Math.atan2(-this.ballX, this.H.len-this.ballY);   // 홀 방향(라디안)
    const missDeg = (1-this.acc) * this.C.spread * 16 * (Math.random()<0.5?-1:1);
    const rad = base + (this.aim + missDeg)*Math.PI/180;
    const dy = Math.cos(rad)*dist;
    const dx = Math.sin(rad)*dist + this.wind*dist*0.05;
    this.from={x:this.ballX, y:this.ballY};
    this.to={x:this.ballX+dx, y:this.ballY+dy};
    this.phase='FLY'; this.flyT=0;
    this.flyDur = this.club===4 ? 0.45 : 0.35+dist/GOLF.clubs[0].dist*0.9;
    Sfx.step(this.acc>0.7?'PERFECT':this.acc>0.35?'GOOD':'MISS');
  }
  settle(){
    this.ballX=this.to.x; this.ballY=this.to.y;
    /* 홀에 들어갔나 */
    if(this.toHole<=GOLF.holeR){ this.holed(); return; }
    /* 라이 — 페어웨이를 벗어난 정도로 */
    const off=Math.abs(this.ballX);
    const past=this.ballY>this.H.len+30;
    if(past || off>34) this.lie='rough';
    else if(off>22) this.lie='bunker';
    else this.lie='fairway';
    if(this.lie==='bunker') this.say('벙커에 빠졌다', true);
    else if(this.lie==='rough') this.say('러프다', true);
    this.phase='AIM'; this.aim=0; this.pickClub();
    if(this.strokes>=GOLF.maxStrokes){ this.say('최대 타수', true); this.holed(true); }
  }
  holed(capped){
    const par=this.H.par;
    const sc=this.strokes;
    this.scores.push({par, strokes:sc, capped:!!capped});
    this.totalPar+=par; this.totalStrokes+=sc;
    const d=sc-par;
    this.say(capped?'홀 아웃' : d<=-2?'이글!' : d===-1?'버디!' : d===0?'파' : d===1?'보기' : '더블 보기 이상',
             d>0);
    this.flash = d<0?0.8:0.3;
    d<=0 ? Sfx.finish() : Sfx.fail();
    Track.cheer(d<0?0.7:0.3);
    this.phase='HOLED'; this.holedAt=this.t;
  }

  update(dt){
    this.t+=dt*1000;
    this.flash=Math.max(0,this.flash-dt*3);
    if(this.phase==='POWER' || this.phase==='ACC'){
      const sp=dt*1000/GOLF.meterMs;
      this.meter += this.meterDir*sp;
      if(this.phase==='POWER' && this.meter>=1){
        this.meter=1; this.power=1; this.phase='ACC'; this.meterDir=-1;
        /* ⚠ 세기가 꽉 차면 저절로 정확도 단계로 넘어간다. 그런데 그 순간 누르고 있던 손이
           곧바로 '정확도 결정'으로 찍혀 **정확도 0** 이 됐다 — 세기를 100% 로 쓰는 순간
           무조건 빗맞는 셈이라, 의도한 맞바꿈(100%는 창을 지나치기 쉽다)이 아니라
           그냥 못 쓰는 선택지였다. 넘어간 직후 짧게 입력을 무시한다. */
        this.accGrace = this.t + 110;
      }
      if(this.phase==='ACC' && this.meter<=-GOLF.accWindow*2.4){
        /* 창을 놓쳤다 — 완전히 빗맞는다 */
        this.acc=0; this.swing();
      }
    }
    else if(this.phase==='FLY'){
      this.flyT+=dt;
      if(this.flyT>=this.flyDur) this.settle();
    }
    else if(this.phase==='HOLED'){
      if(this.t-this.holedAt>1600){
        if(this.hole>=GOLF.holes.length-1){
          this.phase='DONE'; this.doneAt=this.t;
          const v=this.totalStrokes-this.totalPar;      // 파 대비 (적을수록 좋다)
          const pass=v<=this.qualify;
          this.result={status:pass?'OK':'MISSED_QUALIFY', value:v, rank:pass?1:2};
          pass?Sfx.finish():Sfx.fail();
        } else { this.hole++; this.newHole(); }
      }
    }
    Track.crowdTick();
    Sfx.crowd(0.2);
  }

  draw(ctx){
    /* 위에서 내려다본 홀 — 카누와 같은 시점이지만 여긴 목표가 점이다 */
    const gt=Track.fieldBack(ctx, 14);
    Track.fieldGround(ctx,{grassTop:gt, surface:'#2f5a34'});
    ctx.fillStyle='rgba(10,20,12,.78)'; ctx.fillRect(0,0,VW,VH);
    /* ⚠ top=34 는 상단 HUD(0~26)와 깃대(홀에서 16px 위)가 겹쳤다 */
    const top=48, bot=VH-46, cx=VW/2;
    this._v={top, bot, cx};
    const H=this.H;
    const toY=(m)=> bot - (m/H.len)*(bot-top);
    const toX=(x)=> cx + x*1.6;
    this._toX=toX; this._toY=toY;
    /* 페어웨이 */
    ctx.fillStyle='#3f7a42';
    ctx.fillRect(toX(-22), top-6, toX(22)-toX(-22), bot-top+12);
    ctx.fillStyle='#2f5a34';
    ctx.fillRect(toX(-34), top-6, toX(-22)-toX(-34), bot-top+12);
    ctx.fillRect(toX(22), top-6, toX(34)-toX(22), bot-top+12);
    /* 벙커 — 어셋이 오면 사각형 대신 진짜 모래턱 */
    const bgc=BG.ctx();
    for(const [bx,bm] of [[-30, H.len*0.62], [24, H.len*0.42]]){
      if(!BG.obj(bgc,'golf-bunker', toX(bx)+7, toY(bm)+6, 10)){
        ctx.fillStyle='#d8c68a'; ctx.fillRect(toX(bx), toY(bm)-6, 14, 12);
      }
    }
    /* 그린 */
    const gr=Math.round(GOLF.greenR*1.6);
    if(!BG.obj(bgc,'golf-green', cx, toY(H.len)+gr*0.55, gr*1.1)){
      ctx.fillStyle='#5aa860';
      ctx.beginPath(); ctx.ellipse(cx, toY(H.len), gr, gr*0.55, 0, 0, 6.284); ctx.fill();
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.35})`; ctx.fillRect(0,0,VW,VH); }
  }
  /* ⛔ 골프에 **사람이 없었다** — 위에서 본 홀에 공만 굴러다녔다(감사에서 CharHD 0회).
     티 자리에 선수를 세운다. 게이지를 채우는 동안 자세가 커지고, 치면 스윙이 돈다. */
  drawGolfer(u){
    const v=this._v; if(!v) return;
    const swinging = this.phase==='SWING' || (this.t-(this.hitAt||-1e9)) < 420;
    const ph = swinging ? clamp((this.t-(this.hitAt||this.t))/420, 0, 1)*0.6 + 0.2 : 0.25;
    CharHD.draw(u, 'bear', v.cx-16, v.bot+10, ph,
      { act:'spin', throwing:true, rare:2, t:this.t, scale:0.95 });
  }
  drawUI(u){
    this.drawGolfer(u);
    const V=this._v; if(!V) return;
    const toX=this._toX, toY=this._toY, H=this.H;
    /* 홀과 깃대 — 깃대는 공보다 앞이라 UI 층에 그린다 */
    const hx=toX(0), hy=toY(H.len);
    u.fillStyle='#1a1a1a'; u.beginPath(); u.arc(hx,hy,3,0,6.284); u.fill();
    if(!BG.obj(u,'golf-flag', hx+3, hy, 26)){
      u.strokeStyle='#e8e8e8'; u.lineWidth=1;
      u.beginPath(); u.moveTo(hx,hy); u.lineTo(hx,hy-16); u.stroke();
      u.fillStyle='#ff5a4a'; u.fillRect(hx, hy-16, 8, 5);
    }
    /* 공 */
    let bx, by;
    if(this.phase==='FLY'){
      const k=clamp(this.flyT/this.flyDur,0,1);
      bx=toX(lerp(this.from.x,this.to.x,k));
      by=toY(lerp(this.from.y,this.to.y,k)) - Math.sin(k*Math.PI)*(this.club===4?3:22);
    } else { bx=toX(this.ballX); by=toY(this.ballY); }
    u.fillStyle='#ffffff'; u.beginPath(); u.arc(bx,by,2.5,0,6.284); u.fill();
    /* 조준선 */
    if(this.phase==='AIM' || this.phase==='POWER' || this.phase==='ACC'){
      const base=Math.atan2(-this.ballX, H.len-this.ballY);
      const rad=base+this.aim*Math.PI/180;
      const len=Math.min(this.C.dist, this.toHole+20);
      const ex=toX(this.ballX+Math.sin(rad)*len), ey=toY(this.ballY+Math.cos(rad)*len);
      u.strokeStyle='rgba(255,255,255,.45)'; u.lineWidth=1; u.setLineDash([3,3]);
      u.beginPath(); u.moveTo(bx,by); u.lineTo(ex,ey); u.stroke(); u.setLineDash([]);
    }
    /* 바람 */
    const wdir=this.wind>0?'▶':'◀';
    txt(u, K('바람')+' '+wdir+' '+Math.abs(this.wind).toFixed(1),
        VW-8, 38, 10, Math.abs(this.wind)>0.5?PAL.red:PAL.dim,'right',700);
    /* 게이지 — 세기와 정확도를 한 막대에서 본다 */
    if(this.phase==='POWER'||this.phase==='ACC'){
      const bw=170, bx0=VW/2-bw/2, by0=VH-30;
      u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(bx0,by0,bw,12);
      /* 정확도 창 — 0 근처 */
      u.fillStyle='rgba(92,255,156,.45)';
      u.fillRect(bx0-2, by0, bw*GOLF.accWindow+4, 12);
      /* 세기 표시 */
      if(this.phase==='ACC'){
        u.fillStyle='rgba(255,215,94,.35)'; u.fillRect(bx0, by0, bw*this.power, 12);
      }
      const m=clamp(this.meter,-GOLF.accWindow*2.4,1);
      u.fillStyle=PAL.white; u.fillRect(bx0+bw*m-1, by0-3, 2, 18);
      txt(u, this.phase==='POWER'? K('세기 — 액션으로 멈춤') : K('정확도 — 초록에서 액션'),
          VW/2, by0-14, 10, this.phase==='ACC'?PAL.green:PAL.white,'center',700);
    }
    /* HUD — ⛔ 골프만 **혼자 다른 얼굴**이었다(2026-08-31 캡처 대조).
       47종목은 SB.tally 의 판 위에 [이름 | 진행 | 큰 숫자 | 레일] 로 서 있는데
       골프는 자기 판(26px)에 자기 배치였다. 레일은 있었으니 '틀렸다'가 아니라
       **한 게임처럼 안 보였다** — 점수판을 한 곳에서 그리기로 한 이유가 그것이다. */
    const rel=this.totalStrokes-this.totalPar;
    const relS = v => v===0?'E':(v>0?'+'+v:String(v));
    SB.tally(u, {
      name: this.def.name,
      progress: K('%1번 홀').replace('%1', this.hole+1)+' · '+K('파')+' '+H.par,
      mine: rel, fmt: relS,
      cuts: medalCuts(this.def), higher: !!this.def.higher,
      /* 홀별 결과가 곧 시기별 기록이다 — 칩으로 */
      history: this.scores.map(s => relS(s.strokes-s.par)),
      foe: { label: K('타수'), value: String(this.strokes) },
    });
    /* ⚠ 아래 줄들은 예전 26px 판 기준이었다 — SB 판은 34 까지다. 그만큼 내린다. */
    txt(u, K('남은 거리')+' '+Math.round(this.toHole)+'m', 8, 38, 10,
        this.onGreen?PAL.green:PAL.white,'left',700);
    if(this.phase==='AIM'){
      txt(u, '▲▼ '+K(this.C.name)+'  '+this.C.dist+'m', 8, 50, 10, PAL.gold,'left',700);
      txt(u, K('라이')+' '+K(this.lie==='fairway'?'페어웨이':this.lie==='bunker'?'벙커':'러프'),
          8, 62, 9, this.lie==='fairway'?PAL.dim:PAL.red,'left');
      if(this.strokes===0 && this.hole===0)
        txt(u,'←→ 조준 · ▲▼ 클럽 · 액션 3번(시작·세기·정확도)', VW/2, Track.tipY(), 10, PAL.white,'center');
    }
    if(this.t-this.msgAt<1100)
      txt(u, this.msg, VW/2, 62, 14, this.msgBad?PAL.red:PAL.green,'center',700);
  }
}
