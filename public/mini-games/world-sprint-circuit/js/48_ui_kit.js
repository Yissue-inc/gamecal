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
  nine(u, name, x, y, w, h, cornerPx){
    const img = BG.get(name); if(!img) return false;
    const S = cornerPx || Math.round(img.width/6);        // 어셋 좌표의 모서리
    const d = Math.max(2, Math.round(S * (w/img.width) * (img.width/ (img.width))));
    /* 화면에서의 모서리 크기 — 너무 크면 작은 패널이 모서리만 남는다 */
    const c = Math.max(2, Math.min(Math.floor(Math.min(w,h)/2 - 1), Math.round(S/3)));
    const iw = img.width, ih = img.height;
    const put=(sx,sy,sw,sh,dx,dy,dw,dh)=>{
      if(sw<=0||sh<=0||dw<=0||dh<=0) return;
      u.drawImage(img, sx,sy,sw,sh, dx,dy,dw,dh);
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
    opt = opt||{};
    const fill = opt.fill || 'rgba(12,16,26,.92)';
    const edge = opt.edge || '#3a4870';
    const glow = opt.glow || null;
    /* HD 액자가 있으면 그걸 쓴다. 없으면 아래 선 그림이 그대로 돈다. */
    const art = opt.art===false ? null : (glow ? (opt.art || 'frame-gold') : (opt.art || 'frame-panel'));
    if(art){
      u.fillStyle = fill; u.fillRect(x, y, w, h);
      if(this.nine(u, art, x, y, w, h, 16)) return;
    }
    u.fillStyle = fill; u.fillRect(x, y, w, h);
    if(glow){                                  // 강조 패널은 바깥에 옅은 띠
      u.strokeStyle = glow; u.globalAlpha=0.35; u.lineWidth=1;
      u.strokeRect(x-1.5, y-1.5, w+3, h+3); u.globalAlpha=1;
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
  card(u, x, y, w, h, color, opt){
    opt = opt||{};
    const c = color || '#9aa4b8';
    /* HD 카드 테두리 — 안쪽이 비어 있어 등급 색을 밑에 깐다 */
    if(opt.art!==false && BG.get && BG.get('frame-card')){
      u.fillStyle = 'rgba(12,16,26,.94)'; u.fillRect(x,y,w,h);
      u.globalAlpha = opt.on ? 0.26 : 0.14; u.fillStyle = c;
      u.fillRect(x, y, w, h); u.globalAlpha = 1;
      this.nine(u, 'frame-card', x, y, w, h, 10);
      if(opt.on){ u.strokeStyle=c; u.lineWidth=1; u.strokeRect(x+.5,y+.5,w-1,h-1); }
      return;
    }
    /* 등급 색을 아주 옅게 깐다 — 색만으로 등급이 읽히게 */
    u.fillStyle = 'rgba(12,16,26,.94)'; u.fillRect(x,y,w,h);
    u.globalAlpha = opt.on ? 0.22 : 0.12; u.fillStyle = c;
    u.fillRect(x, y, w, h); u.globalAlpha = 1;
    u.strokeStyle = '#0a0d16'; u.lineWidth=1; u.strokeRect(x+.5,y+.5,w-1,h-1);
    u.strokeStyle = c; u.lineWidth = opt.on ? 2 : 1;
    u.strokeRect(x + (opt.on?1:1.5), y + (opt.on?1:1.5), w - (opt.on?2:3), h - (opt.on?2:3));
    /* 위쪽 하이라이트 — 카드가 평평해 보이지 않게 */
    u.globalAlpha=0.18; u.fillStyle='#ffffff'; u.fillRect(x+2, y+2, w-4, 1); u.globalAlpha=1;
  },

  /* ── 레벨 뱃지 ───────────────────────────────────────────
     레퍼런스는 예외 없이 카드 왼쪽 위에 Lv 를 붙인다. */
  lvBadge(u, x, y, lv, color){
    const s = 'Lv.'+lv;
    const w = s.length*4.6 + 6;
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
    opt = opt||{};
    const c = opt.color || '#9aa4b8';
    this.card(u, x, y, size, size, c, {on:!!opt.on});
    const cx = x+size/2, cy = y+size/2;
    if(!(opt.icon && BG.obj(u, opt.icon, cx, cy+size*0.30, size*0.62))){
      u.fillStyle = c; u.globalAlpha=0.9;
      u.beginPath();
      u.moveTo(cx, cy-size*0.22); u.lineTo(cx+size*0.20, cy);
      u.lineTo(cx, cy+size*0.22); u.lineTo(cx-size*0.20, cy);
      u.closePath(); u.fill(); u.globalAlpha=1;
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
    opt=opt||{};
    const pulse = 0.5 + 0.5*Math.sin((t||0)*0.005);
    const base = opt.color || '#2f6fd0';
    /* HD 버튼 — 맥동에 맞춰 평상/발광 두 장을 겹친다 */
    if(opt.art!==false && BG.get && BG.get('btn-primary')){
      this.nine(u, 'btn-primary', x, y, w, h, 24);
      u.globalAlpha = 0.25 + pulse*0.55;
      this.nine(u, 'btn-primary-on', x, y, w, h, 24);
      u.globalAlpha = 1;
      txt(u, label, x+w/2, y+Math.round((h-13)/2), 13, PAL.white, 'center', 700);
      return;
    }
    u.fillStyle = base; u.fillRect(x, y, w, h);
    u.globalAlpha = 0.20 + pulse*0.22; u.fillStyle='#ffffff';
    u.fillRect(x, y, w, Math.round(h*0.45)); u.globalAlpha=1;
    u.strokeStyle = opt.edge || '#8fc4ff'; u.lineWidth=1;
    u.strokeRect(x+.5, y+.5, w-1, h-1);
    u.globalAlpha = 0.25+pulse*0.4; u.strokeStyle='#ffffff';
    u.strokeRect(x-1.5, y-1.5, w+3, h+3); u.globalAlpha=1;
    txt(u, label, x+w/2, y+Math.round((h-13)/2), 13, PAL.white, 'center', 700);
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
      x += 13 + s.length*5.4 + 14;
    }
  },

  /* ── 경험치 막대 (레벨 + 진행) ───────────────────────────── */
  xpBar(u, x, y, w, lv, cur, need, opt){
    opt=opt||{};
    const p = clamp(cur/Math.max(1,need), 0, 1);
    u.fillStyle='rgba(6,9,16,.85)'; u.fillRect(x, y, w, 7);
    u.strokeStyle='#2a3450'; u.lineWidth=1; u.strokeRect(x+.5, y+.5, w-1, 6);
    const g=u.createLinearGradient(x,y,x,y+7);
    g.addColorStop(0,'#7fd0ff'); g.addColorStop(1,'#2f6fd0');
    u.fillStyle=g; u.fillRect(x+1, y+1, Math.round((w-2)*p), 5);
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
  rate(u, x, y, label, per, bonus, color){
    txt(u, label, x, y, 9, PAL.dim, 'left', 700);
    let s = this.n(per);
    txt(u, s, x+34, y-1, 11, color||PAL.white, 'left', 700);
    let w = 34 + s.length*5.8;
    if(bonus>0){
      const b='(+'+this.n(bonus)+')';
      txt(u, b, x+w, y, 9, PAL.green, 'left', 700);
      w += b.length*4.8;
    }
    txt(u, '/분', x+w+2, y, 8, PAL.dim, 'left');
  },
};
