/* ══════════════════════════════════════════════════════════════════
   경기 시뮬레이터 — 스탯을 경기력으로 바꾼다.
   아케이드에서 '사람의 손가락'이 있던 자리에 '선수의 정밀도'를 넣는다.
   물리는 아케이드와 완전히 같은 Runner 를 쓴다 — 그래야 기록이 같은 축에서 비교된다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 중거리 종목별 계수 — 스윕으로 잡은 값 */
/* 거리별 계수.
   pace  = 케이던스(1.0 이 판정에 가장 유리하다. 여기서 속도를 조절하지 않는다)
   speed = 순항 속도 배율 (여기서 조절한다) */
/* ⚠ 이 표는 아케이드에 중장거리가 생기기 전 값이었다. 새 기준표(측정으로 잡은 것)와
   맞춰 보니 **최고 선수가 5000m 기준(855초)에 939초로 못 닿고**, 반대로 20km 경보는
   5527초로 기준(8650)을 36% 밑돌았다 — 아케이드와 감독 모드가 서로 다른 세계를 재고 있었다. */
const MidTune = {
  400 : { pace:1.0, speed:0.99, fadeAt:0.35, fadeHi:1.1, fadeLo:0.30, fatHi:0.030, fatLo:0.010 },
  800 : { pace:1.0, speed:0.83, fadeAt:0.40, fadeHi:1.2, fadeLo:0.25, fatHi:0.018, fatLo:0.006 },
  1500: { pace:1.0, speed:0.78, fadeAt:0.55, fadeHi:1.0, fadeLo:0.18, fatHi:0.010, fatLo:0.004 },
  5000: { pace:1.0, speed:0.77, fadeAt:0.60, fadeHi:0.8, fadeLo:0.14, fatHi:0.005, fatLo:0.0018 },
  20000:{ pace:1.0, speed:0.32, fadeAt:0.65, fadeHi:0.6, fadeLo:0.12, fatHi:0.0016,fatLo:0.0005 },
};

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
  if(rng() < fsChance) return { falseStart:true, timeS:DNF, splits:{}, judge:r.judge };

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

  /* ⚠ 상한이 30초 고정이라 400m 가 전부 미완주였다. 거리에 비례시킨다. */
  const CAP = Math.max(30000, trackM * 260);
  while(!r.finished && t < CAP){
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
  if(!r.finished) return { falseStart:false, dnf:true, timeS:DNF, splits:r.splits, judge:r.judge };
  return { falseStart:false, timeS:r.finishTimeS, splits:r.splits, judge:r.judge,
           reactionMs:r.reactionMs, sigma:+sigma.toFixed(1), skill:+skill.toFixed(3) };
}

/* 중거리(800m·1500m) — 스프린트와 같은 물리지만 지구력이 지배한다.
   ⚠ 100m 용 감속·피로 계수를 그대로 쓰면 1500m 가 말이 안 되는 시간이 나온다.
      거리에 따라 목표 케이던스를 낮추고 피로 누적을 늘린다. */
function simulateMiddle(a, opt){
  opt = opt||{};
  const trackM = opt.trackM || 800;
  const rng = opt.rng || makeRng((Date.now()^0x51ed)>>>0);
  const skill = execSkill(a, opt);
  const sigma = lerp(SimTune.sigmaWorst, SimTune.sigmaBest, clamp(skill,0,1)) * 1.25;

  const r = new Runner(opt.lane??0, a.stats, false, trackM);
  r.reset(0);
  /* 페이스 — 거리가 길수록 느린 케이던스로 달린다 */
  /* 거리별 페이스·후반 붕괴. 세계기록 대비 90~100% 가 되도록 실측으로 맞춘 값이다.
     (400m 를 스프린트 물리로 돌렸더니 36초가 나왔다 — 세계기록이 43초다) */
  const P = MidTune[trackM] || MidTune[800];
  const paceMult = P.pace;
  r.speedMul = P.speed;
  const st = a.stats.stamina/100;
  const DT = 1/60;
  let t = 0, side = 1;
  let react = 190 + gauss(rng)*20;
  let next = react;
  const targetIv = ()=> r.targetIntervalMs() / paceMult;

  /* ⚠ 상한이 600초 고정이라 5000m·20km 가 전부 미완주였다. 거리에 비례시킨다. */
  const CAPM = Math.max(600000, trackM*520);
  while(!r.finished && t < CAPM){
    t += DT*1000;
    if(t >= next){
      r.stride(side, Math.round(t), 'off'); side = -side;
      /* 후반 페이스 붕괴 — 지구력이 낮으면 크게 무너진다 */
      const prog = r.distM/trackM;
      const fade = prog>P.fadeAt ? 1 + (prog-P.fadeAt)*lerp(P.fadeHi,P.fadeLo,st) : 1;
      next = t + targetIv()*fade + gauss(rng)*sigma;
      if(next <= t + RULES.minInputIntervalMs) next = t + RULES.minInputIntervalMs + 4;
    }
    /* 장거리 피로는 따로 쌓는다 */
    r.fatigue = Math.min(1, r.fatigue + DT*lerp(P.fatHi, P.fatLo, st));
    r.simulate(DT, Math.round(t));
  }
  if(!r.finished) return { falseStart:false, dnf:true, timeS:9999, splits:r.splits, judge:r.judge };
  return { falseStart:false, timeS:r.finishTimeS, splits:r.splits, judge:r.judge,
           reactionMs:r.reactionMs, sigma:+sigma.toFixed(1) };
}

/* 계주 — 선수 4명. 각 구간 기록 + 바통 인계 손실.
   ⚠ 개인 기록의 단순 합이 아니다. 인계가 매끄러우면 오히려 빨라진다(러닝 스타트). */
function simulateRelay(team, opt){
  opt = opt||{};
  const rng = opt.rng || makeRng((Date.now()^0x7ace)>>>0);
  /* ⚠ 구간 거리를 100m 로 못 박아 두면 4x400 이 4x100 과 같은 기록이 나온다(실측 486%). */
  const legM = (opt.trackM || 400) / 4;
  const legs = [];
  let total = 0, drops = 0;
  for(let i=0;i<4;i++){
    const a = team[i % team.length];
    const res = legM > 150
      ? simulateMiddle(a, Object.assign({}, opt, { rng, trackM:legM }))
      : simulateSprint(a, Object.assign({}, opt, { rng, trackM:legM }));
    let legT = res.falseStart ? legM*0.135 : res.timeS;
    if(i>0){
      // 인계 — 기술·리듬이 좋을수록 손실이 적고, 실패하면 크게 잃는다
      const prev = team[(i-1) % team.length];
      const q = clamp(((a.stats.technique+prev.stats.technique)/2*0.6 +
                       (a.stats.rhythm+prev.stats.rhythm)/2*0.4)/100
                      * a.formScore(), 0.05, 1.15);
      if(rng() < 0.035*(1.6-q)){ drops++; legT += 1.9 + rng()*1.4; }   // 바통 실수
      else legT -= lerp(0.05, 0.42, q) * (legM/100);                  // 러닝 스타트 이득
    }
    legs.push({ athlete:a, timeS:+legT.toFixed(2) });
    total += legT;
  }
  return { timeS:+total.toFixed(2), legs, drops, falseStart:false };
}

/* 수영 — 교대 스트로크는 같지만 물이 훨씬 느리다.
   영법마다 속도와 기술 비중이 다르고, 턴(50m)에서 타이밍이 필요하다. */
const SwimTune = {
  free  :{ speed:0.212, tech:1.00, name:'자유형' },
  back  :{ speed:0.191, tech:1.10, name:'배영'   },
  breast:{ speed:0.174, tech:1.30, name:'평영'   },
  fly   :{ speed:0.200, tech:1.25, name:'접영'   },
};
function simulateSwim(a, opt){
  opt = opt||{};
  const trackM = opt.trackM || 100;
  const stroke = opt.stroke || 'free';
  const S = SwimTune[stroke] || SwimTune.free;
  const rng = opt.rng || makeRng((Date.now()^0x5171)>>>0);
  const skill = execSkill(a, opt);
  /* 물에서는 기술이 더 중요하다 — 물잡기가 어긋나면 그대로 멈춘다 */
  const tq = a.stats.technique/100;
  const eff = clamp(skill*0.55 + tq*0.45*S.tech, 0.05, 1.25);
  const st  = a.stats.stamina/100;
  const pw  = a.stats.power/100;

  /* ⚠ 예전 계수는 100m 를 14초에 끊었다 — 세계기록이 46.4초다(달리기 속도가 나왔다).
     물에서는 2m/s 안팎이다. 스탯99 ≈ 2.13 · 스탯50 ≈ 1.43 이 되게 잡았다. */
  /* ⚠ 힘 비중(1.4*pw)이 커서 **투척 종이 수영을 이겼다**(실측 62.4 대 64.1초).
     적합도만 고치면 '누굴 내보낼까'만 바뀌고 기록은 그대로다 — 물리도 같이 고쳐야 한다.
     물에서 사는 종에게 물잡기 보너스를 준다. */
  let swimBonus = 1;
  if(typeof SPECIES!=='undefined' && SPECIES[a.species] && SPECIES[a.species].spec==='swim')
    swimBonus = 1.12;
  const base = S.speed * (3.6 + 4.6*eff + 0.9*pw + 0.5*st) * swimBonus;
  let t=0, dist=0, turns=0;
  const DT=1/60;
  let sigma = lerp(0.26, 0.05, clamp(skill,0,1));
  while(dist < trackM && t < 400){
    t += DT;
    const prog = dist/trackM;
    const fade = prog>0.5 ? 1 - (prog-0.5)*lerp(0.30,0.06,st) : 1;
    const wob  = 1 + gauss(rng)*sigma*0.12;
    dist += base*fade*wob*DT;
    /* 턴 — 50m 마다. 기술이 좋으면 벽을 차고 빨라진다 */
    const nextTurn = (turns+1)*50;
    if(nextTurn < trackM && dist >= nextTurn){
      turns++;
      const q = clamp(tq*a.formScore() + gauss(rng)*0.12, 0, 1.1);
      dist += lerp(-0.35, 0.85, q);       // 좋은 턴은 이득, 나쁜 턴은 손해
    }
  }
  return { falseStart:false, timeS:+t.toFixed(2), turns, splits:{}, judge:{},
           eff:+eff.toFixed(3) };
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
    if(roll < pClean){ clean++; penalty += 0.215; }
    else if(roll < pClean+pClip){ clip++; penalty += 0.20; }
    else { crash++; penalty += 0.62; }
  }
  return Object.assign(base, { timeS: base.timeS + penalty, hurdles:{clean,clip,crash} });
}

const FIELD_KINDS = new Set(['longJump','tripleJump','highJump','poleVault',
                             'shotPut','discus','javelin','hammer']);
/* 필드 종목 — 거리는 파워·기술·컨디션에서 나온다. 3회 시기 중 최고. */
function simulateField(a, kind, opt){
  opt = opt||{};
  const rng = opt.rng || makeRng(Date.now()>>>0);
  const K = {
    longJump  : { base:4.30, power:1.76, tech:1.33, speed:1.16, foul:0.16, sd:0.24, trait:'jump'  },
    tripleJump: { base:9.20, power:3.20, tech:3.10, speed:2.10, foul:0.19, sd:0.42, trait:'jump'  },
    highJump  : { base:1.28, power:0.42, tech:0.40, speed:0.16, foul:0.14, sd:0.055,trait:'jump'  },
    poleVault : { base:2.60, power:1.35, tech:1.50, speed:0.95, foul:0.20, sd:0.16, trait:'jump'  },
    shotPut   : { base:9.20, power:8.90, tech:3.90, speed:0.55, foul:0.13, sd:0.58, trait:'throw' },
    discus    : { base:28.0, power:26.0, tech:14.0, speed:1.60, foul:0.18, sd:2.10, trait:'throw' },
    javelin   : { base:33.0, power:34.0, tech:19.0, speed:5.0,  foul:0.15, sd:2.6,  trait:'throw' },
    hammer    : { base:30.0, power:36.0, tech:14.0, speed:2.0,  foul:0.17, sd:2.4,  trait:'throw' },
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

/* ── 기준 기록에 앵커를 건 종목들 ─────────────────────────────
   ⚠ simulateMeetEvent 의 마지막 분기가 **무조건 simulateField** 였다. 필드 8종목의
      계수 표에만 이름이 있어서, 다이빙·역도·양궁·사이클·조정·트램폴린이 들어오면
      `K.foul` 을 undefined 에서 읽고 **감독 모드가 통째로 죽었다.**
      (아케이드에서만 확인해서 놓쳤다 — 종목을 늘리면 시뮬레이터도 늘려야 한다.)

   새 종목마다 계수 표를 손으로 채우는 대신 **기준 기록(parS/qualify)에 앵커**를 건다.
   능력치가 par 를 얼마나 당기거나 미는지로 낸다 — 종목이 더 늘어도 표를 안 고쳐도 된다. */
const ANCHOR = {
  dive  : { w:{technique:.42, rhythm:.24, power:.20, speed:.14}, spread:.30, fail:.10, tries:3 },
  lift  : { w:{power:.62, technique:.24, stamina:.14},           spread:.26, fail:.16, tries:3 },
  aim   : { w:{technique:.52, rhythm:.34, stamina:.14},          spread:.22, fail:.04, tries:1 },
  tramp : { w:{rhythm:.40, technique:.32, power:.18, speed:.10}, spread:.28, fail:.06, tries:1 },
  cycle : { w:{speed:.38, power:.30, stamina:.20, rhythm:.12},   spread:.14, fail:.03, tries:1 },
  row   : { w:{rhythm:.40, stamina:.32, power:.20, technique:.08},spread:.14, fail:.03, tries:1 },
  climb : { w:{rhythm:.36, technique:.30, power:.22, acceleration:.12}, spread:.16, fail:.09, tries:1 },
  fence : { w:{technique:.40, acceleration:.28, rhythm:.20, speed:.12}, spread:.20, fail:.14, tries:1 },
  shoot : { w:{technique:.56, rhythm:.30, stamina:.14}, spread:.12, fail:.02, tries:1 },
  rally : { w:{acceleration:.36, rhythm:.30, technique:.24, speed:.10}, spread:.18, fail:.10, tries:1 },
};
function simulateAnchored(a, def, opt){
  opt = opt||{};
  const rng = opt.rng || makeRng(Date.now()>>>0);
  const A = ANCHOR[def.kind];
  if(!A) throw new Error('simulateAnchored: 앵커 없는 종목 '+def.kind+' ('+def.id+')');
  const par = def.parS || def.qualify;
  let skill = 0;
  for(const k in A.w) skill += (a.stats[k]||0)/100 * A.w[k];
  const form = a.formScore();
  const marks = [];
  for(let i=0;i<A.tries;i++){
    if(rng() < A.fail*(opt.big?1.15:1)){ marks.push(null); continue; }
    /* higher 종목은 능력이 값을 밀어 올리고, 시간 종목은 끌어내린다 */
    const k = def.higher ? (0.68 + A.spread*2*skill) : (1.00 + A.spread - A.spread*2*skill);
    let v = par * k * (0.93 + form*0.11);
    v += gauss(rng) * par * 0.022;
    marks.push(Math.max(0.01, +v.toFixed(2)));
  }
  const valid = marks.filter(m=>m!==null);
  if(def.higher) return { marks, best: valid.length? Math.max(...valid):0, allFoul: !valid.length };
  return { marks, timeS: valid.length? Math.min(...valid) : DNF, dnf: !valid.length };
}

/* 10종 경기 — 하위 열 종목을 각자 돌리고 IAAF 표로 합산한다.
   ⚠ 여기서 하위 종목 목록을 다시 적으면 사본이 된다. DECA(20_decathlon.js)를 그대로 쓴다. */
function simulateCombined(a, def, opt){
  if(typeof DECA==='undefined') throw new Error('simulateCombined: DECA 표가 없다');
  let total=0; const marks=[];
  for(const slot of DECA){
    const sd = EVENT_BY_ID[slot.id];
    const r = simulateOne(a, sd, opt);
    const v = sd.higher ? (r.best??0) : (r.timeS??DNF);
    const pts = decaPoints(slot, v);
    marks.push({id:slot.id, value:v, pts}); total+=pts;
  }
  return { marks, best: total, allFoul:false };
}
/* 철인3종 — 구간을 이어 달리되 **피로가 넘어간다**.
   ⚠ 구간 목록을 여기서 다시 적으면 사본이 된다. TRI.legs(21_triathlon.js)를 그대로 쓴다. */
function simulateTri(a, def, opt){
  if(typeof TRI==='undefined') throw new Error('simulateTri: TRI 표가 없다');
  let total=0, carry=0; const splits=[];
  for(const L of TRI.legs){
    const sd=EVENT_BY_ID[L.id];
    const r=simulateOne(a, sd, opt);
    let s = (r.timeS!==undefined ? r.timeS : DNF);
    if(!(s>0) || s>=DNF) s = sd.qualify*1.6;
    s *= (1 + carry*0.34);                    // 지친 만큼 느려진다
    splits.push({id:L.id, s}); total += s;
    carry = Math.min(1, carry + TRI.fatiguePerLeg);
    total += TRI.transitionMs/1000;           // 전환
  }
  total -= TRI.transitionMs/1000;             // 마지막 구간 뒤엔 전환이 없다
  return { splits, timeS: total };
}

/* 종목 하나를 알맞은 시뮬레이터로 — 10종 경기와 개별 대회가 같은 길을 쓴다 */
function simulateOne(a, def, opt){
  const o = Object.assign({}, opt, { trackM:def.distanceM });
  if(def.kind==='sprint') return simulateSprint(a, o);
  if(def.kind==='hurdles') return simulateHurdles(a, o);
  if(def.kind==='middle' || def.kind==='walk') return simulateMiddle(a, o);
  if(def.kind==='swim') return simulateSwim(a, Object.assign({}, o, {stroke:def.stroke}));
  if(def.kind==='combined') return simulateCombined(a, def, opt);
  if(def.kind==='tri') return simulateTri(a, def, opt);
  if(ANCHOR[def.kind]) return simulateAnchored(a, def, o);
  if(FIELD_KINDS.has(def.id)) return simulateField(a, def.id, o);
  throw new Error('simulateOne: 시뮬레이터 없는 종목 '+def.id+' (kind='+def.kind+')');
}

function simulateMeetEvent(eventDef, entries, opt){
  opt = opt||{};
  const rng = opt.rng || makeRng(Date.now()>>>0);
  const rows = entries.map(a=>{
    const o = { rng, big:opt.big, trackM:eventDef.distanceM };
    /* ⚠ 예전엔 여기가 '나머지는 전부 필드'였다. 모르는 종목을 조용히 필드로 보내면
       계수 표에 없는 이름으로 undefined 를 읽고 죽는다 — simulateOne 이 이름을 대며 실패한다. */
    const res = simulateOne(a, eventDef, o);
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
