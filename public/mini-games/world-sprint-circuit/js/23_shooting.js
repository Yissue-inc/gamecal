/* ══════════════════════════════════════════════════════════════════
   사격 (10m 공기소총) — 양궁과 겹치지 않게 **호흡**을 축으로 삼는다.

   양궁은 '당기는 힘'과 '흔들림'의 맞바꿈이다: 오래 당기면 멀리 가지만 손이 떨린다.
   사격은 거리가 없다. 10m 앞 과녁은 늘 같은 자리에 있다 — 문제는 **내 몸**이다.
     · 액션을 누르고 있으면 **숨을 참는다.** 참는 동안 흔들림이 줄어든다
     · 그런데 참는 시간에는 바닥이 있다 — 산소가 떨어지면 흔들림이 **급격히** 커진다
     · ⚠ 그래서 '빨리 쏘기'도 '오래 조준하기'도 답이 아니다.
       숨을 참고 **가장 잔잔해지는 구간**(2.0~3.2초)을 찾아 그 안에서 떼는 게 전부다
     · 액션을 떼면 쏜다 · ▲ 를 누르면 쏘지 않고 다시 호흡한다(시간은 잃는다)
     · 심장박동이 주기적으로 조준점을 밀어 올린다 — 박동 사이를 노려야 한다
   10발 · 소수점 채점(10.9 만점). 합계 109.0.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const SHOOT = {
  shots: 10,
  holdBest: [2000, 3200],   // 숨을 참고 이 구간이 가장 잔잔하다(ms)
  holdMax: 4600,            // 이 뒤로는 손을 못 쓴다
  wanderBase: 0.30,         // 숨 쉬는 동안의 흔들림
  wanderCalm: 0.055,        // 가장 잔잔할 때
  pulseAmp: 0.052,          // 심장박동
  pulseMs: 820,
  aimNudge: 0.028,         // 곱게. 굵으면 원하는 자리에 못 세운다
  rebreatheMs: 1500,
  shotClockMs: 18000,       // 한 발에 주어지는 시간 — 없으면 영원히 다시 호흡할 수 있다
  maxScore: 10.9,
};

class ShootingEvent {
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.t=0; this.shot=1; this.scores=[]; this.total=0;
    this.result=null; this.doneAt=0;
    this.msg=''; this.msgAt=-1e9; this.msgBad=false; this.flash=0;
    this.newShot();
  }
  newShot(){
    this.phase='BREATHE';          // BREATHE → HOLD → SHOT
    this.holdStart=-1; this.rebreatheAt=-1e9; this.rebreaths=0;
    /* ⚠ 세로 편차를 무작위로 주면 **고칠 방법이 없다**(좌우 보정은 X 만 움직인다) —
       운으로 점수가 깎이는 건 종목이 아니다. 세로 흔들림은 흔들림·심장박동이 만든다.
       가로 편차만 남기고, 그건 좌우로 맞춰 나가는 게 이 종목의 조준이다. */
    this.aimX=(Math.random()*2-1)*0.16; this.aimY=0;
    this.wanderPhase=Math.random()*6.28;
    this.hit=null; this.shotAt=-1e9; this.shotOpenedAt=this.t;
  }
  get qualify(){ return this.def.qualify; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }
  get holdMs(){ return this.holdStart<0 ? 0 : this.t-this.holdStart; }
  /* 흔들림 폭 — 숨을 참은 시간에 따라 U 자를 그린다.
     ⚠ 이 곡선이 이 종목의 전부다. 단조 감소면 '오래 참기'가 정답이 되고,
        단조 증가면 '바로 쏘기'가 정답이 된다. 둘 다 종목이 아니다. */
  wander(){
    if(this.phase!=='HOLD') return SHOOT.wanderBase;
    const h=this.holdMs, [a,b]=SHOOT.holdBest;
    if(h < a) return lerp(SHOOT.wanderBase, SHOOT.wanderCalm, h/a);
    if(h <= b) return SHOOT.wanderCalm;
    const over = (h-b)/(SHOOT.holdMax-b);
    return SHOOT.wanderCalm + over*over*0.85;      // 산소가 떨어지면 급격히
  }
  /* 지금 조준점 — 흔들림 + 심장박동 */
  reticle(){
    const w=this.wander();
    const p=Math.sin(this.t/SHOOT.pulseMs*Math.PI*2);
    const beat = (p>0.86 ? (p-0.86)/0.14 : 0) * SHOOT.pulseAmp;
    return {
      x: this.aimX + Math.sin(this.t*0.0021+this.wanderPhase)*w*0.75,
      y: this.aimY + Math.cos(this.t*0.0017+this.wanderPhase*1.7)*w*0.75 - beat,
      w,
    };
  }
  onStride(side, tMs){
    if(this.phase==='SHOT') return;
    this.aimX = clamp(this.aimX - side*SHOOT.aimNudge, -0.45, 0.45);
  }
  onAction(tMs){
    if(this.phase!=='BREATHE') return;
    if(this.t < this.rebreatheAt) return;
    this.phase='HOLD'; this.holdStart=this.t;
    Sfx.beep(320,0.05,'sine',0.07);
  }
  onActionUp(tMs){
    if(this.phase!=='HOLD') return;
    this.fire();
  }
  /* ▲ = 쏘지 않고 다시 호흡. 시간은 잃지만 망친 조준을 버릴 수 있다. */
  onUp(){
    if(this.phase!=='HOLD') return;
    this.phase='BREATHE'; this.holdStart=-1;
    this.rebreatheAt=this.t+SHOOT.rebreatheMs; this.rebreaths++;
    this.say('다시 호흡'); Sfx.beep(240,0.07,'sine',0.06);
  }
  fire(){
    const r=this.reticle();
    const d=Math.sqrt(r.x*r.x + r.y*r.y);
    /* 소수점 채점. ⚠ 계수 11.4 는 너무 관대했다 — 잔잔 구간 안에서 아무 때나 쏴도
       d 가 0.036~0.083 사이라 최악이 9.95 였고, 명사수(101.0)와 서툰(98.2)의 차이가
       10발에 2.8점뿐이었다. 실제 10m 공기소총의 10점 링은 지름 0.5mm 다.
       기울기를 세워 '얼마나 중앙이냐'가 기록이 되게 한다. */
    const sc = d>=0.46 ? 0 : Math.max(0, Math.round((SHOOT.maxScore - d*24)*10)/10);
    this.hit={x:r.x, y:r.y, score:sc};
    this.scores.push(sc); this.total=Math.round((this.total+sc)*10)/10;
    this.phase='SHOT'; this.shotAt=this.t; this.flash=0.5;
    Sfx.shot();
    if(sc>=10.5){ this.say('완벽한 한 발!'); Sfx.finish(); Track.cheer(0.55); }
    else if(sc>=9.5){ this.say('좋다'); Sfx.step('PERFECT'); }
    else if(sc>=8) Sfx.step('GOOD');
    else { this.say(sc<=0?'과녁을 벗어났다':'빗나갔다', true); Sfx.fail(); }
  }
  update(dt){
    this.t += dt*1000;
    this.flash=Math.max(0,this.flash-dt*3);
    if(this.phase==='HOLD' && this.holdMs > SHOOT.holdMax){
      this.say('더는 못 참는다', true); this.fire();
    }
    /* ⚠ 제한 시간이 없으면 조준이 맘에 안 들 때 **영원히 다시 호흡**할 수 있다.
       실측: 까다롭게 고르는 플레이가 한 판을 끝내지 못했다. 실제 사격도 시리즈에 시간이 있다. */
    if((this.phase==='BREATHE'||this.phase==='HOLD')
       && this.t-this.shotOpenedAt > SHOOT.shotClockMs){
      this.say('시간 초과 — 쏴야 한다', true);
      if(this.phase==='HOLD') this.fire();
      else { this.phase='HOLD'; this.holdStart=this.t-SHOOT.holdMax; this.fire(); }
    }
    if(this.phase==='SHOT' && this.t-this.shotAt > 1100){
      if(this.shot >= SHOOT.shots){
        this.phase='DONE'; this.doneAt=this.t;
        const pass=this.total>=this.qualify;
        this.result={status:pass?'OK':'MISSED_QUALIFY', value:this.total, rank:pass?1:2};
        pass?Sfx.finish():Sfx.fail();
      } else { this.shot++; this.newShot(); }
    }
    Track.crowdTick();
    Sfx.crowd(0.16);
  }

  draw(ctx){
    /* 실내 사대 — 밤 트랙을 겹치면 두 세계가 섞인다(역도·트램폴린과 같은 이유) */
    if(!BG.fill(BG.ctx(),'range-shooting', 0, VH)){
      /* ⚠ 사격은 실내다. 어셋이 오기 전까지는 야외 무대를 **거의 지워** 실내처럼 만든다 —
         밤 경기장이 그대로 비치면 두 세계가 섞인다(역도·트램폴린과 같은 문제). */
      const gt=Track.fieldBack(ctx, 18);
      Track.fieldGround(ctx,{grassTop:gt, surface:'#2f3340'});
      ctx.fillStyle='rgba(8,10,16,.86)'; ctx.fillRect(0,0,VW,VH);
      ctx.fillStyle='rgba(30,36,50,.9)'; ctx.fillRect(0, VH-52, VW, 52);   // 사대
      ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fillRect(0, VH-52, VW, 1);
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.28})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    const cx=VW/2, cy=126, R=54;
    /* 과녁 — 10m 공기소총은 검은 중심이 아주 작다 */
    if(!BG.obj(u, 'target-air-hd', cx, cy+R, R*2)){
      u.fillStyle='#f2f2ee'; u.beginPath(); u.arc(cx,cy,R,0,6.284); u.fill();
      u.fillStyle='#141821'; u.beginPath(); u.arc(cx,cy,R*0.46,0,6.284); u.fill();
      u.strokeStyle='rgba(20,24,33,.5)'; u.lineWidth=1;
      for(let i=1;i<=5;i++){ u.beginPath(); u.arc(cx,cy,R*(i/5.4),0,6.284); u.stroke(); }
      u.strokeStyle='rgba(255,255,255,.55)';
      for(let i=1;i<=3;i++){ u.beginPath(); u.arc(cx,cy,R*(i/12),0,6.284); u.stroke(); }
      u.fillStyle='#f2f2ee'; u.beginPath(); u.arc(cx,cy,R*0.045,0,6.284); u.fill();
    }
    /* 지난 탄착 */
    for(const h of (this._marks||[])){
      u.fillStyle='rgba(90,170,255,.55)';
      u.beginPath(); u.arc(cx+h.x*R, cy+h.y*R, 2, 0, 6.284); u.fill();
    }
    if(this.phase==='SHOT' && this.hit){
      u.fillStyle=PAL.gold;
      u.beginPath(); u.arc(cx+this.hit.x*R, cy+this.hit.y*R, 3, 0, 6.284); u.fill();
      u.strokeStyle=PAL.gold; u.lineWidth=1;
      u.beginPath(); u.arc(cx+this.hit.x*R, cy+this.hit.y*R, 6, 0, 6.284); u.stroke();
      txt(u, this.hit.score.toFixed(1), cx, cy+R+10, 20,
          this.hit.score>=10.5?PAL.green:this.hit.score>=9?PAL.gold:PAL.red,'center',700);
    } else {
      const r=this.reticle();
      const on = Math.sqrt(r.x*r.x+r.y*r.y) < 0.09;
      u.strokeStyle = this.phase==='HOLD' ? (on?PAL.green:PAL.white) : 'rgba(255,255,255,.45)';
      u.lineWidth=1.5;
      const rx=cx+r.x*R, ry=cy+r.y*R, k=7;
      u.beginPath(); u.arc(rx,ry,k*0.55,0,6.284); u.stroke();
      u.beginPath(); u.moveTo(rx-k,ry); u.lineTo(rx-k*0.3,ry);
      u.moveTo(rx+k*0.3,ry); u.lineTo(rx+k,ry);
      u.moveTo(rx,ry-k); u.lineTo(rx,ry-k*0.3);
      u.moveTo(rx,ry+k*0.3); u.lineTo(rx,ry+k); u.stroke();
    }
    /* 총 — 화면 아래쪽에 걸쳐 '내가 들고 있다'를 만든다 */
    /* 사수 — CK 지시(2026-08-31): "캐릭터는 그냥 옆에 보여주고 **조준 조작에 집중**".
       ⚠ 두 번 헛짚었다. 처음엔 x=74(UI), 다음엔 x=66·96·128·150(장면 캔버스) — 전부 안 보였다.
          원인은 캔버스가 아니라 **자리**였다: 소총 그림이 게임좌표 36~105 를 덮는다.
          그리고 이 화면의 배경은 BG 캔버스라 장면 캔버스(#game)에 그린 건 묻힌다.
          UI 캔버스에 **소총보다 먼저**, 총 오른쪽(150)에 세운다.
       ⚠ '안 보인다' 를 '안 그려진다' 로 읽지 말 것 — draw 는 내내 true 를 돌려주고 있었다.
          진짜 원인은 **좌표가 NaN** 이었다(아래 주석). */
    {
      const sway = this.drawStart>=0 ? this.swayAmt()*6 : 0;
      const holdPh = this.drawStart<0 ? 0.2
        : 0.2 + clamp((this.t-this.drawStart)/SHOOT.holdMax, 0, 1)*0.25;
      /* ⛔ swayPhase 가 없으면 Math.sin(undefined) = **NaN** 이라 좌표가 NaN 이 되고
         **그리기는 true 를 돌려주면서 아무것도 안 나온다.** 세 번 헛짚은 진짜 원인이었다.
         (라이브 콘솔 시험은 상수 좌표라 멀쩡했다 — 그래서 캔버스·자리를 의심했다)
         ⚠ 좌표는 그리기 전에 **숫자인지 확인한다.** */
      const swayX = Math.sin(this.swayPhase || 0) * sway * 0.4;
      CharHD.draw(u, 'eagle', 150 + (isFinite(swayX) ? swayX : 0), VH-14, holdPh,
        { act:'aim', throwing:true, rare:3, t:this.t, scale:1.2 });
    }
    BG.obj(u, 'rifle-hd', 74, VH-46, 20);
    /* 호흡 막대 — 언제 떼야 하는지 화면에 있어야 한다.
       ⚠ 안 보이면 '왜 흔들리는지' 알 수 없고, 그건 실력이 아니라 운이다. */
    const bw=150, bx=cx-bw/2, by=Track.botY(34);
    const [a,b]=SHOOT.holdBest;
    u.fillStyle='rgba(255,255,255,.12)'; u.fillRect(bx,by,bw,8);
    u.fillStyle='rgba(92,255,156,.35)';
    u.fillRect(bx+bw*(a/SHOOT.holdMax), by, bw*((b-a)/SHOOT.holdMax), 8);
    if(this.phase==='HOLD'){
      const p=clamp(this.holdMs/SHOOT.holdMax,0,1);
      u.fillStyle=PAL.white; u.fillRect(bx+bw*p-1, by-3, 2, 14);
    }
    txt(u,'숨 참기', bx-6, by-1, 9, PAL.dim,'right');
    txt(u, this.phase==='HOLD'?'액션을 떼면 발사  ·  ▲ 다시 호흡':'액션을 눌러 숨을 참으세요',
        cx, Track.botY(20), 9, PAL.dim,'center');

    /* ⛔ 양궁과 같은 병이었다 — '기준 90.0' 과 내 합계가 나란히 있어 뭐가 내 것인지
       한눈에 안 왔다. 점수판은 한 곳에서 그린다(05_scoreboard). */
    SB.tally(u, {
      name: this.def.name,
      progress: this.shot+' / '+SHOOT.shots+'발',
      mine: +this.total.toFixed(1), unit: K('점'),
      fmt: v => v.toFixed(1),
      cuts: medalCuts(this.def), higher: !!this.def.higher,
      pace: this.shot > 0 ? this.total / this.shot * SHOOT.shots : undefined,
      history: this.scores.map(v => +(+v).toFixed(1)),
    });
    if(this.rebreaths) txt(u,'다시 호흡 '+this.rebreaths+'회', 8, 36, 9, PAL.dim,'left');
    if(this.phase==='BREATHE'||this.phase==='HOLD'){
      const left=Math.max(0,(SHOOT.shotClockMs-(this.t-this.shotOpenedAt))/1000);
      txt(u, left.toFixed(1)+'초', cx+52, 6, 10, left<5?PAL.red:PAL.dim,'left',700);
    }
    if(this.t-this.msgAt<900)
      txt(u, this.msg, cx, 40, 12, this.msgBad?PAL.red:PAL.green,'center',700);
  }
}
