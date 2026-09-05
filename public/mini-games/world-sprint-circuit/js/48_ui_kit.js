/* ══════════════════════════════════════════════════════════════════
   UI 키트 — 방치형 보상 게임 · 육성 시뮬의 어휘

   레퍼런스(에픽세븐·AFK아레나·방치형 RPG들)에서 공통으로 쓰는 것들:
     ① 액자형 패널   — 그냥 사각형이 아니라 테두리가 있는 판
     ② 등급 테두리   — 아이템·캐릭터 카드는 희귀도가 **색과 두께**로 보인다
     ③ 레벨 뱃지     — 카드 모서리에 Lv 가 항상 붙어 있다
     ④ 아이템 상자 행 — 보상은 '아이콘 + 수량' 상자를 가로로 늘어놓는다
     ⑤ 큰 수령 버튼   — 화면에서 제일 큰 것이 '받기'다
     ⑥ 분당 획득률    — 3300(+1607)/m 처럼 **비율과 보너스**를 같이 보여 준다
     ⑦ 상한 표시     — "12시간 0분 (최대 12시간)"
     ⑧ 큰 수 축약    — 73M · 1875K · 305억

   ⛔ 이 파일은 **그리는 도구만** 둔다. 규칙·계산은 한 줄도 없다.
      기존 화면은 안 건드린다 — 쓰고 싶은 화면이 골라 쓴다.

   ⚠ 우리 화면은 480×270 픽셀이다. 레퍼런스의 화려한 판타지 액자를 그대로 옮길
      수는 없다. **구조를 가져오고 장식은 우리 해상도에 맞춘다.**
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const UIK = {
  /* ── 큰 수 축약 ──────────────────────────────────────────
     방치형은 수가 커진다. 1,234,567 을 그대로 쓰면 읽히지 않는다.
     한국어는 만/억 단위가 몸에 붙어 있어 그쪽을 쓴다. */
  num(v){
    v = Math.round(v||0);
    const neg = v<0; v=Math.abs(v);
    let s;
    if(v >= 1e8)      s = (v/1e8).toFixed(v>=1e9?0:1).replace(/\.0$/,'') + '억';
    else if(v >= 1e4) s = (v/1e4).toFixed(v>=1e6?0:1).replace(/\.0$/,'') + '만';
    else              s = v.toLocaleString();
    return (neg?'-':'') + s;
  },
  /* 영어권에서는 K/M/B 가 읽힌다 */
  numEn(v){
    v = Math.round(v||0); const neg=v<0; v=Math.abs(v);
    let s;
    if(v>=1e9)      s=(v/1e9).toFixed(1).replace(/\.0$/,'')+'B';
    else if(v>=1e6) s=(v/1e6).toFixed(1).replace(/\.0$/,'')+'M';
    else if(v>=1e3) s=(v/1e3).toFixed(1).replace(/\.0$/,'')+'K';
    else            s=String(v);
    return (neg?'-':'')+s;
  },
  n(v){ return (typeof LANG!=='undefined' && LANG==='en') ? this.numEn(v) : this.num(v); },

  /* ── 9-slice ─────────────────────────────────────────────
     테두리가 있는 그림을 **아무 크기로나** 늘여 쓰는 표준 수법.
     모서리 4개는 그대로, 변 4개는 한 방향으로만, 가운데는 양방향으로 늘인다.
     ⚠ 그냥 drawImage 로 늘이면 모서리 장식이 같이 늘어나 뭉개진다.
     ⚠ 우리 화면은 480×270 이고 어셋은 3배로 그려져 있다 — 모서리 픽셀 수를
        화면 좌표로 환산해서 넘겨야 한다(96px 어셋의 16px 모서리 = 화면 5.3). */
  /* ── 어셋의 '진짜 테두리' ─────────────────────────────────
     ⛔ 9-slice 는 **캔버스 네 귀퉁이**에서 모서리를 떠 온다. 그런데 어셋에 투명
        여백이 있으면 그 귀퉁이가 **빈 곳**이다 — 테두리가 통째로 안 그려진다.
        실측(2026-08-30): hud-frame 은 192×48 인데 그림이 1~31행뿐이고 33행 아래가
        알파 0 이다. 모서리 S=16 이라 아래 모서리를 32~48행에서 떴다 = 전부 빈칸.
        경기 HUD 띠의 **아래 테두리가 없었다.** 에러도 안 나고 화면도 안 비어서
        (틀 일부는 그려지므로) 눈으로만 보이는 종류다. bar-track·ribbon-title 도 같다.
     ⚠ 여백이 없는 어셋은 bbox 가 캔버스 전체라 **예전과 완전히 같다.**
     ⚠ 한 번만 재고 캐시한다. 어셋은 안 바뀐다. */
  _bbox(name, img){
    this._bb = this._bb || {};
    const hit = this._bb[name]; if(hit) return hit;
    let box = { x:0, y:0, w:img.width, h:img.height };
    try{
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d', { willReadFrequently:true });
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let x0=c.width, y0=c.height, x1=-1, y1=-1;
      for(let yy=0; yy<c.height; yy++)
        for(let xx=0; xx<c.width; xx++)
          if(d[(yy*c.width+xx)*4+3] > 8){
            if(xx<x0) x0=xx; if(xx>x1) x1=xx;
            if(yy<y0) y0=yy; if(yy>y1) y1=yy;
          }
      if(x1>=x0 && y1>=y0) box = { x:x0, y:y0, w:x1-x0+1, h:y1-y0+1 };
    }catch(e){ /* 캔버스를 못 읽으면 캔버스 전체를 쓴다 — 예전 동작 */ }
    return (this._bb[name] = box);
  },

  nine(u, name, x, y, w, h, cornerPx){
    const img = BG.get(name); if(!img) return false;
    /* 캔버스가 아니라 **그림이 실제로 있는 영역**을 9등분한다 */
    const B = this._bbox(name, img);
    const ox = B.x, oy = B.y, iw = B.w, ih = B.h;
    /* ⚠ 여백을 걷어내면 내용이 작아진다 — 모서리 S 를 그대로 두면 위·아래 모서리가
       내용 전체를 먹어 **가운데(mh)가 0** 이 된다(실측: hud-frame 32px 에 S=16).
       그러면 네 귀퉁이만 남고 변과 속이 사라진다. 내용에 맞춰 조인다.
       ⚠ 화면 모서리 c 는 S 에서 나오므로 **조인 뒤에** 계산해야 한다. */
    const S = Math.max(1, Math.min(cornerPx || Math.round(iw/6),
                                   Math.floor(Math.min(iw, ih) / 2) - 1));
    /* 화면에서의 모서리 크기 — 너무 크면 작은 패널이 모서리만 남는다 */
    const c = Math.max(2, Math.min(Math.floor(Math.min(w,h)/2 - 1), Math.round(S/3)));
    const put=(sx,sy,sw,sh,dx,dy,dw,dh)=>{
      if(sw<=0||sh<=0||dw<=0||dh<=0) return;
      u.drawImage(img, ox+sx, oy+sy, sw,sh, dx,dy,dw,dh);
    };
    const mw = iw-S*2, mh = ih-S*2;             // 어셋 가운데
    const cw = w-c*2,  ch = h-c*2;              // 화면 가운데
    put(0,0,S,S,           x,     y,     c,  c );   // ↖
    put(iw-S,0,S,S,        x+w-c, y,     c,  c );   // ↗
    put(0,ih-S,S,S,        x,     y+h-c, c,  c );   // ↙
    put(iw-S,ih-S,S,S,     x+w-c, y+h-c, c,  c );   // ↘
    put(S,0,mw,S,          x+c,   y,     cw, c );   // ↑
    put(S,ih-S,mw,S,       x+c,   y+h-c, cw, c );   // ↓
    put(0,S,S,mh,          x,     y+c,   c,  ch);   // ←
    put(iw-S,S,S,mh,       x+w-c, y+c,   c,  ch);   // →
    put(S,S,mw,mh,         x+c,   y+c,   cw, ch);   // 가운데
    return true;
  },

  /* ── 액자 패널 ───────────────────────────────────────────
     안쪽은 어둡게, 테두리는 두 겹(바깥 짙은 선 + 안쪽 밝은 선).
     ⚠ 한 겹 선만 쓰면 우리 해상도에서 '판'으로 안 읽힌다 — 두 겹이 최소다. */
  frame(u, x, y, w, h, opt){
    /* ⛔ 알파는 **되돌린다** — 예전엔 `globalAlpha=1` 로 밀어 버렸다.
       그래서 호출자가 걸어 둔 반투명이 이 함수를 지나면 조용히 사라졌다
       (실측: 육성 선택에서 카드 틀만 흐려지고 이름·숫자는 또렷했다). */
    const a0 = u.globalAlpha;
    opt = opt||{};
    const fill = opt.fill || 'rgba(12,16,26,.92)';
    const edge = opt.edge || '#3a4870';
    const glow = opt.glow || null;
    /* HD 액자가 있으면 그걸 쓴다. 없으면 아래 선 그림이 그대로 돈다.
       ⚠ 액자 어셋이 두 벌 있다. 새로 온 panel-frame(모서리 24)은 **테두리만** 있고
          안쪽 바탕이 panel-fill 로 따로 온다 — 그래서 두 장을 겹쳐야 완성된다.
          강조(glow)는 아직 frame-gold 한 장짜리뿐이라 그쪽을 쓴다. */
    const art = opt.art===false ? null : (glow ? (opt.art || 'frame-gold') : (opt.art || null));
    if(art){
      u.fillStyle = fill; u.fillRect(x, y, w, h);
      if(this.nine(u, art, x, y, w, h, 16)) return;
    }
    if(opt.art!==false && !glow){
      const fillImg = BG.get('panel-fill');
      if(fillImg){
        /* 안쪽 바탕은 이어 붙인다(64×64 타일). 밖으로 새지 않게 잘라 둔다 */
        u.save(); u.beginPath(); u.rect(x, y, w, h); u.clip();
        const tw = 24, th = 24;                    // 화면 좌표에서의 타일 크기
        for(let ty=y; ty<y+h; ty+=th)
          for(let tx=x; tx<x+w; tx+=tw) u.drawImage(fillImg, tx, ty, tw, th);
        u.globalAlpha=0.55; u.fillStyle=fill; u.fillRect(x,y,w,h); u.globalAlpha=a0;
        u.restore();
        if(this.nine(u, 'panel-frame', x, y, w, h, 24)) return;
      } else {
        u.fillStyle = fill; u.fillRect(x, y, w, h);
        if(this.nine(u, 'panel-frame', x, y, w, h, 24)) return;
      }
      u.fillStyle = fill; u.fillRect(x, y, w, h);
      if(this.nine(u, 'frame-panel', x, y, w, h, 16)) return;
    }
    u.fillStyle = fill; u.fillRect(x, y, w, h);
    if(glow){                                  // 강조 패널은 바깥에 옅은 띠
      u.strokeStyle = glow; u.globalAlpha=0.35; u.lineWidth=1;
      u.strokeRect(x-1.5, y-1.5, w+3, h+3); u.globalAlpha=a0;
    }
    u.strokeStyle = '#0a0d16'; u.lineWidth=1;
    u.strokeRect(x+.5, y+.5, w-1, h-1);
    u.strokeStyle = edge; u.lineWidth=1;
    u.strokeRect(x+1.5, y+1.5, w-3, h-3);
    /* 모서리 장식 — 레퍼런스의 액자 느낌을 최소 비용으로 */
    if(opt.corners!==false){
      u.fillStyle = edge;
      for(const [cx,cy] of [[x+1,y+1],[x+w-4,y+1],[x+1,y+h-4],[x+w-4,y+h-4]])
        u.fillRect(cx, cy, 3, 3);
    }
  },

  /* ── 등급 카드 ───────────────────────────────────────────
     아이템·선수 카드. 희귀도가 테두리 색과 안쪽 물빛으로 보인다. */
  CARD_ICON: { 1:'card-1', 2:'card-2', 3:'card-3', 4:'card-4', 5:'card-5' },
  card(u, x, y, w, h, color, opt){
    /* ⛔ 알파는 **되돌린다** — 예전엔 `globalAlpha=1` 로 밀어 버렸다.
       그래서 호출자가 걸어 둔 반투명이 이 함수를 지나면 조용히 사라졌다
       (실측: 육성 선택에서 카드 틀만 흐려지고 이름·숫자는 또렷했다). */
    const a0 = u.globalAlpha;
    opt = opt||{};
    const c = color || '#9aa4b8';
    /* 등급별 카드틀(card-1 … card-5) — 등급이 색이 아니라 **테두리 모양**으로 읽힌다.
       ⚠ 이름은 리터럴 맵으로 둔다(rarity 때 검사기가 종족 이름 60개를 지어냈다).
       ⚠ opt.tier 를 안 주면 예전 frame-card 로 물러난다 — 아이템 카드 등 등급이
          없는 자리는 그대로여야 한다. */
    const tierArt = opt.tier ? this.CARD_ICON[opt.tier|0] : null;
    if(opt.art!==false && tierArt && BG.get && BG.get(tierArt)){
      u.fillStyle = 'rgba(12,16,26,.94)'; u.fillRect(x,y,w,h);
      u.globalAlpha = opt.on ? 0.26 : 0.14; u.fillStyle = c;
      u.fillRect(x, y, w, h); u.globalAlpha = a0;
      this.nine(u, tierArt, x, y, w, h, 16);
      if(opt.on){ u.strokeStyle=c; u.lineWidth=1; u.strokeRect(x+.5,y+.5,w-1,h-1); }
      return;
    }
    /* HD 카드 테두리 — 안쪽이 비어 있어 등급 색을 밑에 깐다 */
    if(opt.art!==false && BG.get && BG.get('frame-card')){
      u.fillStyle = 'rgba(12,16,26,.94)'; u.fillRect(x,y,w,h);
      u.globalAlpha = opt.on ? 0.26 : 0.14; u.fillStyle = c;
      u.fillRect(x, y, w, h); u.globalAlpha = a0;
      this.nine(u, 'frame-card', x, y, w, h, 10);
      if(opt.on){ u.strokeStyle=c; u.lineWidth=1; u.strokeRect(x+.5,y+.5,w-1,h-1); }
      return;
    }
    /* 등급 색을 아주 옅게 깐다 — 색만으로 등급이 읽히게 */
    u.fillStyle = 'rgba(12,16,26,.94)'; u.fillRect(x,y,w,h);
    u.globalAlpha = opt.on ? 0.22 : 0.12; u.fillStyle = c;
    u.fillRect(x, y, w, h); u.globalAlpha = a0;
    u.strokeStyle = '#0a0d16'; u.lineWidth=1; u.strokeRect(x+.5,y+.5,w-1,h-1);
    u.strokeStyle = c; u.lineWidth = opt.on ? 2 : 1;
    u.strokeRect(x + (opt.on?1:1.5), y + (opt.on?1:1.5), w - (opt.on?2:3), h - (opt.on?2:3));
    /* 위쪽 하이라이트 — 카드가 평평해 보이지 않게 */
    u.globalAlpha=0.18; u.fillStyle='#ffffff'; u.fillRect(x+2, y+2, w-4, 1); u.globalAlpha=a0;
  },

  /* ── 레벨 뱃지 ───────────────────────────────────────────
     레퍼런스는 예외 없이 카드 왼쪽 위에 Lv 를 붙인다. */
  lvBadge(u, x, y, lv, color){
    const s = 'Lv.'+lv;
    /* ⚠ 폭을 `글자수 × 4.6` 으로 잡고 있었다 — 8px ASCII 실측은 4.816 이다.
       숫자만 들어가는 뱃지라 티가 안 났을 뿐, 같은 실수가 오늘 세 곳에서 나왔다. */
    u.font = '700 8px "Galmuri11","Nanum Gothic Coding",monospace';
    const w = Math.ceil(u.measureText(s).width) + 8;
    u.fillStyle = 'rgba(6,9,16,.9)'; u.fillRect(x, y, w, 9);
    u.strokeStyle = color || PAL.gold; u.lineWidth=1;
    u.strokeRect(x+.5, y+.5, w-1, 8);
    txt(u, s, x+w/2, y+1, 8, color||PAL.gold, 'center', 700);
    return w;
  },

  /* ── 아이템 상자 ─────────────────────────────────────────
     보상 화면의 기본 단위: 네모 + 아이콘 + 수량.
     아이콘 어셋이 없으면 등급 색 마름모로 대신한다(빈칸보다 낫다). */
  itemBox(u, x, y, size, opt){
    /* ⛔ 알파는 **되돌린다** — 예전엔 `globalAlpha=1` 로 밀어 버렸다.
       그래서 호출자가 걸어 둔 반투명이 이 함수를 지나면 조용히 사라졌다
       (실측: 육성 선택에서 카드 틀만 흐려지고 이름·숫자는 또렷했다). */
    const a0 = u.globalAlpha;
    opt = opt||{};
    const c = opt.color || '#9aa4b8';
    this.card(u, x, y, size, size, c, {on:!!opt.on});
    const cx = x+size/2, cy = y+size/2;
    if(!(opt.icon && BG.obj(u, opt.icon, cx, cy+size*0.30, size*0.62))){
      u.fillStyle = c; u.globalAlpha=0.9;
      u.beginPath();
      u.moveTo(cx, cy-size*0.22); u.lineTo(cx+size*0.20, cy);
      u.lineTo(cx, cy+size*0.22); u.lineTo(cx-size*0.20, cy);
      u.closePath(); u.fill(); u.globalAlpha=a0;
    }
    if(opt.qty!==undefined){
      /* 수량은 상자 아래 오른쪽 — 레퍼런스가 전부 그렇게 한다 */
      const s = (typeof opt.qty==='string') ? opt.qty : ('×'+this.n(opt.qty));
      u.fillStyle='rgba(6,9,16,.85)'; u.fillRect(x, y+size-9, size, 9);
      txt(u, s, x+size-2, y+size-8, 8, PAL.white, 'right', 700);
    }
    if(opt.label) txt(u, opt.label, cx, y+size+2, 8, PAL.dim, 'center');
  },

  /* ── 큰 수령 버튼 ────────────────────────────────────────
     화면에서 제일 큰 것이 '받기'여야 한다. 숨쉬듯 맥동한다. */
  bigButton(u, x, y, w, h, label, t, opt){
    /* ⛔ 알파는 **되돌린다** — 예전엔 `globalAlpha=1` 로 밀어 버렸다.
       그래서 호출자가 걸어 둔 반투명이 이 함수를 지나면 조용히 사라졌다
       (실측: 육성 선택에서 카드 틀만 흐려지고 이름·숫자는 또렷했다). */
    const a0 = u.globalAlpha;
    opt=opt||{};
    const pulse = 0.5 + 0.5*Math.sin((t||0)*0.005);
    const base = opt.color || '#2f6fd0';
    /* HD 버튼 — 맥동에 맞춰 평상/발광 두 장을 겹친다 */
    /* ⚠ 버튼 어셋도 두 벌이다. 새로 온 button-idle/focus(192×64·모서리 16)를 먼저 쓰고,
       없으면 예전 btn-primary(모서리 24)로 물러난다. 모서리 값이 달라 함께 못 쓴다. */
    if(opt.art!==false && BG.get && BG.get('button-idle')){
      this.nine(u, 'button-idle', x, y, w, h, 16);
      u.globalAlpha = 0.25 + pulse*0.55;
      this.nine(u, 'button-focus', x, y, w, h, 16);
      u.globalAlpha = a0;
      txt(u, label, x+w/2, y+Math.round((h-13)/2), 13, PAL.white, 'center', 700);
      return;
    }
    if(opt.art!==false && BG.get && BG.get('btn-primary')){
      this.nine(u, 'btn-primary', x, y, w, h, 24);
      u.globalAlpha = 0.25 + pulse*0.55;
      this.nine(u, 'btn-primary-on', x, y, w, h, 24);
      u.globalAlpha = a0;
      txt(u, label, x+w/2, y+Math.round((h-13)/2), 13, PAL.white, 'center', 700);
      return;
    }
    u.fillStyle = base; u.fillRect(x, y, w, h);
    u.globalAlpha = 0.20 + pulse*0.22; u.fillStyle='#ffffff';
    u.fillRect(x, y, w, Math.round(h*0.45)); u.globalAlpha=a0;
    u.strokeStyle = opt.edge || '#8fc4ff'; u.lineWidth=1;
    u.strokeRect(x+.5, y+.5, w-1, h-1);
    u.globalAlpha = 0.25+pulse*0.4; u.strokeStyle='#ffffff';
    u.strokeRect(x-1.5, y-1.5, w+3, h+3); u.globalAlpha=a0;
    txt(u, label, x+w/2, y+Math.round((h-13)/2), 13, PAL.white, 'center', 700);
  },

  /* ── 등급 뱃지 ───────────────────────────────────────────
     rarity-1 … rarity-5 (96×96). ⚠ 지금은 1·2만 도착했다 —
     **없는 등급은 false 를 돌려주고 부르는 쪽이 별표로 물러난다.**
     한 벌을 다 기다렸다가 붙이면 온 것도 안 쓰이고 놀게 된다. */
  /* ⚠ 이름을 `'rarity-'+tier` 로 조립했더니 어셋 검사기가 그걸 종족 이름과 엮어
     rarity-cheetah 같은 있지도 않은 이름 60개를 만들어 냈다(실측).
     **이름은 리터럴로 못 박는다** — 검사기가 읽을 수 있어야 검사가 산다. */
  /* ⚠ 맵 이름에 ICON 이 들어가야 어셋 검사기가 읽는다(check_assets.py 의 규약). */
  RARITY_ICON: { 1:'rarity-1', 2:'rarity-2', 3:'rarity-3', 4:'rarity-4', 5:'rarity-5' },
  rarityBadge(u, x, y, size, tier){
    const name = this.RARITY_ICON[tier|0]; if(!name) return false;
    const img = BG.get(name);
    if(!img) return false;
    u.drawImage(img, x, y, size, size);
    return true;
  },

  /* ── 작은 배지 ───────────────────────────────────────────
     badge-slot(48×48) — 등급·적성 글자 한두 자를 담는 육각 틀.
     ⚠ 지금은 글자만 떠 있어서 'S' 인지 '5' 인지 배경이 없으면 눈에 안 걸린다.
     ⚠ 어셋이 없으면 false — 부르는 쪽이 예전처럼 글자만 그린다. */
  badge(u, cx, cy, size, label, color){
    const img = BG.get('badge-slot');
    if(!img) return false;
    u.drawImage(img, Math.round(cx-size/2), Math.round(cy-size/2), size, size);
    if(label) txt(u, label, cx, cy-Math.round(size*0.30), Math.round(size*0.62),
                  color||PAL.white, 'center', 700);
    return true;
  },

  /* ── 원형 게이지 ─────────────────────────────────────────
     gauge-ring(96×96) 은 **빈 고리**다 — 코드가 안쪽에 호를 채운다.
     ⛔ 챕터 2 — 컨디션·피로·사기 세 줄이 각각 아이콘+라벨+막대+숫자(=12조각)를
        먹고 있었다. 고리 셋이면 자리를 3분의 1로 줄이고 상태는 색과 길이로 읽힌다.
     ⚠ 어셋이 없으면 false 를 돌려준다 — 부르는 쪽이 예전 막대로 물러난다. */
  ring(u, cx, cy, r, v, color, label){
    const img = BG.get('gauge-ring');
    if(!img) return false;
    const d = r*2;
    u.drawImage(img, cx-r, cy-r, d, d);
    /* 채움 — 12시에서 시계방향. 두께는 고리 안쪽에 맞춘다. */
    const p = clamp(v, 0, 1);
    if(p > 0.005){
      u.save();
      u.strokeStyle = color; u.lineWidth = Math.max(2, r*0.30);
      u.lineCap = 'butt';
      u.beginPath();
      u.arc(cx, cy, r*0.70, -Math.PI/2, -Math.PI/2 + p*Math.PI*2);
      u.stroke();
      u.restore();
    }
    if(label!==undefined) txt(u, label, cx, cy-4, 9, PAL.white, 'center', 700);
    return true;
  },

  /* ── 탭 한 칸 ────────────────────────────────────────────
     tab-idle / tab-active (128×48). 없으면 예전처럼 사각형 두 겹으로 그린다. */
  tab(u, x, y, w, h, label, on){
    if(!this.nine(u, on?'tab-active':'tab-idle', x, y, w, h, 12)){
      u.fillStyle = on?'rgba(255,215,94,.20)':'rgba(20,26,40,.8)';
      u.fillRect(x, y, w, h);
      u.strokeStyle = on?PAL.gold:'#3a4258'; u.lineWidth=1;
      u.strokeRect(x+.5, y+.5, w-1, h-1);
    }
    /* ⛔ 9px 로 박아 두면 **긴 번역이 칸 밖으로 삐져나온다** — 육성 화면의 'Raise Stats'
       가 56px 칸 양쪽으로 밀려 나왔다(한국어 '스탯 올리기' 는 들어갔다).
       글자와 **상자**의 겹침이라 겹침 감시가 못 본다 — 칸이 스스로 지켜야 한다.
       ⚠ 칸을 넓히지 않는다(옆 칸을 밀게 된다). 글자를 줄인다. */
    let sz = 9;
    try{
      const s2 = (typeof K==='function') ? K(label) : label;
      for(; sz >= 6; sz--){
        u.font = `${on?700:400} ${sz}px "Galmuri11","Nanum Gothic Coding",monospace`;
        if(u.measureText(s2).width <= w - 8) break;
      }
    }catch(e){ sz = 9; }
    txt(u, label, x+w/2, y+Math.round((h-sz)/2), sz, on?PAL.gold:PAL.dim, 'center', on?700:400);
  },
  /* ── 구분선 ──────────────────────────────────────────────
     divider-line (256×8) — 가운데가 밝고 양끝이 흐려진다. 이어 붙이지 않고 한 장을 늘인다. */
  divider(u, x, y, w){
    const img = BG.get('divider-line');
    if(img){ u.drawImage(img, x, y, w, 3); return; }
    u.fillStyle='rgba(255,255,255,.10)'; u.fillRect(x, y+1, w, 1);
  },
  /* ── 말풍선 꼬리 ─────────────────────────────────────────
     tooltip-tail (32×24) — 위를 가리킨다. 설명 상자가 '무엇에 대한 말인지' 잇는다. */
  tail(u, cx, y, w){
    const img = BG.get('tooltip-tail');
    if(!img) return false;
    const ww = w||9, hh = Math.round(ww*24/32);
    u.drawImage(img, Math.round(cx-ww/2), Math.round(y), ww, hh);
    return true;
  },

  /* ── 자원 막대 ───────────────────────────────────────────
     상단에 가진 것을 늘어놓는다(자금·훈련 포인트·장비 수). */
  resourceBar(u, y, items){
    const h=16;
    this.frame(u, 0, y, VW, h, { fill:'rgba(8,11,20,.9)', corners:false });
    let x = 8;
    for(const it of items){
      if(it.icon) BG.obj(u, it.icon, x+5, y+h-3, 10);
      else { u.fillStyle=it.color||PAL.gold; u.beginPath();
             u.arc(x+5, y+h/2, 3.2, 0, 6.284); u.fill(); }
      const s = this.n(it.value);
      txt(u, s, x+13, y+4, 10, it.color||PAL.white, 'left', 700);
      /* ⚠ `글자수 × 5.4` 였다 — 10px ASCII 실측은 6.02 라 **좁게 잡혀** 다음 칸이 붙는다 */
      u.font = '700 10px "Galmuri11","Nanum Gothic Coding",monospace';
      x += 13 + Math.ceil(u.measureText(s).width) + 14;
    }
  },

  /* ── 아이콘 한 장, 색을 입혀서 ────────────────────────────
     ⚠ 두 곳에서 같은 문제를 만났다:
       ① 목록 위 정렬/거르기 칩 — 켜짐/꺼짐이 글자에만 있어 아이콘은 늘 같아 보였다.
       ② 경기 중 HUD — ic-speed-hud 는 평균 밝기 94 인데 바탕이 남색 프레임이라
          묻혔다(실측: ic-timer 150 · ic-distance 105 · ic-speed-hud 94).
     둘 다 '어셋의 형태는 쓰되 색은 코드가 정한다'로 푼다 — bar-fill 과 같은 규약.
     `color` 를 안 주면 원본 그대로 그린다. 어셋이 없으면 false 를 돌려준다. */
  _tintC: {},                      // 이름+크기+색 → 물들여 둔 작은 캔버스
  iconTint(u, name, x, y, size, color){
    const im = (typeof BG!=='undefined') && BG.get(name);
    if(!im) return false;
    if(!color){ u.drawImage(im, x, y, size, size); return true; }
    /* ⛔ 여기서 한 번 틀렸다 — 바로 캔버스에 그리고 source-atop 으로 덮었더니
       **아이콘이 아니라 9×9 회색 사각형**이 나왔다. source-atop 은 '방금 그린 그림'이
       아니라 **캔버스에 이미 있는 모든 것**을 대상으로 한다. HUD 프레임처럼 바탕이
       불투명하면 사각형이 통째로 칠해진다(실측: 경기 중 상단 아이콘 3개 전부).
       투명한 오프스크린에서 물들인 뒤 옮겨 붙여야 아이콘 모양만 남는다. */
    const key = name+'|'+size+'|'+color;
    let c = this._tintC[key];
    if(!c){
      c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.drawImage(im, 0, 0, size, size);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = color; g.fillRect(0, 0, size, size);
      this._tintC[key] = c;
    }
    u.drawImage(c, x, y);
    return true;
  },

  /* ── 경험치 막대 (레벨 + 진행) ───────────────────────────── */
  /* 게이지 한 벌 — bar-track(홈) + bar-fill(채움).
     ⚠ bar-fill 은 **흰색으로 그려져 왔다**(발주서 지정). 색은 코드가 입힌다.
        어셋이 없으면 예전 그림이 그대로 돈다. */
  bar(u, x, y, w, h, p, color){
    const track = BG.get('bar-track');
    if(!track) return false;
    this.nine(u, 'bar-track', x, y, w, h, 8);
    const fw = Math.round(w*clamp(p,0,1));
    if(fw > 2){
      u.save(); u.beginPath(); u.rect(x, y, fw, h); u.clip();
      this.nine(u, 'bar-fill', x, y, w, h, 8);
      if(color){ u.globalCompositeOperation='source-atop';
                 u.globalAlpha=0.72; u.fillStyle=color; u.fillRect(x,y,fw,h); }
      u.restore();
    }
    return true;
  },
  xpBar(u, x, y, w, lv, cur, need, opt){
    opt=opt||{};
    const p = clamp(cur/Math.max(1,need), 0, 1);
    if(!this.bar(u, x, y, w, 8, p, '#5aaaff')){
    u.fillStyle='rgba(6,9,16,.85)'; u.fillRect(x, y, w, 7);
    u.strokeStyle='#2a3450'; u.lineWidth=1; u.strokeRect(x+.5, y+.5, w-1, 6);
    const g=u.createLinearGradient(x,y,x,y+7);
    g.addColorStop(0,'#7fd0ff'); g.addColorStop(1,'#2f6fd0');
    u.fillStyle=g; u.fillRect(x+1, y+1, Math.round((w-2)*p), 5);
    }
    /* ⚠ 숫자를 막대 위(y-1)에 그렸더니 막대와 겹쳐 읽히지 않았다. 막대 밖으로 뺀다. */
    if(opt.showText!==false)
      txt(u, `${this.n(cur)} / ${this.n(need)}`, x+w-1, y+9, 8, PAL.dim, 'right');
  },

  /* ── 시간 표시 ───────────────────────────────────────────
     "08:00:00" 처럼 큼직하게. 방치 보상의 주인공이다. */
  clock(u, cx, y, sec, size){
    const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60), s=Math.floor(sec%60);
    const pad=n=>String(n).padStart(2,'0');
    txt(u, `${pad(h)}:${pad(m)}:${pad(s)}`, cx, y, size||26, PAL.gold, 'center', 700);
  },

  /* ── 분당 획득률 ─────────────────────────────────────────
     3,300(+1,607)/m 형태. 보너스가 있으면 괄호로 따로 보여 준다. */
  /* ⛔ 라벨 폭을 **34px 로 박아** 두고 그 뒤에 숫자를 찍었다. 한국어 '1명당'(3자)은
     들어가지만 영어 'per athlete'(11자)는 넘쳐 숫자와 '/분'을 물었다
     (2026-09-04 실측: 방치 보상 화면에서 13px·12px). 뒤 폭도 `글자수 × 5.8` 추정치였다.
     ⚠ `txt()` 가 안에서 K() 를 부르므로 **번역된 문자열을 재야** 한다. */
  rate(u, x, y, label, per, bonus, color){
    const wOf = (t, sz, wt) => { u.font = `${wt||400} ${sz}px "Galmuri11","Nanum Gothic Coding",monospace`;
                                 return Math.ceil(u.measureText(typeof K==='function'?K(t):t).width); };
    txt(u, label, x, y, 9, PAL.dim, 'left', 700);
    let s = this.n(per);
    let w = Math.max(34, wOf(label, 9, 700) + 6);
    txt(u, s, x+w, y-1, 11, color||PAL.white, 'left', 700);
    w += wOf(s, 11, 700) + 2;
    if(bonus>0){
      const b='(+'+this.n(bonus)+')';
      txt(u, b, x+w, y, 9, PAL.green, 'left', 700);
      w += wOf(b, 9, 700) + 2;
    }
    txt(u, '/분', x+w, y, 8, PAL.dim, 'left');
  },
};
