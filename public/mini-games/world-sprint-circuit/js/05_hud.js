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

function fmtRec(def, v){
  if(v===undefined || v===null || !isFinite(v) || v>=DNF) return '--.--';
  if(def.unit==='s') return fmtTime(v);   // 초 단위는 부르는 쪽이 붙인다
  /* 복합종목 점수는 네 자리다 — 소수 둘까지 쓰면 'Target 6500.00 pts' 가 칸을 넘는다 */
  return (v>=1000 ? Math.round(v) : v.toFixed(2)) + unitOf(def);
}

function fmtTime(s){
  /* ⚠ '99 이상 = 기록 없음' 이라는 옛 규칙이 중장거리를 통째로 지웠다(1500m 기준 255초
     가 화면에 '--.--' 로 떴다). 1분을 넘으면 분:초 로 읽어 준다. */
  if(!(s>0) || s>=9999) return '--.--';
  if(s < 100) return s.toFixed(2);
  const m=Math.floor(s/60), r=s-m*60;
  return m+':'+(r<10?'0':'')+r.toFixed(2);
}
function fmtDist(m){ return m<=0 ? '--.--' : m.toFixed(2); }

const HUD = {
  /* 경기 중 상단 바 */
  race(ctx, o){
    plate(ctx, 0, 0, VW, 30, 0.72);
    txt(ctx, 'TIME',  8, 3, 8, PAL.dim);
    txt(ctx, fmtTime(o.timeS), 8, 12, 15, PAL.gold, 'left', 700);

    txt(ctx, 'SPEED', 76, 3, 8, PAL.dim);
    txt(ctx, o.speed.toFixed(1)+' m/s', 76, 13, 11, PAL.white);

    txt(ctx, 'DIST', 150, 3, 8, PAL.dim);
    txt(ctx, o.distM.toFixed(0)+' / '+o.trackM, 150, 13, 11, PAL.white);

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

  /* 판정 표시 */
  judge(ctx, j, ageMs){
    if(!j || ageMs>620) return;
    const a = 1 - ageMs/620;
    const col = { PERFECT:PAL.green, GOOD:PAL.blue, EARLY:PAL.gold, LATE:PAL.gold,
                  REPEAT:PAL.red, SPAM:PAL.red, LEAN:PAL.green, LEAN_EARLY:PAL.red }[j] || PAL.white;
    const label = { PERFECT:'PERFECT!', GOOD:'GOOD', EARLY:'너무 빨라', LATE:'너무 늦어',
                    REPEAT:'같은 발!', SPAM:'연타 금지', LEAN:'LEAN!', LEAN_EARLY:'너무 일찍' }[j] || j;
    ctx.save(); ctx.globalAlpha=a;
    txt(ctx, label, VW/2, 38 - (1-a)*8, j==='PERFECT'?17:13, col, 'center', 700);
    ctx.restore();
  },
};
