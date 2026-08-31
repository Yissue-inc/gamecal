/* ══════════════════════════════════════════════════════════════════
   점수판 — "내가 몇 점인지, 상대보다 앞선지" 를 **한눈에** (CK 지적 2026-08-31)

   ⚠ 왜 필요한가 (실측 캡처로 확인한 것)
     · 양궁: 기준 `51 pts` 가 **빨갛고 크게**, 내 점수 `Total 4` 는 **작고 흐리게** 있었다.
       위계가 뒤집혀 있었다 — 화면에서 제일 큰 숫자가 내 것이 아니었다.
     · 100m: 라이벌 둘이 트랙에 뛰고 있는데 **HUD 는 그들에 대해 한 마디도 안 했다.**
       누가 앞선지 알려면 트랙을 봐야 하는데 카메라가 선두를 따라가서 그것도 안 된다.
     · 탁구만 구조가 맞았다(나 6 · 상대 0). 그런데 그것도 **맨 글자**였다.
     CK 말 그대로 "너무 시스템 대시보드 같은 느낌" 이었다.

   ⛔ 규칙 세 가지
     ① **내 숫자가 화면에서 제일 크다.** 기준·상대는 그 다음이다.
     ② **목표는 숫자가 아니라 자리다.** '기준 51점' 대신 동–은–금 레일 위의 눈금으로 보인다.
        달리는 중에 뺄셈을 시키지 않는다.
     ③ **상대는 항상 옆에 있다.** 없으면 없다고 쓰는 게 아니라, 있는 종목은 반드시 나란히 놓는다.

   ⚠ 기존 종목 코드를 안 갈아엎는다 — 종목은 자기 값을 넘겨주기만 하고
      그리는 방법은 여기 한 곳에서 정한다. 그래야 48종목이 같은 얼굴을 갖는다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const SB = {
  H: 32,                 // 상단 점수판 높이
  /* ⚠ 오른쪽 위 x 461~480 · y −6~8 은 **일시정지 버튼(DOM)** 이 덮는다.
     캔버스 밖 요소라 화면만 봐서는 원인이 안 보인다 — 안쪽으로 물린다. */
  RX: 462,

  /* 판 — hud-frame 이 있으면 그림으로, 없으면 반투명 판 */
  panel(u, x, y, w, h){
    if(!(typeof UIK!=='undefined' && UIK.nine(u, 'hud-frame', x, y, w, h, 16)))
      plate(u, x, y, w, h, 0.78);
  },

  /* 큰 숫자 — 이 게임에서 '내 점수' 는 언제나 이 크기·이 색이다 */
  big(u, s, x, y, col, align){
    txt(u, s, x, y, 19, col || PAL.gold, align || 'right', 700);
  },

  /* ── 메달 레일 ─────────────────────────────────────────────
     동–은–금을 **자리**로 보여 주고 내 기록을 그 위의 점으로 찍는다.
     ⛔ 숫자를 하나 더 늘리려는 게 아니다. '기준 51점' 은 달리면서 못 쓴다 —
        어디쯤 왔는지는 눈이 즉시 읽는다.
     cuts = {bronze,silver,gold} · higher = 클수록 좋은가 */
  rail(u, x, y, w, val, cuts, higher, projected, floor){
    if(!cuts) return;
    const b = cuts.bronze, sv = cuts.silver, g = cuts.gold;
    const span = Math.abs(g - b) || 1;

    /* ⛔ **한 자로 다 재면 메달 구간이 안 보인다.** 양궁 컷은 51·52·54.5 —
       60점 만점에서 폭이 3.5점뿐이다. 그 자로 재니 페이스 13.5 가 왼쪽 끝에 박혀
       "얼마나 모자란지"도 "조금만 더 가면 되는지"도 안 보였다(2026-08-31 캡처).
       그래서 자를 둘로 나눈다 — 왼쪽 38% 는 **기준 아래**, 오른쪽은 **메달 구간**.
       기준 아래에서도 바늘이 움직이고, 메달 구간은 크게 벌어져 보인다. */
    const BR = 0.38;                       // 기준(동)이 놓이는 자리
    const GD = 0.90;                       // 금이 놓이는 자리
    const lo = (floor !== undefined) ? floor
             : (higher ? Math.min(0, b - span*4) : b + span*4);
    const hiEnd = higher ? g + span*0.6 : g - span*0.6;

    const frac = v => {
      const between = (a, b2, t0, t1) => t0 + (t1 - t0) * clamp((v - a)/((b2 - a)||1), 0, 1);
      if(higher){
        if(v <= b) return between(lo, b, 0, BR);
        if(v <= g) return between(b, g, BR, GD);
        return between(g, hiEnd, GD, 1);
      }
      /* 작을수록 좋은 종목 — 방향만 뒤집는다 */
      if(v >= b) return between(lo, b, 0, BR);
      if(v >= g) return between(b, g, BR, GD);
      return between(g, hiEnd, GD, 1);
    };
    const px = v => x + Math.round(w * frac(v));

    /* 기준 아래 구간은 어둡게 — '아직 메달권이 아니다' 가 색으로 읽힌다 */
    u.fillStyle = 'rgba(242,245,250,.10)'; u.fillRect(x, y, w, 3);
    const seg = (v0, v1, col) => {
      const a = Math.min(px(v0), px(v1)), bx = Math.max(px(v0), px(v1));
      u.fillStyle = col; u.fillRect(a, y, Math.max(1, bx - a), 3);
    };
    seg(b, sv, 'rgba(205,127,50,.85)');     // 동 구간
    seg(sv, g, 'rgba(192,199,210,.85)');    // 은 구간
    u.fillStyle = 'rgba(255,206,84,.90)';
    u.fillRect(px(g), y, Math.max(1, x + w - px(g)), 3);   // 금 위쪽

    [[b,'#cd7f32'], [sv,'#c0c7d2'], [g,'#ffce54']].forEach(([v,c]) => {
      u.fillStyle = c; u.fillRect(px(v) - 1, y - 2, 2, 7);
    });

    if(val !== undefined && val !== null && isFinite(val)){
      const mx = px(val);
      u.beginPath(); u.moveTo(mx, y - 6); u.lineTo(mx + 4, y - 1); u.lineTo(mx - 4, y - 1); u.closePath();
      if(projected){ u.strokeStyle = PAL.white; u.lineWidth = 1; u.stroke(); }
      else { u.fillStyle = PAL.white; u.fill(); }
    }
  },

  /* 지금 어느 등급인가 — 레일 색과 짝을 맞춘다 */
  gradeOf(val, cuts, higher){
    if(!cuts || val === undefined || !isFinite(val)) return null;
    const ge = (a, b) => higher ? a >= b : a <= b;
    if(ge(val, cuts.gold))   return { name:'금', col:'#ffce54' };
    if(ge(val, cuts.silver)) return { name:'은', col:'#c0c7d2' };
    if(ge(val, cuts.bronze)) return { name:'동', col:'#cd7f32' };
    return null;
  },

  /* ══ ① 점수 쌓는 종목 (양궁·사격·다이빙·체조·트램폴린·역도·골프) ══
     o = { name, progress, mine, unit, fmt, cuts, higher, pace, history, foe:{label,value} }

     ⛔ **레일에는 `pace` 를 찍는다(있으면).** 처음엔 `mine`(누적 합계)을 찍었는데,
        4발 쏜 시점의 합계 5 를 6발 기준 51 과 비교하니 바늘이 늘 맨 왼쪽에 박혔다 —
        "지고 있다"가 아니라 **아직 안 끝났다**는 뜻인데 화면은 전자로 보였다.
        트랙 HUD 가 '통과 페이스'로 바꾼 것과 같은 이유다(고정 숫자는 경기 중에 못 쓴다). */
  tally(u, o){
    const H = this.H, X = 4, W = this.RX - X;
    this.panel(u, X, 2, W, H);

    /* ── 왼쪽: 종목·진행 (한 번 읽으면 그만인 것들 — 작게) */
    txt(u, o.name, X + 6, 5, 9, PAL.dim, 'left', 700);
    if(o.progress) txt(u, o.progress, X + 6, 16, 11, PAL.white, 'left', 700);
    /* ⛔ 칩 시작점을 78 로 박아 뒀더니 **'10m Air Rifle' 위로 겹쳤다**(2026-08-31 캡처).
       이름 길이는 종목마다·언어마다 다르다 — 자리를 박지 말고 **재서** 피한다. */
    let leftEnd = X + 78;
    try{
      u.font = '700 9px "Galmuri11","Nanum Gothic Coding",monospace';
      const w1 = u.measureText(K(o.name || '')).width;
      u.font = '700 11px "Galmuri11","Nanum Gothic Coding",monospace';
      const w2 = o.progress ? u.measureText(K(o.progress)).width : 0;
      leftEnd = X + 10 + Math.max(w1, w2);
    }catch(e){}

    /* ── 오른쪽: 내 점수. **화면에서 제일 큰 숫자** */
    const val = o.mine;
    const shown = (val === undefined || val === null || !isFinite(val)) ? '--'
                : (typeof o.fmt === 'function' ? o.fmt(val) : String(val));
    const railVal = (o.pace !== undefined && isFinite(o.pace)) ? o.pace : val;
    const gr = this.gradeOf(railVal, o.cuts, o.higher);
    const RIGHT = this.RX - 8, RAIL_W = 104, RAIL_X = RIGHT - RAIL_W;
    this.big(u, shown, RIGHT, 3, gr ? gr.col : PAL.gold, 'right');
    if(o.unit) txt(u, o.unit, RAIL_X - 4, 9, 9, PAL.dim, 'right');

    /* 레일은 내 숫자 **바로 밑**에 — 둘은 같은 이야기다 */
    if(o.cuts) this.rail(u, RAIL_X, 26, RAIL_W, railVal, o.cuts, o.higher,
                         o.pace !== undefined, o.floor);

    /* ── 가운데: 시도별 칩. 예전엔 '0 0 1 3' 이 흐린 글씨로 붙어 있었다 */
    if(o.history && o.history.length){
      const cw = o.history.some(v => String(v).length > 2) ? 17 : 13;
      const cx = leftEnd, room = RAIL_X - 8 - cx;
      if(room > cw) this.chips(u, o.history, cx, 11, Math.max(1, Math.floor(room / cw)), cw);
    }

    /* ── 상대가 있으면 나란히 */
    if(o.foe){
      txt(u, (o.foe.label || '상대') + ' ' + o.foe.value, RIGHT, 22, 9, PAL.dim, 'right', 700);
    }
  },

  /* 시도별 점수 칩 — 잘한 것은 밝게, 못한 것은 어둡게 */
  chips(u, list, x, y, max, cw){
    cw = cw || 13;
    const n = Math.min(list.length, max || 8);
    const start = list.length - n;
    for(let i = 0; i < n; i++){
      const v = list[start + i], cx = x + i * cw;
      const good = typeof v === 'number' ? clamp(v / 10, 0, 1) : 0.5;
      u.fillStyle = `rgba(255,206,84,${0.22 + good * 0.55})`;
      u.fillRect(cx, y, cw - 2, 8);
      txt(u, String(v), cx + (cw - 2) / 2, y - 1, 8, good > 0.5 ? '#1b1b22' : PAL.white, 'center', 700);
    }
  },

  /* ══ ② 맞붙는 종목 (펜싱·유도·탁구) ══
     o = { mine, foe, myLabel, foeLabel, target, note, first } */
  versus(u, o){
    const H = this.H;
    this.panel(u, 4, 2, this.RX - 4, H);
    const midX = (4 + this.RX) / 2;

    /* 양쪽 큰 숫자 — 같은 크기여야 **차이가 크기로 읽힌다** */
    const lead = (o.mine || 0) - (o.foe || 0);
    txt(u, o.myLabel || '나', 14, 5, 9, PAL.blue, 'left', 700);
    this.big(u, String(o.mine ?? 0), 14, 13, lead >= 0 ? PAL.gold : PAL.white, 'left');
    txt(u, o.foeLabel || '상대', this.RX - 10, 5, 9, PAL.red, 'right', 700);
    this.big(u, String(o.foe ?? 0), this.RX - 10, 13, lead <= 0 ? PAL.red : PAL.white, 'right');

    /* 가운데 — 목표와 상황 */
    if(o.target) txt(u, o.target, midX, 4, 9, PAL.dim, 'center');
    if(o.note)   txt(u, o.note, midX, 15, 12, PAL.gold, 'center', 700);

    /* 우세 막대 — 누가 얼마나 앞서는지를 **길이**로 */
    const need = o.first || Math.max(1, Math.abs(lead));
    const bw = 96, bx = midX - bw / 2, by = H - 3;
    u.fillStyle = 'rgba(242,245,250,.14)'; u.fillRect(bx, by, bw, 3);
    const half = bw / 2, k = clamp(lead / need, -1, 1);
    u.fillStyle = k >= 0 ? PAL.blue : PAL.red;
    if(k >= 0) u.fillRect(bx + half, by, Math.round(half * k), 3);
    else       u.fillRect(bx + half + Math.round(half * k), by, Math.round(-half * k), 3);
    u.fillStyle = 'rgba(242,245,250,.55)'; u.fillRect(bx + half - 0.5, by - 2, 1, 7);
  },

  /* ══ ③ 순위가 있는 종목 (트랙·수영·사이클…) ══
     rows = [{name, col, prog(0~1), timeS, mine}] — 진행 순으로 정렬해서 넘길 것 */
  standings(u, rows, x, y){
    if(!rows || !rows.length) return;
    const W = 116, RH = 9, H = rows.length * RH + 6;
    x = (x === undefined) ? this.RX - W : x;
    y = (y === undefined) ? 34 : y;
    plate(u, x, y, W, H, 0.62);
    const lead = rows[0];
    rows.forEach((r, i) => {
      const ry = y + 3 + i * RH;
      const col = r.mine ? PAL.gold : r.ghost ? PAL.blue : (r.col || PAL.dim);
      /* 내 줄은 바탕을 깔아 **눈이 먼저 간다** */
      if(r.mine){ u.fillStyle = 'rgba(255,206,84,.16)'; u.fillRect(x + 1, ry - 1, W - 2, RH); }
      txt(u, String(i + 1), x + 5, ry, 8, col, 'left', 700);
      txt(u, r.name || '', x + 14, ry, 8, col, 'left', r.mine ? 700 : 400);
      /* 선두와의 차 — 미터로. 시간 차는 아직 안 끝난 사람에게 뜻이 없다 */
      if(i === 0) txt(u, r.timeS ? fmtTime(r.timeS) : '선두', x + W - 5, ry, 8, col, 'right', 700);
      else {
        const d = (lead.prog - r.prog) * (r.trackM || 100);
        txt(u, '−' + (d >= 100 ? Math.round(d) : d.toFixed(1)) + 'm', x + W - 5, ry, 8, col, 'right');
      }
    });
  },
};
