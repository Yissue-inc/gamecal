/* ══════════════════════════════════════════════════════════════════
   경기 시뮬레이터 — 스탯을 경기력으로 바꾼다.
   아케이드에서 '사람의 손가락'이 있던 자리에 '선수의 정밀도'를 넣는다.
   물리는 아케이드와 완전히 같은 Runner 를 쓴다 — 그래야 기록이 같은 축에서 비교된다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const SimTune = {
  sigmaBest: 5,      // 최고 선수의 스트라이드 오차 표준편차(ms)
  sigmaWorst: 62,    // 최악 — 78 은 하위권 편차가 너무 커 스탯40이 10.86초를 내기도 했다
  reactBest: 118,    // 반응속도(ms)
  reactWorst: 235,
  falseStartBase: 0.012,
};

/* 선수의 '실행 정밀도' 0~1. 리듬·기술이 주고, 컨디션·피로가 깎는다. */
function execSkill(a, ctx){
  ctx = ctx||{};
  const core = (a.stats.rhythm*0.62 + a.stats.technique*0.38)/100;
  let s = core * a.formScore();
  s *= 1 - a.eff('sigma');                    // 메트로놈 특성이면 오차가 준다
  if(ctx.big) s *= 1 + a.eff('bigGame')*0.5;  // 큰 경기 특성
  return clamp(s, 0.05, 1.15);
}

/* 한 선수의 한 경기를 돌린다. 반환: {timeS, splits, judge, falseStart, ...} */
function simulateSprint(a, opt){
  opt = opt||{};
  const trackM = opt.trackM || 100;
  const rng = opt.rng || makeRng((Date.now()^0x9e3779b9)>>>0);
  const skill = execSkill(a, opt);
  const sigma = lerp(SimTune.sigmaWorst, SimTune.sigmaBest, clamp(skill,0,1));

  const r = new Runner(opt.lane??0, a.stats, false, trackM);
  const gunMs = 0;
  r.reset(gunMs);

  /* 부정출발 — 잘하는 선수일수록 아슬아슬하게 붙어 가끔 튄다 */
  const fsChance = SimTune.falseStartBase * (0.4 + skill) * (opt.big?1.5:1) * (1 + Math.max(0,-a.eff('bigGame')));
  if(rng() < fsChance) return { falseStart:true, timeS:99.99, splits:{}, judge:r.judge };

  /* 반응 */
  let react = lerp(SimTune.reactWorst, SimTune.reactBest,
                   clamp((a.stats.acceleration*0.6 + a.stats.technique*0.4)/100 * a.formScore(),0,1));
  react *= 1 + a.eff('reaction');
  react = Math.max(100, react + gauss(rng)*14);

  const DT = 1/120;                   // 시뮬레이션은 화면과 무관하게 고정 간격
  let t = 0, side = 1;
  let next = react;
  const staminaK = a.stats.stamina/100;
  const fadeAt = trackM * lerp(0.52, 0.78, staminaK);   // 이 지점부터 흔들리기 시작

  while(!r.finished && t < 30000){
    t += DT*1000;
    if(t >= next){
      r.stride(side, Math.round(t), 'off');
      side = -side;
      /* 후반 흔들림 — 지구력이 낮으면 리듬이 무너진다 */
      let sg = sigma;
      if(r.distM > fadeAt){
        const over = (r.distM - fadeAt)/Math.max(1,(trackM-fadeAt));
        sg *= 1 + over * lerp(1.5, 0.25, staminaK) * (1 + a.eff('lateFade'));
      }
      next = t + r.targetIntervalMs() + gauss(rng)*sg;
      if(next <= t + RULES.minInputIntervalMs) next = t + RULES.minInputIntervalMs + 4;
    }
    /* 피니시 린 — 기술이 좋을수록 창을 잘 잡는다 */
    if(!r.leanDone && r.distM >= RULES.leanWindowStartM){
      const grab = clamp((a.stats.technique/100)*a.formScore(), 0.05, 0.99);
      if(rng() < grab*DT*26) r.lean();
    }
    r.simulate(DT, Math.round(t));
  }
  if(!r.finished) return { falseStart:false, dnf:true, timeS:99.99, splits:r.splits, judge:r.judge };
  return { falseStart:false, timeS:r.finishTimeS, splits:r.splits, judge:r.judge,
           reactionMs:r.reactionMs, sigma:+sigma.toFixed(1), skill:+skill.toFixed(3) };
}

/* 허들 — 스프린트에 허들 통과 판정을 얹는다 */
function simulateHurdles(a, opt){
  opt = Object.assign({}, opt, { trackM:110 });
  const rng = opt.rng || makeRng(Date.now()>>>0);
  const base = simulateSprint(a, Object.assign({}, opt, { rng }));
  if(base.falseStart || base.dnf) return Object.assign(base, { hurdles:{clean:0,clip:0,crash:0} });
  const acc = clamp((a.stats.technique*0.55 + a.stats.rhythm*0.25 + a.stats.acceleration*0.20)/100
                    * a.formScore() * (1 + a.eff('hurdle')*0.5), 0.05, 1.2);
  let clean=0, clip=0, crash=0, penalty=0;
  for(let i=0;i<RULES.hurdleCount;i++){
    const roll = rng();
    const pClean = clamp(acc*0.92, 0.05, 0.97);
    const pClip  = clamp((1-pClean)*0.78, 0, 1);
    if(roll < pClean){ clean++; penalty += 0.045; }
    else if(roll < pClean+pClip){ clip++; penalty += 0.20; }
    else { crash++; penalty += 0.62; }
  }
  return Object.assign(base, { timeS: base.timeS + penalty, hurdles:{clean,clip,crash} });
}

/* 필드 종목 — 거리는 파워·기술·컨디션에서 나온다. 3회 시기 중 최고. */
function simulateField(a, kind, opt){
  opt = opt||{};
  const rng = opt.rng || makeRng(Date.now()>>>0);
  const K = {
    longJump: { base:4.30, power:1.76, tech:1.33, speed:1.16, foul:0.16, sd:0.24, trait:'jump'  },
    highJump: { base:1.28, power:0.42, tech:0.40, speed:0.16, foul:0.14, sd:0.055,trait:'jump'  },
    javelin : { base:33.0, power:34.0, tech:19.0, speed:5.0,  foul:0.15, sd:2.6,  trait:'throw' },
    hammer  : { base:30.0, power:36.0, tech:14.0, speed:2.0,  foul:0.17, sd:2.4,  trait:'throw' },
  }[kind];
  const form = a.formScore();
  const p = a.stats.power/100, tq = a.stats.technique/100, sp = a.stats.speed/100;
  const marks=[];
  for(let i=0;i<3;i++){
    const foulP = K.foul * (1.5 - tq) * (opt.big?1.15:1);
    if(rng() < foulP){ marks.push(null); continue; }
    let v = K.base + K.power*p + K.tech*tq + K.speed*sp;
    v *= (0.80 + form*0.22) * (1 + a.eff(K.trait)*0.10);
    v += gauss(rng)*K.sd;
    marks.push(Math.max(0, +v.toFixed(2)));
  }
  const valid = marks.filter(m=>m!==null);
  return { marks, best: valid.length? Math.max(...valid) : 0, allFoul: valid.length===0 };
}

/* 종목 하나를 통째로 — 출전 선수 전원을 돌리고 순위를 매긴다 */
function simulateMeetEvent(eventDef, entries, opt){
  opt = opt||{};
  const rng = opt.rng || makeRng(Date.now()>>>0);
  const rows = entries.map(a=>{
    const o = { rng, big:opt.big, trackM:eventDef.distanceM };
    let res;
    if(eventDef.id==='sprint100') res = simulateSprint(a, o);
    else if(eventDef.id==='hurdles110') res = simulateHurdles(a, o);
    else res = simulateField(a, eventDef.id, o);
    const value = eventDef.higher ? (res.best??0) : res.timeS;
    return { athlete:a, res, value };
  });
  rows.sort((x,y)=>{
    const bad = r=> (r.res.falseStart||r.res.dnf||r.res.allFoul) ? 1 : 0;
    if(bad(x)!==bad(y)) return bad(x)-bad(y);
    return eventDef.higher ? y.value-x.value : x.value-y.value;
  });
  rows.forEach((r,i)=>{ r.rank = i+1; });
  return rows;
}
