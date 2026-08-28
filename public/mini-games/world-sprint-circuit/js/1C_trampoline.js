/* ══════════════════════════════════════════════════════════════════
   트램폴린 — 다이빙과 비슷해 보이지만 **정반대의 종목**이다.

   다이빙은 한 번의 도약이 전부다. 트램폴린은 10번을 **끊지 않고 잇는다**.
     · 매트에 닿는 순간(초록 창)에 액션 = 다음 점프가 더 높다 — 높이가 누적된다
     · 공중에서 좌우 연타 = 회전. 많이 돌수록 난도가 오른다
     · 그러나 **착지 전에 회전을 멈춰야** 한다(액션으로 편다) — 안 그러면 자세 감점
     · 한 번이라도 타이밍을 놓치면 높이가 무너지고 다시 쌓아야 한다
   점수 = Σ(높이 × 난도 × 자세) / 10 회

   ⚠ 이게 이 종목의 정체성이다 — **실수 한 번의 비용이 누적된다.**
      다이빙은 3시기 중 최고점이라 두 번 망쳐도 된다. 여기는 한 번 무너지면
      남은 회차 내내 그 손해를 안고 간다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const TRAMP = {
  bounces: 10,          // 총 회차
  landWindow: 0.13,     // 착지 타이밍 창(초) — 이 안에 액션
  baseH: 2.6,           // 첫 점프 높이(m)
  maxH: 8.4,
  gain: 1.22,           // 잘 밟았을 때 배율
  loss: 0.62,           // 놓쳤을 때
  spinPerTap: 0.5,      // 연타 1회당 반바퀴
  maxSpin: 4.0,
  g: 9.8,
  pxPerM: 15,   /* 18 이면 최고높이(8.4m)에서 선수가 HUD 글자를 덮는다 */
};

class TrampolineEvent {
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.phase='READY';        // READY → AIR → RESULT
    this.t=0; this.bounce=0;
    this.height=TRAMP.baseH; this.y=0; this.vy=0;
    this.spin=0; this.rot=0; this.opened=false; this.tucking=false;
    this.marks=[]; this.sum=0;
    this.combo=0; this.bestCombo=0;
    this.result=null; this.doneAt=0;
    this.msg=''; this.msgAt=-1e9; this.msgBad=false; this.flash=0;
    this.landAt=0;             // 착지 예정 시각(초)
    this.judgeTxt=''; this.judgeAt=-1e9;
  }
  get qualify(){ return this.def.qualify; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }
  /* 착지까지 남은 시간 — HUD 링과 판정이 같은 값을 쓴다 */
  get toLand(){ return this.landAt - this.t/1000; }

  launch(h){
    this.height=clamp(h, 1.4, TRAMP.maxH);
    this.vy=Math.sqrt(2*TRAMP.g*this.height);
    this.y=0; this.spin=0; this.rot=0; this.opened=false; this.tucking=false;
    this.landAt = this.t/1000 + 2*this.vy/TRAMP.g;
    this.phase='AIR';
  }
  onStride(side, tMs){
    if(this.phase==='READY'){ this.bounce=1; this.launch(TRAMP.baseH); return; }
    if(this.phase!=='AIR') return;
    /* 공중 연타 = 회전. 단, 이미 폈으면 안 돈다. */
    if(this.opened) return;
    if(this.toLand < 0.22) return;             // 착지 직전엔 못 돈다
    this.spin = Math.min(TRAMP.maxSpin, this.spin + TRAMP.spinPerTap);
    this.tucking=true;
    Sfx.step(this.spin>=TRAMP.maxSpin?'GOOD':'PERFECT');
  }
  onAction(tMs){
    if(this.phase==='READY'){ this.bounce=1; this.launch(TRAMP.baseH); return; }
    if(this.phase!=='AIR') return;
    const dt = this.toLand;
    /* ① 아직 높이 있으면 = 자세를 편다(회전 정지) */
    if(dt > TRAMP.landWindow*2 && !this.opened && this.spin>0){
      this.opened=true; this.tucking=false;
      Sfx.beep(980,0.08,'sine',0.12); this.say('자세 폄');
      return;
    }
    /* ② 착지 창 안이면 = 다음 점프 밟기 */
    if(Math.abs(dt) <= TRAMP.landWindow*2.4){
      this.land(Math.abs(dt));
    }
  }
  onActionUp(){}

  /* err = 착지 창 중심에서 벗어난 초 */
  land(err){
    const w=TRAMP.landWindow;
    let grade, mul, exec;
    if(err<=w*0.28){ grade='완벽'; mul=TRAMP.gain; exec=1.00; }   /* 0.40 은 너무 넓었다 — 보통(70.4)과 능숙(71.9)이 붙었다 */
    else if(err<=w){ grade='좋음'; mul=0.99;       exec=0.86; }
    else { grade='어긋남'; mul=TRAMP.loss;          exec=0.58; }
    /* ⚠ 예전엔 착지 품질이 **높이를 통해서만** 점수에 닿았다. 높이가 상한(8.4m)에 붙고
       나면 '좋음'도 상한을 유지해서, 오차 0.02 인 능숙과 0.07 인 보통이 **똑같이 71.9점**이
       나왔다 — 실력이 사라진 것이다. 실제 채점처럼 회차마다 수행점수를 따로 곱한다. */
    const form = this.opened ? 1.0 : (this.spin>0 ? 0.55 : 0.85);
    const diff = 1 + this.spin*0.30;                 // 난도
    const mark = this.height * diff * form * exec;
    this.marks.push(mark); this.sum += mark;
    if(grade==='완벽'){ this.combo++; this.bestCombo=Math.max(this.bestCombo,this.combo); }
    else if(grade==='어긋남'){ this.combo=0; }
    this.judgeTxt = grade + (this.opened?'':' · 자세 흐트러짐');
    /* '완벽 · 자세 흐트러짐'이 초록으로 떴다 — 색은 **나쁜 쪽**을 따라야 한다 */
    this.judgeBad = (grade==='어긋남') || !this.opened;
    this.judgeAt = this.t;
    grade==='어긋남' ? Sfx.fail() : Sfx.step(grade==='완벽'?'PERFECT':'GOOD');
    this.flash = grade==='완벽' ? 0.7 : 0.25;
    Track.cheer(grade==='완벽'?0.5:0.15);

    if(this.bounce >= TRAMP.bounces){
      /* 배율은 측정으로 잡았다 — 4.0 일 때 최고 플레이가 38.9 로 기준(52)에 한참 못 미쳤다 */
      const score = this.sum/TRAMP.bounces * 7.4;
      this.phase='RESULT'; this.doneAt=this.t;
      const pass = score >= this.qualify;
      this.result={status:pass?'OK':'MISSED_QUALIFY', value:score, rank:pass?1:3};
      pass?Sfx.finish():Sfx.fail();
      return;
    }
    this.bounce++;
    this.launch(this.height*mul);
  }

  update(dt){
    this.t += dt*1000;
    if(this.phase==='AIR'){
      this.vy -= TRAMP.g*dt;
      this.y = Math.max(0, this.y + this.vy*dt);
      if(!this.opened && this.tucking) this.rot += dt*this.spin*2.4;
      /* 착지 창을 놓치고 매트를 지나쳤다 — 높이가 무너진다 */
      if(this.toLand < -TRAMP.landWindow*2.4){
        this.say('타이밍을 놓쳤다', true);
        this.land(TRAMP.landWindow*3);
      }
    }
    this.flash=Math.max(0,this.flash-dt*3.2);
    Track.crowdTick();
    Sfx.crowd(this.phase==='AIR' ? clamp(this.height/TRAMP.maxH,0,1)*0.7 : 0.25);
  }

  draw(ctx){
    /* ⚠ 트램폴린은 실내다. 밤 야외 경기장을 겹쳐 그리면 두 세계가 섞인다(역도와 같은 문제). */
    let groundY = 206;
    if(!BG.tile(BG.ctx(),'hall-wall', 96, 78, 0)){
      const gt = Track.fieldBack(ctx, 20);
      groundY = Track.fieldGround(ctx,{grassTop:gt, surface:'#4a4550'}) - 8;
    }
    const matW = 78, cx = VW/2;
    /* 매트 */
    if(!BG.obj(BG.ctx(),'trampoline-hd', cx, groundY+22, 30)){
      /* ⚠ 78x7 짜리 매트는 화면에서 그냥 '검은 막대'였다. 트램폴린은 사람 키의
         서너 배짜리 장비다 — 프레임과 다리까지 그려야 무대로 읽힌다. */
      ctx.fillStyle='#2b323f';                                  // 프레임
      ctx.fillRect(cx-matW/2-8, groundY-3, matW+16, 6);
      ctx.fillStyle='#12161e';                                  // 매트
      ctx.fillRect(cx-matW/2, groundY+1, matW, 6);
      ctx.fillStyle='rgba(120,180,255,.13)';
      for(let i=1;i<10;i++) ctx.fillRect(cx-matW/2+i*(matW/10), groundY+1, 1, 6);
      ctx.fillStyle='#4d596b';                                  // 스프링
      for(let i=0;i<=10;i++){ const sx=cx-matW/2+i*(matW/10);
        ctx.fillRect(Math.round(sx)-1, groundY-3, 2, 4); }
      ctx.fillStyle='#3a4352';                                  // 다리
      ctx.fillRect(cx-matW/2-6, groundY+3, 5, 18);
      ctx.fillRect(cx+matW/2+1, groundY+3, 5, 18);
      ctx.fillRect(cx-matW/2-10, groundY+20, 13, 3);
      ctx.fillRect(cx+matW/2-3, groundY+20, 13, 3);
      ctx.fillStyle='rgba(0,0,0,.35)';
      ctx.fillRect(cx-matW/2-10, groundY+23, matW+20, 3);
    }
    const py = groundY - this.y*TRAMP.pxPerM;
    this._ground = groundY; this._matW = matW;
    this._char = { x:cx, y:py, rot:this.rot, tuck:this.tucking && !this.opened };
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.4})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    /* 높이 눈금 — 이 종목의 점수는 높이다. 눈에 보여야 한다.
       ⚠ 게임 캔버스에 13% 알파로 그렸더니 화면에서 완전히 사라졌었다. */
    if(this._ground){
      const gY=this._ground, mw=this._matW, cx0=VW/2;
      const L=cx0-mw/2-34, R=cx0+mw/2+24;
      /* ⚠ 22% 흰 눈금은 관중석 띠 위에서 사라졌다. 그렇다고 세로 레일을 깔았더니
         이번엔 화면을 가로막는 **기둥 두 개**가 됐다 — 눈금마다 작은 칩만 깐다. */
      for(let m=2;m<=8;m+=2){
        const gy = gY - m*TRAMP.pxPerM;
        const on = this.y >= m-0.4;
        u.fillStyle='rgba(6,10,18,.5)';
        u.fillRect(L-1, gy-2, 12, 5); u.fillRect(R-1, gy-2, 12, 5);
        u.fillStyle = on ? PAL.gold : 'rgba(255,255,255,.5)';
        u.fillRect(L, gy, 10, on?2:1); u.fillRect(R, gy, 10, on?2:1);
        txt(u, m+'m', L-4, gy-4, 8, on?PAL.gold:'rgba(255,255,255,.55)','right');
      }
    }
    const c=this._char;
    if(c){
      /* 회전은 캔버스를 돌려서 낸다 — 웅크린 자세 어셋 하나로 공중 연출이 전부 나온다 */
      u.save(); u.translate(c.x, c.y-10); u.rotate(c.rot*Math.PI*2); u.translate(-c.x, -(c.y-10));
      if(!(CharHD.enabled && CharHD.draw(u, 'squirrel', c.x, c.y, c.tuck?0.45:0.05,
          {rare:1, t:this.t, scale:0.85, crouch:c.tuck, airborne:!c.tuck}))){
        u.fillStyle=PAL.gold; u.fillRect(c.x-5, c.y-18, 10, 18);
      }
      u.restore();
    }
    /* 착지 링 — 언제 밟아야 하는지 */
    if(this.phase==='AIR' && c){
      const d=this.toLand;
      if(d < 0.9){
        const k = clamp(1 - d/0.9, 0, 1);
        const r = 20 - k*14;
        u.strokeStyle = Math.abs(d)<=TRAMP.landWindow ? PAL.green : 'rgba(255,255,255,.45)';
        u.lineWidth=2; u.beginPath(); u.arc(c.x, 214, Math.max(4,r), 0, Math.PI*2); u.stroke();
      }
    }
    /* ⚠ y0=26 은 조명탑 램프와 겹쳤다(실측 스크린샷). 뒷판을 깔고 내린다. */
    const y0=40;
    u.fillStyle='rgba(6,10,18,.62)'; u.fillRect(0, 30, VW, 34);
    txt(u,'회차', 14, y0, 9, PAL.dim,'left');
    txt(u, this.bounce+' / '+TRAMP.bounces, 14, y0+13, 15, PAL.white,'left',700);
    txt(u,'높이', 84, y0, 9, PAL.dim,'left');
    txt(u, this.height.toFixed(1)+'m', 84, y0+13, 15, PAL.gold,'left',700);
    txt(u,'회전', 146, y0, 9, PAL.dim,'left');
    txt(u, (this.spin*0.5).toFixed(1)+'바퀴', 146, y0+13, 15,
        this.opened?PAL.green:(this.spin>0?PAL.red:PAL.white),'left',700);
    const cur = this.sum/Math.max(1,this.bounce-(this.phase==='RESULT'?0:1))*7.4;
    txt(u,'점수', VW-14, y0, 9, PAL.dim,'right');
    txt(u, (this.phase==='RESULT'?this.result.value:cur||0).toFixed(1), VW-14, y0+13, 15, PAL.white,'right',700);
    txt(u,'기준 '+this.qualify.toFixed(1), VW-14, y0+27, 9, PAL.green,'right');
    if(this.combo>=2) txt(u, this.combo+'연속 완벽', VW/2, y0+13, 12, PAL.gold,'center',700);

    if(this.phase==='READY')
      txt(u,'아무 키나 눌러 시작 — 매트에 닿는 순간 액션', VW/2, VH-40, 11, PAL.white,'center',700);
    else if(this.phase==='AIR' && this.bounce<=2)
      txt(u,'좌우 = 회전 · 착지 전에 액션으로 펴고, 닿는 순간 다시 액션', VW/2, VH-40, 10, PAL.white,'center');
    if(this.t-this.judgeAt<650)
      txt(u, this.judgeTxt, VW/2, 94, 14,
          this.judgeBad ? PAL.red : (this.judgeTxt.startsWith('완벽')?PAL.green:PAL.gold),'center',700);
    if(this.t-this.msgAt<800)
      txt(u, this.msg, VW/2, 78, 11, this.msgBad?PAL.red:PAL.white,'center');
  }
}
