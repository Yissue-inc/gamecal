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
  race(ctx, o){
    plate(ctx, 0, 0, VW, 30, 0.72);
    /* ⚠ 칸 폭을 100m(9.58)에 맞춰 박아 뒀다. 마라톤이 들어오자 시계가 '43:20.67' 이
       되면서 옆 칸(SPEED)을 파고들었다. 글자가 길면 크기를 줄여 칸 안에 넣는다. */
    const ts = fmtTime(o.timeS);
    txt(ctx, 'TIME',  8, 3, 8, PAL.dim);
    txt(ctx, ts, 8, ts.length>7?13:12, ts.length>7?12:15, PAL.gold, 'left', 700);

    txt(ctx, 'SPEED', 76, 3, 8, PAL.dim);
    txt(ctx, o.speed.toFixed(1)+' m/s', 76, 13, 11, PAL.white);

    /* 거리도 마찬가지 — '17616 / 42195' 는 11px 로 칸을 넘는다. km 로 줄인다. */
    txt(ctx, 'DIST', 150, 3, 8, PAL.dim);
    const dist = o.trackM > 10000
      ? (o.distM/1000).toFixed(1)+' / '+(o.trackM/1000).toFixed(1)+'km'
      : o.distM.toFixed(0)+' / '+o.trackM;
    txt(ctx, dist, 150, 13, 11, PAL.white);

    // 기준기록 — 지금 페이스로 통과할 수 있나
    const ok = o.timeS <= o.qualify;
    txt(ctx, 'QUALIFY', VW-8, 3, 8, PAL.dim, 'right');
    txt(ctx, fmtTime(o.qualify), VW-8, 12, 13, ok?PAL.green:PAL.red, 'right', 700);

    if(o.best!==undefined){
      txt(ctx, 'BEST', VW-84, 3, 8, PAL.dim, 'right');
      txt(ctx, fmtTime(o.best), VW-84, 13, 11, PAL.blue, 'right');
    }
  },

  /* 리듬 게이지 — "언제 눌러야 하나"를 눈으로 보여준다.
     ⚠ 이게 없으면 초보는 목표 간격을 영영 못 찾는다. 실측: 이거 넣기 전 완주율이 절반. */
  rhythm(ctx, o){
    const GY=Track.GAUGE_Y, GH=Track.GAUGE_H;
    plate(ctx, 0, GY, VW, GH, 0.82);
    // 다음에 눌러야 할 발 — 크게, 색으로
    const nextL = o.nextSide < 0;
    txt(ctx, '다음', 10, GY+4, 8, PAL.dim);
    txt(ctx, nextL?'◀ 왼발':'오른발 ▶', 10, GY+13, 12, nextL?PAL.gold:PAL.blue, 'left', 700);

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
    txt(ctx, '빠름', x-2, y+h+1, 7, PAL.dim, 'right');
    txt(ctx, '늦음', x+w+2, y+h+1, 7, PAL.dim, 'left');
    // 폼·피로
    txt(ctx, '폼', VW-64, GY+4, 8, PAL.dim);
    const bw=52; ctx.fillStyle='rgba(242,245,250,.14)'; ctx.fillRect(VW-58, GY+14, bw, 6);
    ctx.fillStyle = o.form>0.95?PAL.green:(o.form>0.86?PAL.gold:PAL.red);
    ctx.fillRect(VW-58, GY+14, Math.round(bw*clamp((o.form-RULES.formFloor)/(RULES.formCeil-RULES.formFloor),0,1)), 6);
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
