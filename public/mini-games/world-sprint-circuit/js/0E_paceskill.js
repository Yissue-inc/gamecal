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

  /* ⚠ 표가 살아 있는 Runner 와 어긋나면 밸런스가 조용히 무너진다.
     부팅 때 세 점만 싸게 대조한다(각 8회 · 100m). 3% 넘게 벌어지면 경고. */
  verify(){
    if(typeof Runner==='undefined') return true;
    const DT=1/60, out=[];
    /* 100m 에서 세 배수만 싸게 대조한다. 3% 넘게 벌어지면 표가 낡은 것이다. */
    for(const ratio of [1.00, 1.10, 1.25]){
      const sk = this.skillFor(ratio, 100);
      let sum=0;
      for(let n=0;n<8;n++){
        const r = new Runner(1, { speed:45+sk*45, acceleration:45+sk*40,
                                  stamina:50, technique:50, rhythm:50 }, false, 100);
        r.reset(0);
        let t=0, next=150, side=1;
        while(!r.finished && t<30000){
          t += DT*1000;
          while(t>=next && !r.finished){
            r.stride(side, Math.round(next), 'off'); side=-side;
            next += r.targetIntervalMs() + (Math.random()*2-1)*((1-sk)*90);
          }
          r.simulate(DT, Math.round(t));
        }
        sum += (r.finishTimeS>0 ? r.finishTimeS : t/1000);
      }
      const got  = sum/8;
      const want = this.DIST[100].par * ratio;
      if(Math.abs(got-want)/want > 0.03)
        out.push(`x${ratio}: 표 ${want.toFixed(2)}s · 실제 ${got.toFixed(2)}s`);
    }
    if(out.length) console.warn('⚠ PaceSkill 표가 낡았다 — tools/winrate.js 로 재측정할 것\n  ' + out.join('\n  '));
    return out.length===0;
  },
};
