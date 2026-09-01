/* ══════════════════════════════════════════════════════════════════
   라이벌을 '실력값' 이 아니라 **목표 기록** 으로 만든다 (2026-08-30)

   ⛔ 왜 필요한가 — 실측으로 찾은 사고
     단거리·계주는 라이벌 실력을 `0.62 + i*0.16` 로 뽑았다. 그런데
       · 라이벌 기록은 skill **0.78 위에서 포화**한다 (0.78→9.22s · 1.00→9.10s)
       · 사람의 성능 띠는 **9.57s(완벽) ~ 10.49s(±40ms)**
     즉 가장 빠른 라이벌(9.10~9.28s)은 **사람의 상한 바깥**에 있었다.
     실측 1위 확률 — 쉬움·보통·어려움 **전부 0%**. 100m 는 이길 수 없는 종목이었다.
     (라이브 브라우저에서도 라이벌 최고가 9.15~9.28s 로 같은 값이 나왔다)
     ⚠ 중거리는 같은 사고를 이미 겪고 parS 로 고쳤다(1D_middle.js 주석).
        단거리·계주에만 남아 있었다.

   ⛔ 왜 skill 에 난이도를 더하면 안 되는가
     skill→기록 곡선이 가파르고 포화한다. 같은 +0.12 가 구간에 따라
     0.5초이기도 하고 0.02초이기도 하다 — 실측 1위 확률이 0%↔100% 로 튀었다.
     그래서 **시간 공간(사람 기록 대비 배수)** 에서 난이도를 주고,
     여기서 skill 로 되돌린다. 그러면 난이도 전 구간이 곡선의 반응하는 띠에 들어온다.

   ⚠ 표는 실측이다(Runner 를 120회씩 돌려 평균). 코드가 바뀌면 표가 낡는다 —
      그래서 verify() 가 부팅 때 살아 있는 Runner 와 대조해 어긋나면 경고한다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const PaceSkill = {
  /* ── 실측 표 ────────────────────────────────────────────────
     거리마다 **'사람의 완벽한 기록 대비 몇 배' → 라이벌 실력값** 을 이분탐색으로 찾아 적었다.
     ⚠ 거리 하나로 못 쓴다 — 라이벌은 사람보다 **장거리에서 덜 느려진다.**
        (실측: 100m 표를 400m 에 그대로 썼더니 라이벌이 1.2초 빨라 어려움이 다시 0% 였다)
       ratio 1.00 → 사람의 완벽한 기록과 같은 기록을 내는 라이벌
       ratio 1.10 → 10% 느린 라이벌
     par 는 참고용(사람이 완벽한 박자로 뛴 기록). 계산에는 ratio 만 쓴다. */
  DIST: {
    100:  { par:  9.57, rows:[[0.95,1.000],[1.00,0.671],[1.05,0.555],[1.10,0.457],[1.15,0.389],[1.25,0.295]] },
    110:  { par: 10.52, rows:[[0.95,1.000],[1.00,0.661],[1.05,0.545],[1.10,0.451],[1.15,0.398],[1.25,0.297]] },
    200:  { par: 19.03, rows:[[0.95,0.781],[1.00,0.623],[1.05,0.509],[1.10,0.436],[1.15,0.389],[1.25,0.302]] },
    400:  { par: 38.72, rows:[[0.95,0.678],[1.00,0.576],[1.05,0.479],[1.10,0.420],[1.15,0.389],[1.25,0.308]] },
    3000: { par:348.98, rows:[[0.95,0.633],[1.00,0.551],[1.05,0.453],[1.10,0.398],[1.15,0.381],[1.25,0.298]] },
  },

  /* 거리는 가장 가까운 표를 쓴다 — 비율(로그) 로 재야 100 과 3000 사이에서 안 쏠린다 */
  rowsFor(distM){
    const D = this.DIST, keys = Object.keys(D).map(Number);
    let best = keys[0], bd = Infinity;
    for(const k of keys){ const d = Math.abs(Math.log(distM/k)); if(d < bd){ bd = d; best = k; } }
    return D[best].rows;
  },

  /* 사람 기록의 몇 배로 뛰는 라이벌인가 → 그 실력값. */
  skillFor(ratio, distM){
    const T = this.rowsFor(distM || 100);
    if(ratio <= T[0][0])            return T[0][1];
    if(ratio >= T[T.length-1][0])   return T[T.length-1][1];
    for(let i=0; i<T.length-1; i++){
      const [r0,s0] = T[i], [r1,s1] = T[i+1];
      if(ratio >= r0 && ratio <= r1){
        const f = (ratio - r0) / (r1 - r0);
        return s0 + (s1 - s0) * f;
      }
    }
    return 0.55;
  },

  /* 라이벌 한 명을 통째로 만든다 — 실력값 **과 손떨림**.
     ⛔ 실력에는 바닥이 있다. 실측: 실력 0 으로 내려도 100m 가 14.9s 다.
        그런데 아이(±150ms)는 16.5s 로 뛴다 — 실력만으로는 **아이보다 느려질 수 없다.**
        그 아래는 손떨림으로 연다: 실력 0.30 에서 손떨림 90→14.4s · 200→18.3s · 280→21.1s.
     ⚠ 쉬움(아이용)이 이 갈래를 쓴다. 보통·어려움은 표 안에 있어 예전과 같다. */
  rivalFor(ratio, distM){
    const T = this.rowsFor(distM || 100);
    const maxR = T[T.length-1][0];
    if(ratio <= maxR){
      const sk = this.skillFor(ratio, distM);
      return { skill: sk, jitter: (1-sk)*90 };
    }
    const sk = T[T.length-1][1];
    const over = ratio / maxR;
    return { skill: sk, jitter: clamp(90 + (over-1)*330, 90, 420) };
  },

  /* ⛔ **이 검사기는 없어진 모델을 재고 있었다.**
     예전 verify() 는 라이벌을 `r.targetIntervalMs()` 로 몰아 '표의 기록'과 대조했다.
     그런데 2026-08-31 부터 라이벌은 **연타 간격(AI.mashIv)** 으로 뛴다 — 그 박자는
     이제 아무도 안 쓴다. 그래서 부팅할 때마다 `⚠ PaceSkill 표가 낡았다` 가 떴고,
     그 경고는 **맞는 말이었지만 고칠 수도 없는 말**이었다(표가 재는 대상이 사라졌다).
     아무도 안 읽는 경고는 경고가 아니다.

     연타 모델에서 이 표가 아직 맡는 일은 하나다: **라이벌의 스탯(실력값)**.
     케이던스는 난이도가 정하고, 표는 '얼마나 좋은 선수인가'만 준다.
     그래서 검사할 것도 하나로 줄었다 — **실력값이 아직 기록을 움직이는가.**
     (실측 2026-08-31 · 100m/110ms: 실력 0.30→10.48s · 1.00→9.70s — 8% 띠)
     ⚠ 여기서 움직임이 죽으면 난이도의 스탯 성분이 조용히 사라진다. 그때만 경고한다. */
  verify(){
    if(typeof Runner==='undefined') return true;
    const DT=1/60, D=100;
    const iv = (typeof RULES!=='undefined' && RULES.mashMode && typeof AI!=='undefined' && AI.mashIv)
             ? AI.mashIv() : null;
    const time = (sk)=>{
      let sum=0;
      for(let n=0;n<6;n++){
        const r = new Runner(1, { speed:45+sk*45, acceleration:45+sk*40,
                                  stamina:50, technique:50, rhythm:50 }, false, D);
        r.reset(0);
        let t=0, next=150, side=1;
        while(!r.finished && t<30000){
          t += DT*1000;
          while(t>=next && !r.finished){
            r.stride(side, Math.round(next), 'off'); side=-side;
            /* ⛔ 게임의 aiStep 과 **같은 박자**로 몬다 — 여기만 다르면 아무것도 안 재는 것이다 */
            next += (iv !== null ? iv : r.targetIntervalMs()) + (Math.random()*2-1)*((1-sk)*90);
          }
          r.simulate(DT, Math.round(t));
        }
        sum += (r.finishTimeS>0 ? r.finishTimeS : t/1000);
      }
      return sum/6;
    };
    const rows = this.DIST[D].rows;
    const lo = rows[rows.length-1][1], hi = rows[0][1];   // 가장 약한 · 가장 센 실력값
    const tLo = time(lo), tHi = time(hi);
    const spread = (tLo - tHi) / tLo;
    if(!(spread > 0.03)){
      console.warn('⚠ PaceSkill — 라이벌 실력값이 기록을 못 움직인다(띠 '
        + (spread*100).toFixed(1) + '%). 난이도의 스탯 성분이 죽었다.'
        + '\n  실력 ' + lo.toFixed(2) + ' → ' + tLo.toFixed(2) + 's · '
        + hi.toFixed(2) + ' → ' + tHi.toFixed(2) + 's'
        + '\n  절차: tools/DIFFICULTY_AUDIT.md');
      return false;
    }
    return true;
  },
};
