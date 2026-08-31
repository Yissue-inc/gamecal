/* ══════════════════════════════════════════════════════════════════
   HUD — 레퍼런스 배치를 따른다: 왼쪽 기록 / 오른쪽 세계기록·기준기록
   ⚠ 글자는 UI 캔버스(고해상도)에 그린다. 게임 캔버스에 그리면 뭉갠다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* ⚠ 화면에 나가는 모든 글자가 이 함수를 지난다(호출 279곳, 직접 fillText 는 1곳).
   그래서 다국어를 여기 한 곳에서 건다 — 호출부 699곳을 건드리지 않는다. */
function txt(ctx, s, x, y, size, color, align, weight){
  if(typeof K==='function') s = K(s);
  ctx.font = `${weight||400} ${size}px "Galmuri11","Nanum Gothic Coding",monospace`;
  ctx.textAlign = align||'left'; ctx.textBaseline='top';
  ctx.fillStyle = color||PAL.white;
  ctx.fillText(s, x, y);
}
/* 글자 뒤에 어두운 판을 깔아 어떤 배경에서도 읽히게 한다 */
function plate(ctx, x, y, w, h, a){
  ctx.fillStyle = `rgba(5,6,10,${a??0.62})`;
  ctx.fillRect(x, y, w, h);
}
/* 종목 기록 한 줄 — 단위를 보고 형식을 고른다.
   ⚠ 예전엔 '높을수록 좋으면 숫자, 아니면 시간'으로 갈랐다. 낮을수록 좋은 종목이
      전부 시간인 줄 알았던 것인데, 골프(타)·승마(벌점)가 생기자 **골프 기준기록
      0타가 '--.--' 로** 나왔다(fmtTime(0)=기록없음). 방향이 아니라 단위로 가른다. */
/* 단위는 언어별로 다르다. 조각 치환에 맡기면 '타'(스트로크)가 '스타트'·'타이밍'
   같은 낱말 속에서도 바뀔 수 있다 — 종목 단위는 여기서 못 박는다.
   ⚠ 실측: 영어판 종목 선택에서 '기준 60.00점'·'8.00벌점'이 한글로 나왔다. */
const UNIT_EN = { 's':'s', 'm':'m', '점':' pts', 'kg':'kg', '타':' str', '벌점':' pen' };
function unitOf(def){
  const u = def.unit;
  return (typeof LANG!=='undefined' && LANG==='en') ? (UNIT_EN[u]!==undefined ? UNIT_EN[u] : u) : u;
}

/* '초'를 붙여도 되는 표기인가 — 45.20초는 자연스럽지만 2:24:10초는 아니다.
   ⚠ 실격 화면이 '--.--초' 로 나왔다(기록이 없는데 단위가 붙었다). */
function needsSec(str){ return str.indexOf(':')<0 && str!=='--.--'; }

function fmtRec(def, v){
  if(v===undefined || v===null || !isFinite(v) || v>=DNF) return '--.--';
  if(def.unit==='s') return fmtTime(v);   // 초 단위는 부르는 쪽이 붙인다
  /* 복합종목 점수는 네 자리다 — 소수 둘까지 쓰면 'Target 6500.00 pts' 가 칸을 넘는다 */
  return (v>=1000 ? Math.round(v) : v.toFixed(2)) + unitOf(def);
}

function fmtTime(s){
  /* ⚠⚠ 이 함수의 상한이 **세 번** 종목을 지웠다.
       ① 99.99 : 1500m 기준 255초가 '--.--' 로 떴다
       ② 9999  : 20km 경보(10968초)·신인 마라톤(3시간 5분)이 또 지워졌다
     매번 '설마 이보다 긴 종목이 있겠나' 하고 숫자를 박은 게 원인이다. 그런 종목은
     계속 생긴다. **기록이 아닌 값은 실격 값(DNF) 하나뿐이다** — 상한을 따로 두지 않는다.
     그리고 한 시간을 넘으면 시:분:초 로 읽어 준다(마라톤이 '114:21.92' 로 나왔다). */
  if(!(s>0) || s>=DNF) return '--.--';
  if(s < 100) return s.toFixed(2);
  const h = Math.floor(s/3600), rest = s - h*3600;
  const m = Math.floor(rest/60), r = rest - m*60;
  /* 한 시간을 넘는 종목은 100분의 1초를 적지 않는다 — 마라톤을 그렇게 재지 않는다 */
  if(h) return h+':'+String(m).padStart(2,'0')+':'+String(Math.round(r)).padStart(2,'0');
  return m + ':' + (r<10?'0':'') + r.toFixed(2);
}
function fmtDist(m){ return m<=0 ? '--.--' : m.toFixed(2); }

const HUD = {
  /* 경기 중 상단 바 */
  /* ⚠ lab() 이 이름을 **변수로** 받아 BG.get(name) 을 부른다 — 어셋 검사기는
     BG.get('리터럴') 만 읽으므로 배선해 놓고도 '안 붙은 것'으로 잡혔다.
     맵 이름에 ICON 을 넣어 검사기가 읽게 한다(check_assets 의 규약). */
  RACE_ICON: { time:'ic-timer', speed:'ic-speed-hud', dist:'ic-distance' },
  race(ctx, o){
    /* 상단 정보띠 — hud-frame(9-slice)이 오면 그림으로, 없으면 예전 반투명 판 */
    if(!(typeof UIK!=='undefined' && UIK.nine(ctx, 'hud-frame', 0, 0, VW, 30, 16)))
      plate(ctx, 0, 0, VW, 30, 0.72);
    /* ⚠ 칸 폭을 100m(9.58)에 맞춰 박아 뒀다. 마라톤이 들어오자 시계가 '43:20.67' 이
       되면서 옆 칸(SPEED)을 파고들었다. 글자가 길면 크기를 줄여 칸 안에 넣는다. */
    /* ⛔ 챕터 4 — **달리면서 읽을 수 있는 건 두세 개뿐이다.**
       실측: 경기 중 텍스트 13조각 중 **8개가 라벨**이었다
       (TIME·SPEED·DIST·QUALIFY·다음·빠름·늦음·폼). 대부분 한 번 배우면 그만이다.
       아이콘이 오면 라벨을 안 그린다 — 챕터 1과 같은 규칙. */
    /* ⚠ 아이콘을 원본 색으로 그리면 남색 프레임에 묻힌다 — ic-speed-hud 는
       평균 밝기 94 다(ic-timer 150 · ic-distance 105). 라벨과 같은 색으로 물들여
       셋의 밝기를 맞춘다. 목록 칩(UI.picker)과 같은 처리다. */
    const lab = (name, txt0, x, y) => {
      if(typeof UIK!=='undefined' && UIK.iconTint(ctx, name, x, y-1, 9, PAL.dim)) return 11;
      txt(ctx, txt0, x, y, 8, PAL.dim); return 0;
    };
    const ts = fmtTime(o.timeS);
    /* 라벨도 한국어를 원문으로 — 아이콘이 없을 때만 나오는 대비책이지만
       그때 한국어 화면에 영어가 뜨면 안 된다(위 QUALIFY 와 같은 사고다). */
    lab(this.RACE_ICON.time, '시간', 8, 3);
    txt(ctx, ts, 8, ts.length>7?13:12, ts.length>7?12:15, PAL.gold, 'left', 700);

    /* ⚠ 'm/s' 는 매 프레임 읽히지 않는 잡음이다 — 숫자만 남긴다 */
    /* ⚠ 2인 이상이면 이 자리를 사람별 막대가 쓴다. 예전엔 그려 놓고 덮개로 가렸는데
       덮개가 92% 라 '49 / 100' 이 **막대 뒤로 비쳤다**(실측). 아예 안 그린다. */
    const multi = o.party && o.party.length > 1;
    if(!multi){
      lab(this.RACE_ICON.speed, '속도', 76, 3);
      txt(ctx, o.speed.toFixed(1), 76, 13, 11, PAL.white);
      /* 거리도 마찬가지 — '17616 / 42195' 는 11px 로 칸을 넘는다. km 로 줄인다. */
      lab(this.RACE_ICON.dist, '거리', 150, 3);
      const dist = o.trackM > 10000
        ? (o.distM/1000).toFixed(1)+' / '+(o.trackM/1000).toFixed(1)+'km'
        : o.distM.toFixed(0)+' / '+o.trackM;
      txt(ctx, dist, 150, 13, 11, PAL.white);
    }

    /* ── 2인 이상: 사람별 진행 ────────────────────────────
       ⚠ 속도·거리를 한 벌만 보여 주면 **누가 앞선지 알 수 없다.** 카메라가 선두를
          따라가므로 트랙만 봐서도 헷갈린다. 사람마다 색 막대를 하나씩 준다.
       ⚠ 위 속도·거리(76~230)를 덮고 그 자리를 쓴다 — 띠는 30px 하나뿐이다. */
    if(multi){
      const list=o.party, n=list.length, x0=88, wAll=140;
      const bh = Math.max(3, Math.floor((24 - (n-1)*2) / n));
      list.forEach((p,k)=>{
        const col = (typeof Party!=='undefined') ? Party.color(p.i) : PAL.white;
        const y = 3 + k*(bh+2);
        txt(ctx, 'P'+(p.i+1), x0-4, y, 8, col, 'right', 700);
        ctx.fillStyle='rgba(242,245,250,.16)'; ctx.fillRect(x0, y, wAll, bh);
        ctx.fillStyle=col;
        ctx.fillRect(x0, y, Math.round(wAll*clamp((p.distM||0)/(o.trackM||1),0,1)), bh);
        if(p.done && p.timeS) txt(ctx, fmtTime(p.timeS), x0+wAll+4, y-1, 9, col, 'left', 700);
      });
    }

    /* ⛔ 기준기록이 **고정 숫자**였다 — 달리는 중엔 아무것도 못 한다.
       "지금 페이스로 통과하나"로 바꾼다. 그건 지금 행동을 바꿀 수 있는 정보다.
       ⚠ 초반 예측은 요동친다(20m 에서 0.1초 흔들리면 100m 예측이 0.5초 튄다).
          20% 를 지나야 보여 준다 — 그 전에는 기준기록 자체를 띄운다. */
    /* ⚠ 오른쪽 위는 **일시정지 버튼(DOM #p-pause)이 덮는다.** 실측하니 게임 좌표로
       x 461~480 · y -6~8 을 가린다 — VW-8 에 우측정렬하면 라벨이 그 밑에 깔려
       'QUALI…' 로 잘렸다. 캔버스 밖 요소라 화면만 봐서는 원인이 안 보인다.
       오른쪽 블록을 버튼 폭만큼 안으로 물린다. */
    const RX = VW - 30;
    const prog = o.trackM ? o.distM/o.trackM : 0;
    /* ⛔ 통과 예측은 **그 사람의 시간**으로 재야 한다. 예전엔 경기 시계(o.timeS)를 썼는데,
       1인용은 내가 들어오면 경기가 끝나니 같았다. 2인용은 다르다 —
       먼저 들어온 사람의 칸이 뒤늦게 들어오는 사람을 기다리는 동안 계속 올라가서
       **9.76초로 기준(11.30)을 통과한 P1 에게 '기준 미달 +3.09' 라고 했다**(실측). */
    const mt = (o.myTimeS !== undefined && o.myTimeS > 0) ? o.myTimeS : o.timeS;
    if(prog >= 0.2 && mt > 0){
      const proj = mt / prog;
      const d = proj - o.qualify;
      const ahead = d <= 0;
      txt(ctx, K(ahead?'통과 페이스':'기준 미달'), RX, 3, 8, ahead?PAL.green:PAL.red, 'right');
      txt(ctx, (d<=0?'−':'+')+Math.abs(d).toFixed(2), RX, 12, 13,
          ahead?PAL.green:PAL.red, 'right', 700);
    } else {
      /* ⛔ 여기 'QUALIFY' 와 아래 'BEST' 가 **영어 원문**으로 박혀 있었다.
         번역표는 한국어→영어 한 방향이라 코드에 박힌 영어는 한국어 빌드에서
         그대로 영어로 나온다(실측: 한국어 화면에 QUALIFY 만 영어). 게다가 20%를
         지나면 같은 자리가 K('통과 페이스') 로 바뀌어 **경기 도중에 언어가 갈렸다.**
         한국어를 원문으로 쓰고 영어는 표가 만든다 — 두 낱말 다 이미 표에 있다. */
      txt(ctx, K('기준'), RX, 3, 8, PAL.dim, 'right');
      txt(ctx, fmtTime(o.qualify), RX, 12, 13, PAL.dim, 'right', 700);
    }

    if(o.best!==undefined){
      txt(ctx, K('최고'), RX-76, 3, 8, PAL.dim, 'right');
      txt(ctx, fmtTime(o.best), RX-76, 13, 11, PAL.blue, 'right');
    }
  },

  /* 연타 게이지 — **손이 하는 일**을 그대로 보여 준다.
     ① 다음에 칠 발 ② 지금 타수(막대가 즉시 반응) ③ 그 결과인 속도 */
  mashGauge(ctx, o, GY, GH){
    const nextL = o.nextSide < 0;
    txt(ctx, nextL?'◀ 왼발':'오른발 ▶', 10, GY+8, 13, nextL?PAL.gold:PAL.blue, 'left', 700);
    const w=190, h=10, x=(VW-w)/2, y=GY+9;
    /* 타수 — 초당 몇 번 치고 있나(0~14 을 막대 전체로) */
    const tps = clamp((o.rate||0)*2, 0, 14);      // strideRate 는 바퀴/초 → 타/초는 ×2
    ctx.fillStyle='rgba(242,245,250,.14)'; ctx.fillRect(x,y,w,h);
    const fw = w*(tps/14);
    /* 빠를수록 뜨겁게 — 손의 노력이 색으로 보인다 */
    ctx.fillStyle = tps>=10 ? 'rgba(255,120,90,.92)' : tps>=6 ? 'rgba(255,215,94,.9)' : 'rgba(92,255,156,.75)';
    ctx.fillRect(x, y, fw, h);
    txt(ctx, K('타수')+' '+tps.toFixed(1), x-2, y+h+1, 7, PAL.dim, 'right');
    txt(ctx, K('빠를수록 빠르다'), x+w+2, y+h+1, 7, PAL.dim, 'left');
  },

  /* 리듬 게이지 — "언제 눌러야 하나"를 눈으로 보여준다.
     ⚠ 이게 없으면 초보는 목표 간격을 영영 못 찾는다. 실측: 이거 넣기 전 완주율이 절반. */
  rhythm(ctx, o){
    const GY=Track.GAUGE_Y, GH=Track.GAUGE_H;
    plate(ctx, 0, GY, VW, GH, 0.82);
    /* ⛔ 연타 모드에서는 '빠름/늦음' 게이지가 **거짓말**이다 — 목표 박자가 없으니까.
       CK: "조작과 화면이 불일치한다" — 맞다. 화면이 다른 규칙을 말하고 있었다.
       대신 **지금 몇 타로 치고 있는지**와 **그게 속도로 얼마나 나오는지**를 보여 준다.
       치면 즉시 오르고 멈추면 즉시 내려간다 — 손이 하는 일이 화면에 그대로 보여야 한다. */
    if(RULES.mashMode) return this.mashGauge(ctx, o, GY, GH);
    // 다음에 눌러야 할 발 — 크게, 색으로
    /* ⛔ 챕터 4 — '다음' 라벨은 **큰 화살표가 이미 말한다.** 지운다. */
    const nextL = o.nextSide < 0;
    txt(ctx, nextL?'◀ 왼발':'오른발 ▶', 10, GY+8, 13, nextL?PAL.gold:PAL.blue, 'left', 700);

    const w=190, h=10, x=(VW-w)/2, y=GY+9;
    ctx.fillStyle='rgba(242,245,250,.14)'; ctx.fillRect(x,y,w,h);
    const gw = RULES.goodWindowPct*w;          // 좋음 구간
    ctx.fillStyle='rgba(92,255,156,.18)'; ctx.fillRect(x+w/2-gw/2, y, gw, h);
    const pw = RULES.perfectWindowPct*w;       // 완벽 구간
    ctx.fillStyle='rgba(92,255,156,.5)';  ctx.fillRect(x+w/2-pw/2, y, pw, h);
    ctx.fillStyle='rgba(92,255,156,.9)';  ctx.fillRect(x+w/2, y-2, 1, h+4);
    // 바늘 — 왼쪽=아직 이르다, 오른쪽=늦었다
    const px = clamp(x + w/2 + o.phaseErr*w*0.5, x-2, x+w+2);
    ctx.fillStyle=PAL.white; ctx.fillRect(Math.round(px)-1, y-3, 2, h+6);
    /* ⚠ '빠름/늦음' 은 게이지 읽는 법을 가르치는 글자다 — 한 번 배우면 잡음이다.
       스트라이드 열 번을 넘기면 흐려진다. 지우지는 않는다(가끔 다시 눈에 들어와야 한다). */
    const taught = (o.strides||0) > 10;
    ctx.save(); ctx.globalAlpha = taught ? 0.28 : 1;
    txt(ctx, '빠름', x-2, y+h+1, 7, PAL.dim, 'right');
    txt(ctx, '늦음', x+w+2, y+h+1, 7, PAL.dim, 'left');
    ctx.restore();
    // 폼·피로
    txt(ctx, '폼', VW-64, GY+4, 8, PAL.dim);
    const bw=52; ctx.fillStyle='rgba(242,245,250,.14)'; ctx.fillRect(VW-58, GY+14, bw, 6);
    ctx.fillStyle = o.form>0.95?PAL.green:(o.form>0.86?PAL.gold:PAL.red);
    ctx.fillRect(VW-58, GY+14, Math.round(bw*clamp((o.form-RULES.formFloor)/(RULES.formCeil-RULES.formFloor),0,1)), 6);
  },

  /* ── 2인 이상: 리듬 게이지를 사람 수만큼 ───────────────────
     ⛔ 시뮬레이션은 두 사람을 제대로 굴리는데 **화면은 통째로 1인용**이었다 —
        시간·거리·리듬·콤보가 전부 this.player(=P1) 하나에 묶여 있어서
        2인 대결에서 P2 는 **자기 박자가 맞는지 볼 방법이 없었다.**
        리듬 게임에서 게이지가 없는 건 조작이 없는 것과 같다.
     ⚠ 1인용 rhythm() 은 손대지 않는다 — 사람이 둘 이상일 때만 이걸 부른다.
     ⚠ 띠는 242~270(28px) 하나뿐이라 세로로 못 늘린다. **가로로 나눈다.**
        2인이면 반씩, 3~4인이면 4등분. 칸이 좁아질수록 글자를 버리고 색만 남긴다. */
  rhythm2(ctx, list){
    const GY=Track.GAUGE_Y, GH=Track.GAUGE_H, n=list.length;
    plate(ctx, 0, GY, VW, GH, 0.82);
    const pad=4, cw=(VW - pad*(n+1))/n;
    list.forEach((o,i)=>{
      const cx = pad + i*(cw+pad);
      const col = (typeof Party!=='undefined') ? Party.color(i) : PAL.white;
      /* 누구 칸인지 — 색만으로는 P1/P2 를 못 가른다(둘 다 트랙 위에 있다) */
      txt(ctx, 'P'+(i+1), cx+2, GY+3, 9, col, 'left', 700);
      /* 다음 발 — 좁은 칸에서는 화살표만 */
      const nextL = o.nextSide < 0;
      txt(ctx, nextL?'◀':'▶', cx+2, GY+14, 11, nextL?PAL.gold:PAL.blue, 'left', 700);
      /* 게이지 — 1인용과 같은 눈금(완벽·좋음 구간)을 쓴다. 손이 배운 게 그대로 통해야 한다. */
      const gw = cw-26, gx = cx+22, gy = GY+9, gh=10;
      ctx.fillStyle='rgba(242,245,250,.14)'; ctx.fillRect(gx,gy,gw,gh);
      const good = RULES.goodWindowPct*gw, perf = RULES.perfectWindowPct*gw;
      ctx.fillStyle='rgba(92,255,156,.18)'; ctx.fillRect(gx+gw/2-good/2, gy, good, gh);
      ctx.fillStyle='rgba(92,255,156,.5)';  ctx.fillRect(gx+gw/2-perf/2, gy, perf, gh);
      ctx.fillStyle='rgba(92,255,156,.9)';  ctx.fillRect(gx+gw/2, gy-2, 1, gh+4);
      const px = clamp(gx + gw/2 + o.phaseErr*gw*0.5, gx-2, gx+gw+2);
      ctx.fillStyle=col; ctx.fillRect(Math.round(px)-1, gy-3, 2, gh+6);
      /* 폼 — 가는 띠로. 숫자는 안 쓴다(칸이 없다) */
      ctx.fillStyle='rgba(242,245,250,.14)'; ctx.fillRect(gx, gy+gh+3, gw, 3);
      ctx.fillStyle = o.form>0.95?PAL.green:(o.form>0.86?PAL.gold:PAL.red);
      ctx.fillRect(gx, gy+gh+3,
        Math.round(gw*clamp((o.form-RULES.formFloor)/(RULES.formCeil-RULES.formFloor),0,1)), 3);
      /* 이미 들어온 사람은 칸을 흐린다 — 아직 뛰는 사람에게 눈이 가야 한다 */
      if(o.done){ ctx.save(); ctx.globalAlpha=0.55; ctx.fillStyle='#050609';
                  ctx.fillRect(cx, GY+1, cw, GH-2); ctx.restore();
                  txt(ctx, o.timeText||'', cx+cw/2, GY+9, 12, col, 'center', 700); }
    });
  },

  /* ── 한 타의 피드백 ──────────────────────────────────────
     ⚠ 종목마다 따로 만들면 기준이 흩어진다(실측: 10종목 중 판정 표시가 있는 건 4개,
        타격 고리 2개, 콤보 음정 3개 — 같은 리듬 게임인데 종목마다 손맛이 달랐다).
        한 타에 무엇을 보여 줄지는 여기 한 곳에서 정한다.

     o = { j, ageMs, ivMs, x, y, labelY }
       ivMs  목표 간격 — 판정 수명을 여기 맞춘다(다음 타 전에 사라져야 또렷하다)
       x,y   두드린 자리(발밑) — 없으면 고리를 안 그린다 */
  tap(ctx, o){
    if(!o || !o.j) return;
    const age = o.ageMs;
    /* 고리는 **잘 친 타에만**. 다 주면 실수해도 똑같이 터져 의미가 없다.
       수명 160ms 는 어떤 종목의 간격보다도 짧다 — 겹치면 다시 뭉갠다. */
    if(o.x !== undefined && age < 160 && (o.j==='PERFECT' || o.j==='GOOD'))
      BG.fx(ctx, 'fx-tap-ring', o.x, o.y, o.j==='PERFECT'?20:14,
            clamp(age/160, 0, 0.999), 4);
    this.judge(ctx, o.j, age, Math.min(620, (o.ivMs||760)*0.8), o.labelY);
  },

  /* 판정 표시 */
  /* ⚠ 지속이 620ms 고정이었다. 목표 스트라이드 간격이 238ms 이므로
     **한 판정이 살아 있는 동안 다음 타가 2.6번 들어온다** — 라벨이 안 끊기고
     계속 번져 있어서 '한 타 한 타 맞았다'가 안 느껴졌다.
     간격에 맞춰 짧게 끊는다: 다음 타가 오기 전에 사라져야 매 타가 또렷하다. */
  /* ⚠ y 가 38 로 못 박혀 있었다 — 화면 맨 위 하늘이다. 정작 눈은 선수(y≈130)와
     리듬 게이지(맨 아래)를 본다. 판정이 **둘 다에서 제일 먼 곳**에 떴다.
     종목이 자기 선수 근처를 알려 주면 거기 띄운다. */
  judge(ctx, j, ageMs, life, y){
    const L = life || 620;
    if(!j || ageMs>L) return;
    const a = 1 - ageMs/L;
    const col = { PERFECT:PAL.green, GOOD:PAL.blue, EARLY:PAL.gold, LATE:PAL.gold,
                  REPEAT:PAL.red, SPAM:PAL.red, LEAN:PAL.green, LEAN_EARLY:PAL.red }[j] || PAL.white;
    const label = { PERFECT:'PERFECT!', GOOD:'GOOD', EARLY:'너무 빨라', LATE:'너무 늦어',
                    REPEAT:'같은 발!', SPAM:'연타 금지', LEAN:'LEAN!', LEAN_EARLY:'너무 일찍' }[j] || j;
    const sz = j==='PERFECT'?17:13;
    const yy = (y!==undefined?y:38) - (1-a)*8;
    ctx.save(); ctx.globalAlpha=a;
    /* ⚠ 선수 옆으로 옮기니 **빨간 트랙 위에서 글자가 묻혔다**(하늘에 있을 땐 잘 보였다).
       가까이 두는 값을 지키면서 읽히게 — 글자 뒤에만 좁은 받침을 깐다. */
    if(y!==undefined){
      const w = label.length*sz*0.62 + 12;
      ctx.globalAlpha = a*0.55; ctx.fillStyle='#070a12';
      ctx.fillRect(Math.round(VW/2-w/2), Math.round(yy-3), Math.round(w), sz+6);
      ctx.globalAlpha = a;
    }
    txt(ctx, label, VW/2, yy, sz, col, 'center', 700);
    ctx.restore();
  },
};
