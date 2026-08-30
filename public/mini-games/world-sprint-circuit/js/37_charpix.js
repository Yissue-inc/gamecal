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
  /* 게임 좌표에서 캐릭터 높이.
     ⚠ 처음엔 HD 와 같은 42 였는데 **도형처럼 보인다**는 지적을 받았다(CK).
        픽셀은 칸이 곧 표현력이라 같은 키에서 HD 보다 정보가 적다 — 조금 키운다.
        52 / 26칸 = 한 칸 2px 을 유지하면서 세로 칸이 22 → 26 으로 늘어
        귀·뿔·부리·꼬리 같은 **종족의 생김새**를 넣을 자리가 생긴다. */
  DRAW_H: 52,

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
  /* ── 종족 생김새 ────────────────────────────────────────
     ⛔ 색만 다른 같은 몸이면 60종이 **도형 하나**로 보인다(CK 지적).
        생김새를 갈라 준다 — 귀 모양·뿔·부리·꼬리·덩치.
     ⚠ 60줄을 손으로 적으면 종족이 늘 때마다 어긋나는 목록이 또 생긴다.
        **낱말 묶음**으로 갈래를 잡고, 아래 verify() 가 빠진 종족을 잡는다. */
  KIND: {
    cat:    ['cheetah','puma','lynx','serval'],
    dog:    ['hound','wolf','jackal','greyfox','husky','hyena'],
    hopper: ['rabbit','hare','jerboa','kangaroo','wallaby','frog','squirrel','lemur'],
    hoof:   ['horse','pronghorn','gazelle','impala','springbok','deer','caribou','antelope',
             'ibex','goat','bison','camel'],
    bird:   ['ostrich','roadrunner','swift','albatross','eagle','penguin','cormorant',
             'swan','duck'],
    sea:    ['dolphin','orca','walrus','sealion','otter','furseal','beaver','seaturtle',
             'octopus','crab'],
    bug:    ['ant','flea','mantis','cricket','grasshopper'],
    heavy:  ['elephant','rhino','hippo','bear','gorilla','monkey'],
  },
  kindOf(sp){
    if(!this._kmap){
      this._kmap = {};
      for(const k in this.KIND) for(const n of this.KIND[k]) this._kmap[n] = k;
    }
    return this._kmap[sp] || 'hoof';
  },

  /* ⛔ 갈래가 **실루엣**을 정한다. 귀·뿔 같은 1칸짜리 장식만 갈라서는
     60종이 여전히 '색만 다른 막대'로 보인다(CK 지적, 실측 시연 12종).
     한눈에 보이는 것부터 바꾼다 — 덩치·팔다리 굵기·머리 크기·다리 길이·자세.
       wide  몸통 폭 배수      limb 팔다리 굵기(칸)
       headW/headH 머리 크기   legK 다리 길이 배수   neck 목 길이(칸) */
  /* ⚠ 머리를 키웠다(4~5 → 6~8). 저해상도에서 **얼굴이 곧 캐릭터**다 —
     머리가 작으면 눈·코·입을 넣을 칸이 없어 어떤 종족이든 같은 막대로 읽힌다.
     실제 픽셀 게임들이 머리를 크게 그리는 이유가 이것이다. */
  SHAPE: {
    cat:    { wide:0.95, limb:2, headW:6, headH:5, legK:1.05, neck:2 },
    dog:    { wide:1.00, limb:2, headW:6, headH:5, legK:1.00, neck:2 },
    hopper: { wide:0.85, limb:3, headW:6, headH:5, legK:1.20, neck:1 },
    hoof:   { wide:0.95, limb:2, headW:5, headH:5, legK:1.15, neck:3 },
    bird:   { wide:1.25, limb:2, headW:6, headH:5, legK:0.80, neck:2 },
    sea:    { wide:1.45, limb:2, headW:7, headH:5, legK:0.55, neck:1 },
    bug:    { wide:0.60, limb:1, headW:5, headH:4, legK:1.25, neck:2 },
    heavy:  { wide:1.75, limb:3, headW:8, headH:6, legK:0.80, neck:1 },
  },
  shapeOf(sp){ return this.SHAPE[this.kindOf(sp)] || this.SHAPE.hoof; },
  /* 종족이 늘었는데 갈래에 안 넣으면 **조용히 기본 생김새**가 된다 — 그걸 막는다.
     ⚠ 부팅 때 한 번 부른다(99_main.js). 문서에만 있는 규약은 다음 리팩터링에 사라진다. */
  verifyKinds(){
    if(typeof SPECIES === 'undefined') return;
    const miss = Object.keys(SPECIES).filter(n => !this.kindOf(n) || !this._kmap[n]);
    if(miss.length) throw new Error('CharPix.KIND 에 안 들어간 종족 — ' + miss.join(' '));
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
    const GRID = 26;
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

    const S = this.shapeOf(species);
    /* 특기(BUILD)와 생김새(SHAPE)를 곱한다 — 같은 치타라도 투척형이면 어깨가 넓다 */
    const legH  = GRID * B.leg * S.legK, armH = GRID * B.arm, torH = GRID * B.torso;
    const bodyW = Math.max(3, Math.round(5 * B.wide * S.wide));
    const LIMB  = S.limb;                       // 팔다리 굵기(칸) — 갈래가 정한다

    /* 웅크림·공중은 다리를 접는다 — 자세가 상태를 말한다 */
    const fold = crouch ? 0.55 : (air ? 0.72 : 1);
    const L = legH * fold;
    const bob = air ? -1 : (crouch ? 1 : (Math.abs(sw) > 0.7 ? 0 : -0.5));

    const hipY  = -(L) + bob;                        // 골반
    const shY   = hipY - torH;                       // 어깨
    const headY = shY - S.neck - S.headH + 1;        // 목 길이만큼 띄운다

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
        px(hipX + (kneeX - hipX) * t - LIMB/2, hipY + (kneeY - hipY) * t, LIMB, 1, c);
      }
      /* 정강이 — 무릎에서 발로 */
      const stepsB = Math.max(2, Math.round(L * 0.5));
      for(let i = 0; i < stepsB; i++){
        const t = i / stepsB;
        px(kneeX + (footX - kneeX) * t - LIMB/2, kneeY + (footY - kneeY) * t, LIMB, 1, c);
      }
      px(footX - LIMB/2, footY, LIMB + 1, 1, cFoot);   // 발
    };
    /* ⛔ 동작이 '달리기 / 웅크림 / 공중' 셋뿐이라 어떤 종목이든 비슷해 보였다.
       상태를 조합해 **자세를 갈라 준다** — 자세가 곧 그 종목의 순간이다.
         출발(crouch)  두 다리를 앞뒤로 크게 벌리고 낮게 — 스타팅 블록
         공중(air)     두 다리를 모아 접는다 — 도약·착지
         던지기(thr)   축발을 버티고 뒷다리를 뺀다
         기울임(lean)  앞다리를 길게 내민다 — 결승선 */
    let spread, lLift, rLift;
    if(crouch){ spread = 4.2; lLift = 0.4;  rLift = 2.2; }        // 앞뒤로 벌린 준비 자세
    else if(air){ spread = 2.0; lLift = 3.0; rLift = 2.4; }        // 두 다리를 모아 접는다
    else if(thr){ spread = 3.4; lLift = 0.6; rLift = 1.2; }        // 축발 버티기
    else if(opt.lean){ spread = 6.2; lLift = Math.max(0, cw)*1.4; rLift = 0.4; }
    else { spread = 5.0; lLift = Math.max(0, cw)*2.6; rLift = Math.max(0, -cw)*2.6; }
    legSeg(sw * spread,  lLift, dark, dark);                        // 뒤쪽 다리
    legSeg(-sw * spread, rLift, col,  this.shade(col, 0.85));       // 앞쪽 다리

    /* ── 몸통 — 가슴과 골반을 나눈다 ───────────────────
       ⛔ 한 덩어리 사각형이라 **판자**로 보였다. 사람 몸은 가슴이 넓고 허리가 좁다.
          그리고 달릴수록 앞으로 기운다 — 척추가 자세를 말한다. */
    const tilt = crouch ? 2 : (thr ? -1 : (air ? 1 : Math.abs(sw) * 0.6));
    const chestW = bodyW, waistW = Math.max(2, bodyW - 1.5);
    const chestH = Math.max(2, torH * 0.55), waistH = Math.max(1, torH + 1 - chestH);
    /* 척추 기울기 — 웅크림·던지기는 크게, 달릴 땐 살짝 */
    const spine = crouch ? 1.6 : (thr ? -1.2 : (air ? 0.8 : 0.5));
    px(-chestW/2 + tilt*0.3 + spine, shY, chestW, chestH, col);
    px(-chestW/2 + tilt*0.3 + spine, shY, chestW, 1, light);   // 어깨 윗면
    px(-waistW/2 + tilt*0.3, shY + chestH, waistW, waistH, this.shade(col, 0.88));
    /* 가슴 그늘 — 한 줄이면 입체가 생긴다 */
    px(-chestW/2 + tilt*0.3 + spine, shY + chestH - 1, chestW, 1, dark);

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
          px(elX * t - LIMB/2, shY + 1 + (elY - shY - 1) * t, LIMB, 1, c); }
        const stepsB = Math.max(2, Math.round(armH * 0.5));
        for(let i = 0; i < stepsB; i++){ const t = i / stepsB;
          px(elX + (swing - elX) * t - LIMB/2, elY + (armH * 0.45) * t, LIMB, 1, c); }
      };
      armSeg(-sw * aSw, dark);
      armSeg( sw * aSw, col);
    }

    /* ── 목과 머리 ─────────────────────────────────────
       ⚠ 목이 없으면 머리가 몸통에 파묻혀 '통나무'가 된다. 한 칸이면 충분하다. */
    px(-LIMB/2, shY - S.neck + 1, LIMB, S.neck, dark);
    const hx = tilt * 0.4 + (thr ? -0.6 : 0);
    px(hx - S.headW/2, headY, S.headW, S.headH, col);
    px(hx - S.headW/2, headY, S.headW, 1, light);
    /* ── 얼굴 ───────────────────────────────────────────
       ⛔ 눈 한 칸뿐이라 **표정이 없었다.** 얼굴은 세 점이면 생긴다 —
          눈·코·입. 그리고 그 셋이 상태에 따라 바뀌면 '살아 있는' 것이 된다.
       ⚠ 진행 방향은 오른쪽이다. 얼굴 부품은 전부 머리의 오른쪽 절반에 모은다. */
    const HW = S.headW, eyeX = hx + HW/2 - 1.6;
    /* 눈 — 힘들면 감긴다(가로 한 칸), 평소엔 흰자 위에 눈동자 */
    const strain = crouch || thr || (opt.form !== undefined && opt.form < 0.88);
    if(strain){
      px(eyeX, headY + 1.2, 1.6, 1, '#101018');          // 찡그린 눈
    } else {
      px(eyeX - 0.2, headY + 0.9, 1.6, 1.4, '#f4f6fb');  // 흰자
      px(eyeX + 0.4, headY + 1.1, 1, 1, '#101018');      // 눈동자 — 앞을 본다
    }
    /* 눈썹 — 한 칸이 인상을 만든다. 힘줄 때 내려간다. */
    px(eyeX - 0.2, headY + (strain ? 0.3 : 0), 1.8, 0.6, dark);
    /* 코 — 주둥이 끝 한 칸. 갈래별 주둥이 위에 얹는다. */
    px(hx + HW/2, headY + 1.8, 1, 1, dark);
    /* 입 — 숨이 차면 벌어진다(달리는 중엔 늘 조금 벌어져 있다) */
    const gasp = !crouch && !thr;
    px(hx + HW/2 - 1, headY + 2.6, gasp ? 1.6 : 1.2, gasp ? 1.2 : 0.6, '#5a2a2a');

    /* ── 종족 생김새 ────────────────────────────────────
       ⛔ 여기가 없으면 60종이 **색만 다른 같은 도형**이다(CK 지적).
          갈래마다 머리 위·앞·뒤를 다르게 그린다 — 실루엣이 곧 종족이다. */
    const kind = this.kindOf(species);
    const tailSway = cw * 0.8;
    switch(kind){
      case 'cat':                                   // 둥근 귀 둘 · 길고 낭창한 꼬리
        px(hx - 2, headY - 1, 1, 1, col); px(hx + 1, headY - 1, 1, 1, col);
        px(hx + 2, headY + 1, 1, 1, light);         // 짧은 주둥이
        px(-bodyW/2 - 4, shY + 1 + tailSway, 4, 1, col);
        px(-bodyW/2 - 5, shY + tailSway, 1, 1, col);
        break;
      case 'dog':                                   // 뾰족 귀 · 덤불 꼬리
        px(hx - 2, headY - 2, 1, 2, dark); px(hx + 1, headY - 2, 1, 2, dark);
        px(hx + 2, headY + 1, 2, 1, light);         // 긴 주둥이
        px(-bodyW/2 - 3, shY + tailSway, 3, 2, col);
        break;
      case 'hopper':                                // 아주 긴 귀 · 큰 뒷다리는 BUILD 가 담당
        px(hx - 1, headY - 4, 1, 4, col); px(hx + 1, headY - 4, 1, 4, col);
        px(hx + 2, headY + 1, 1, 1, light);
        px(-bodyW/2 - 2, shY + 2 + tailSway * 0.4, 2, 1, dark);
        break;
      case 'hoof':                                  // 뿔 · 긴 목 · 갈기
        px(hx - 1, headY - 3, 1, 3, light); px(hx + 1, headY - 3, 1, 3, light);
        px(hx + 2, headY + 1, 2, 1, light);
        px(-0.5, shY - 2, 1, 1, dark);              // 목이 하나 더 길다
        px(-bodyW/2 - 2, shY + 1 + tailSway, 2, 1, dark);
        break;
      case 'bird':                                  // 부리 · 접은 날개 · 볏
        px(hx + 2, headY + 1, 3, 1, '#e8a33a');     // 부리는 색을 따로 준다
        px(hx, headY - 2, 1, 2, light);             // 볏
        px(-bodyW/2 - 1, shY + 2, bodyW, 2, dark);  // 접은 날개
        break;
      case 'sea':                                   // 매끈한 머리 · 지느러미 꼬리
        px(hx + 2, headY + 1, 2, 1, light);
        px(-bodyW/2 - 3, shY + 2 + tailSway * 0.5, 3, 1, col);
        px(-bodyW/2 - 4, shY + 1 + tailSway * 0.5, 1, 3, col);   // 꼬리 지느러미
        break;
      case 'bug':                                   // 더듬이 둘 · 마디 몸
        px(hx - 1, headY - 3, 1, 3, dark); px(hx + 2, headY - 3, 1, 3, dark);
        px(-bodyW/2, shY + torH * 0.5, bodyW, 1, dark);          // 허리 마디
        break;
      case 'heavy':                                 // 큰 머리 · 짧은 귀 · 두꺼운 목
        px(hx - 2, headY - 1, 5, 1, col);           // 이마가 넓다
        px(hx + 3, headY + 1, 1, 2, light);         // 굵은 주둥이
        px(-1, shY - 2, 2, 2, dark);                // 목이 두껍다
        px(-bodyW/2 - 2, shY + 2 + tailSway * 0.4, 2, 1, dark);
        break;
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
