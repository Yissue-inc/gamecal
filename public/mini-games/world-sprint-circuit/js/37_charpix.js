/* ══════════════════════════════════════════════════════════════════
   픽셀 리깅 캐릭터 — 그림이 아니라 **뼈대**로 그린다

   ⚠ 왜 또 하나를 만드나 (CK 제안 2026-08-30)
     HD 레이어는 **그려 놓은 그림**이다. 달리기만 8프레임이고 나머지 자세
     (웅크림·도약·기울임·던지기)는 **한 장씩**이다. 그래서 도약의 높낮이,
     기울임의 각도, 던지기의 힘 같은 **연속적인 것**이 그림에 안 실린다 —
     코드가 회전·이동으로 흉내 낼 뿐이다.

     픽셀 리깅은 반대다. 팔다리를 따로 갖고 있으니 위상(phase)과 상태에서
     **자세를 계산해 낸다.** 스트라이드가 빨라지면 다리가 실제로 빨리 벌어지고,
     기울이면 몸이 정말 기운다. 어떤 종족이든 즉시 된다(그림이 필요 없다).

   ⛔ 기존 방식을 대체하지 않는다. **모드로 나란히 둔다** — 경기 전에 고른다.
   ⛔⛔ **두 모드가 한 화면에 섞이면 안 된다**(CK 확정). 픽셀은 **경기 중에만** 쓴다.
      선수단·육성·도감·스카우트의 초상과 카드는 언제나 HD 그대로다.
      아래 CharMode.active() 가 그 경계다 — 경기 화면이 아니면 무조건 HD.

   ── 그리는 규칙 ─────────────────────────────────────────
   · 좌표는 **픽셀 단위 격자**에 스냅한다. 안 그러면 픽셀아트가 아니라
     그냥 작은 벡터 그림이 된다(가장자리가 흐려진다).
   · 종족의 색(SPECIES.color)과 특기(spec)로 실루엣을 바꾼다 —
     단거리는 다리가 길고, 투척은 어깨가 넓고, 수영은 몸이 길다.
   · 아웃라인은 안 그린다. 32px 급에서 아웃라인은 몸 색을 다 먹는다
     (HD 레이어 주석의 실측: 코끼리 어셋의 46%가 아웃라인이었다).
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const CharPix = {
  /* 게임 좌표에서 캐릭터 높이 — HD 와 같은 크기로 맞춘다(같은 무대를 쓴다) */
  DRAW_H: 42,

  /* 특기별 체형 — 숫자는 '몸 높이에 대한 비율' 이다.
     ⚠ 종족 60개에 하나씩 적으면 손으로 맞추는 목록이 또 생긴다.
        특기(spec)는 이미 종족표가 갖고 있으니 그걸로 나눈다. */
  /* ⚠ 첫 판은 **몸통이 커서 통나무처럼 보였다**(실측 스크린샷). 사람 비율로 다시 잡는다:
     다리 45% · 몸통 30% · 머리 15% · 목 이하 나머지. 몸통 폭은 3~4칸이면 충분하다 —
     넓으면 다리가 그 뒤로 숨어 달리는 모양이 안 나온다. */
  BUILD: {
    sprint: { leg:0.48, arm:0.30, torso:0.26, wide:0.72, ear:2, tail:3 },
    jump:   { leg:0.52, arm:0.28, torso:0.24, wide:0.70, ear:3, tail:2 },
    throw:  { leg:0.40, arm:0.32, torso:0.32, wide:1.00, ear:1, tail:1 },
    endure: { leg:0.46, arm:0.29, torso:0.27, wide:0.78, ear:2, tail:2 },
    swim:   { leg:0.42, arm:0.34, torso:0.30, wide:0.86, ear:0, tail:4 },
    tech:   { leg:0.45, arm:0.30, torso:0.27, wide:0.80, ear:2, tail:2 },
  },
  buildOf(sp){
    const s = (typeof SPECIES!=='undefined' && SPECIES[sp]) ? SPECIES[sp] : null;
    return this.BUILD[(s && s.spec) || 'tech'] || this.BUILD.tech;
  },
  colorOf(sp){
    const s = (typeof SPECIES!=='undefined' && SPECIES[sp]) ? SPECIES[sp] : null;
    return (s && s.color) || '#c9c2b6';
  },

  /* 색을 어둡게/밝게 — 그림자면과 배면에 쓴다. 팔레트를 늘리지 않는다. */
  shade(hex, k){
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, Math.round(((n>>16)&255) * k)));
    const g = Math.max(0, Math.min(255, Math.round(((n>>8)&255) * k)));
    const b = Math.max(0, Math.min(255, Math.round((n&255) * k)));
    return '#' + ((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
  },

  /* ── 그리기 ──────────────────────────────────────────────
     u        UI 캔버스(HD 와 같은 좌표계)
     species  종족 이름
     x, y     발이 닿는 자리(바닥 중앙)
     phase    0~1 스트라이드 위상 — 이게 다리를 움직인다
     opt      { crouch, airborne, lean, throwing, swim, scale, rot, rare, t }
     ⚠ 반환값은 HD 와 같은 규약이다: 그렸으면 true. */
  draw(u, species, x, y, phase, opt){
    opt = opt || {};
    const H = (this.DRAW_H * (opt.scale || 1));
    /* 픽셀 크기 — 몸 높이를 **22칸**으로 나눈다.
       ⚠ 16칸이면 한 칸이 3px 이라 팔다리(2칸=6px)가 통나무가 된다. 22칸이면 2px 이라
          같은 키에 형태가 두 배로 실린다 — 픽셀아트는 칸 수가 곧 표현력이다. */
    const GRID = 22;
    const P = Math.max(1, Math.round(H / GRID));
    const B = this.buildOf(species);
    const col = this.colorOf(species);
    const dark = this.shade(col, 0.62), light = this.shade(col, 1.18);

    const ph = ((phase || 0) % 1 + 1) % 1;
    const sw = Math.sin(ph * Math.PI * 2);          // 앞뒤 흔들림 −1~1
    const cw = Math.cos(ph * Math.PI * 2);

    const air = !!opt.airborne, crouch = !!opt.crouch;
    const thr = !!opt.throwing, swim = !!opt.swim;

    /* 격자에 스냅해서 채운다 — 픽셀아트의 핵심이다.
       ⚠ 소수 좌표로 그리면 가장자리가 흐려져 '작은 벡터 그림'이 된다. */
    const px = (gx, gy, gw, gh, c) => {
      u.fillStyle = c;
      u.fillRect(Math.round(gx) * P, Math.round(gy) * P,
                 Math.max(1, Math.round(gw)) * P, Math.max(1, Math.round(gh)) * P);
    };

    u.save();
    u.translate(Math.round(x), Math.round(y));
    if(opt.rot) u.rotate(opt.rot);
    if(swim) u.rotate(-Math.PI/2 * 0.86);           // 수영은 몸이 눕는다
    else if(opt.lean) u.rotate(-0.16);              // 결승선 기울임
    /* 격자 원점을 발밑으로. 이후 좌표는 전부 '칸' 단위다(위가 음수). */

    const legH  = GRID * B.leg,  armH = GRID * B.arm, torH = GRID * B.torso;
    const bodyW = Math.max(3, Math.round(5 * B.wide));

    /* 웅크림·공중은 다리를 접는다 — 자세가 상태를 말한다 */
    const fold = crouch ? 0.55 : (air ? 0.72 : 1);
    const L = legH * fold;
    const bob = air ? -1 : (crouch ? 1 : (Math.abs(sw) > 0.7 ? 0 : -0.5));

    const hipY  = -(L) + bob;                        // 골반
    const shY   = hipY - torH;                       // 어깨
    const headY = shY - 4;                           // 목 한 칸을 띄운다

    /* ── 다리 — **두 마디**(허벅지·정강이) ─────────────────
       ⛔ 처음엔 한 마디 막대였다. 벌어짐도 작아서 **서 있는 막대**로 보였다(실측).
          달리는 모양은 무릎에서 나온다 — 앞다리는 무릎을 들고, 뒷다리는 뒤로 편다.
       ⚠ 벌어짐을 키운다(±2.6 → ±5칸). 22칸 격자에서 그래야 눈에 보인다. */
    const legSeg = (swing, lift, c, cFoot) => {
      const hipX = 0;
      const kneeX = swing * 0.55, kneeY = hipY + L * 0.5 - lift * 0.7;
      const footX = swing,        footY = hipY + L - lift;
      /* 허벅지 — 골반에서 무릎으로. 칸을 계단처럼 채워 대각선을 만든다. */
      const stepsA = Math.max(2, Math.round(L * 0.5));
      for(let i = 0; i < stepsA; i++){
        const t = i / stepsA;
        px(hipX + (kneeX - hipX) * t - 0.5, hipY + (kneeY - hipY) * t, 2, 1, c);
      }
      /* 정강이 — 무릎에서 발로 */
      const stepsB = Math.max(2, Math.round(L * 0.5));
      for(let i = 0; i < stepsB; i++){
        const t = i / stepsB;
        px(kneeX + (footX - kneeX) * t - 0.5, kneeY + (footY - kneeY) * t, 2, 1, c);
      }
      px(footX - 1, footY, 3, 1, cFoot);             // 발
    };
    const spread = air ? 3.0 : (crouch ? 1.4 : 5.0);
    const lLift = air ? 2.4 : Math.max(0, cw) * 2.6;
    const rLift = air ? 2.4 : Math.max(0, -cw) * 2.6;
    legSeg(sw * spread,  lLift, dark, dark);                        // 뒤쪽 다리
    legSeg(-sw * spread, rLift, col,  this.shade(col, 0.85));       // 앞쪽 다리

    /* ── 몸통 ─────────────────────────────────────────── */
    const tilt = crouch ? 2 : (thr ? -1 : (air ? 1 : Math.abs(sw) * 0.6));
    px(-bodyW/2 + tilt*0.3, shY, bodyW, torH + 1, col);
    px(-bodyW/2 + tilt*0.3, shY, bodyW, 1, light);   // 어깨 윗면 하이라이트

    /* ── 팔 두 짝 — 다리와 **반대로** 흔든다 ─────────────
       던지기는 한 팔을 뒤로 크게 젖힌다. 힘이 자세로 보여야 한다. */
    if(thr){
      px(1, shY + 1, 1, armH, dark);                 // 뒤로 젖힌 팔
      px(-bodyW/2 - 1, shY, 2, 1, col);
      px(bodyW/2 - 1, shY - 2, 2, armH * 0.8, col);
    } else {
      /* 팔도 두 마디 — 다리와 **반대로** 흔든다. 팔꿈치가 있어야 달리는 팔이 된다. */
      const aSw = swim ? 5.0 : 3.4;
      const armSeg = (swing, c) => {
        const elX = swing * 0.5, elY = shY + 1 + armH * 0.5;
        const stepsA = Math.max(2, Math.round(armH * 0.5));
        for(let i = 0; i < stepsA; i++){ const t = i / stepsA;
          px(elX * t - 0.5, shY + 1 + (elY - shY - 1) * t, 2, 1, c); }
        const stepsB = Math.max(2, Math.round(armH * 0.5));
        for(let i = 0; i < stepsB; i++){ const t = i / stepsB;
          px(elX + (swing - elX) * t - 0.5, elY + (armH * 0.45) * t, 2, 1, c); }
      };
      armSeg(-sw * aSw, dark);
      armSeg( sw * aSw, col);
    }

    /* ── 목과 머리 ─────────────────────────────────────
       ⚠ 목이 없으면 머리가 몸통에 파묻혀 '통나무'가 된다. 한 칸이면 충분하다. */
    px(-0.5, shY - 1, 1, 2, dark);
    const hx = tilt * 0.4 + (thr ? -0.6 : 0);
    px(hx - 2, headY, 4, 3, col);
    px(hx - 2, headY, 4, 1, light);
    /* 주둥이 — 진행 방향(오른쪽)을 가리켜 '앞'을 분명히 한다 */
    px(hx + 2, headY + 1, 1, 1, light);
    /* 눈 — 한 칸. 있고 없고가 얼굴을 만든다. */
    px(hx + 1, headY + 1, 1, 1, '#101018');
    /* 귀 — 종족 체형이 정한다(수영종은 없다) */
    for(let e = 0; e < B.ear; e++)
      px(hx - 1 + e, headY - 1 - (e === 1 ? 1 : 0), 1, e === 1 ? 2 : 1, dark);

    /* ── 꼬리 — 위상에 따라 흔들린다 ───────────────────── */
    if(B.tail){
      const t = B.tail;
      px(-bodyW/2 - t, shY + 1 + cw * 0.8, t, 1, dark);
    }

    /* 등급 발광 — HD 와 같은 규약(rare 5 는 빛난다). 픽셀에서도 티가 나야 한다. */
    if((opt.rare | 0) >= 4){
      const a = 0.16 + 0.10 * Math.sin(((opt.t || 0) / 260));
      u.globalAlpha = Math.max(0, a);
      px(-bodyW/2 - 1, shY - 1, bodyW + 2, torH + 3, light);
      u.globalAlpha = 1;
    }
    u.restore();
    return true;
  },
};

/* ── 모드 ────────────────────────────────────────────────
   'hd' = 그려 놓은 그림(기본) · 'pixel' = 위 리깅

   ⛔⛔ **두 모드가 한 화면에 섞이면 안 된다**(CK 확정 2026-08-30).
      픽셀은 **경기 중에만** 쓴다. 선수단·육성·도감·스카우트 같은 감독 화면의
      초상과 카드는 **언제나 HD 그대로**다 — 거기는 그림을 보는 자리지
      움직임을 보는 자리가 아니다.

   ⚠ 그래서 CharHD.draw 를 통째로 갈아 끼우지 않는다. 그렇게 하면 같은 함수를
      쓰는 감독 화면까지 픽셀이 되어 **정확히 CK 가 금지한 섞임**이 난다.
      대신 아래 active() 가 **경기 화면일 때만** 참이 된다.
      ⚠ 감독 모드의 대회 관전(MeetWatchScreen)은 ST.MANAGER 라 여기 안 걸린다 —
         그 화면은 통째로 HD 로 남는다. 한 화면 안에서는 언제나 한 가지다. */
const CharMode = {
  KEY: 'wsc_charmode',
  mode: 'hd',
  load(){
    try{ const v = localStorage.getItem(this.KEY); if(v === 'hd' || v === 'pixel') this.mode = v; }
    catch(e){}
    return this.mode;
  },
  set(m){
    if(m !== 'hd' && m !== 'pixel') return;
    this.mode = m;
    try{ localStorage.setItem(this.KEY, m); }catch(e){}
  },
  toggle(){ this.set(this.mode === 'hd' ? 'pixel' : 'hd'); },
  get label(){ return this.mode === 'pixel' ? '픽셀' : 'HD 그림'; },

  /* 지금 픽셀로 그려야 하는가 — **경기 화면에서만** 참이다. */
  active(){
    if(this.mode !== 'pixel') return false;
    if(typeof G === 'undefined' || typeof ST === 'undefined') return false;
    return G.state === ST.PLAY || G.state === ST.RESULT;
  },
};
