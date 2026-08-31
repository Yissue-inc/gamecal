/* ══════════════════════════════════════════════════════════════════
   그림 — 지금은 코드로 그린다. 어셋이 도착하면 같은 이름으로 갈아끼운다.
   ⚠ 어셋이 없다고 화면이 비면 안 된다. 항상 코드 그림이 폴백으로 남는다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 팔레트 — 레퍼런스(Atari 8bit)의 대비를 따르되 눈이 덜 아프게 */
const PAL = {
  sky1:'#0b1026', sky2:'#1b2a5e', sky3:'#3a5aa8',
  crowdA:'#2a2f52', crowdB:'#3b4270', crowdSkin:'#c98b64',
  wall:'#8a90a6', wallDark:'#5f6478', wallLine:'#c9cede',
  grass:'#1f6b34', grassLine:'#2c8a44',
  track:'#a8482c', trackDark:'#8c3a22', lane:'#e8e2d6',
  white:'#f2f5fa', black:'#05060a',
  gold:'#ffd75e', red:'#ff5c5c', green:'#5cff9c', blue:'#5aaaff', dim:'#7d8699',
};

/* ── 외부 이미지 로더 (어셋 도착 시 자동 사용) ───────────── */
const Art = {
  cache:{}, missing:{},
  get(name){
    if(this.cache[name]) return this.cache[name];
    if(this.missing[name]) return null;
    const img = new Image();
    img.onload = ()=>{ this.cache[name]=img; };
    img.onerror = ()=>{ this.missing[name]=true; };
    img.src = assetUrl(`assets/${name}.webp`);
    this.missing[name]=false;
    return null;
  },
  /* 어셋을 '바닥 중앙' 기준으로 놓는다. 없으면 false 를 돌려주니 코드 그림으로 넘어가면 된다.
     ⚠ 발주서와 이 함수가 어긋나면 어셋이 와도 화면에 안 나온다 — 이름을 바꾸면 여기도 바꿀 것. */
  blit(ctx, name, x, y, anchor){
    const img=this.get(name); if(!img) return false;
    let ox=img.width/2, oy=img.height;                 // 기본: 바닥 중앙
    if(anchor==='center'){ oy=img.height/2; }
    else if(anchor==='topleft'){ ox=0; oy=0; }
    else if(anchor==='bottomleft'){ ox=0; }
    ctx.drawImage(img, Math.round(x-ox), Math.round(y-oy));
    return true;
  },
  /* 좌우로 이어 붙이는 타일 */
  tile(ctx, name, y, offset, w){
    const img=this.get(name); if(!img) return false;
    const tw=img.width; let x=-((Math.round(offset)%tw)+tw)%tw;
    for(; x<(w||VW); x+=tw) ctx.drawImage(img, Math.round(x), Math.round(y));
    return true;
  },
};

/* ── 배경: 하늘·관중·담장·트랙 ───────────────────────────── */
const Track = {
  /* 트랙 세로 배치 (480×270 기준).
     ⚠ 실측으로 잡음: 예전 값은 y240~269(화면 11%)가 검은 띠로 죽어 있었고
        118~121 에도 틈이 있었다. 아래 값은 270px 를 빈틈 없이 채운다. */
  HUD_H:30,
  SKY_Y:30,  SKY_H:42,
  CROWD_Y:72, CROWD_H:26,
  WALL_Y:98,  WALL_H:16,
  /* ── 레인 원근 ──────────────────────────────────────────
     ⚠ 예전엔 세 레인이 전부 42px 로 같아서 평평한 띠 세 줄이었다 —
        화면의 55% 를 먹으면서 깊이가 전혀 없었다.
     먼 레인일수록 얇고, 가까운 레인일수록 두껍다. 합은 그대로 126.
     ⚠ LANE_H 는 남겨 둔다 — 기존 호출부 20여 곳이 이 값을 쓴다(기준 높이).
        레인별 값이 필요한 곳은 laneH(i)·laneFoot(i)·laneScale(i) 를 쓴다. */
  LANE_Y:[114, 148, 190],     // 3개 레인의 윗선 (34+42+50 = 126)
  LANE_HS:[34, 42, 50],       // 레인별 높이 — 뒤에서 앞으로
  LANE_H:42,                  // 기준 높이(가운데 레인) — 옛 호출부 호환용
  laneH(i){ return this.LANE_HS[i] !== undefined ? this.LANE_HS[i] : this.LANE_H; },
  /* 그 레인에 선 선수의 '발이 닿는 y' */
  laneFoot(i){ return this.LANE_Y[i] + this.laneH(i) - 10; },
  /* 원근에 따른 선수 크기 배율 — 뒤는 작게, 앞은 크게 */
  laneScale(i){ return this.laneH(i) / this.LANE_H; },
  laneBottom(){ const n=this.LANE_Y.length-1; return this.LANE_Y[n] + this.laneH(n); },
  /* 레인 수를 바꾼다 (3 또는 4). 위에서 아래로 점점 두꺼워지고 합은 항상 126.
     ⚠ 사람이 4명이면 레인도 4개여야 한다 — 예전엔 3개로 못 박혀 있었다. */
  setLanes(n){
    n = clamp(n|0, 3, 4);
    if(this.LANE_Y.length === n) return;
    const TOP=114, SPAN=126;
    /* 등차수열로 나눈다 — 뒤가 얇고 앞이 두껍다 */
    const w=[]; let sum=0;
    /* ⚠ 기울기 0.235 는 3레인일 때 예전 값 [34,42,50] 을 그대로 재현한다.
       1인용 화면이 멀티 도입 때문에 바뀌면 안 된다. */
    for(let i=0;i<n;i++){ const v = 1 + i*0.235; w.push(v); sum+=v; }
    const hs=w.map(v=>Math.round(SPAN*v/sum));
    /* 반올림 오차는 마지막 레인이 흡수한다 — 바닥선 240 이 흔들리면 안 된다 */
    hs[n-1] += SPAN - hs.reduce((a,b)=>a+b,0);
    const ys=[]; let y=TOP;
    for(let i=0;i<n;i++){ ys.push(y); y+=hs[i]; }
    this.LANE_Y = ys; this.LANE_HS = hs;
  },
  /* ⛔ **GAUGE_Y 는 이제 상수가 아니라 계산값이다.**
     터치(가로 폰)에서는 화면 바닥을 조작 패드가 덮는다 — 그 높이만큼 위로 올린다.
     이 한 줄이 리듬 띠·도약/투척 게이지·수영 숨·허들 카운터·차례 배지를 **한꺼번에**
     띄운다(전부 GAUGE_Y 를 기준으로 놓여 있다). 자리마다 고치면 새 종목에서 또 빠진다.
     ⚠ 키보드 모드에서는 padInset()=0 이라 예전 값 그대로다. */
  GAUGE_H:28,                 // 리듬 게이지 전용 띠의 높이
  get GAUGE_Y(){
    const inset = (typeof Ctrl !== 'undefined' && Ctrl.padInset) ? Ctrl.padInset() : 0;
    return 242 - inset;
  },
  /* ⛔ **한 줄 조작 안내의 y 는 여기서 정한다.**
     2인용 턴제에서는 화면 왼쪽 아래(222~239)를 **차례 배지**가 쓴다(20_screens.drawTurnBadge).
     그 자리를 두고 배지와 안내가 서로 밀어내다 세 번 자리를 바꿨고, 옮길 때마다
     **옮긴 자리에도 임자가 있었다**(승마·도마·골프·링·7종…).
     자리를 다투는 대신 규칙을 둔다 — **배지가 뜨면 안내가 비킨다.**
     ⚠ 새 종목의 한 줄 안내는 `VH-48` 대신 **`Track.tipY()`** 를 쓸 것.
        안 쓰면 2인 감사(tools/SCREEN_AUDIT.md)에서 겹침으로 잡힌다. */
  /* 차례 배지가 지금 화면에 있나 — 왼쪽 아래(222~239)를 그 배지가 쓴다 */
  turnBadgeOn(){
    return !!(typeof Party !== 'undefined' && Party.on && Party.modeFor &&
              typeof G !== 'undefined' && G.def && Party.modeFor(G.def) === 'turn');
  },
  tipY(){
    const inset = (typeof Ctrl !== 'undefined' && Ctrl.padInset) ? Ctrl.padInset() : 0;
    return (this.turnBadgeOn() ? VH - 64 : VH - 48) - inset;
  },
  /* 바닥에 붙는 것들이 쓰는 공통 뺄셈 — VH-30 대신 Track.botY(30) */
  botY(off){
    const inset = (typeof Ctrl !== 'undefined' && Ctrl.padInset) ? Ctrl.padInset() : 0;
    return VH - off - inset;
  },

  /* 시간대 — 대회마다 하늘이 다르면 "같은 트랙을 또 뛴다"가 덜하다.
     ⚠ 종목 id 로 고정한다. 무작위면 같은 대회를 다시 볼 때마다 하늘이 바뀌어
        오히려 안 자연스럽다(기록 화면과도 어긋난다).
     ⚠ 어셋이 없으면 night-sky → 그라디언트 순으로 물러난다. */
  SKY_ART: { day:'sky-day', dusk:'sky-dusk', night:'sky-night' },
  skyFor(id){
    if(!id) return 'sky-night';
    let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0;
    return [this.SKY_ART.day, this.SKY_ART.dusk, this.SKY_ART.night][h%3];
  },
  drawBack(ctx, camM, distTotal){
    // 하늘 — 시간대별. 없으면 night-sky, 그것도 없으면 그라디언트
    const skyName = this.skyFor(G && G.event && G.event.def && G.event.def.id);
    const skyOk = BG.tile(BG.ctx(), skyName, 0, this.CROWD_Y, camM*0.6);
    if(!skyOk && !BG.tile(BG.ctx(),'night-sky', 0, this.CROWD_Y, camM*0.6)){
      const g = ctx.createLinearGradient(0,this.SKY_Y,0,this.CROWD_Y);
      g.addColorStop(0, PAL.sky1); g.addColorStop(1, PAL.sky2);
      ctx.fillStyle=g; ctx.fillRect(0,0,VW,this.CROWD_Y);
      Art.tile(ctx,'sky-stars',this.SKY_Y,camM*0.6);
    }
    // 조명탑 — 하늘 안에만 둔다(예전엔 HUD 뒤로 들어가 부스러기처럼 보였다)
    for(let i=0;i<4;i++){
      const x = Math.round(((i*137 - camM*2.2) % 560 + 560) % 560) - 40;
      this.floodlight(ctx, x, this.SKY_Y+2);
    }
    // 관중 — 카메라보다 훨씬 느리게 흐른다(원경)
    this.crowd(ctx, camM*0.25);
    // 담장
    if(BG.tile(BG.ctx(),'stadium-wall', this.WALL_Y, this.WALL_H, camM*8)){ /* HD */ }
    else if(!Art.tile(ctx,'wall-tile',this.WALL_Y,camM*8)){
      ctx.fillStyle=PAL.wallDark; ctx.fillRect(0,this.WALL_Y,VW,this.WALL_H);
      ctx.fillStyle=PAL.wall;     ctx.fillRect(0,this.WALL_Y,VW,this.WALL_H-4);
      const off = Math.round(-camM*8) % 64;
      ctx.fillStyle=PAL.wallLine;
      for(let x=off-64; x<VW+64; x+=64) ctx.fillRect(x, this.WALL_Y, 2, this.WALL_H);
    }
    /* 지붕 실루엣 — 있으면 하늘 위에 얹는다 */
    BG.fill(BG.ctx(),'stadium-roof', 0, 30);
    /* 대기 원근 — 하늘·관중·담장을 뒤로 물린다. 선수가 가장 도드라져야 한다. */
    BG.haze(BG.ctx(), {top:0, bottom:this.LANE_Y[0], gain:0.50, far:0.34, mid:0.20, near:0.08});
  },

  floodlight(ctx,x,y){
    if(BG.obj(BG.ctx(),'floodlight-tower', x+9, this.CROWD_Y, this.CROWD_Y-y)){
      /* 조명 번짐 — 탑만 있으면 밤인데 빛이 안 난다. 등 위에 옅게 겹친다. */
      const fl = BG.get('flare-light');
      if(fl){ const c=BG.ctx();
        c.save(); c.globalAlpha=0.30; c.globalCompositeOperation='lighter';
        c.drawImage(fl, x-9, y-8, 36, 36); c.restore(); }
      return;
    }
    ctx.fillStyle='#2b3352'; ctx.fillRect(x+7,y+10,3,this.CROWD_Y-y-10);
    if(!Art.blit(ctx,'floodlight',x+9,y+12)){
      ctx.fillStyle='#4a5580'; ctx.fillRect(x,y,18,10);
      ctx.fillStyle='#fff6c8';
      for(let i=0;i<4;i++) for(let j=0;j<2;j++) ctx.fillRect(x+1+i*4, y+1+j*4, 3, 3);
    }
    // 빛무리
    ctx.fillStyle='rgba(255,246,200,.07)';
    ctx.beginPath(); ctx.moveTo(x+9,y+10); ctx.lineTo(x-14,this.CROWD_Y); ctx.lineTo(x+32,this.CROWD_Y); ctx.fill();
  },

  /* ── 관중 반응 ─────────────────────────────────────────
     ⚠ 지금 관중은 소리만 반응하고(Audio2.crowd) 그림은 완전히 정지해 있다.
        측정상 평균 밝기 35 로 화면에서 가장 눈에 안 띈다 — 사실상 없는 것이다.
     ROAR(월드컵 응원 게임)에서 가져온 것: **관중이 주인공처럼 반응한다.**
       · 열기(heat) 가 오르면 띠가 위로 들썩이고 밝아진다
       · 파도타기가 화면을 훑고 지나간다
       · 큰 순간(단계 상승·결승선)엔 한 번 크게 튄다
     열기는 게임 쪽에서 Track.crowdHeat 로 넣는다. */
  heat: 0, waveT: 0, pop: 0,
  setHeat(v){ this.heat = clamp(v, 0, 1); },
  cheer(power){ this.pop = Math.max(this.pop, power===undefined?1:power); },
  crowdTick(){
    this.waveT += 0.006 + this.heat*0.020;
    if(this.pop > 0) this.pop = Math.max(0, this.pop - 0.035);
  },
  crowd(ctx, off){
    this.crowdTick();
    const bg=BG.ctx();
    /* 들썩임 — 열기가 높을수록 크고, 큰 순간엔 한 번 크게 */
    const lift = -(this.heat*2.2 + this.pop*3.4);
    if(BG.tile(bg,'crowd-far', this.CROWD_Y+lift*0.5, this.CROWD_H, off*8)){
      BG.tile(bg,'crowd-near', this.CROWD_Y+this.CROWD_H*0.55+lift,
              this.CROWD_H*0.45, off*20);
      this.crowdWave(bg);
      return;
    }
    if(Art.tile(ctx,'crowd-tile',this.CROWD_Y,off*8)) return;
    ctx.fillStyle=PAL.crowdA; ctx.fillRect(0,this.CROWD_Y,VW,this.CROWD_H);
    const o = Math.round(-off*8);
    for(let row=0; row<3; row++){
      const y0 = this.CROWD_Y + 2 + row*8;
      for(let i=-1;i<VW/7+2;i++){
        const x = ((i*7 + o + row*3) % (VW+14) + VW+14) % (VW+14) - 7;
        const h = (i*13+row*7) % 3;
        /* 파도타기 — 화면을 훑고 지나가며 그 자리 관중만 일어선다 */
        const phase = this.waveT*6 - x*0.035 - row*0.25;
        const w = Math.max(0, Math.sin(phase));
        const jump = Math.round(w*w * (2 + this.heat*4) + this.pop*4);
        ctx.fillStyle = h===0?PAL.crowdB : (h===1?PAL.crowdSkin:'#4d5480');
        ctx.fillRect(x, y0 - jump, 5, 6);
      }
    }
  },
  /* HD 관중 위에 얹는 파도 — 어셋이 정지 그림이라 코드가 움직임을 만든다 */
  crowdWave(bg){
    if(!bg) return;
    const y=this.CROWD_Y, h=this.CROWD_H;
    const cx = ((this.waveT*0.9) % 1.6 - 0.3) * VW;
    if(cx < -90 || cx > VW+90) return;
    const g = bg.createLinearGradient(cx-70, 0, cx+70, 0);
    g.addColorStop(0,   'rgba(255,238,190,0)');
    g.addColorStop(0.5, `rgba(255,238,190,${0.08+this.heat*0.16})`);
    g.addColorStop(1,   'rgba(255,238,190,0)');
    bg.fillStyle=g; bg.fillRect(cx-70, y, 140, h);
  },

  /* 레인 — 3개만 보여준다(480px 폭에 8레인은 뭉갠다) */
  drawLanes(ctx, camM, mPerPx){
    for(let i=0;i<this.LANE_Y.length;i++){
      const y=this.LANE_Y[i], LH=this.laneH(i);
      /* HD 트랙면이 있으면 잔디·트랙면 전부 그 층이 맡는다.
         ⚠ 픽셀 캔버스가 위에 있으므로 여기서 칠하면 배경층이 통째로 가려진다 — 안 칠해야 한다.
         레인 번호·5m 눈금·결승선은 픽셀 층에 그대로 남긴다(정보라서 또렷해야 한다). */
      const hd = BG.tile(BG.ctx(), 'track-surface', y-6, LH, camM/mPerPx);
      if(!hd){
        ctx.fillStyle = PAL.grass; ctx.fillRect(0, y-6, VW, 6);
        ctx.fillStyle = PAL.grassLine;
        for(let x=(Math.round(-camM/mPerPx)%12+12)%12-12; x<VW; x+=12) ctx.fillRect(x,y-6,6,2);
        ctx.fillStyle = PAL.track;     ctx.fillRect(0, y, VW, LH-6);
        ctx.fillStyle = PAL.trackDark; ctx.fillRect(0, y+LH-10, VW, 4);
        ctx.fillStyle = PAL.lane;      ctx.fillRect(0, y-1, VW, 1);
      }
      // 레인 번호 — 어느 줄이 내 줄인지 알 수 있어야 한다
      ctx.fillStyle='rgba(232,226,214,.55)';
      for(let x=(Math.round(-camM/mPerPx)%96+96)%96-96; x<VW; x+=96) this.digit(ctx, x+4, y+3, i+1);
    }
    this.laneHaze();
  },

  /* 트랙 원근 — 위쪽(먼) 레인일수록 살짝 더 어둡게. 3개 레인이 평평해 보이지 않게. */
  laneHaze(){
    const bg=BG.ctx(); if(!bg) return;
    /* 트랙은 밝기를 거의 유지하되(선수가 딛는 면), 먼 레인만 살짝 물린다 */
    BG.haze(bg, {top:this.LANE_Y[0], bottom:this.laneBottom(),
                 gain:1, far:0.30, mid:0.12, near:0.0});
  },

  /* 아주 작은 숫자 (3x5 픽셀) — 레인 번호용 */
  digit(ctx,x,y,n){
    const F={1:[6,2,2,2,7],2:[7,1,7,4,7],3:[7,1,7,1,7],4:[5,5,7,1,1],
             5:[7,4,7,1,7],6:[7,4,7,5,7],7:[7,1,1,1,1],8:[7,5,7,5,7],
             9:[7,5,7,1,7],0:[7,5,5,5,7]}[n]||[7,5,5,5,7];
    for(let r=0;r<5;r++) for(let c=0;c<3;c++) if(F[r]&(4>>c)) ctx.fillRect(x+c,y+r,1,1);
  },

  /* 여러 자리 숫자 */
  num(ctx,x,y,n){ const str=String(n); for(let i=0;i<str.length;i++) this.digit(ctx,x+i*4,y,+str[i]); },

  /* 5m 간격 눈금 — 속도감의 핵심. 이게 없으면 제자리 뛰는 것처럼 보인다 */
  drawMarks(ctx, camM, mPerPx){
    ctx.fillStyle='rgba(242,245,250,.30)';
    const first = Math.floor(camM/5)*5;
    for(let m=first; m<camM + VW*mPerPx + 5; m+=5){
      const x = Math.round((m-camM)/mPerPx);
      if(x<-2||x>VW) continue;
      for(let i=0;i<this.LANE_Y.length;i++) ctx.fillRect(x, this.LANE_Y[i]+this.laneH(i)-12, 1, 8);
    }
  },

  /* 필드 종목(뛰기·던지기) 공용 바닥.
     ⚠ 실측으로 다시 짬: 예전엔 트랙 띠가 얇고 위아래로 잔디만 넓어 화면 절반이 비었고,
        모래밭이 발 라인보다 위에 그려져 떠 있는 것처럼 보였다.
     반환값 GROUND 가 '발이 닿는 y' 다 — 모든 오브젝트는 이 값을 기준으로 놓는다. */
  /* 필드 종목 전용 배경 — 관중석을 트랙 가까이 내린다.
     ⚠ 달리기용 배치를 그대로 쓰면 담장(114)과 주로(180) 사이가 초록 공백으로
        화면의 40% 를 먹는다(실측). 여기서는 담장을 158 까지 내려 붙인다. */
  fieldBack(ctx, camM){
    const CY=118, CH=26, WY=144, WH=14;
    const g=ctx.createLinearGradient(0,0,0,CY);
    g.addColorStop(0,PAL.sky1); g.addColorStop(1,PAL.sky2);
    ctx.fillStyle=g; ctx.fillRect(0,0,VW,CY);
    for(let i=0;i<4;i++){
      const x=Math.round(((i*137 - camM*1.4)%560+560)%560)-40;
      ctx.fillStyle='#2b3352'; ctx.fillRect(x+7,34,3,CY-34);
      ctx.fillStyle='#4a5580'; ctx.fillRect(x,24,18,10);
      ctx.fillStyle='#fff6c8';
      for(let a=0;a<4;a++) for(let b=0;b<2;b++) ctx.fillRect(x+1+a*4,25+b*4,3,3);
      ctx.fillStyle='rgba(255,246,200,.07)';
      ctx.beginPath(); ctx.moveTo(x+9,34); ctx.lineTo(x-16,CY); ctx.lineTo(x+34,CY); ctx.fill();
    }
    const save={CROWD_Y:this.CROWD_Y, CROWD_H:this.CROWD_H};
    this.CROWD_Y=CY; this.CROWD_H=CH; this.crowd(ctx, camM*0.25);
    this.CROWD_Y=save.CROWD_Y; this.CROWD_H=save.CROWD_H;
    ctx.fillStyle=PAL.wallDark; ctx.fillRect(0,WY,VW,WH);
    ctx.fillStyle=PAL.wall;     ctx.fillRect(0,WY,VW,WH-4);
    const off=Math.round(-camM*6)%64; ctx.fillStyle=PAL.wallLine;
    for(let x=off-64;x<VW+64;x+=64) ctx.fillRect(x,WY,2,WH);
    return WY+WH;                      // 잔디 시작 y
  },

  fieldGround(ctx, opt){
    opt = opt||{};
    const GROUND = 214;                 // 발 라인 (게이지 띠 242 위로 여유)
    const STRIP  = 34;                  // 트랙(주로) 두께
    const top0   = opt.grassTop ?? (this.WALL_Y+this.WALL_H);
    // 잔디
    ctx.fillStyle = PAL.grass;   ctx.fillRect(0, top0, VW, VH-top0);
    ctx.fillStyle = PAL.grassLine;
    for(let x=0;x<VW;x+=14) ctx.fillRect(x, top0+2, 7, 2);
    // 주로
    const top = GROUND - STRIP;
    ctx.fillStyle = opt.surface || PAL.track; ctx.fillRect(0, top, VW, STRIP);
    ctx.fillStyle = PAL.trackDark;            ctx.fillRect(0, GROUND-4, VW, 4);
    ctx.fillStyle = PAL.lane;                 ctx.fillRect(0, top, VW, 1);
    return GROUND;
  },

  /* 결승선 */
  drawFinish(ctx, camM, mPerPx, finishM){
    const x = Math.round((finishM-camM)/mPerPx);
    if(x < -20 || x > VW+20) return;
    // 트랙 면 안에만 그린다 — 예전엔 잔디까지 덮어 띠가 어긋나 보였다
    for(let li=0; li<this.LANE_Y.length; li++){
      const y = this.LANE_Y[li];
      const h = this.laneH(li)-6;
      for(let i=0;i*4<h;i++){
        ctx.fillStyle = i%2 ? PAL.white : PAL.black;
        ctx.fillRect(x-2, y + i*4, 4, Math.min(4, h - i*4));
      }
    }
    // 결승 테이프 기둥
    if(BG.obj(BG.ctx(),'finish-tape-hd',x,this.LANE_Y[0]+8,60)){ /* HD */ }
    else if(!Art.blit(ctx,'finish-tape',x,this.LANE_Y[0])){
      ctx.fillStyle=PAL.white; ctx.fillRect(x-1, this.WALL_Y, 2, this.LANE_Y[0]-this.WALL_Y);
    }
  },
};

/* ── 선수 스프라이트 ─────────────────────────────────────── */
/* 어셋이 오면 assets/runner-<color>.webp 8프레임 시트로 대체된다.
   지금은 코드로 그린다 — 머리·몸통·팔·다리 6조각. */
function drawRunner(ctx, x, y, phase, color, opts){
  opts = opts||{};
  // 자세 어셋(웅크림·젖힘·도약·던지기)이 있으면 그쪽이 먼저
  const poseName = opts.crouch ? 'pose-crouch' : opts.throwing ? 'pose-throw'
                 : opts.airborne ? 'pose-jump' : opts.lean ? 'pose-lean' : null;
  if(poseName && Art.blit(ctx, poseName, x, y)) return;
  /* ⚠ color 는 '#5aaaff' 처럼 # 가 붙어 온다. 그대로 쓰면 파일명이 'runner-#5aaaff' 가 돼
     어셋이 도착해도 영영 안 붙는다(실측으로 잡음). */
  /* ⛔ 어셋이 없으면 곧장 **막대 인간**으로 떨어졌다 — 그래서 멀리뛰기·높이뛰기 같은
     종목이 "사람이 없는" 것처럼 보였다(48종목 감사에서 CharHD 호출 0회로 잡힘).
     CK: "액션 동작도 없고 너무 심심해요 다른 종목도 마찬가지".
     막대로 떨어지기 **전에** 제대로 된 캐릭터를 먼저 시도한다.
     ⚠ 이미 CharHD 를 시도하고 실패해 여기로 온 호출부도 있다 — 그땐 한 번 더 실패하고
        아래 막대로 간다(무한루프 없음). 종족은 사람이 고른 것을 쓴다. */
  if(!opts._noChar && typeof CharHD!=='undefined' && CharHD.enabled){
    const sp = opts.species
      || ((typeof Party!=='undefined' && Party.species) ? Party.species(0) : null)
      || 'hare';
    if(CharHD.draw(ctx, sp, x, y, phase, {
        act: opts.act || '', air: !!opts.airborne, crouch: !!opts.crouch,
        throwing: !!opts.throwing, lean: !!opts.lean,
        rare: 2, t: (typeof performance!=='undefined' ? performance.now() : 0),
        scale: opts.scale || 0.9 })) return;
  }
  const img = Art.get('runner-' + String(color).replace('#',''));
  if(img){                                   // 달리기 시트
    const F=8, fw=img.width/F, fh=img.height;
    const f = Math.floor(phase*F) % F;
    ctx.drawImage(img, f*fw, 0, fw, fh, Math.round(x-fw/2), Math.round(y-fh), fw, fh);
    return;
  }
  const p = phase*Math.PI*2;
  const lean = opts.lean ? 3 : 0;
  const crouch = opts.crouch ? 5 : 0;
  const sw = Math.sin(p), cw = Math.cos(p);
  const px = Math.round(x), py = Math.round(y);
  const skin = opts.skin || '#e0a878';
  const S=(dx,dy,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(px+Math.round(dx),py+Math.round(dy),w,h); };
  // 다리
  S(-1 + sw*4, -9+crouch, 3, 9+Math.round(cw*2), color);
  S(-1 - sw*4, -9+crouch, 3, 9-Math.round(cw*2), color);
  // 발
  S(-2 + sw*5, -1+crouch+Math.round(cw*2), 4, 2, PAL.white);
  S(-2 - sw*5, -1+crouch-Math.round(cw*2), 4, 2, PAL.white);
  // 몸통
  S(-3+lean, -20+crouch, 6, 12, color);
  // 팔 (다리와 반대 위상)
  S(-4 - sw*3 + lean, -19+crouch, 3, 7, skin);
  S( 1 + sw*3 + lean, -19+crouch, 3, 7, skin);
  // 머리
  S(-3+lean, -26+crouch, 6, 6, skin);
  S(-3+lean, -27+crouch, 6, 2, '#2b2118');
}
