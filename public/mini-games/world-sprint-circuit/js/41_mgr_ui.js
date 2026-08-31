/* ══════════════════════════════════════════════════════════════════
   감독 모드 화면 — 목록 + 커서. 조작은 ▲▼◀▶·확인·취소 여섯 개뿐이다.
   (그래야 키보드와 화면버튼이 같은 코드로 돈다)
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 공용 그리기 조각 ------------------------------------------------ */
const UI = {
  header(u, title, right){
    plate(u, 0, 0, VW, 22, 0.86);
    txt(u, title, 8, 5, 13, PAL.gold, 'left', 700);
    if(right) txt(u, right, VW-30, 6, 11, PAL.dim, 'right');
    u.fillStyle='rgba(255,215,94,.35)'; u.fillRect(0,22,VW,1);
  },
  footer(u, hint){
    plate(u, 0, VH-16, VW, 16, 0.86);
    txt(u, hint, VW/2, VH-13, 9, PAL.dim, 'center');
  },
  /* ── 목록 위의 '◀ 기준 ▶' 칩 ─────────────────────────────
     정렬(선수단)과 거르기(기록실)가 같은 손버릇이 되도록 한 곳에서 그린다.
     ⚠ 아이콘 자리를 만들려고 라벨 폭을 재는데, 재기 전에 폰트를 **먼저 지정**해야
        한다. 안 하면 직전에 그린 글씨의 폰트로 재서 아이콘이 라벨을 파고든다.
     `on` = 기본값이 아님(= 지금 뭔가 걸려 있다) → 금색으로 알린다. */
  picker(u, icon, label, on, y){
    const lbl = `◀ ${label} ▶`, col = on ? PAL.gold : PAL.dim;
    if(typeof UIK==='undefined' || !(typeof BG!=='undefined' && BG.get(icon))){
      txt(u, lbl, VW/2, y, 9, col, 'center', 700); return; }
    u.font = '700 9px "Galmuri11","Nanum Gothic Coding",monospace';
    const w = Math.ceil(u.measureText(lbl).width);
    /* 아이콘을 **라벨 색으로 물들인다** — 켜짐/꺼짐을 아이콘도 같이 말한다.
       ic-filter 는 선이 얇고 어두워(불투명 17% · 밝기 95) 안 그러면 9px 에서 사라진다. */
    UIK.iconTint(u, icon, VW/2 - w/2 - 13, y-1, 9, col);
    txt(u, lbl, VW/2 + 5, y, 9, col, 'center', 700);
  },
  /* ── 선수단 한 줄의 부제 ─────────────────────────────────
     ⛔ 챕터 7. 등급 글자는 뺐다(별·색과 같은 값). 특성은 아이콘이 오면 아이콘으로.
     ⚠ 아이콘이 하나도 없어도 **말이 되는 줄**이어야 한다 — 어셋은 한 장씩 온다. */
  TRAIT_ICON: {
    starter:'tr-starter', closer:'tr-closer', metronome:'tr-metronome',
    glass:'tr-glass', ironman:'tr-ironman', bigGame:'tr-bigGame',
    nervous:'tr-nervous', hurdler:'tr-hurdler', springy:'tr-springy',
    cannon:'tr-cannon',
  },
  GROWTH_ICON: { early:'gr-early', normal:'gr-normal', late:'gr-late' },
  /* 나쁜 특성은 붉게 — 형태만으로 못 가릴 때 색이 갈라 준다 */
  BAD_TRAITS: ['glass', 'nervous'],

  /* 아이콘으로 나갈 것들. 없으면 빈 배열이라 부제가 알아서 글자로 메운다. */
  squadIcons(a){
    const out = [];
    const g = this.GROWTH_ICON[a.growth];
    if(g && BG.get(g)) out.push({ name:g, color:PAL.dim });
    for(const t of (a.traits||[])){
      const n = this.TRAIT_ICON[t];
      if(n && BG.get(n))
        out.push({ name:n, color: this.BAD_TRAITS.indexOf(t)>=0 ? PAL.red : PAL.blue });
    }
    return out;
  },
  /* 아이콘이 못 챙긴 것만 글자로.
     ⛔ 아이콘이 도착하자 특성 이름이 **통째로 사라졌다.** 목록은 깔끔해졌지만
        처음 보는 사람은 그 그림이 무슨 뜻인지 **배울 방법이 없다**(실측: 처음 플레이).
        `on`(커서가 있는 줄)이면 말로 적는다 — 한 줄만 말하면 목록은 그대로 깔끔하다.
        아이콘은 기억을 돕는 것이고, 이름은 그 기억을 처음 만드는 것이다. */
  squadSub(a, on){
    /* ⚠ 이름·숫자를 문장에 조립하면 통문자열이라 번역표에서 못 찾는다 — 틀만 옮긴다 */
    const bits = [ K('%1세').replace('%1', a.age) ];
    const gIcon = this.GROWTH_ICON[a.growth] && BG.get(this.GROWTH_ICON[a.growth]);
    if(!gIcon || on) bits.push(K(GROWTH[a.growth].name));
    const traits = a.traits || [];
    const left = traits.filter(t=>!(this.TRAIT_ICON[t] && BG.get(this.TRAIT_ICON[t])));
    const show = on ? traits : left;               // 고른 줄이면 아이콘으로 나간 것도 말한다
    if(show.length) bits.push(show.map(t=>K(TRAITS[t].name)).slice(0,2).join(' · ')
                              + (show.length>2 ? ` +${show.length-2}` : ''));
    else if(!traits.length) bits.push(K('특성 없음'));
    return bits.join(' · ');
  },

  /* 커서가 달린 세로 목록. rows = [{label, sub, right, color, dim, icons}] */
  /* ⛔ 스크롤 '▴N' 표시가 **첫 줄의 오른쪽 값을 덮었다**(실측: 'Load 0.85' → '0.8⁵2').
     위로 올려 봤더니 이번엔 머리말과 겹쳤다 — 자리를 옮길 게 아니라
     **첫 줄의 오른쪽 값을 그 폭만큼 안으로 미는** 것이 맞다. */
  list(u, rows, sel, x, y, w, rowH, maxRows){
    /* ⛔ 목록이 비면 **아무 말도 안 하고 빈 칸만 남았다**(영입 후보 화면 캡처:
       1주차엔 후보가 없어 화면 절반이 그냥 비어 있었다). 빈 상태는 상태다 — 말해야 한다. */
    if(!rows || !rows.length){
      plate(u, x, y, w, rowH, 0.32);
      txt(u, K('아직 아무것도 없습니다'), x + w/2, y + Math.round((rowH-9)/2), 9, PAL.dim, 'center');
      return 0;
    }
    const n = Math.min(rows.length, maxRows);
    const first = clamp(sel - (maxRows>>1), 0, Math.max(0, rows.length-maxRows));
    /* 위 스크롤 표시가 차지할 폭 — 첫 줄의 오른쪽 값을 그만큼 안으로 민다(위 주석 참조) */
    this._topTagW = 0;
    if(first > 0 && rows.length > maxRows){
      u.font = '700 8px "Galmuri11","Nanum Gothic Coding",monospace';
      this._topTagW = Math.ceil(u.measureText('▴ '+first).width) + 10;
    }
    /* ⛔ **위쪽 표시만 자리를 비켜 줬다.** 아래쪽 '▾ N' 도 똑같이 마지막 줄의
       오른쪽 값 위에 앉는데 그건 안 밀어 줬다 — 훈련 화면 캡처에서
       'Condition ave▾ 4' 로 잘렸다(2026-08-31). 대칭인 두 가지를 한쪽만 고치면
       나머지 한쪽은 반드시 남는다. */
    this._botTagW = 0;
    const _below = rows.length - (first + maxRows);
    if(_below > 0){
      u.font = '700 8px "Galmuri11","Nanum Gothic Coding",monospace';
      this._botTagW = Math.ceil(u.measureText('▾ '+_below).width) + 10;
    }
    const _lastI = n - 1;
    for(let i=0;i<n;i++){
      const idx = first+i, r = rows[idx]; if(!r) break;
      const ry = y + i*rowH, on = idx===sel;
      /* 선택된 줄 — row-selected(9-slice)가 오면 그림으로. 없으면 예전 사각형.
         ⚠ 커서 줄이 어디인지가 이 화면들의 유일한 상태다. 눈에 확실히 걸려야 한다. */
      /* 줄 바탕 — 짝수/홀수로 결을 준다 */
      u.fillStyle = (i%2 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.22)');
      u.fillRect(x, ry, w, rowH-1);
      if(on){
        /* 선택 줄 — row-selected(9-slice)가 오면 그 위에 얹는다.
           ⚠ 불투명하게 깔았더니 **금색 바탕에 금색 글자**가 되어 선택된 줄만
              안 읽혔다(실측). 강조는 글자를 가리면 안 된다 — 반투명으로 얹는다. */
        let drew = false;
        if(typeof UIK!=='undefined'){
          u.save(); u.globalAlpha = 0.34;
          drew = UIK.nine(u, 'row-selected', x, ry, w, rowH-1, 12);
          u.restore();
        }
        if(!drew){ u.fillStyle='rgba(255,215,94,.20)'; u.fillRect(x, ry, w, rowH-1); }
      }
      u.fillStyle='rgba(255,255,255,.07)'; u.fillRect(x, ry+rowH-1, w, 1);
      if(on){ u.fillStyle=PAL.gold; u.fillRect(x, ry, 2, rowH-1); }
      /* 커서 화살표(cursor-arrow) — 금색 세로줄만으로는 '어디를 보고 있나'가 약했다.
         ⛔ 자리는 **모든 줄에 미리 비운다.** 선택된 줄에서만 밀면 위아래로 옮길 때마다
            글자가 좌우로 튄다. 어셋이 없으면 폭 0 이라 예전 자리 그대로다. */
      const cs = (typeof BG!=='undefined' && BG.get('cursor-arrow')) ? Math.min(11, rowH-6) : 0;
      const gut = cs ? cs+3 : 0;
      if(on && cs) u.drawImage(BG.get('cursor-arrow'), x+2, ry+Math.round((rowH-1-cs)/2), cs, cs);
      let lx = x+8+gut;
      /* 줄 아이콘 — 사무실 메뉴처럼 줄마다 성격이 다른 목록에서 글을 읽기 전에 구분된다.
         ⚠ 국기와 같은 자리를 쓴다(둘 다 있는 목록은 없다). 어셋이 없으면 폭 0. */
      if(r.icon && typeof BG!=='undefined'){
        /* 전용 아이콘이 아직 안 왔으면 빌려 쓰던 범용 아이콘으로 물러난다.
           ⚠ 발주서(ASSET_ORDER_UX)와 이 표가 어긋나면 그림이 와도 안 붙는다. */
        const im = BG.get(r.icon) || (UI.ICON_FALLBACK[r.icon] ? BG.get(UI.ICON_FALLBACK[r.icon]) : null);
        /* ⚠ 13px 고정이라 시설처럼 **줄이 큰 목록에서도 아이콘만 작았다** —
           128×128 아이소메트릭을 13px 로 줄이면 뭘 그렸는지 안 보인다.
           줄 높이에 비례하되 24 에서 멈춘다(그 이상은 글자를 밀어낸다). */
        if(im){ const is=Math.max(11, Math.min(24, rowH-10));
                u.drawImage(im, x+7+gut, ry+Math.round((rowH-1-is)/2), is, is);
                lx = x+9+gut+is; }
      }
      /* 국기 — 목록에서 소속이 바로 보여야 한다 */
      if(r.nation && typeof drawFlag==='function'){
        drawFlag(u, x+7+gut, ry+5, 13, 9, r.nation); lx = x+25+gut;
      }
      /* ⚠ 위쪽에 붙여 그리면 줄 높이가 커질 때(시설 화면 36) 아래가 텅 빈다.
         두 줄 묶음을 줄 한가운데에 놓는다 — 26 일 때는 예전과 같은 자리다. */
      /* ⛔ 챕터 1 — **부제는 보고 있는 줄에만.**
         예전엔 모든 줄이 label+sub+right+right2 넷을 다 그려서, 여섯 줄이면
         텍스트 24조각이 한 화면에 깔렸다. 눈이 어디를 봐야 할지 알 수가 없다.
         ⚠ 정보를 버리는 게 아니다 — 커서를 올리면 그 줄의 부제가 나온다.
            `!` `●3` 같은 **상태 배지(right)는 모든 줄에 남긴다** —
            "어디에 할 일이 있나"는 한눈에 보여야 하기 때문이다.
         ⛔ 규칙: 부제가 **설명**이면 숨기고, **데이터**면 남긴다(subAlways).
            설명 = "코인을 영구 성장으로 바꿉니다" (메뉴가 뭘 하는지)
            데이터 = "17세 · 우수 · 표준 · 강골" (그 줄 자체의 값)
            지금 subAlways: 시설 · 스킬 · 코치 · 기록실 · 선수단 */
      /* ⚠ right2 는 **긴 설명이 아니라 단위**다('클럽 경기력' · '경기/육성' · ◆◆◆).
         이걸 같이 숨겼더니 선수단 줄이 `4,189` 만 남아 무슨 숫자인지 알 수 없었다.
         숨기는 건 sub(설명) 하나뿐이다. */
      const showSub = (on || r.subAlways) && !!r.sub;
      const twoLine = showSub || !!r.right2;
      const pad = twoLine ? Math.max(2, Math.round((rowH-1-19)/2))
                          : Math.max(2, Math.round((rowH-1-11)/2));
      txt(u, r.label, lx, ry+pad, 11, r.dim?PAL.dim:(r.color||PAL.white), 'left', on?700:400);
      if(showSub){
        txt(u, r.sub, lx, ry+pad+11, 8, PAL.dim);
        /* 부제 뒤에 아이콘을 잇는다 — 글자로 쓰면 20자가 되는 것들이다.
           ⚠ 폭을 재기 전에 부제와 **같은 폰트**를 지정해야 아이콘이 글자를 파고들지 않는다. */
        if(r.icons && r.icons.length && typeof UIK!=='undefined'){
          u.font = '400 8px "Galmuri11","Nanum Gothic Coding",monospace';
          let ix = lx + Math.ceil(u.measureText(r.sub||'').width) + (r.sub ? 7 : 0);
          for(const ic of r.icons){
            if(ix > x + w - 74) break;             // 오른쪽 값과 안 부딪히게
            UIK.iconTint(u, ic.name, ix, ry+pad+10, 9, ic.color);
            ix += 11;
          }
        }
      }
      /* 상태 배지 — `!` `●3` 같은 짧은 표시는 글자만 떠 있으면 안 걸린다.
         chip-bg(9-slice)가 오면 그 뒤에 칩을 깐다.
         ⚠ 긴 값(4,605 · 클럽 경기력)에는 안 깐다 — 칩은 **짧은 상태**용이다.
            숫자에까지 칩을 두르면 목록이 알약밭이 된다.
         ⛔ **'값이 없다'는 표시에도 안 깐다.** 기록실을 '아직 없음'으로 거르면
            17줄이 전부 `—` 인데, 한 글자라 칩이 붙어 **파란 알약 17개**가 됐다 —
            비어 있다는 뜻이 '뭔가 있다'로 보인다(실측). */
      if(r.right){
        const rt = String(r.right), ry2 = ry+pad+(twoLine?2:0);
        const EMPTY = ['—','-','–','—'];
        /* ⛔ **글자만 비켜 놓고 칩은 안 옮겼다** — 방출 화면 마지막 줄에서
           '+37' 은 왼쪽으로 갔는데 파란 알약은 제자리라 '▾ 4' 밑에 빈 알약이 남았다.
           고치기 전보다 나빠졌다. 스카우트 리포트의 배지 때와 **같은 실수**다 —
           자리를 옮길 땐 **그 자리에 그리는 것 전부**를 옮긴다. 어긋남은 하나로 묶는다. */
        const shift = (i===0 ? this._topTagW||0 : (i===_lastI ? this._botTagW||0 : 0));
        if(rt.length<=3 && EMPTY.indexOf(rt)<0 && typeof UIK!=='undefined'){
          u.font='700 10px "Galmuri11","Nanum Gothic Coding",monospace';
          const cw2 = Math.max(16, Math.ceil(u.measureText(rt).width)+10);
          u.save(); u.globalAlpha=0.55;
          UIK.nine(u, 'chip-bg', x+w-8-shift-cw2, ry2-2, cw2, 14, 8);
          u.restore();
        }
        txt(u, rt, x+w-8-shift, ry2, 10, r.rightColor||PAL.white, 'right');
      }
      if(r.right2) txt(u, r.right2, x+w-8-(i===_lastI ? this._botTagW||0 : 0), ry+pad+13, 8, r.right2Color||PAL.dim, 'right');
    }
    if(rows.length > maxRows){
      /* ⚠ 막대는 **어디쯤인지**만 말한다. 처음 켠 사람에게 필요한 건
         "아래에 더 있다"는 사실이다 — 2px 60% 막대는 눈에 안 걸린다(실측: 못 봤다).
         남은 줄 수를 숫자로 적는다. 위에도 가려진 줄이 있으면 위에도 적는다. */
      const H = rowH*maxRows;
      const th = Math.max(8, (maxRows/rows.length)*H);
      const tp = (first/Math.max(1,rows.length-maxRows))*(H - th);
      u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(x+w-3, y, 3, H);
      u.fillStyle='rgba(255,215,94,.85)';  u.fillRect(x+w-3, y+tp, 3, th);
      /* ⚠ 오른쪽 끝은 줄의 보조값(right2: '보통' 등)이 이미 쓴다 — 겹쳐 읽혔다.
         작은 받침을 깔아 띄운다. 막대 왼쪽에 붙여 스크롤과 한 덩어리로 읽히게. */
      const tag = (s2, ty, c) => {
        u.font = '700 8px "Galmuri11","Nanum Gothic Coding",monospace';
        const tw = Math.ceil(u.measureText(s2).width) + 6;
        plate(u, x+w-5-tw, ty-1, tw, 11, 0.82);
        txt(u, s2, x+w-6, ty, 8, c, 'right', 700);
      };
      const below = rows.length - (first + maxRows);
      if(below > 0) tag('▾ '+below, y+H-11, PAL.gold);
      if(first > 0) tag('▴ '+first, y+1, PAL.dim);
    }
    return first;
  },
  /* 가로 막대 게이지 */
  bar(u, x, y, w, h, v, max, color, bg){
    u.fillStyle = bg||'rgba(255,255,255,.12)'; u.fillRect(x,y,w,h);
    u.fillStyle = color; u.fillRect(x,y,Math.round(w*clamp(v/max,0,1)),h);
  },
  /* 라벨 칸 폭 — 언어마다 글자 길이가 다르다.
     ⚠ 42px 로 못 박아 뒀더니 영어판에서 'Acceleration' 이 막대를 파고들었다(실측).
        지금 언어의 가장 긴 라벨을 재서 칸을 잡는다. */
  /* ⚠ 캐시를 하나만 두면 스탯 칸과 상태 칸이 같은 폭을 쓴다. 목록별로 따로 잰다. */
  _lw: {}, _lwLang: null,
  labelW(u, names, size, min){
    if(this._lwLang !== LANG){ this._lw = {}; this._lwLang = LANG; }
    const ck = (size||9)+'|'+names.join('\u0001');
    if(this._lw[ck] !== undefined) return this._lw[ck];
    let m = min||42;
    u.save(); u.font = `${size||9}px Galmuri11, monospace`;
    for(const n of names){
      const t = (typeof K==='function') ? K(n) : n;
      m = Math.max(m, Math.ceil(u.measureText(t).width) + 6);
    }
    u.restore();
    this._lw[ck] = m;
    return m;
  },
  /* 스탯 한 줄: 이름 · 현재/잠재 막대 */
  /* 전용 아이콘이 오기 전까지 빌려 쓸 것 — 오는 즉시 전용으로 바뀐다 */
  ICON_FALLBACK: { 'ic-develop':'icon-levelup', 'ic-facility':'icon-gear',
                   'ic-hall':'icon-xp', 'ic-codex':'icon-medal',
                   'ic-league':'ic-medal', 'ic-points':'icon-medal' },
  /* 스탯마다 아이콘 하나 — 이름을 읽지 않아도 어느 줄인지 안다.
     ⚠ 어셋이 없으면 폭 0 이라 예전 자리 그대로다(아이콘은 8종 다 와야 켜진다). */
  STAT_ICON: { speed:'ic-speed', acceleration:'ic-accel', stamina:'ic-stamina',
               technique:'ic-technique', rhythm:'ic-rhythm', power:'ic-power' },
  statRow(u, x, y, w, key, cur, pot){
    const ic = (typeof BG!=='undefined') ? BG.get(this.STAT_ICON[key]) : null;
    const iw = ic ? 11 : 0;
    if(ic) u.drawImage(ic, x, y-1, 10, 10);
    txt(u, STAT_NAME[key], x+iw, y, 9, PAL.dim);
    const LW = this.labelW(u, STAT_KEYS.map(k=>STAT_NAME[k]), 9, 42) + iw;
    const bx = x+LW, bw = w-LW-30;
    u.fillStyle='rgba(255,255,255,.10)'; u.fillRect(bx,y+2,bw,7);
    u.fillStyle='rgba(90,170,255,.30)';  u.fillRect(bx,y+2,Math.round(bw*pot/100),7);  // 잠재
    const c = cur>=pot-0.5 ? PAL.green : PAL.gold;
    u.fillStyle=c; u.fillRect(bx,y+2,Math.round(bw*cur/100),7);
    txt(u, Math.round(cur)+'', x+w, y, 9, c, 'right');
  },
  cond(v){ return v>=80?PAL.green : v>=60?PAL.gold : v>=40?'#ffa04c' : PAL.red; },
  /* 등급 — 색과 별로 표시한다. 숫자보다 눈에 먼저 들어와야 한다. */
  rareColor(a){ const r=(typeof rarityOf==='function')?rarityOf(a):1;
    return (typeof RARITY!=='undefined' && RARITY[r]) ? RARITY[r].color : PAL.dim; },
  rareName(a){ const r=(typeof rarityOf==='function')?rarityOf(a):1;
    return (typeof RARITY!=='undefined' && RARITY[r]) ? RARITY[r].name : ''; },
  rareStars(a){ const r=(typeof rarityOf==='function')?rarityOf(a):1;
    return '★'.repeat(r)+'☆'.repeat(5-r); },
  /* 뱃지 어셋이 그 등급만큼 왔으면 그림으로, 아니면 별표로 — 오는 대로 붙는다 */
  rareBadge(u, a, x, y, size){
    const r=(typeof rarityOf==='function')?rarityOf(a):1;
    return (typeof UIK!=='undefined') ? UIK.rarityBadge(u, x, y, size, r) : false;
  },
  condName(v){ return v>=85?'최상' : v>=70?'좋음' : v>=55?'보통' : v>=40?'나쁨' : '최악'; },
};

/* 화면 기반 클래스 ------------------------------------------------ */
class Screen0 {
  constructor(mg){ this.mg=mg; this.sel=0; }
  get rows(){ return []; }
  move(d){ const n=this.rows.length; if(!n) return; this.sel=(this.sel+d+n)%n; Sfx.ui(); }
  update(now){
    if(Input.repeat('up',now))   this.move(-1);
    if(Input.repeat('down',now)) this.move(1);
    if(Input.pressed('action'))  this.confirm();
    if(Input.pressed('back'))    this.cancel();
  }
  confirm(){} cancel(){ this.mg.pop(); }
}

/* 배웠는데 안 켠 스킬이 몇 개인가 — 슬롯이 비어 있는데 놀리는 건 순손해다 */
function C_squadIdleSkills(club){
  let n=0;
  for(const a of (club.squad||[])){
    SKILL.ensure(a);
    const free = SKILL.slots(a) - SKILL.equipped(a).length;
    if(free<=0) continue;
    n += Math.min(free, a.skills.filter(id=>a.skillEq.indexOf(id)<0).length);
  }
  return n;
}

/* ── 지금 할 것 ──────────────────────────────────────────
   ⚠ 사무실 메뉴가 **14줄**이다. 층을 아홉 개 쌓는 동안 "지금 뭘 해야 하나"에
      답하는 자리가 없었다. 우마무스메는 매 턴 다섯 개만 묻는다.

   그래서 맨 위에 **한 줄**을 둔다. 상태를 보고 제일 값진 것 하나를 골라
   사람 말로 말하고, 확인 한 번에 그 화면으로 간다.
   ⛔ 새 시스템이 아니다 — 이미 있는 것들을 가리키는 손가락일 뿐이다.

   순서는 **놓치면 손해인 것**부터다: 공짜 보상 → 잠긴 자원 → 대회 → 관리. */
function officeTodo(mg){
  const C = mg.club, S = mg.season;
  const put = (text, why, go, icon) => ({ text, why, go, icon });

  /* ① 그냥 받으면 되는 것 — 안 받으면 순손해다 */
  if(typeof Daily!=='undefined'){
    const d=Daily.load();
    if(d && !d.claimed && Daily.events().every(e=>d.marks[e.id]!==undefined))
      return put('일일 도전 보상을 받으세요', '세 종목을 다 마쳤습니다',
                 ()=>new DailyScreen(mg), 'icon-medal');
  }
  if(typeof Codex!=='undefined' && Codex.hasClaim())
    return put('도감 보상을 받으세요', '이정표에 닿았습니다',
               ()=>new CodexScreen(mg), 'icon-xp');

  /* ② 이번 주가 지나면 **사라지는 것** — 여기가 먼저다.
     ⛔ 예전엔 쌓인 자원(스킬·포인트·시설)이 먼저였다. 그래서 새로 시작한 감독이
        1주차에 받는 첫 지시가 **'시설을 지을 수 있습니다'** 였다(자금 260 · 최저 80).
        시설은 다음 주에도 지을 수 있지만 **직접 지도 3자리는 그 주에 안 쓰면 없어진다.**
        기준은 취향이 아니라 이것 하나다 — 건너뛰면 잃는가.
        쌓인 자원은 안 사라지므로 다음 주 목록에서 다시 말해 준다. */
  if(S.isMeetWeek) return put(`${MEET_INFO[S.meetKind].name} 출전`, '출전표를 짜세요',
                              ()=>new EntryScreen(mg), 'ic-meet');
  /* 팀 미팅 — 실측상 사기가 80 아래일 때 부르면 시즌 승점이 +19.9(+7%) 다.
     매주 부르면 오히려 −3.9 이므로 **문턱을 넘을 때만** 권한다. */
  const mAvg = C.squad.length
    ? C.squad.reduce((s2,a)=>s2+a.morale,0)/C.squad.length : 100;
  /* ⚠ '내려갔습니다' 라고 쓰고 있었다. 그런데 **새 클럽은 평균 61~68 로 시작한다**
     (실측 6회 · 문턱 78). 즉 새 게임을 켤 때마다 아무 일도 없었는데 "내려갔다" 가
     첫 지시로 떴다 — 감독이 이미 뭔가 잘못한 것처럼 읽힌다.
     변화가 아니라 **지금 값**을 말한다. 시작값 자체는 밸런스라 손대지 않는다
     (문턱 아래에서 시작하는 덕에 첫 주에 팀 미팅을 배우게 되는 면도 있다). */
  if(mAvg < 78 && !Object.values(mg.focus).includes('talk'))
    return put(`팀 사기 ${Math.round(mAvg)} — 올릴 수 있습니다`,
               '팀 미팅으로 올리세요 — 컨디션이 따라 오릅니다',
               ()=>new TrainScreen(mg), 'ic-morale');
  const hurt = C.squad.filter(a=>a.injury).length;
  if(hurt) return put(`부상 ${hurt}명 — 치료를 지정하세요`, '치료 지도는 회복이 2배 빠릅니다',
                      ()=>new TrainScreen(mg), 'ic-injury');
  if(Object.keys(mg.focus).length < 3)
    return put(`직접 지도 ${Object.keys(mg.focus).length} / 3`, '남은 자리를 쓰지 않으면 그냥 사라집니다',
               ()=>new TrainScreen(mg), 'ic-train');

  /* ③ 쌓여 있는 것 — 안 사라지니 이번 주에 할 일을 다 한 뒤에 권한다 */
  if(typeof SKILL!=='undefined'){
    const idle = C_squadIdleSkills(C);
    if(idle) return put(`안 켠 스킬 ${idle}개가 있습니다`, '배웠는데 장착을 안 했습니다',
                        ()=>new GrowPickScreen(mg), 'icon-levelup');
  }
  const tp = C.squad.reduce((n,a)=>n+(a.tp||0),0);
  if(tp >= 10) return put(`훈련 포인트 ${tp}점이 놀고 있습니다`, '스탯을 올리거나 잠재치를 돌파하세요',
                          ()=>new GrowPickScreen(mg), 'icon-tp');
  if(typeof FACIL!=='undefined' && FACIL.ids().some(id=>FACIL.canBuild(C,id)===null))
    return put('시설을 지을 수 있습니다', '코인을 영구 성장으로 바꿉니다',
               ()=>new FacilityScreen(mg), 'icon-gear');
  return null;                                  // 할 일이 없으면 줄을 안 만든다
}

/* ── 사무실(허브) ────────────────────────────────────────── */
class OfficeScreen extends Screen0 {
  get hdBg(){ return 'bg-office'; }  get hdBgDim(){ return 0.76; }
  get rows(){
    const S=this.mg.season, meetW=S.nextMeetWeek;
    const todo = officeTodo(this.mg);
    const r=[];
    /* 맨 위 한 줄 — 지금 할 것. 없으면 아예 안 뜬다(빈 줄로 자리를 먹지 않는다) */
    if(todo) r.push({ label:'▶ '+K(todo.text), sub:todo.why, icon:todo.icon,
                      right:'!', rightColor:PAL.green, color:PAL.green,
                      go:todo.go });
    r.push(...[
      /* 감독(4C_master) — '나'. 레벨이 선수 레벨 상한·코치 자리·정원을 연다 */
      (()=>{ const lv=(typeof Master!=='undefined')?Master.lv():1;
             const nx=(typeof Master!=='undefined')?Master.nextUnlock():null;
             return { icon:'ic-career', label:`감독  ${(typeof Master!=='undefined')?Master.name:''}`,
                      sub:`Lv.${lv} · 선수 레벨 상한 ${(typeof Master!=='undefined')?Master.athleteCap():60}`
                          + (nx? ` · 다음 Lv.${nx.lv}: ${nx.text}` : ''),
                      right:'Lv.'+lv, rightColor:PAL.gold,
                      go:()=>new MasterScreen(this.mg) }; })(),
      { label:'훈련 지시', icon:'ic-train', sub:`이번 주 직접 지도 ${Object.keys(this.mg.focus).length} / 3`, right:'▶',
        go:()=>new TrainScreen(this.mg) },
      { label:'선수단',   icon:'ic-squad',
        sub:`${this.mg.club.squad.length}명 · 부상 ${this.mg.club.squad.filter(a=>a.injury).length}명`,
        right: (typeof Power!=='undefined') ? UIK.n(Power.clubOf(this.mg.club)) : '▶',
        rightColor: PAL.gold, right2: (typeof Power!=='undefined') ? '클럽 경기력' : undefined,
        go:()=>new SquadScreen(this.mg) },
      /* 육성(46_rpg) — 포인트가 남아 있으면 눈에 띄게 */
      (()=>{ const tp=this.mg.club.squad.reduce((s,a)=>s+(a.tp||0),0);
             const inv=(this.mg.club.inventory||[]).length;
             /* 켤 수 있는데 안 켠 스킬이 있으면 알려 준다 — 배우고 안 켜는 게 함정이다 */
             const idle = (typeof SKILL==='undefined') ? 0 : C_squadIdleSkills(this.mg.club);
             return { label:'육성', icon:'ic-develop',
                      sub:`훈련 포인트 ${tp} · 창고 ${inv}개`
                          + (idle? ` · 안 켠 스킬 ${idle}개` : ''),
                      right: (tp>0||idle)?'●'+(tp||idle):'▶',
                      rightColor: (tp>0||idle)?PAL.gold:PAL.dim,
                      color: (tp>0||idle)?PAL.gold:undefined,
                      go:()=>new GrowPickScreen(this.mg) }; })(),
      { label:'팀 프로그램', icon:'ic-rest', sub:PROGRAMS[this.mg.club.program].name+' — '+PROGRAMS[this.mg.club.program].desc, right:'▶',
        go:()=>new ProgramScreen(this.mg) },
      /* 코치진(49_depth) — 뽑으면 그 분야가 잘 자란다. 주급을 먹는다. */
      (()=>{ const n=(typeof DEPTH!=='undefined')?DEPTH.hired(this.mg.club).length:0;
             const w=(typeof DEPTH!=='undefined')?DEPTH.wageBill(this.mg.club):0;
             return { label:'코치진', icon:'ic-injury', sub:n? `${n}명 · 주급 ${w}` : '아직 없음 — 분야별로 3명까지', right:'▶',
                      go:()=>new CoachScreen(this.mg) }; })(),
      { label:'선수 사무소', icon:'ic-market', sub:`자금 ${Math.round(this.mg.club.budget)} · 스카우트·영입·이적`, right:'▶',
        go:()=>new MarketScreen(this.mg) },
      /* 국가대표(4N_national) — ⛔ 선발이 **조용히** 일어났다. 시즌 시작에 뽑아 놓고
         화면이 한 마디도 안 했다. 누가 나라를 대표하는지는 감독이 봐야 할 것이다. */
      (()=>{ if(typeof NATIONAL==='undefined') return null;
             const C=this.mg.club;
             const nat = C.squad.filter(a=>NATIONAL.is(a));
             if(!nat.length) return null;
             nat.sort((x,y)=>y.overall-x.overall);
             return { label:'국가대표', icon:'ic-medal',
                      sub: nat.map(a=>`${a.name}${NATIONAL.caps(a)>1?'('+NATIONAL.capsLabel(a)+')':''}`).join(', '),
                      right:String(nat.length), rightColor:PAL.gold,
                      go:()=>new SquadScreen(this.mg) }; })(),
      /* 클럽 갈래(4M_identity) — 라이벌은 여섯 팀 다 특기가 있는데 우리만 없었다 */
      (()=>{ if(typeof IDENT==='undefined') return null;
             IDENT.ensure(this.mg.club);
             const cur = IDENT.of(this.mg.club);
             return { label:'클럽 갈래', icon:'ic-develop',
                      sub: cur ? IDENT.name(this.mg.club) : '아직 안 정했습니다 — 정하면 그 갈래가 빨리 큰다',
                      right: cur ? '◎' : '!',
                      rightColor: cur ? PAL.gold : PAL.green,
                      color: cur ? undefined : PAL.green,
                      go:()=>new IdentityScreen(this.mg) }; })(),
      /* 계약(4K_contract) — ⛔ 만료가 코앞이면 **빨갛게** 말한다. 모르고 잃으면 사고다 */
      (()=>{ if(typeof CONTRACT==='undefined') return null;
             const exp = CONTRACT.expiring(this.mg.club);
             return { label:'계약', icon:'ic-career',
                      sub: exp.length
                        ? K('올해 끝나는 계약 %1 — %2 외').replace('%1', exp.length).replace('%2', exp[0].name)
                        : '모두 여유 있음',
                      right: exp.length ? String(exp.length) : '▶',
                      rightColor: exp.length ? PAL.red : PAL.dim,
                      go:()=>new ContractScreen(this.mg) }; })(),
      /* 시설(4F_facility) — 코인을 영구 성장으로. 지을 수 있으면 눈에 띄게 */
      (()=>{ const C=this.mg.club;
             const can=(typeof FACIL!=='undefined') &&
               FACIL.ids().some(id=>FACIL.canBuild(C,id)===null);
             return { label:'시설', icon:'ic-facility',
                      sub:(typeof FACIL!=='undefined')?FACIL.summary(C):'—',
                      right: can?'!':'▶', rightColor: can?PAL.gold:PAL.dim,
                      color: can?PAL.gold:undefined,
                      go:()=>new FacilityScreen(this.mg) }; })(),
      /* 일일 도전(4B_daily) — 매일 열 이유. 안 한 종목이 있으면 눈에 띄게 */
      (()=>{ const d=(typeof Daily!=='undefined')?Daily.load():null;
             if(!d) return { label:'기록실', sub:'클럽 기록과 대회 이력', right:'▶' };
             const evs=Daily.events(), left=evs.filter(e=>d.marks[e.id]===undefined).length;
             const st=Daily.streak();
             return { label:'일일 도전',
               sub: d.claimed ? '오늘은 끝났습니다' + (st.n>1?` · ${st.n}일 연속`:'')
                  : left ? `남은 종목 ${left} / ${evs.length}`
                  : '보상을 받을 수 있습니다',
               right: d.claimed ? '✓' : left ? String(left) : '!',
               rightColor: d.claimed?PAL.dim:PAL.gold,
               color: d.claimed?undefined:PAL.gold,
               icon:'ic-stopwatch', go:()=>new DailyScreen(this.mg) }; })(),
      /* 명예의 전당(49_depth) — 은퇴 선수가 남는 자리이자 신인이 물려받는 자리 */
      (()=>{ const h=(typeof DEPTH!=='undefined')?DEPTH.hall(this.mg.club):[];
             const t=(typeof DEPTH!=='undefined')?DEPTH.legacyTotal(this.mg.club):0;
             return { label:'명예의 전당',
                      sub: h.length? `${h.length}명 · 유산 ${t}` : '아직 비어 있습니다',
                      right:'▶', icon:'ic-hall', go:()=>new HallScreen(this.mg) }; })(),
      /* 종족 도감(4D_codex) — 5단계 등급에 '모을 것'을 준다 */
      (()=>{ const T=(typeof Codex!=='undefined')?Codex.totals():{owned:0,total:0};
             const claim=(typeof Codex!=='undefined') && Codex.hasClaim();
             const gb=(typeof Codex!=='undefined') ? (Codex.growBonus().grow*100).toFixed(1) : '0';
             return { label:'종족 도감',
                      sub:`등록 ${T.owned} / ${T.total} · 성장 +${gb}%` + (claim?' · 받을 보상이 있습니다':''),
                      right: claim?'!':`${T.owned}/${T.total}`,
                      icon:'ic-codex', rightColor: claim?PAL.gold:PAL.dim,
                      color: claim?PAL.gold:undefined,
                      go:()=>new CodexScreen(this.mg) }; })(),
      { label:'기록실',   icon:'ic-record', sub:'클럽 기록과 대회 이력', right:'▶',
        go:()=>new RecordScreen(this.mg) },
      { label:'리그 순위표', icon:'ic-league', sub:leagueSub(S), right:'▶',
        go:()=>new LeagueScreen(this.mg) },
    ]);
    if(S.isMeetWeek) r.push({ label:`▶ ${MEET_INFO[S.meetKind].name} 출전`, icon:'ic-meet',
                              sub:'출전표를 짜고 경기를 본다',
                              color:PAL.green, right:'!', go:()=>new EntryScreen(this.mg) });
    else r.push({ label:'다음 주로', sub: meetW? `${meetW}주차 대회까지 ${meetW-S.week}주` : '시즌 마무리', right:'▶',
                  next:true });
    /* ⛔ 조건부 줄이 null 을 돌려줄 수 있다(계약처럼 모듈이 없을 때) —
       거르지 않으면 목록이 통째로 깨진다. */
    return r.filter(Boolean);
  }
  /* ⚠ 예전엔 줄 목록과 switch(this.sel) 두 벌을 손으로 맞췄다. 줄을 하나 더할 때마다
     인덱스가 밀려 **다른 화면이 열린다**(이 코드베이스가 같은 이유로 여러 번 물렸다).
     줄이 자기가 열 화면을 들고 있으면 어긋날 자리가 없다. */
  confirm(){
    const r=this.rows[this.sel]; if(!r) return;
    if(r.next){ this.mg.nextWeek(); return; }
    if(r.go){ this.mg.push(r.go()); return; }
  }

  cancel(){}
  draw(u){
    const S=this.mg.season, C=this.mg.club;
    /* 국기 + 클럽 이름 — 우리가 어느 나라인지 매 화면에 있어야 한다 */
    UI.header(u, `${C.name}`, `${C.year}년차 · ${S.week} / 24주`);
    if(C.nation && typeof drawFlag==='function') drawFlag(u, VW/2-11, 4, 22, 15, C.nation);
    /* 올림픽 카운트다운 — 감독의 4년은 '다음 올림픽까지 남은 시간'이다 */
    if(S.isOlympicYear){
      /* ⚠ 아래 else 는 '이름은 이름대로, 문장은 문장대로' 를 지키는데 이 갈래만 안 지켰다.
         ⛔ 그리고 **가운데 정렬도 이 갈래만 안 고쳤다** — 'LA 2028 — this is the year' 가
            목표 칸('0/9')을 물었다. 두 갈래는 같은 자리를 쓰므로 규칙도 같아야 한다. */
      const oy = olympicName(C.year) + ' — ' + K('올해다');
      const L0 = 186, R0 = VW - 58;
      let oys = 10;
      try{ for(; oys >= 7; oys--){ u.font = `700 ${oys}px "Galmuri11","Nanum Gothic Coding",monospace`;
             if(u.measureText(oy).width <= R0 - L0) break; } }catch(e){}
      txt(u, oy, (L0 + R0) / 2, 40 + (10 - oys), oys, PAL.gold, 'center', 700);
    } else {
      /* ⚠ 대회 이름을 문장 안에 넣으면 번역 자리표(%1)가 숫자만 접기 때문에 매칭이 깨진다.
         이름은 이름대로, 문장은 문장대로 넘긴다. */
      /* ⛔ y=39~40 한 줄에 넷이 산다 — 목표 막대(8~106)·승점(110~)·금(150~)·범례(~VW-8).
         가운데 정렬로 두면 그 사이 빈 폭보다 길어질 때 **양옆을 문다**
         ('Brisbane 2032 · in 3 yr' 이 '0/10' 을 물었다 — 4년차에 처음 나왔다).
         남은 폭 안에서만 그리고, 안 들어가면 글자를 줄인다. */
      const oc = olympicName(C.year + S.yearsToOlympics) + ' · ' + K('%1년 뒤').replace('%1', S.yearsToOlympics);
      const L = 186, R = VW - 58;                 // 금메달 칸 뒤 ~ '■ 대회 주' 앞
      let os = 9;
      try{ for(; os >= 7; os--){ u.font = `400 ${os}px "Galmuri11","Nanum Gothic Coding",monospace`;
             if(u.measureText(oc).width <= R - L) break; } }catch(e){}
      txt(u, oc, (L + R) / 2, 40 + (9 - os), os, PAL.dim, 'center');
    }
    // 주차 스트립 — 대회가 언제인지 한눈에
    const sx=8, sw=VW-16, cw=sw/24;
    for(let w=1;w<=24;w++){
      const x=sx+(w-1)*cw;
      const isMeet=!!MEET_WEEKS[w], past=w<S.week, cur=w===S.week;
      u.fillStyle = cur ? PAL.gold : isMeet ? (past?'rgba(92,255,156,.4)':PAL.green) : (past?'rgba(255,255,255,.22)':'rgba(255,255,255,.09)');
      u.fillRect(x+1, 28, cw-2, isMeet?9:6);
    }
    txt(u,'■ 대회 주',VW-8,39,8,PAL.green,'right');
    /* 시즌 목표 — 감독이 무엇으로 평가받는지 늘 보여야 한다 */
    if(S.goal){
      const okP=S.points>=S.goal.points, okG=S.medals.gold>=S.goal.gold;
      /* ⚠ 진행값을 x=108 에 못 박아 뒀다. 한국어 '목표 승점 220 · 금 2' 는 100px 안에
         들어가지만 영어 'Target 220 pts · 2 gold' 는 넘어가 **글자가 겹쳤다.**
         라벨을 재서 그 뒤에 놓는다 — 이 코드베이스가 언어 때문에 여러 번 물린 자리다
         (UI.labelW 도 같은 이유로 생겼다). */
      /* ⛔ 챕터 1 — 문장 두 덩이("목표 승점 220 · 금 2" + "0 / 0")를 **막대 하나**로.
         "얼마나 왔나"는 숫자를 읽는 것보다 길이를 보는 게 빠르다.
         ⚠ 숫자를 없애지 않는다 — 막대 옆에 현재/목표를 짧게 남긴다. */
      const bx=8, bw=96, by=41;
      u.fillStyle='rgba(255,255,255,.12)'; u.fillRect(bx, by, bw, 5);
      u.fillStyle = okP?PAL.green:PAL.gold;
      u.fillRect(bx, by, Math.round(bw*clamp(S.points/Math.max(1,S.goal.points),0,1)), 5);
      /* ⛔ 승점 칸 폭을 40px 로 박아 뒀다(110~150) — **여섯 자리가 되면 넘어가**
         메달 칸(150~)을 문다(극단값 감사에서 '999999/999999' 가 '999/99' 를 12px 물었다).
         재서 다음 칸을 잡는다 — 이 화면에서만 네 번째 같은 사고다. */
      const pts = `${S.points}/${S.goal.points}`;
      txt(u, pts, bx+bw+6, 39, 8, okP?PAL.green:PAL.dim, 'left', 700);
      let ptsW = 40;
      try{ u.font = '700 8px "Galmuri11","Nanum Gothic Coding",monospace';
           ptsW = Math.ceil(u.measureText(pts).width); }catch(e){}
      /* 금메달 목표는 메달 아이콘 + 개수로 */
      const mx = Math.max(bx+bw+46, bx+bw+6+ptsW+8);
      const mi = BG.get('icon-medal');
      if(mi) u.drawImage(mi, mx, 38, 9, 9);
      txt(u, `${S.medals.gold}/${S.goal.gold}`, mx+(mi?11:0), 39, 8,
          okG?PAL.green:PAL.dim, 'left', 700);

    }

    // 요약 카드
    const avgC = C.squad.reduce((s,a)=>s+a.condition,0)/C.squad.length;
    const avgF = C.squad.reduce((s,a)=>s+a.fatigue,0)/C.squad.length;
    plate(u, 8, 50, VW-16, 28, .78);
    const inj=C.squad.filter(a=>a.injury);
    /* ⚠ 예전엔 배열 세 칸([라벨, 값, 색])이었다. 아이콘을 네 번째 칸으로 붙였더니
       어셋 검사기가 못 읽었다(이름 붙은 icon: 만 읽는다). 객체로 바꾼다 —
       칸이 늘어도 자리로 세지 않아도 되고 검사기도 읽는다. */
    /* ⛔ 챕터 1 — **아이콘이 라벨을 대신한다.**
       예전엔 칸마다 아이콘 + 라벨 + 값 셋을 다 그렸다(텍스트 12조각).
       아이콘이 있으면 라벨을 안 그린다 — 없으면 예전처럼 라벨이 나온다.
       ⚠ 정보를 지우는 게 아니라 **중복을 지운다.** 값은 그대로 다 있다. */
    const cells=[
      { k:'자금', v:String(Math.round(C.budget)), c:C.budget<20?PAL.red:PAL.gold, icon:'ic-coin' },
      { k:'승점', v:String(S.points), c:PAL.white, icon:'ic-points' },
      { k:'메달', v:`${S.medals.gold}·${S.medals.silver}·${S.medals.bronze}`, c:PAL.white, icon:'icon-medal' },
      { k:'컨디션', v:UI.condName(avgC), c:UI.cond(avgC), icon:'ic-condition' },
      { k:'피로', v:Math.round(avgF)+'', c:avgF>65?PAL.red:avgF>45?PAL.gold:PAL.green, icon:'ic-fatigue' },
      { k:'부상', v:inj.length?`${inj.length}명`:'없음', c:inj.length?PAL.red:PAL.green, icon:'ic-injury' },
    ];
    /* ⛔ 이사회 신뢰는 시즌 **끝에만** 보여 주면 24주 동안 압박이 없다(4I_board).
       ⚠ 목표 줄(y 39)에 넣으려다 두 번 겹쳤다 — 오른쪽은 '■ 대회 주' 범례,
         가운데는 올림픽 카운트다운이 이미 쓰고 있다(실측 캡처 2회).
         신뢰는 클럽 지표니 **요약 카드**가 제자리다. */
    if(typeof BOARD !== 'undefined'){
      BOARD.ensure(C);
      cells.push({ k:'신뢰',
        v: Math.round(C.trust) + (C.warnings>0 ? ' ⚠'+C.warnings : ''),
        c: BOARD.color(C.trust), icon:'ic-morale' });
    }
    /* ⛔ 아이콘만 두면 **처음 켠 사람에게는 여섯 칸이 전부 수수께끼다** —
       260 · 0 · 0·0·0 · 보통 · 0 · 없음 이 각각 뭔지 알 길이 없다(실측: 새 클럽 1주차).
       그렇다고 늘 라벨을 달면 CK 가 지적한 '글자가 너무 많다' 로 되돌아간다.
       **첫 시즌에만 라벨을 함께 보여 준다** — 배우고 나면 조용해진다.
       ⚠ 라벨은 아이콘 오른쪽에 붙인다. 칸 너비는 74px 라 11+2+라벨(≤22px) 이 들어간다. */
    const teach = S.year <= 1;
    const cellW = Math.floor((VW-32)/cells.length);
    cells.forEach((c,i)=>{
      const cx=16+i*cellW;
      const im = c.icon ? BG.get(c.icon) : null;
      if(im){ u.drawImage(im, cx, 53, 11, 11);
              if(teach) txt(u, c.k, cx+13, 54, 8, PAL.dim); }
      else    txt(u, c.k, cx, 54, 8, PAL.dim);        // 아이콘이 아직 없으면 라벨로
      /* ⛔ 값을 12px 로 박아 두면 **긴 번역이 옆 칸을 문다** — 부상 '1명'(한국어 13px)이
         영어로는 '1 athletes'(66px)가 되어 칸(64px)을 넘고 다음 칸의 값 위에 앉았다
         (2026-08-31 흐름 감사). 칸이 스스로 지킨다 — 안 들어가면 글자를 줄인다. */
      let vs = 12;
      try{
        const t2 = K(c.v);
        for(; vs >= 8; vs--){
          u.font = `700 ${vs}px "Galmuri11","Nanum Gothic Coding",monospace`;
          if(u.measureText(t2).width <= cellW - 5) break;
        }
      }catch(e){ vs = 12; }
      txt(u, c.v, cx, 66+(12-vs), vs, c.c, 'left', 700);
    });

    UI.list(u, this.rows, this.sel, 8, 82, VW-16, 22, 6);
    // 지난주 일지 — 비어 있으면 안내를 띄운다(빈 화면은 고장처럼 보인다)
    const log=this.mg.lastLog, WS=this.mg.weekSummary;
    plate(u, 8, VH-58, VW-16, 40, .55);
    if(log && log.length){
      txt(u,'지난주',14,VH-56,8,PAL.dim);
      /* ⚠ 아래 성장 줄의 시작점(52)은 '지난주'(한국어 26px)를 비켜 잡은 값이다.
         영어 'Last week' 는 39px 라 14+39=53 — 52 를 문다. 재서 뒤에 붙인다. */
      let logHead = 52;
      try{ u.font = '400 8px "Galmuri11","Nanum Gothic Coding",monospace';
           logHead = 14 + Math.ceil(u.measureText(K('지난주')).width) + 8; }catch(e){}
      /* ⚠ 한 주치 성장이 로그 세 줄로만 흘러갔다. 그 주에 클럽이 얼마나 세졌는지를
         **제일 먼저** 말한다 — 큰 것이 작은 것보다 잘 보여야 한다. */
      if(WS && WS.grow){
        const c = WS.grow>0?PAL.green:PAL.red;
        /* 달력 한 장이 넘어간다 — 사무실에 처음 들어온 1.2초 동안만.
           ⚠ 시간은 화면이 이미 갖고 있는 것을 쓴다(this.mg.t). */
        { const age = (this.mg.t||0) - (this._wsAt ??= (this.mg.t||0));
          if(age < 1200)
            BG.fx(u, 'fx-week-done', 78, VH-40, 30, clamp(age/1200,0,0.999), 5); }
        /* ⛔ 52 / 108 / 146 으로 자리를 박아 뒀다 — 한국어 '이번 주 성장'(약 48px)은
           108 전에 끝나지만 영어 'Growth this week'(69px)는 **값 위로 올라탔다**
           (2026-08-31 흐름 감사에서 14주 연속으로 잡혔다). 재서 이어 놓는다.
           ⚠ 흐르는 배치에는 **끝점**이 있어야 한다 — 상자 오른쪽 끝(VW-16)에서 자른다. */
        const adv = (s2, size, weight) => {
          try{ u.font = `${weight||400} ${size}px "Galmuri11","Nanum Gothic Coding",monospace`;
               return u.measureText(K(s2)).width; }catch(e){ return String(s2).length*size*0.55; }
        };
        let gx = logHead;
        txt(u, '이번 주 성장', gx, VH-56, 8, PAL.dim, 'left');  gx += adv('이번 주 성장', 8) + 6;
        const gv = (WS.grow>0?'+':'')+UIK.n(WS.grow);
        txt(u, gv, gx, VH-57, 11, c, 'left', 700);              gx += adv(gv, 11, 700) + 10;
        if(WS.top && WS.top.length){
          const line = WS.top.map(r=>`${r.name} ${r.d>0?'+':''}${UIK.n(r.d)}`).join('  ·  ');
          if(gx + adv(line, 8) <= VW - 16) txt(u, line, gx, VH-56, 8, PAL.dim, 'left');
        }
      }
      /* 로그 줄 수를 결산 유무와 무관하게 세 줄로 유지한다(상자 높이가 고정이다) */
      log.slice(0,3).forEach((e,i)=>
        txt(u, e.msg, 14, VH-46+i*11, 9,
          e.t==='injury'?PAL.red : e.t==='break'?PAL.green : e.t==='slump'?'#ffa04c' : PAL.white));
    } else {
      /* 이 상자가 '무엇에 대한 말인지' 잇는다 — 목록에서 고른 줄을 꼬리로 가리킨다 */
      UIK.tail(u, 30, VH-62, 10);
      UIK.divider(u, 14, VH-60, VW-28);
      txt(u,'감독 노트',14,VH-56,8,PAL.dim);
      txt(u,'매주 3명까지 직접 지도할 수 있습니다. 나머지는 팀 프로그램대로 훈련합니다.',14,VH-46,9,PAL.white);
      txt(u,'피로가 쌓이면 성장이 멈추고 부상이 급증합니다 — 대회 직전엔 쉬게 하세요.',14,VH-35,9,PAL.dim);
    }
    UI.footer(u, '▲▼ 이동   확인 선택');
  }
}

/* ── 훈련 지시 ───────────────────────────────────────────── */
class TrainScreen extends Screen0 {
  /* ⚠ 0.68 로는 '단거리 · OVR 38' 같은 회색 보조글이 밝은 훈련장에 묻혔다(실측) */
  get hdBg(){ return 'bg-training'; }  get hdBgDim(){ return 0.82; }
  constructor(mg){ super(mg); this.pick=null; }
  get squad(){ return this.mg.club.squad; }
  get rows(){
    return this.squad.map(a=>{
      const f=this.mg.focus[a.id];
      return {
        label: (a.national?'★ ':'') + `${a.speciesName} ${a.name}` + (a.injury?' (부상)':''), nation:a.nation,
        sub: `${a.spec==='sprint'?'단거리':a.spec==='hurdles'?'허들':a.spec==='jump'?'도약':'투척'} · OVR ${a.overall} · 피로 ${Math.round(a.fatigue)}`,
        right: f ? FOCUS[f].name : '—',
        rightColor: f ? PAL.gold : PAL.dim,
        right2: `컨디션 ${UI.condName(a.condition)}`,
        color: a.injury ? PAL.red : PAL.white,
      };
    });
  }
  confirm(){
    const a=this.squad[this.sel];
    this.mg.push(new FocusPickScreen(this.mg, a));
  }
  draw(u){
    const used=Object.keys(this.mg.focus).length;
    UI.header(u, '훈련 지시', `직접 지도 ${used} / 3`);
    txt(u, '지도하지 않은 선수는 팀 프로그램대로 훈련합니다', 8, 27, 9, PAL.dim);
    txt(u, `팀 프로그램: ${PROGRAMS[this.mg.club.program].name}`, 8, 38, 9, PAL.blue);
    UI.list(u, this.rows, this.sel, 8, 52, VW-16, 26, 6);
    UI.footer(u, '확인 지도 지정   취소 돌아가기');
  }
}
class FocusPickScreen extends Screen0 {
  constructor(mg, a){ super(mg); this.a=a; this.keys=Object.keys(FOCUS); }
  get rows(){
    return this.keys.map(k=>{
      const F=FOCUS[k];
      const cur = F.stat ? this.a.stats[F.stat] : null;
      const pot = F.stat ? this.a.potential[F.stat] : null;
      /* 팀 미팅은 선수단 전체가 얼마나 오르는지를 미리 보여 준다 —
         "지금 부를 때인가"를 목록에서 바로 판단할 수 있어야 한다 */
      const gain = F.talk
        ? Math.round(this.mg.club.squad.reduce((s2,x)=>
            s2 + Math.min(100-x.morale, 5 + (100-x.morale)*0.22 + (x.injury?4:0)), 0))
        : 0;
      return { label:F.name,
        /* ⚠ 예전엔 여기서 k==='rest' 삼항으로 설명을 갈랐다 — 항목을 하나 더하면
           **엉뚱한 설명이 붙는다**(면담을 넣자 '부상 회복이 2배'로 떴다).
           설명은 FOCUS 가 들고 있다. */
        sub: F.stat ? `${Math.round(cur)} / ${pot}${cur>=pot-0.5?' (한계)':''}` : (F.desc||''),
        right: F.talk ? `팀 사기 +${gain}`
              : F.load>0 ? `부하 +${F.load.toFixed(1)}` : `회복 ${F.load.toFixed(1)}`,
        rightColor: F.talk ? (gain>=45?PAL.green:PAL.gold)
                  : F.load>0 ? (F.load>1.4?PAL.red:PAL.gold) : PAL.green,
        right2: F.talk ? `평균 ${Math.round(this.mg.club.squad.reduce((s2,x)=>s2+x.morale,0)/this.mg.club.squad.length)}` : undefined,
        dim: F.stat && cur>=pot-0.5 };
    }).concat([{ label:'지도 안 함', sub:'팀 프로그램대로', right:'—', rightColor:PAL.dim }]);
  }
  confirm(){
    const used=Object.keys(this.mg.focus);
    if(this.sel >= this.keys.length){ delete this.mg.focus[this.a.id]; Sfx.ui(); this.mg.pop(); return; }
    if(!this.mg.focus[this.a.id] && used.length>=3){ this.mg.toast('직접 지도는 주당 3명까지'); Sfx.fail(); return; }
    this.mg.focus[this.a.id]=this.keys[this.sel]; Sfx.ui(); this.mg.pop();
  }
  draw(u){
    const a=this.a;
    UI.header(u, a.name, `OVR ${a.overall} / 잠재 ${a.potOverall}`);
    txt(u, `컨디션 ${UI.condName(a.condition)}`, 8, 27, 9, UI.cond(a.condition));
    txt(u, `피로 ${Math.round(a.fatigue)}`, 96, 27, 9, a.fatigue>65?PAL.red:PAL.dim);
    if(a.injury) txt(u, `부상: ${a.injury.name} (${a.injury.weeks}주)`, 160, 27, 9, PAL.red);
    /* ⚠ 8줄 고정이었다. 항목이 10개(스탯 6 + 휴식·치료·팀 미팅 + 지도 안 함)로 늘자
       **새로 넣은 팀 미팅이 화면 밖으로 잘렸다** — 목록이 스크롤되긴 하지만
       기본 위치에서 안 보이면 없는 것과 같다. 줄 수에 맞춰 높이를 계산한다. */
    const n = this.rows.length;
    const top = 40, bot = VH - 20;
    const rowH = Math.max(16, Math.min(22, Math.floor((bot-top)/n)));
    UI.list(u, this.rows, this.sel, 8, top, VW-16, rowH, n);
    UI.footer(u, '확인 지정   취소 돌아가기');
  }
}

/* ── 팀 프로그램 ─────────────────────────────────────────── */
class ProgramScreen extends Screen0 {
  /* ⛔ 예전엔 `Object.keys(PROGRAMS)` 를 통째로 썼다. 갈래 전용 프로그램이 PROGRAMS 에
     합쳐지면서 **모든 클럽에 열두 개가 다 보이게** 된다 — 갈래를 고른 뜻이 사라진다.
     기본 5종 + **우리 갈래 전용 2종**만 보여 준다(4M_identity.programKeys). */
  constructor(mg){ super(mg);
    this.keys = (typeof IDENT!=='undefined') ? IDENT.programKeys(mg.club) : Object.keys(PROGRAMS);
    this.sel = Math.max(0, this.keys.indexOf(mg.club.program)); }
  get rows(){ return this.keys.map(k=>{
    const P=PROGRAMS[k];
    const top=Object.entries(P.w).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>STAT_NAME[e[0]]).join('·');
    const ex = (typeof IDENT!=='undefined') && IDENT.isExtra(k);
    return { label:(ex?'★ ':'')+P.name, sub:P.desc, right:`부하 ${P.load.toFixed(2)}`,
      rightColor:P.load>1.1?PAL.red:P.load<0.9?PAL.green:PAL.gold, right2:top,
      color: k===this.mg.club.program?PAL.gold:(ex?PAL.blue:PAL.white) };
  }); }
  confirm(){ this.mg.club.program=this.keys[this.sel]; Sfx.ui(); this.mg.pop(); }
  draw(u){
    const nm = (typeof IDENT!=='undefined') ? IDENT.name(this.mg.club) : '';
    UI.header(u,'팀 프로그램', nm ? `${K('시즌 내내 적용')} · ${K(nm)}` : '시즌 내내 적용');
    txt(u,'부하가 높으면 빨리 크지만 피로·부상이 늘어납니다',8,27,9,PAL.dim);
    if(typeof IDENT!=='undefined' && IDENT.of(this.mg.club))
      txt(u,'★ '+K('갈래 전용'), VW-8, 27, 9, PAL.blue, 'right');
    UI.list(u,this.rows,this.sel,8,42,VW-16,26,5);
    UI.footer(u,'확인 선택   취소 돌아가기');
  }
}

/* ── 선수단 · 선수 상세 ──────────────────────────────────── */
/* 피로가 높은 선수에 땀방울 — 목록을 훑을 때 '쉬게 해야 할 사람'이 눈에 띈다 */
function drawSweat(u, a, x, y){
  if(!a || (a.fatigue||0) < 65) return;
  BG.obj(u, 'sweat-drop', x, y, 9);
}

class SquadScreen extends Screen0 {
  /* ⛔ 챕터 3 — **정렬.** 선수단은 최대 18명인데 등록순 하나뿐이라
     "누가 제일 센가" "누가 지쳤나" "누가 다쳤나"를 눈으로 훑어야 했다.
     ◀▶ 로 기준을 바꾼다. 목록이 질문에 답하게 만드는 게 목적이다.

     ⚠ 표시 순서를 바꾸면 **this.sel 로 club.squad 를 바로 인덱싱하면 안 된다** —
        이 코드베이스가 병렬 목록으로 여러 번 물린 자리다(READY↔classFor 등).
        보이는 목록을 view() 한 곳에서 만들고, 모든 곳이 그걸 쓴다. */
  static SORTS = [
    { k:'등록순', f:null },
    { k:'경기력', f:(x,y)=>Power.of(y)-Power.of(x) },
    { k:'컨디션', f:(x,y)=>x.condition-y.condition },        // 나쁜 순 — 손 볼 사람부터
    { k:'피로',   f:(x,y)=>y.fatigue-x.fatigue },
    { k:'나이',   f:(x,y)=>y.age-x.age },
  ];
  view(){
    const S = SquadScreen.SORTS[this.sortI||0];
    const v = this.mg.club.squad.slice();
    /* 부상자는 언제나 위로 — 어느 기준이든 "지금 못 뛰는 사람"이 먼저다 */
    v.sort((x,y)=> (y.injury?1:0)-(x.injury?1:0) || (S.f ? S.f(x,y) : 0));
    return v;
  }
  update(now){
    const n = SquadScreen.SORTS.length;
    if(Input.pressed('left')) { this.sortI=((this.sortI||0)+n-1)%n; this.sel=0; Sfx.ui(); return; }
    if(Input.pressed('right')){ this.sortI=((this.sortI||0)+1)%n;   this.sel=0; Sfx.ui(); return; }
    super.update(now);
  }
  get rows(){ return this.view().map((a,i)=>({
    /* ⚠ 종족 이름은 번역표에 다 있는데도 영어 빌드에서 한국어로 나왔다 —
       별·종족·이름을 **한 문자열로 조립**하면 txt() 가 그 통문자열을 K() 에 넘겨
       표에서 못 찾기 때문이다. 종족만 먼저 옮겨 붙인다(이름은 데이터라 그대로). */
    /* ★ 옆에 캡(대표 횟수) — 두 번 이상 뽑힌 선수는 그게 이력이다(4N_national) */
    label:(a.national?'★ ':'')+`${UI.rareStars(a)} ${K(a.speciesName)} ${a.name}`
          + ((typeof NATIONAL!=='undefined' && NATIONAL.caps(a)>1) ? ` ${NATIONAL.caps(a)}` : ''),
    nation:a.nation,
    /* 로스터는 표다 — 나이·성장형·특성을 훑을 수 있어야 한다.
       ⛔ 챕터 1 규칙: 부제가 **설명**이면 숨기고 **데이터**면 남긴다.
       ⛔ 챕터 7 — 이 화면이 **73개 중 제일 빽빽했다**(36조각·455자 · ink.html).
          한 줄 57자를 뜯어 보니 **등급이 세 번** 있었다: 별(★★☆☆☆)·글자(우수)·글자색.
          같은 값을 세 번 말하는 자리가 제일 긴 줄을 만들고 있었다 → 글자를 뺀다.
          특성 이름 나열도 길다(`승부사, 허들 감각`) — 아이콘이 오면 아이콘으로,
          오기 전엔 **하나만 이름 + `+N`** 으로 줄인다. 정보는 상세 화면에 그대로 있다. */
    subAlways:true,
    /* 커서가 있는 줄만 특성을 **말로** 적는다 — 아이콘의 뜻을 거기서 배운다 */
    sub: UI.squadSub(a, i === (this.sel|0)),
    icons: UI.squadIcons(a),
    /* ⚠ 목록의 큰 글씨도 경기력으로 바꾼다. OVR 만 보이면 Lv30 에 전설 장비를
       끼운 선수와 신인이 같은 숫자로 나란히 선다 — 누굴 내보낼지 알 수가 없다.
       ⚠ 그래서 오른쪽 둘째 줄의 OVR 은 뺀다 — 경기력이 그것을 품은 상위 지표이고,
          OVR 은 상세 화면과 정렬 기준에 그대로 있다. 여기선 **컨디션**만 필요하다. */
    right: (typeof Power!=='undefined') ? UIK.n(Power.of(a)) : `${a.overall} / ${a.potOverall}`,
    rightColor: a.injury?PAL.red:PAL.gold,
    right2: a.injury ? K('부상 %1주').replace('%1', a.injury.weeks)
                     : UI.condName(a.condition),
    color: a.injury?PAL.red:UI.rareColor(a) })); }
  confirm(){ const a=this.view()[this.sel]; if(a) this.mg.push(new AthleteScreen(this.mg, a)); }
  draw(u){
    const v = this.view(), S = SquadScreen.SORTS[this.sortI||0];
    UI.header(u,'선수단',`${v.length}명`);
    /* ⛔ 오른쪽 큰 숫자(4,346)가 **뭔지 라벨이 없었다.** 처음 보면 알 수 없다.
       사무실 지표와 같은 규칙 — **첫 시즌에만** 이름을 달고 그 뒤엔 조용해진다. */
    if(this.mg.season && this.mg.season.year <= 1)
      txt(u, K('경기력'), VW-16, 17, 8, PAL.dim, 'right');
    /* 지금 무슨 기준으로 줄 세웠나 — 안 보이면 왜 순서가 바뀌었는지 모른다 */
    /* 정렬 표시 — 아이콘이 오면 '◀ ▶' 화살표 앞에 놓아 무슨 줄인지 분명히 한다 */
    UI.picker(u, 'ic-sort', K(S.k), !!(this.sortI||0), 17);
    UI.list(u,this.rows,this.sel,8,28,VW-16,26,8);
    /* 피로한 선수는 땀방울로 — 목록에서 '쉬게 해야 할 사람'이 바로 보인다.
       ⚠ 목록은 8줄씩 스크롤되므로 화면에 실제로 그려진 줄만 표시한다.
       ⚠ 정렬을 넣은 뒤로는 **보이는 순서(view)** 를 써야 한다 — squad 를 쓰면
          땀방울이 엉뚱한 줄에 붙는다. */
    const first = Math.max(0, Math.min(this.sel-3, v.length-8));
    v.slice(first, first+8).forEach((a,i)=>{
      drawSweat(u, a, VW-16, 28+i*26+9);
    });
    UI.footer(u,'◀▶ 정렬 · 확인 상세 · 취소 돌아가기');
  }
}
class AthleteScreen extends Screen0 {
  constructor(mg,a){ super(mg); this.a=a; }
  /* ⛔ 챕터 2 — 종합력 **내역은 접어 둔다.**
     이 화면이 35조각으로 제일 빽빽했는데 그중 15조각이 내역이었다.
     내역은 "왜 이 숫자인가"를 **배울 때** 보는 것이지 매번 볼 것이 아니다.
     ⚠ 없애지 않는다 — ▲ 한 번이면 나온다. 접혀 있을 때도 안내 한 줄이 남는다. */
  update(now){
    if(Input.pressed('up')){ this.showWhy=!this.showWhy; Sfx.ui(); return; }
    if(Input.pressed('back')||Input.pressed('action')) this.mg.pop();
  }
  draw(u){
    const a=this.a;
    /* ⚠ 예전엔 헤더의 오른쪽 문구와 등급 줄을 둘 다 VW-8, y≈5 에 우측정렬로 그려
       서로 겹쳤다(한국어에서도 겹쳤고 영어에서 확연해졌다). 한 줄로 합친다. */
    UI.header(u, `${a.speciesName} ${a.name}`, null);
    /* 국기 + 국가명 — 누구를 위해 뛰는지.
       ⚠ x=8,y=26 에 그렸더니 바로 아래 OVR(8,28) 과 **글자가 겹쳤다**
          ('대한민 OVR 34' 로 읽혔다). OVR 블록 오른쪽으로 옮긴다. */
    if(a.nation && typeof drawFlag==='function'){
      drawFlag(u, 120, 28, 20, 14, a.nation);
      txt(u, nationName(a.nation), 144, 30, 9, PAL.dim, 'left');
    }
    /* 나이 — 아이콘이 오면 '세' 를 대신한다(챕터 1 규칙).
       ⚠ 한 줄로 이어 그리므로 아이콘은 따로 얹고 글자에서 '세' 만 뺀다. */
    { const im=BG.get('ic-age');
      if(im) u.drawImage(im, VW-118, 6, 9, 9); }
    txt(u, `${UI.rareStars(a)} ${UI.rareName(a)} · ${a.age}${BG.get('ic-age')?'':'세'} · ${GROWTH[a.growth].name}`,
        VW-30, 6, 9, UI.rareColor(a), 'right', 700);
    /* ⚠ 잠재치 자리를 62 로 박아 뒀다 — OVR 이 **세 자리(100)** 가 되면 문다.
       한 자리 늘어난 것만으로 깨지는 배치는 재서 놓는다. */
    const ovr = `OVR ${a.overall}`;
    txt(u, ovr, 8, 28, 15, PAL.gold, 'left', 700);
    let ovrEnd = 62;
    try{ u.font = '700 15px "Galmuri11","Nanum Gothic Coding",monospace';
         ovrEnd = 8 + Math.ceil(u.measureText(K(ovr)).width) + 6; }catch(e){}
    /* 잠재치 — 아이콘이 오면 '잠재' 라벨을 대신한다(챕터 1 규칙) */
    { const im=BG.get('ic-potential');
      if(im){ txt(u,'/',ovrEnd,32,10,PAL.dim);
              u.drawImage(im, ovrEnd+8, 31, 10, 10);
              txt(u,String(a.potOverall),ovrEnd+21,32,10,PAL.dim); }
      else    txt(u,`/ 잠재 ${a.potOverall}`,ovrEnd,32,10,PAL.dim); }
    const SP = (typeof SPECIES!=='undefined') ? SPECIES[a.species] : null;
    txt(u,{sprint:'단거리',hurdles:'허들',jump:'도약',throw:'투척'}[a.spec],VW-8,28,11,PAL.blue,'right');
    if(SP){
      txt(u, '주 종목 ' + SP.best.map(id=>EVENT_BY_ID[id].short).join(' · '), VW-8, 40, 9, PAL.green, 'right');
      txt(u, SP.note, VW-8, 51, 8, PAL.dim, 'right');
    }

    // 상태
    /* 상태 세 줄에도 아이콘 — 스탯 줄과 같은 어휘로 읽히게.
       ⚠ 어셋이 없으면 폭 0 이라 예전 자리 그대로다.
       ⛔ 아이콘을 **먼저** 잡는다. SW 가 이 값을 쓰는데 아래에 두면
          선언 전 참조(TDZ)로 화면이 통째로 터진다. */
    const has = (typeof BG!=='undefined');
    const imC = has ? BG.get('ic-condition') : null;
    const imF = has ? BG.get('ic-fatigue')   : null;
    const imM = has ? BG.get('ic-morale')    : null;
    const sIc = (im)=> im ? (yy)=>{ u.drawImage(im, 8, yy-1, 9, 9); return 10; } : ()=>0;
    const icC=sIc(imC), icF=sIc(imF), icM=sIc(imM);
    /* ⚠ 아이콘이 라벨 앞에 붙으면 라벨 칸도 그만큼 넓어져야 한다 —
       안 그러면 긴 언어에서 '컨디션'이 막대를 파고든다(예전에 영어판에서 겪은 것). */
    /* ⛔ 챕터 2(gauge-ring 도착) — 세 줄(아이콘+라벨+막대+숫자 = 12조각)을
       **고리 셋**으로. 자리를 3분의 1로 줄이고 상태는 색과 길이로 읽힌다.
       ⚠ 어셋이 없으면 ring 이 false 를 돌려준다 — 그때는 예전 막대 그대로다. */
    const RY = 64, RR = 15;
    const rings = [
      { v:a.condition/100, c:UI.cond(a.condition), t:UI.condName(a.condition), ic:imC, x:26 },
      { v:a.fatigue/100,   c:a.fatigue>65?PAL.red:a.fatigue>45?PAL.gold:PAL.green,
        t:Math.round(a.fatigue)+'', ic:imF, x:76 },
      { v:a.morale/100,    c:a.morale>65?PAL.green:a.morale>40?PAL.gold:PAL.red,
        t:Math.round(a.morale)+'', ic:imM, x:126 },
    ];
    const ringsOk = UIK.ring(u, rings[0].x, RY, RR, rings[0].v, rings[0].c, rings[0].t);
    if(ringsOk){
      for(let i=1;i<3;i++) UIK.ring(u, rings[i].x, RY, RR, rings[i].v, rings[i].c, rings[i].t);
      rings.forEach(r=>{ if(r.ic) u.drawImage(r.ic, r.x-4, RY-RR-10, 9, 9); });
    }
    const SW = UI.labelW(u, ['컨디션','피로','사기'], 8, 36) + (imC?10:0);
    const sbx = 8+SW, sbw = 128-SW, snx = 8+SW+sbw+6;
    if(!ringsOk){
    txt(u,'컨디션',8+icC(48),48,8,PAL.dim); UI.bar(u,sbx,50,sbw,6,a.condition,100,UI.cond(a.condition));
    txt(u,UI.condName(a.condition),snx,46,9,UI.cond(a.condition));
    txt(u,'피로',8+icF(60),60,8,PAL.dim);   UI.bar(u,sbx,62,sbw,6,a.fatigue,100, a.fatigue>65?PAL.red:a.fatigue>45?PAL.gold:PAL.green);
    txt(u,Math.round(a.fatigue)+'',snx,58,9,PAL.dim);
    txt(u,'사기',8+icM(72),72,8,PAL.dim);   UI.bar(u,sbx,74,sbw,6,a.morale,100, a.morale>65?PAL.green:a.morale>40?PAL.gold:PAL.red);
    }
    /* ⚠ 사기는 한 시즌에 23~100 으로 흔들리며 **성장을 27.6% 좌우한다**(실측).
       그런데 화면에는 0~100 숫자만 있어서 그게 뭘 하는 값인지 알 길이 없었다.
       훈련이 실제로 곱하는 배수를 그대로 적는다(31_training 의 moraleF). */
    const mf = 0.82 + a.morale/100*0.32;
    if(!ringsOk) txt(u,Math.round(a.morale)+'',snx,70,9,PAL.dim);
    /* ⚠ snx+22 는 특성 칸(x=192)을 침범했다 — '성장 ×1.05' 가 '리듬이 흔들리지
       않는다' 위에 얹혔다. 고리를 쓰면 사기 고리 아래, 아니면 막대 아래. */
    txt(u, `×${mf.toFixed(2)}`, ringsOk?116:snx, ringsOk?(RY+RR+11):80, 8,
        mf>=1.05?PAL.green:mf<=0.95?PAL.red:PAL.dim, ringsOk?'center':'left');
    if(a.injury) txt(u,`부상: ${a.injury.name} — ${a.injury.weeks}주 남음`,8,84,10,PAL.red,'left',700);

    // 스탯
    let y=98;
    for(const k of STAT_KEYS){
      UI.statRow(u,8,y,168,k,a.stats[k],a.potential[k]);
      // 종 성장 배율 — 어디를 키우면 잘 크는지 한눈에
      const b = (typeof speciesBias==='function') ? speciesBias(a,k) : 1;
      if(b>=1.3)      txt(u,'▲▲',180,y,8,PAL.green);
      else if(b>=1.1) txt(u,'▲', 180,y,8,PAL.green);
      else if(b<=0.85)txt(u,'▽', 180,y,8,PAL.dim);
      y+=13;
    }

    // 특성
    txt(u,'특성',192,48,8,PAL.dim);
    if(!a.traits.length) txt(u,'없음',192,58,9,PAL.dim);
    a.traits.forEach((t,i)=>{
      txt(u,TRAITS[t].name,192,58+i*20,10, t==='glass'||t==='nervous'?PAL.red:PAL.green,'left',700);
      txt(u,TRAITS[t].desc,192,69+i*20,8,PAL.dim);
    });
    /* 개인 기록 — ⛔ 챕터 2: 종합력 내역을 접으면서 **오른쪽 아래가 통째로 비었다.**
       위쪽 좁은 칸에서 4개만 겨우 보이던 걸 그 자리로 내린다. 6개까지 들어간다.
       ⚠ 글자를 더 쓰는 게 아니라 **있던 것을 넓은 자리로 옮기는** 것이다. */
    /* ⚠ 여기서 두 번 겹쳤다. ① x=192 는 '성장력' 라벨 자리다(bx+108, bx=84) —
       글자 두 개가 포개져 '쳉핑력쳢고' 로 나왔다. ② 내역을 펴면 그것과도 겹친다.
       → 오른쪽 절반(x=270~)으로 옮기고, **내역이 펴져 있으면 안 그린다.**
          같은 자리를 두 개가 쓰면 결국 겹친다 — 하나만 나오게 한다. */
    if(!this.showWhy){
      const PBX = 270;
      txt(u,'개인 최고',PBX,182,8,PAL.dim);
      const bs=Object.entries(a.best);
      if(!bs.length) txt(u,'아직 없음',PBX,193,9,PAL.dim);
      bs.slice(0,6).forEach(([k,v],i)=>{
        const ev=EVENT_BY_ID[k]; if(!ev) return;
        const by2 = 193 + i*11;
        if(by2 > VH-24) return;
        txt(u,ev.short,PBX,by2,9,PAL.white);
        txt(u,fmtRec(ev, v),VW-8,by2,9,PAL.gold,'right');
      });
    }
    /* 초상 — 스탯 줄이 y=176 에서 끝나고 푸터까지 비어 있던 자리.
       ⚠ 로스터가 인물로 안 읽히던 이유가 얼굴이 없어서였다. 얼굴이 없는 종족은
          달리는 그림으로 물러나므로 어느 선수를 열어도 빈칸은 안 나온다. */
    const pw=68, pxx=8, pyy=182;
    if(typeof UIK!=='undefined')
      UIK.card(u, pxx, pyy, pw, pw, UI.rareColor(a),
               { tier:(typeof rarityOf==='function')?rarityOf(a):1 });
    if(typeof Face!=='undefined' &&
       !Face.draw(u, a.species, pxx+pw/2, pyy+pw/2, pw-10))
      CharHD.draw(u, a.species, pxx+pw/2, pyy+pw-8, 0.05, { t:performance.now(), scale:1.4 });
    txt(u, a.speciesName, pxx+pw/2, pyy+pw-11, 8, PAL.white, 'center');
    /* ── 종합력과 그 내역 ──────────────────────────────────
       ⚠ 종합력은 목록·카드에 큰 숫자로 뜨는데 **어디서 왔는지는 아무 데도 없었다.**
          숫자만 있고 근거가 없으면 "왜 올랐지"를 못 배운다 — 그러면 무엇을 해야
          오르는지도 모른 채 숫자만 쳐다보게 된다. 여기가 그걸 배우는 자리다.
       ⚠ 새 화면을 만들지 않는다. 선수를 들여다보는 화면이 이미 여기다. */
    if(typeof Power!=='undefined'){
      const bx=84, bw=VW-92;
      const pw2=Power.of(a), gw=Power.growthOf(a, this.mg && this.mg.club);
      txt(u, K('경기력'), bx, pyy, 8, PAL.dim, 'left');
      txt(u, UIK.n(pw2), bx+40, pyy-2, 15, PAL.gold, 'left', 700);
      txt(u, K('성장력'), bx+108, pyy, 8, PAL.dim, 'left');
      txt(u, UIK.n(gw), bx+148, pyy-1, 12, '#5aaaff', 'left', 700);
      /* 내역 — 접혀 있다. ▲ 로 편다. */
      if(!this.showWhy){
        txt(u, K('▲ 무엇이 이 숫자를 만들었나'), bx, pyy+16, 8, PAL.dim, 'left');
      } else {
        const rows = Power.breakdown(a);
        rows.forEach((r,i)=>{
          const y = pyy+14+i*11;
          if(y > VH-20) return;
          txt(u, K(r.k), bx, y, 9, PAL.white, 'left');
          txt(u, r.note||'', bx+44, y+1, 8, PAL.dim, 'left');
          txt(u, (r.v>0?'+':'')+UIK.n(r.v), bx+bw, y, 9,
              r.v>0?PAL.green:(r.v<0?PAL.red:PAL.dim), 'right');
        });
      }
    }
    UI.footer(u, this.showWhy ? '▲ 내역 접기 · 확인/취소 돌아가기'
                              : '▲ 종합력 내역 · 확인/취소 돌아가기');
  }
}

/* ── 기록실 ──────────────────────────────────────────────── */
/* ── 기록실 ───────────────────────────────────────────────
   ⛔ 챕터 6 — **48줄인데 화면엔 6줄이다.**
      실측(tools/_reclist.js · 20시즌 × 시드 2): 클럽이 기록을 가진 종목은
      1년차 23~25 · 20년차 30~32 다. 나머지 **16~18줄이 '기록 없음 / —'** —
      빈 줄만 3화면 분량을 스크롤로 지나가야 우리 기록에 닿는다.
      그래서 좌우키로 거른다. 선수단의 정렬과 **같은 손버릇**이다.

   ⚠ 필터의 기본값은 '전체'다. 처음부터 걸러 놓으면 "아직 안 뛴 종목"이
      화면에서 사라져 목표가 안 된다 — 20년을 굴려도 18종목이 남는다. */
class RecordScreen extends Screen0 {
  /* has: null=전체 · true=기록 있음 · false=아직 없음 */
  static FILTS = [
    { k:'전체',      has:null },
    { k:'기록 있음', has:true  },
    { k:'아직 없음', has:false },
  ];
  constructor(mg){ super(mg); this.filt=0; }
  get rows(){
    const F = RecordScreen.FILTS[this.filt||0];
    return EVENTS.filter(ev=>{
      if(F.has===null) return true;
      return !!this.mg.club.records[ev.id] === F.has;
    }).map(ev=>{
      const r=this.mg.club.records[ev.id];
      /* 부제가 곧 데이터다(누가·몇 년차) — 숨기면 표가 아니라 목록이 된다 */
      /* 같은 이유로 '년차'를 먼저 옮기고 이름을 잇는다 */
      return { label:ev.name, subAlways:true,
        sub: r ? `${r.name} · ${K('%1년차').replace('%1', r.year)}` : '기록 없음',
        right: r? fmtRec(ev, r.value) : '—', rightColor: r?PAL.gold:PAL.dim };
    });
  }
  /* ⚠ 거르고 나면 목록이 짧아진다 — sel 이 그대로면 빈 곳을 가리킨다 */
  setFilt(d){
    const n=RecordScreen.FILTS.length;
    this.filt=((this.filt||0)+d+n)%n; this.sel=0; Sfx.ui();
  }
  update(now){
    if(Input.repeat('up',now)) this.move(-1);
    if(Input.repeat('down',now)) this.move(1);
    if(Input.pressed('left'))  this.setFilt(-1);
    if(Input.pressed('right')) this.setFilt(1);
    if(Input.pressed('back')||Input.pressed('action')) this.mg.pop();
  }
  draw(u){
    /* 몇 종목에 이름을 남겼나 — 이 화면의 값은 기록 자체가 아니라 **넓이**다 */
    const have=EVENTS.filter(ev=>this.mg.club.records[ev.id]).length;
    UI.header(u,'클럽 기록',`${have} / ${EVENTS.length} 종목 · ${this.mg.season.year}년차`);
    UI.picker(u, 'ic-filter', K(RecordScreen.FILTS[this.filt||0].k), !!(this.filt||0), 25);
    const rows=this.rows;
    if(!rows.length) txt(u,K('해당하는 종목이 없습니다'),VW/2,60,11,PAL.dim,'center');
    /* ⚠ 칩 자리를 만드느라 6줄을 5줄로 줄였다가 도로 6줄로 돌렸다 —
       36 + 6×24 = 180 이고 아래 '대회 이력'은 VH-56(214) 이라 안 겹친다. */
    UI.list(u,rows,this.sel,8,36,VW-16,24,6);
    const rs=this.mg.season.results;
    txt(u,'대회 이력',8,VH-56,8,PAL.dim);
    rs.slice(-3).forEach((m,i)=>
      txt(u,`${m.week}주 ${m.name} — ${m.points}점`,8,VH-46+i*10,9,PAL.white));
    UI.footer(u,'◆ 거르기 · 취소 돌아가기');
  }
}


/* ── 리그 순위표 ──────────────────────────────────────────
   ⚠ 예전엔 상대가 대회마다 새로 생기고 사라져서 **이겨도 누구를 이겼는지 몰랐다.**
      여섯 클럽을 고정으로 두고 여기서 순위를 보여 준다 —
      "올해는 고원 육상부를 잡아야 한다" 가 목표가 되도록. */
function leagueSub(S){
  if(typeof RivalLeague==='undefined' || !S.leagueTable) return '리그 6개 클럽';
  const t=RivalLeague.table(S), me=t.find(r=>r.mine), top=t[0];
  /* 클럽 이름은 번역표를 따로 타므로 문장 밖에 둔다 */
  return me.rank===1 ? K('우리가 1위 · %1점').replace('%1', me.pts)
       : K('%1위 · 선두 %2점 차').replace('%1', me.rank).replace('%2', top.pts-me.pts)
         + ' — ' + K(top.name);
}
class LeagueScreen extends Screen0 {
  get rows(){ return []; }
  update(now){ if(Input.pressed('back')||Input.pressed('action')) this.mg.pop(); }
  draw(u){
    const S=this.mg.season;
    /* ⚠ club.year 를 보고 있었다. 시즌 마감이 club.year 를 먼저 올리므로 종료 화면
       근처에서 **리그표만 1년 앞선 해**를 보여 준다. 시즌의 해는 시즌이 안다. */
    UI.header(u, '리그 순위표', `${S.year}년차 · ${S.week} / ${SEASON_WEEKS}주`);
    if(typeof RivalLeague==='undefined' || !S.leagueTable){
      txt(u,'리그 정보가 없습니다', VW/2, VH/2, 12, PAL.dim,'center'); return;
    }
    const t=RivalLeague.table(S);
    const y0=40, rh=19;
    txt(u,'클럽', 44, y0-11, 8, PAL.dim,'left');
    txt(u,'금', VW-92, y0-11, 8, PAL.dim,'right');
    txt(u,'승점', VW-16, y0-11, 8, PAL.dim,'right');
    t.forEach((r,i)=>{
      const y=y0+i*rh;
      u.fillStyle = r.mine ? 'rgba(255,215,94,.16)' : (i%2?'rgba(255,255,255,.04)':'transparent');
      u.fillRect(8, y-2, VW-16, rh-3);
      if(r.mine){ u.strokeStyle=PAL.gold; u.lineWidth=1; u.strokeRect(8.5, y-1.5, VW-17, rh-4); }
      txt(u, String(r.rank), 16, y+2, 12, r.rank<=3?PAL.gold:PAL.dim,'center',700);
      /* 클럽 문장 — 라이벌이 이름만 있으면 '표의 한 줄'이지 클럽이 아니다 */
      const hasCrest = r.crest && BG.obj(u, r.crest, 32, y+rh-4, rh-5);
      if(typeof drawFlag==='function') drawFlag(u, hasCrest?42:26, y+1, 14, 10, r.nation);
      txt(u, r.name, hasCrest?60:46, y+2, 11, r.mine?PAL.gold:PAL.white,'left', r.mine?700:400);
      txt(u, String(r.g), VW-92, y+2, 11, PAL.white,'right');
      txt(u, String(r.pts), VW-16, y+2, 12, r.mine?PAL.gold:PAL.white,'right',700);
    });
    const me=t.find(r=>r.mine);
    const msg = me.rank===1 ? '선두다 — 지키는 것도 일이다'
              : K('선두까지 %1점').replace('%1', t[0].pts-me.pts);
    txt(u, msg, VW/2, VH-26, 11, me.rank===1?PAL.green:PAL.white,'center',700);
    txt(u,'취소 돌아가기', VW/2, VH-13, 9, PAL.dim,'center');
  }
}
