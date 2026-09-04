/* ══════════════════════════════════════════════════════════════════
   기계체조 — 링(안정환)

   이 게임의 조작은 거의 전부 '언제 누르나'다. 링은 반대다 — **누르지 않는 것**이 잘하는 것이다.
   링의 실체는 버티기다. 십자버티기·수평버티기는 움직이지 않는 게 기술이고,
   심판이 감점하는 것도 '흔들림'이다.

     ① 자세 잡기  좌·우로 몸을 끌어 흔들림을 0 근처로 되돌린다
     ② 버티기     흔들림이 저절로 커진다. 되잡되 **필요한 만큼만** —
                  많이 누를수록 몸이 출렁여 오히려 감점이다
     ③ 다음 자세  버티기가 차면 액션으로 다음 자세로 넘어간다
     ④ 내리기     마지막 자세 뒤 액션 → 착지. 흔들림이 클수록 착지가 흔들린다

   ⚠ 다른 종목의 '연타가 이득' 습관이 여기서는 손해다. 그래서 화면에
      **누른 횟수**와 **흔들림**을 같이 보여 준다 — 왜 감점됐는지 보이게.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const RING = {
  holds: [
    { name:'버티기',   sec:2.4, drift:0.42, pay:1.0 },
    { name:'십자버티기', sec:2.6, drift:0.62, pay:1.4 },
    { name:'수평버티기', sec:2.8, drift:0.86, pay:1.8 },
  ],
  noise: 6.0,           // 흔들림에 직접 실리는 잡음
  diverge: 0.9,         // 기운 쪽으로 더 기우는 정도(발산) — 가만 두면 커진다
  nudge: 0.30,          // 한 번 되잡을 때 흔들림이 줄어드는 양
  /* ⛔ overshoot(0.13) 은 **배선이 끊긴 채로 있었다** — onStride 주석 참조. 지웠다. */
  fallAt: 1.0,          // |흔들림| 이 이걸 넘으면 자세가 무너진다
  settleMs: 260,        // 자세를 바꾼 직후엔 흔들림을 안 센다(잡을 틈)
  routineMs: 42000,
  landWindow: 0.18,     // 착지 타이밍 창(초)
  swingIv: 520,         // 내리기 전 스윙 위상(초)
};

class RingsEvent {
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.t=0; this.phase='HOLD';        // HOLD → SWITCH → DISMOUNT → MARK → DONE
    this.idx=0;                          // 지금 몇 번째 자세
    this.wob=0;                          // 흔들림 (−1..1)
    this.held=0;                         // 이 자세를 버틴 시간(초)
    this.enteredAt=0;
    this.taps=0;                         // 되잡은 횟수 — 많으면 감점
    this.quality=[];                     // 자세별 안정도 0..1
    this.broke=0;                        // 무너진 자세 수
    this.landQ=0; this.dismountT=0;
    this.msg=''; this.msgAt=-1e9; this.msgBad=false; this.flash=0;
    this.mark=null; this.markAt=-1e9;
    this.result=null; this.doneAt=0;
    this._acc=0; this._frames=0;         // 이 자세의 안정도 누적
    this.seed=1;
  }
  get qualify(){ return this.def.qualify; }
  get hold(){ return RING.holds[Math.min(this.idx, RING.holds.length-1)]; }
  say(m,bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad; }
  /* 결정적 난수 — 같은 판을 다시 보면 같아야 검증할 수 있다.
     ⚠ 1103515245 를 곱하면 2^53 을 넘겨 정밀도가 깨진다(수열이 뭉갠다). 32비트로 돈다. */
  rnd(){ this.seed = (this.seed*1664525 + 1013904223) >>> 0; return this.seed/4294967296; }

  onStride(side){
    if(this.phase!=='HOLD') return;
    /* 되잡기 — 흔들림 반대쪽으로 눌러야 준다. 같은 쪽이면 더 밀린다. */
    const dir = side<0 ? -1 : 1;
    const helping = (dir>0) !== (this.wob>0);          // 흔들리는 반대쪽인가
    if(helping){
      this.wob -= Math.sign(this.wob) * RING.nudge;
      /* ⛔ 여기 `this.vel += dir * RING.overshoot` 이 있었다. 주석은 이렇게 말했다:
         "되잡기에 대가가 없으면 **연타가 최적**이 된다. 되잡을 때마다 반대로 조금 밀린다."
         그런데 `vel` 은 **아무도 안 읽는다** — HOLD 업데이트가 매 프레임 `this.vel = 0` 으로
         지우기만 한다(2026-09-04 죽은 값 검사로 적발). 흔들림 물리를 다시 짤 때
         (`vel` 에 잡음+감쇠 → `wob` 에 직접 잡음, 아래 주석 참조) **이 줄만 남았다.**
         즉 **되잡기의 대가는 지금 존재하지 않는다.**
         ⚠ 지워서 되살리지 않는다 — 값을 새로 정하려면 이 종목을 사람이 칠 수 있는
            드라이버가 먼저 있어야 한다(내 드라이버는 기준 11.7 에 5.06 로 한참 못 미친다).
            **못 재는 값을 지어내느니 없는 채로 두고 적어 둔다.** 균형 결정은 CK 몫. */
      Sfx.step('GOOD');
    } else {
      this.wob += dir * RING.nudge * 0.6;      // 반대쪽을 누르면 더 밀린다 — 이 대가는 산다
      Sfx.step('MISS');
    }
    this.taps++;
  }
  onAction(){
    if(this.phase==='HOLD'){
      if(this.held < this.hold.sec){
        this.say('아직 버텨야 한다', true); Sfx.fail(); return;
      }
      this.finishHold();
      return;
    }
    if(this.phase==='DISMOUNT'){
      /* 스윙 정점에서 놓아야 깨끗이 내려선다 */
      const ph = (this.dismountT*1000/RING.swingIv)%1;
      const err = Math.min(Math.abs(ph-0.5), Math.abs(ph-0.5));
      this.land(err);
    }
  }
  onActionUp(){}
  onUp(){}

  finishHold(){
    const q = this._frames ? clamp(this._acc/this._frames, 0, 1) : 0;
    this.quality.push(q);
    this.say(q>0.8? K('흔들림 없이 버텼다') : q>0.5? K('버텼다') : K('많이 흔들렸다'), q<=0.5);
    Sfx.step(q>0.8?'PERFECT':'GOOD');
    this.idx++;
    this._acc=0; this._frames=0; this.held=0; this.enteredAt=this.t;
    if(this.idx >= RING.holds.length){
      this.phase='DISMOUNT'; this.dismountT=0;
      this.say('정점에서 액션 — 내려서기');
    }
  }
  breakHold(){
    this.broke++;
    this.quality.push(this._frames ? clamp(this._acc/this._frames*0.4, 0, 1) : 0);
    this.say('자세가 무너졌다', true); Sfx.fail(); this.flash=0.5;
    this.wob=0;
    this.idx++;
    this._acc=0; this._frames=0; this.held=0; this.enteredAt=this.t;
    if(this.idx >= RING.holds.length){ this.phase='DISMOUNT'; this.dismountT=0; }
  }
  land(err){
    /* 착지 — 타이밍이 반, 남은 흔들림이 반이다 */
    const timing = err<=RING.landWindow*0.4 ? 1 : err<=RING.landWindow ? 0.7 : 0.3;
    this.landQ = clamp(timing * (1 - Math.abs(this.wob)*0.5), 0, 1);
    this.say(this.landQ>0.8? K('완벽한 착지!') : this.landQ>0.5? K('착지') : K('착지가 흔들렸다'),
             this.landQ<=0.5);
    this.finishRoutine();
  }
  finishRoutine(){
    const avg = this.quality.length ? this.quality.reduce((a,b)=>a+b,0)/this.quality.length : 0;
    /* 난도 = 버틴 자세들의 배점. 무너진 자세는 난도를 못 받는다. */
    let D = 1.6;
    for(let i=0;i<Math.min(this.quality.length, RING.holds.length);i++)
      if(this.quality[i] > 0.25) D += RING.holds[i].pay;
    /* 수행 = 안정도 + 착지. 되잡기가 많으면 깎는다(출렁인 것이다). */
    const tapPenalty = clamp((this.taps - RING.holds.length*3) * 0.06, 0, 1.6);
    const E = clamp(3.4 + 3.2*avg + 2.4*this.landQ - tapPenalty, 0, 9);
    this.mark = +(D+E).toFixed(2);
    this.phase='MARK'; this.markAt=this.t;
    this.flash=Math.max(this.flash, 0.5);
    Sfx.finish(); Track.cheer(clamp(this.mark/14,0,1));
  }

  update(dt){
    this.t+=dt*1000;
    this.flash=Math.max(0,this.flash-dt*3);
    if(this.phase!=='MARK' && this.phase!=='DONE' && this.t>RING.routineMs){
      this.say('연기 시간 초과', true);
      while(this.quality.length < RING.holds.length) this.quality.push(0);
      this.landQ=Math.max(this.landQ,0.2); this.finishRoutine(); return;
    }

    if(this.phase==='HOLD'){
      const H=this.hold;
      /* 흔들림은 저절로 커진다 — 무작위로 밀리고, **기운 쪽으로 더 기운다**(발산).
         ⚠ 처음엔 속도(vel)에 잡음을 넣고 감쇠를 걸었다. 그랬더니 2.4초 동안 흔들림이
            최대 0.27 밖에 안 갔다 — **아무것도 안 해도 13.7점**이 나왔다(기준 10.8).
            버티기가 위협이 아니면 종목이 아니다. 흔들림에 직접 잡음을 주고,
            기운 만큼 비례해 커지게 한다(가만 두면 한 자세 안에 두 배가 넘는다). */
      this.wob += (this.rnd()*2-1) * H.drift * dt * RING.noise;
      this.wob *= 1 + H.drift * dt * RING.diverge;
      this.wob = clamp(this.wob, -1.6, 1.6);

      const settling = this.t - this.enteredAt < RING.settleMs;
      if(!settling){
        this.held += dt;
        this._acc += 1 - Math.min(1, Math.abs(this.wob));
        this._frames++;
        if(Math.abs(this.wob) >= RING.fallAt) this.breakHold();
      }
    }
    else if(this.phase==='DISMOUNT'){
      this.dismountT += dt;
      this.wob *= (1 - dt*0.9);
      if(this.dismountT > 6){ this.land(RING.landWindow*3); }   // 안 내려서면 대충 떨어진다
    }
    else if(this.phase==='MARK'){
      if(this.t-this.markAt>1800){
        this.phase='DONE'; this.doneAt=this.t;
        const pass=this.mark>=this.qualify;
        this.result={status:pass?'OK':'MISSED_QUALIFY', value:this.mark, rank:pass?1:2};
        pass?Sfx.finish():Sfx.fail();
      }
    }
    Track.crowdTick();
    Sfx.crowd(this.phase==='HOLD' ? 0.2 + (1-Math.min(1,Math.abs(this.wob)))*0.3 : 0.35);
  }

  draw(ctx){
    /* 실내 체조장 — 철봉과 같은 무대 */
    if(BG.tile(BG.ctx(),'hall-wall', 90, 78, 0)) BG.hallFloor(ctx, 90, 168);
    else {
      const gt=Track.fieldBack(ctx, 18);
      Track.fieldGround(ctx,{grassTop:gt, surface:'#4a4550'});
      ctx.fillStyle='rgba(8,10,16,.8)'; ctx.fillRect(0,0,VW,VH);
    }
    const cx=VW/2, topY=64, floorY=VH-46;
    this._v={cx, topY, floorY};
    /* 매트 */
    ctx.fillStyle='#3f5a86'; ctx.fillRect(cx-72, floorY-4, 144, 10);
    ctx.fillStyle='rgba(255,255,255,.14)'; ctx.fillRect(cx-72, floorY-4, 144, 1);
    /* 지주와 상단 프레임 — HD 어셋이 오면 그걸 쓴다(배경층: 선수보다 뒤) */
    if(!BG.obj(BG.ctx(),'rings-frame', cx, floorY+4, floorY-topY+8)){
      ctx.fillStyle='#4d5768';
      ctx.fillRect(cx-74, topY, 4, floorY-topY);
      ctx.fillRect(cx+70, topY, 4, floorY-topY);
      ctx.fillStyle='#d8d2c4'; ctx.fillRect(cx-76, topY-3, 152, 4);
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.4})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    const V=this._v; if(!V) return;
    const lean = clamp(this.wob, -1.4, 1.4);
    /* 링 두 개 — 흔들림만큼 함께 기운다. 줄이 기우는 게 곧 감점이라는 걸 눈으로 본다. */
    const ax = V.cx - 26, bx = V.cx + 26;
    const ropeLen = 46, sway = lean*14;
    u.strokeStyle='rgba(220,225,235,.8)'; u.lineWidth=1.5;
    for(const rx of [ax,bx]){
      u.beginPath(); u.moveTo(rx, V.topY);
      u.lineTo(rx+sway, V.topY+ropeLen); u.stroke();
      /* 링 한 개 — 흔들림에 맞춰 움직여야 해서 배경이 아니라 여기서 그린다 */
      if(!BG.obj(u, 'rings-hd', rx+sway, V.topY+ropeLen+11, 12)){
        u.strokeStyle='#d8b45e'; u.lineWidth=2;
        u.beginPath(); u.arc(rx+sway, V.topY+ropeLen+5, 5, 0, 6.284); u.stroke();
      }
      u.strokeStyle='rgba(220,225,235,.8)'; u.lineWidth=1.5;
    }
    /* 선수 */
    const px = V.cx + sway, py = V.topY + ropeLen + 34;
    u.save();
    u.translate(px, py); u.rotate(lean*0.16); u.translate(-px, -py);
    /* ⛔ 0.1 고정이었다. 링은 **흔들림(wob)** 이 곧 자세다 — 그걸 위상으로 준다. */
    if(!CharHD.draw(u, 'monkey', px, py, 0.25 + clamp(this.wob,-1,1)*0.2,
        { act:'swing', t:this.t, scale:1.15, lean:true }))
      { u.fillStyle=PAL.gold; u.fillRect(px-7, py-30, 14, 30); }
    u.restore();

    /* ── 계기 ── */
    /* ⛔ 여기엔 **기준만 있고 내 점수가 없었다**(2026-08-31 점검).
       점수판인데 내 숫자가 없으면 그건 안내판이지 점수판이 아니다. */
    SB.tally(u, {
      name: this.def.name,
      progress: Math.min(this.idx+1, RING.holds.length)+' / '+RING.holds.length,
      mine: this.mark, fmt: v => (v==null? '—' : (+v).toFixed(2)),
      cuts: medalCuts(this.def), higher: !!this.def.higher,
    });
    /* 지금 잡고 있는 자세 이름은 이 종목의 진행 그 자체다 — 점수판 아래 한 줄로 */
    txt(u, this.idx < RING.holds.length ? K(this.hold.name) : K('내리기'),
        8, 36, 13, PAL.gold, 'left', 700);

    /* 흔들림 — 이 종목의 전부다. 가운데가 0. */
    /* ⚠ 여기만 VH-40 으로 남겨 뒀더니 **아래 줄들만 올라가고 이건 안 올라가** 서로 물었다
       (터치 예약 33px 을 넣은 직후). 한 화면의 바닥 무리는 **같은 기준**을 써야 한다. */
    const bw=180, bx0=VW/2-bw/2, by=Track.botY(40);
    txt(u, K('흔들림'), bx0-8, by-1, 9, PAL.dim, 'right');
    u.fillStyle='rgba(255,255,255,.10)'; u.fillRect(bx0, by, bw, 8);
    /* 안전 구간 */
    u.fillStyle='rgba(92,255,156,.20)'; u.fillRect(bx0+bw*0.35, by, bw*0.30, 8);
    const kx = bx0 + bw*(0.5 + clamp(this.wob,-1,1)*0.5);
    u.fillStyle = Math.abs(this.wob)>0.72 ? PAL.red : Math.abs(this.wob)>0.4 ? PAL.gold : PAL.green;
    u.fillRect(Math.round(kx)-2, by-2, 4, 12);

    /* 버티기 진행 */
    if(this.phase==='HOLD'){
      const need=this.hold.sec, p=clamp(this.held/need,0,1);
      u.fillStyle='rgba(255,255,255,.10)'; u.fillRect(bx0, by-14, bw, 5);
      u.fillStyle = p>=1 ? PAL.green : PAL.blue;
      u.fillRect(bx0, by-14, bw*p, 5);
      txt(u, p>=1 ? K('액션으로 다음 자세') : K('%1초 더').replace('%1', (need-this.held).toFixed(1)),
          VW/2, by-26, 10, p>=1?PAL.green:PAL.white, 'center', p>=1?700:400);
    } else if(this.phase==='DISMOUNT'){
      txt(u, K('정점에서 액션 — 내려서기'), VW/2, by-26, 11, PAL.gold, 'center', 700);
    }

    /* ⚠ '왜 감점됐는지'가 안 보이면 사람은 연타를 멈추지 않는다. 누른 횟수를 보여 준다. */
    const over = this.taps - RING.holds.length*3;
    /* ⚠ 8px 글자를 VH-7 에 두면 아랫변(270)을 넘어 잘린다 — 실측으로 확인했다 */
    txt(u, K('되잡기 %1').replace('%1', this.taps), 8, Track.botY(19), 9, over>0?PAL.red:PAL.dim);
    if(over>0) txt(u, K('너무 자주 잡으면 몸이 출렁인다'), 8, Track.botY(9), 8, PAL.red);

    /* ⛔ 이 한 줄이 세 번 자리를 옮겼다 — 그때마다 **먼저 살던 것**과 부딪혔다:
         오른쪽 VH-19 → 2인용 차례 배지(GAUGE_Y+3 = 245~262)
         왼쪽  VH-19 → 바로 위 '되잡기 %1'(같은 줄, 같은 x)
       "자리를 옮길 땐 그 자리에 누가 사는지 재 보고 옮긴다" 고 **주석에 쓴 바로 다음 편집**에서
       그걸 어겼다. 이번엔 남은 자리를 세어서 놓는다 — 되잡기 줄 위, 링 화면의 빈 띠. */
    txt(u, K('좌·우로 되잡아 흔들림을 0 에 둔다'), 8, Track.botY(32), 9, PAL.dim, 'left');

    if(this.t-this.msgAt < 1400)
      txt(u, this.msg, VW/2, 44, 13, this.msgBad?PAL.red:PAL.green, 'center', 700);

    if(this.phase==='MARK' || this.phase==='DONE'){
      plate(u, VW/2-80, 74, 160, 46, .88);
      txt(u, K('점수'), VW/2, 78, 9, PAL.dim, 'center');
      txt(u, this.mark.toFixed(2), VW/2, 90, 24, PAL.gold, 'center', 700);
      const avg=this.quality.length? this.quality.reduce((a,b)=>a+b,0)/this.quality.length : 0;
      txt(u, K('안정 %1%  ·  무너짐 %2').replace('%1', Math.round(avg*100)).replace('%2', this.broke),
          VW/2, 110, 9, PAL.white, 'center');
    }
  }
}
