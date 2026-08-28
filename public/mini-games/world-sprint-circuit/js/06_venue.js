/* ══════════════════════════════════════════════════════════════════
   경기장 — 종목마다 다른 무대.
   ⚠ 아케이드에는 종목별 화면이 있는데 **감독 모드 관전은 전부 같은 트랙**이었다.
      수영도 던지기도 같은 붉은 트랙 위에서 벌어졌다. 여기 모아 두고 양쪽이 함께 쓴다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* ── 고해상도 배경 층 ────────────────────────────────────
   ⚠ 무대는 픽셀 캔버스(480x270, 스무딩 꺼짐)에 그려진다. 고해상도 그림을 거기
      넣으면 뭉갠다. 캐릭터가 UI 캔버스로 간 것과 같은 이유로, 배경 어셋도
      UI 층에 그린다. 순서는 배경 → 캐릭터 → HUD.
   어셋이 없으면 지금처럼 코드 그림(픽셀 캔버스)으로 폴백한다. */
const BG = {
  cache:{}, missing:{},
  get(name){
    if(this.cache[name]) return this.cache[name];
    if(this.missing[name]) return null;
    const img=new Image();
    img.onload=()=>{ this.cache[name]=img; };
    img.onerror=()=>{ this.missing[name]=true; };
    img.src = assetUrl(`assets/${name}.webp`);
    this.missing[name]=false;
    return null;
  },
  ctx(){ return Screen.bctx; },
  /* 가로로 이어 붙이는 배경 타일. y·h 는 게임 좌표. */
  tile(u, name, y, h, offsetPx){
    if(!u) return false;
    const img=this.get(name); if(!img) return false;
    const w = h * (img.width/img.height);           // 게임 좌표 폭
    if(!(w>0.5)) return false;
    let x = -((((offsetPx||0)%w)+w)%w);
    for(; x<VW; x+=w) u.drawImage(img, x, y, w, h);
    return true;
  },
  /* 한 장짜리 배경 */
  fill(u, name, y, h){
    const img=this.get(name); if(!img) return false;
    u.drawImage(img, 0, y, VW, h);
    return true;
  },
  /* 오브젝트 — 바닥 중앙 기준 */
  obj(u, name, x, y, h){
    const img=this.get(name); if(!img) return false;
    const w = h*(img.width/img.height);
    u.drawImage(img, Math.round(x-w/2), Math.round(y-h), w, h);
    return true;
  },
};

const Venue = {
  /* 종목 → 무대 종류 */
  kindOf(ev){
    if(!ev) return 'track';
    if(ev.kind==='swim') return 'pool';
    if(ev.kind==='throw') return 'throwField';
    if(ev.id==='highJump'||ev.id==='poleVault') return 'vertical';
    if(ev.kind==='jump') return 'runway';
    return 'track';
  },

  /* ── 트랙 (달리기·허들·계주) ── */
  track(ctx, camM, mPerPx, ev, opt){
    opt=opt||{};
    Track.drawBack(ctx, camM, ev?ev.distanceM:100);
    Track.drawLanes(ctx, camM, mPerPx);
    Track.drawMarks(ctx, camM, mPerPx);
    if(ev && ev.id==='hurdles110'){
      for(let i=0;i<RULES.hurdleCount;i++){
        const m=RULES.hurdleFirstM+i*RULES.hurdleSpacingM;
        const x=Math.round((m-camM)/mPerPx);
        if(x<-8||x>VW+8) continue;
        for(let L=0;L<3;L++){
          const hy=Track.LANE_Y[L]+Track.LANE_H-10;
          if(Art.blit(ctx,'hurdle',x,hy)) continue;
          ctx.fillStyle='#e8e2d6'; ctx.fillRect(x-4,hy-13,9,2);
          ctx.fillStyle='#c9cede'; ctx.fillRect(x-3,hy-11,1,11); ctx.fillRect(x+3,hy-11,1,11);
        }
      }
    }
    if(ev && ev.kind==='relay'){
      const legM=(ev.distanceM||400)/4;
      for(let i=1;i<4;i++){
        const z0=i*legM-20, z1=i*legM;
        const x0=Math.round((z0-camM)/mPerPx), x1=Math.round((z1-camM)/mPerPx);
        if(x1<0||x0>VW) continue;
        ctx.fillStyle='rgba(92,255,156,.12)';
        for(const y of Track.LANE_Y) ctx.fillRect(x0,y,x1-x0,Track.LANE_H-6);
      }
    }
    Track.drawFinish(ctx, camM, mPerPx, ev?ev.distanceM:100);
    return { lanes:Track.LANE_Y.map(y=>y+Track.LANE_H-10), toX:(m)=>Math.round((m-camM)/mPerPx) };
  },

  /* ── 수영장 ── */
  pool(ctx, t, ev){
    Track.drawBack(ctx, 40, 100);
    const LY=[118,158,198], LH=38;
    const bg=BG.ctx();
    /* HD 물 타일이 있으면 물결까지 그 층이 맡는다(t 로 천천히 흐른다) */
    const hdW = BG.tile(bg,'pool-water', LY[0]-8, VH-LY[0]+8, t*0.012);
    if(!hdW){
      ctx.fillStyle='#0e3a5a'; ctx.fillRect(0, LY[0]-8, VW, VH-LY[0]+8);
      for(let i=0;i<3;i++){
        const y=LY[i];
        ctx.fillStyle = i===1? '#12507a' : '#104466';
        ctx.fillRect(0, y, VW, LH-6);
        ctx.fillStyle='#e8dcc0';
        const off=Math.round(-t*0.02)%14;
        for(let x=off-14;x<VW;x+=14) ctx.fillRect(x, y-2, 7, 2);
        ctx.fillStyle='rgba(255,255,255,.10)'; ctx.fillRect(0, y+LH-8, VW, 1);
      }
    }
    /* 레인 로프 — 물 위에 얹는다 */
    for(let i=0;i<3;i++) BG.tile(bg,'pool-lane-rope', LY[i]-4, 6, t*0.02);
    ctx.fillStyle='rgba(255,255,255,.08)';
    for(let i=0;i<3;i++) ctx.fillRect(0, LY[i]+LH/2-4, VW, 2);
    ctx.fillStyle='#c9cede'; ctx.fillRect(24, LY[0]-8, 6, VH-LY[0]+8);
    ctx.fillRect(VW-30, LY[0]-8, 6, VH-LY[0]+8);
    const seg=VW-64;
    return { lanes:LY.map(y=>y+LH/2-4),
      toX:(d)=>{ const pool=50; const lap=Math.min(1,Math.floor(d/pool));
        const w=(d-lap*pool)/pool; return lap===0? 32+w*seg : 32+(1-w)*seg; } };
  },

  /* ── 투척장 (부채꼴 섹터) ── */
  throwField(ctx, t, ev){
    const gt=Track.fieldBack(ctx, 20);
    const CX=70, mPerPx=0.20;
    const px=(m)=>Math.round(CX+m/mPerPx);
    /* HD 투척장 한 장이 잔디·섹터선·서클을 통째로 담는다 */
    const hdF = BG.fill(BG.ctx(),'throw-sector', gt, VH-gt);
    const GROUND = hdF ? 214 : Track.fieldGround(ctx,{grassTop:gt, surface:PAL.grass});
    if(!hdF){
      /* 섹터 선 */
      ctx.strokeStyle='rgba(242,245,250,.18)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(CX,GROUND); ctx.lineTo(VW, GROUND-46); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CX,GROUND); ctx.lineTo(VW, GROUND+8); ctx.stroke();
      /* 서클 */
      ctx.fillStyle=PAL.wallDark; ctx.fillRect(CX-24, GROUND-4, 48, 4);
      ctx.fillStyle=PAL.wall;     ctx.fillRect(CX-24, GROUND-4, 48, 2);
    }
    /* 거리 호 */
    for(let m=20;m<=100;m+=20){
      const x=px(m); if(x<=CX||x>=VW) continue;
      ctx.strokeStyle='rgba(242,245,250,.14)';
      ctx.beginPath(); ctx.ellipse(CX, GROUND, x-CX, 26, 0, -Math.PI*0.42, Math.PI*0.08); ctx.stroke();
      ctx.fillStyle='rgba(242,245,250,.55)'; Track.num(ctx, x-6, GROUND-24, m);
    }
    return { ground:GROUND, cx:CX, toX:px, mPerPx };
  },

  /* ── 도약 주로 (멀리·세단) ── */
  runway(ctx, camM, mPerPx, ev){
    const gt=Track.fieldBack(ctx, camM);
    const bgc=BG.ctx();
    /* HD 조주로 — 있으면 잔디·트랙면을 그 층이 맡는다 */
    const hdR = BG.tile(bgc,'runway-strip', 180, 34+6, camM/mPerPx);
    const GROUND = hdR ? 214 : Track.fieldGround(ctx,{grassTop:gt});
    const px=(m)=>Math.round((m-camM)/mPerPx);
    const far = ev && ev.id==='tripleJump' ? 22 : 10.5;
    const sx=px(RULES.boardPositionM+(ev&&ev.id==='tripleJump'?8:0.6));
    const sw=px(RULES.boardPositionM+far)-sx;
    let hdSand=false;
    if(BG.cache['sand-pit'] || BG.missing['sand-pit']===undefined){
      const img=BG.get('sand-pit');
      if(img){ const bh=14, bw=bh*(img.width/img.height);
        bgc.save(); bgc.beginPath(); bgc.rect(sx,GROUND-bh,sw,bh); bgc.clip();
        for(let x=sx-((sx%bw)+bw)%bw; x<sx+sw; x+=bw) bgc.drawImage(img,x,GROUND-bh,bw,bh);
        bgc.restore(); hdSand=true; }
    }
    if(!hdSand && !Art.tile(ctx,'sandpit-tile',GROUND-8,-sx,sx+sw)){
      ctx.fillStyle='#c4ae78'; ctx.fillRect(sx,GROUND-6,sw,6);
      ctx.fillStyle='#d9c48f'; ctx.fillRect(sx,GROUND-5,sw,4);
    }
    const step = ev&&ev.id==='tripleJump' ? 2 : 1;
    for(let m=step;m<=far;m+=step){
      const x=px(RULES.boardPositionM+m); if(x<-4||x>VW+4) continue;
      ctx.fillStyle='rgba(5,6,10,.45)'; ctx.fillRect(x,GROUND-6,1,6);
      if(m%(step*2)===0){ ctx.fillStyle='rgba(5,6,10,.6)'; Track.num(ctx,x+2,GROUND-14,m); }
    }
    const BX=px(RULES.boardPositionM);
    if(BG.obj(bgc,'takeoff-board-hd',BX,GROUND,14)){ /* HD */ }
    else if(!Art.blit(ctx,'board-takeoff',BX,GROUND)){
      ctx.fillStyle=PAL.white; ctx.fillRect(BX-7,GROUND-7,12,7);
      ctx.fillStyle=PAL.red;   ctx.fillRect(BX+5,GROUND-7,3,7);
    }
    return { ground:GROUND, toX:px, board:BX };
  },

  /* ── 수직 도약 (높이뛰기·장대) ── */
  vertical(ctx, t, ev, bar){
    const gt=Track.fieldBack(ctx, 30);
    const bgv=BG.ctx();
    const hdV = BG.tile(bgv,'runway-strip', 180, 34+6, 0);
    const GROUND = hdV ? 214 : Track.fieldGround(ctx,{grassTop:gt});
    const BAR_X = 300, PXPM = ev&&ev.id==='poleVault' ? 26 : 58;
    if(ev&&ev.id==='poleVault'){ ctx.fillStyle='#3a3346'; ctx.fillRect(BAR_X-5,GROUND-4,12,4); }
    if(BG.obj(bgv,'vault-mat',BAR_X+60,GROUND,36)){ /* HD */ }
    else if(!Art.blit(ctx,'highbar-mat',BAR_X+60,GROUND)){
      ctx.fillStyle='#2b3152'; ctx.fillRect(BAR_X+8,GROUND-20,104,20);
      ctx.fillStyle='#3b4270'; ctx.fillRect(BAR_X+8,GROUND-20,104,15);
    }
    const barY=GROUND-(bar||1.5)*PXPM;
    if(!Art.blit(ctx,'highbar-stand',BAR_X,GROUND)){
      ctx.fillStyle='#c9cede'; ctx.fillRect(BAR_X-2,barY-2,4,GROUND-barY+2); }
    if(!Art.blit(ctx,'highbar-stand',BAR_X+102,GROUND)){
      ctx.fillStyle='#c9cede'; ctx.fillRect(BAR_X+100,barY-2,4,GROUND-barY+2); }
    ctx.fillStyle=PAL.gold; ctx.fillRect(BAR_X,barY,104,3);
    /* 높이 눈금 */
    ctx.fillStyle='rgba(242,245,250,.35)';
    for(let m=1;m<=(ev&&ev.id==='poleVault'?7:3);m++){
      const y=GROUND-m*PXPM; if(y<20) break;
      ctx.fillRect(BAR_X-16, y, 6, 1);
      ctx.fillStyle='rgba(242,245,250,.55)'; Track.num(ctx, BAR_X-30, y-3, m);
      ctx.fillStyle='rgba(242,245,250,.35)';
    }
    return { ground:GROUND, barX:BAR_X, pxpm:PXPM, barY };
  },
};
