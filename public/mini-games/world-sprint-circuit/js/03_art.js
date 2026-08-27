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
  LANE_Y:[114, 156, 198],     // 3개 레인의 윗선
  LANE_H:42,                  // 114+42*3 = 240
  GAUGE_Y:242, GAUGE_H:28,    // 242~270 리듬 게이지 전용 띠

  drawBack(ctx, camM, distTotal){
    // 하늘 — 야간 경기장
    const g = ctx.createLinearGradient(0,this.SKY_Y,0,this.CROWD_Y);
    g.addColorStop(0, PAL.sky1); g.addColorStop(1, PAL.sky2);
    ctx.fillStyle=g; ctx.fillRect(0,0,VW,this.CROWD_Y);
    Art.tile(ctx,'sky-stars',this.SKY_Y,camM*0.6);
    // 조명탑 — 하늘 안에만 둔다(예전엔 HUD 뒤로 들어가 부스러기처럼 보였다)
    for(let i=0;i<4;i++){
      const x = Math.round(((i*137 - camM*2.2) % 560 + 560) % 560) - 40;
      this.floodlight(ctx, x, this.SKY_Y+2);
    }
    // 관중 — 카메라보다 훨씬 느리게 흐른다(원경)
    this.crowd(ctx, camM*0.25);
    // 담장
    if(!Art.tile(ctx,'wall-tile',this.WALL_Y,camM*8)){
      ctx.fillStyle=PAL.wallDark; ctx.fillRect(0,this.WALL_Y,VW,this.WALL_H);
      ctx.fillStyle=PAL.wall;     ctx.fillRect(0,this.WALL_Y,VW,this.WALL_H-4);
      const off = Math.round(-camM*8) % 64;
      ctx.fillStyle=PAL.wallLine;
      for(let x=off-64; x<VW+64; x+=64) ctx.fillRect(x, this.WALL_Y, 2, this.WALL_H);
    }
  },

  floodlight(ctx,x,y){
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

  crowd(ctx, off){
    if(Art.tile(ctx,'crowd-tile',this.CROWD_Y,off*8)) return;
    ctx.fillStyle=PAL.crowdA; ctx.fillRect(0,this.CROWD_Y,VW,this.CROWD_H);
    const o = Math.round(-off*8);
    for(let row=0; row<3; row++){
      const y = this.CROWD_Y + 2 + row*8;
      for(let i=-1;i<VW/7+2;i++){
        const x = ((i*7 + o + row*3) % (VW+14) + VW+14) % (VW+14) - 7;
        const h = (i*13+row*7) % 3;
        ctx.fillStyle = h===0?PAL.crowdB : (h===1?PAL.crowdSkin:'#4d5480');
        ctx.fillRect(x, y, 5, 6);
      }
    }
  },

  /* 레인 — 3개만 보여준다(480px 폭에 8레인은 뭉갠다) */
  drawLanes(ctx, camM, mPerPx){
    for(let i=0;i<this.LANE_Y.length;i++){
      const y=this.LANE_Y[i];
      ctx.fillStyle = PAL.grass; ctx.fillRect(0, y-6, VW, 6);
      ctx.fillStyle = PAL.grassLine;
      for(let x=(Math.round(-camM/mPerPx)%12+12)%12-12; x<VW; x+=12) ctx.fillRect(x,y-6,6,2);
      ctx.fillStyle = PAL.track;     ctx.fillRect(0, y, VW, this.LANE_H-6);
      ctx.fillStyle = PAL.trackDark; ctx.fillRect(0, y+this.LANE_H-10, VW, 4);
      ctx.fillStyle = PAL.lane;      ctx.fillRect(0, y-1, VW, 1);
      // 레인 번호 — 어느 줄이 내 줄인지 알 수 있어야 한다
      ctx.fillStyle='rgba(232,226,214,.55)';
      for(let x=(Math.round(-camM/mPerPx)%96+96)%96-96; x<VW; x+=96) this.digit(ctx, x+4, y+3, i+1);
    }
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
      for(const y of this.LANE_Y) ctx.fillRect(x, y+this.LANE_H-12, 1, 8);
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
    for(const y of this.LANE_Y){
      const h = this.LANE_H-6;
      for(let i=0;i*4<h;i++){
        ctx.fillStyle = i%2 ? PAL.white : PAL.black;
        ctx.fillRect(x-2, y + i*4, 4, Math.min(4, h - i*4));
      }
    }
    // 결승 테이프 기둥
    if(!Art.blit(ctx,'finish-tape',x,this.LANE_Y[0])){
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
