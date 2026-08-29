/* ══════════════════════════════════════════════════════════════════
   훈련 — 감독의 유일한 조작 수단.
   ⚠ 매주 전원에게 메뉴를 고르게 하면(24주×6명=144회) 아무도 안 한다.
      팀 프로그램을 깔고, 주당 '직접 지도' 3명만 고르게 한다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 팀 프로그램 — 시즌 내내 깔리는 기본값 */
const PROGRAMS = {
  balanced : { name:'균형',   desc:'모든 스탯을 고르게',       w:{speed:1,acceleration:1,stamina:1,technique:1,rhythm:1,power:1}, load:1.00 },
  speed    : { name:'스피드', desc:'스피드·가속 집중',         w:{speed:2.2,acceleration:1.8,stamina:.4,technique:.6,rhythm:.8,power:.6}, load:1.15 },
  endurance: { name:'지구력', desc:'지구력·리듬. 피로가 적다', w:{speed:.5,acceleration:.6,stamina:2.2,technique:.8,rhythm:1.6,power:.5}, load:0.85 },
  technical: { name:'기술',   desc:'기술·리듬. 성장은 느리다', w:{speed:.5,acceleration:.6,stamina:.7,technique:2.2,rhythm:1.8,power:.6}, load:0.80 },
  power    : { name:'파워',   desc:'파워 집중. 피로가 크다',   w:{speed:.8,acceleration:1.0,stamina:.5,technique:.7,rhythm:.5,power:2.4}, load:1.30 },
};

/* 직접 지도 메뉴 */
const FOCUS = {
  speed       : { name:'스피드',  stat:'speed',        load:1.5 },
  acceleration: { name:'가속',    stat:'acceleration', load:1.4 },
  stamina     : { name:'지구력',  stat:'stamina',      load:1.1 },
  technique   : { name:'기술',    stat:'technique',    load:0.9 },
  rhythm      : { name:'리듬',    stat:'rhythm',       load:0.9 },
  power       : { name:'파워',    stat:'power',        load:1.7 },
  rest        : { name:'휴식',    stat:null,           load:-2.2 },
  care        : { name:'치료·관리', stat:null,         load:-1.2 },   // 부상 회복 가속
};

/* ⚠ 실측으로 다시 잡은 값. 이전 값(7.4 / 17 / 0.011)은 두 가지가 깨져 있었다:
     ① 6명이 한 시즌에 13.7번 다치고 시즌의 26% 를 결장했다 — 팀이 굴러가지 않는다
     ② 스탯이 +5~7 올라도 말기 피로가 87 이라 100m 기록이 오히려 느려졌다.
        육성 게임에서 '키웠는데 느려진다'는 건 게임을 부순다. */
const TrainTune = {
  baseGain: 1.55,          // 주당 기본 성장 포인트
  fatiguePerLoad: 4.6,     // 부하 1당 피로
  restRecover: 22,         // 휴식 시 피로 회복
  injuryBase: 0.0048,      // 주당 부상 확률 기준
  injuryExp: 2.0,          // 피로에 대한 민감도
  condDrift: 4.2,
};

/* 한 선수의 한 주를 처리한다. 반환: 무슨 일이 있었는지(로그용) */
function trainWeek(a, program, focus, rng, club){
  const log = { athlete:a, gains:{}, events:[] };
  /* 육성 층(46_rpg) — 장비는 **성장·회복·부상·컨디션에만** 작용한다.
     경기 시뮬레이션에는 한 줄도 들어가지 않는다(그래야 48종목 밸런스가 그대로다).
     장비가 없으면 전부 0 이라 예전과 완전히 같다. */
  const RB = (typeof RPG!=='undefined') ? RPG.bonus(a) : { grow:0, rest:0, hurt:0, cond:0, xp:0 };
  /* 코치(49_depth) — 장비와 같은 통로로 합친다. 스탯별 성장은 아래에서 따로 더한다.
     ⚠ club 을 안 넘기면 코치는 없는 셈이 된다 — 옛 호출부가 그대로 돌아간다. */
  const CB = (typeof DEPTH!=='undefined' && club) ? DEPTH.coachBonus(club, null)
           : { grow:0, rest:0, hurt:0 };
  RB.rest += CB.rest; RB.hurt += CB.hurt;
  /* 명예의 전당 유산 — 아주 얕게, 대신 영원히. 오래 한 클럽의 신인이 조금 더 잘 큰다. */
  const LB = (typeof DEPTH!=='undefined' && club && DEPTH.legacyBonus)
           ? DEPTH.legacyBonus(club) : { grow:0 };
  RB.grow += LB.grow;
  /* 종족 도감(4D_codex) — 등록한 종족 수만큼 영구히. 유산과 같은 통로, 같은 성격이다.
     ⚠ 도감은 감독에게 붙으므로 **클럽을 새로 만들어도 남는다** — 두 번째 판이 조금 수월하다 */
  if(typeof Codex!=='undefined' && Codex.growBonus) RB.grow += Codex.growBonus().grow;
  /* 스킬 — 육성형만. 경기형은 Athlete.eff 통로로 따로 간다(4E_skill 머리말 참고) */
  if(typeof SKILL!=='undefined'){
    const SB = SKILL.growBonus(a);
    RB.grow += SB.grow; RB.rest += SB.rest; RB.hurt += SB.hurt;
    RB.cond = (RB.cond||0) + SB.cond;
  }

  /* 부상 중이면 회복만 한다 */
  if(a.injury){
    const speed = (focus==='care') ? 2 : 1;
    a.injury.weeks -= speed;
    a.fatigue = Math.max(0, a.fatigue - TrainTune.restRecover*0.6 - RB.rest);
    a.condition = clamp(a.condition - 1.5, 20, 100);
    if(a.injury.weeks <= 0){
      log.events.push({ t:'recovered', msg:`${a.name} 복귀 — ${a.injury.name} 회복` });
      a.injury = null;
      a.condition = clamp(a.condition, 35, 70);
    } else {
      log.events.push({ t:'injured', msg:`${a.name} 재활 중 (${a.injury.weeks}주 남음)` });
    }
    return log;
  }

  const P = PROGRAMS[program];
  const F = focus ? FOCUS[focus] : null;
  const load = P.load + (F ? F.load : 0);

  /* 피로 — 부하가 음수(휴식)면 회복 */
  if(load < 0) a.fatigue = clamp(a.fatigue + load*TrainTune.restRecover*0.5 - RB.rest, 0, 100);
  else a.fatigue = clamp(a.fatigue + load*TrainTune.fatiguePerLoad*(1+a.eff('fatigue')) - RB.rest, 0, 100);

  /* 성장 — 피로가 높으면 효율이 급락한다. 이게 '쉬게 하는' 이유가 된다. */
  const fatiguePenalty = a.fatigue>70 ? lerp(1,0.15,(a.fatigue-70)/30) : lerp(1.12,1,a.fatigue/70);
  const ageF = a.ageFactor();
  const moraleF = 0.82 + a.morale/100*0.32;

  if(load > 0){
    for(const k of STAT_KEYS){
      let w = P.w[k];
      if(F && F.stat===k) w += 2.6;                 // 직접 지도한 스탯에 크게 실린다
      if(w<=0) continue;
      const room = a.potential[k] - a.stats[k];
      if(room <= 0) continue;
      // 잠재치에 가까울수록 잘 안 는다(체감 성장)
      const near = clamp(room/22, 0.10, 1);
      /* 종 배율 — 치타는 스피드가 빨리 늘고 코끼리는 파워가 빨리 는다.
         ⚠ 상한을 막지 않는다. 치타도 던지기를 배울 수 있다, 다만 오래 걸린다. */
      const sb = (typeof speciesBias==='function') ? speciesBias(a, k) : 1;
      /* 그 스탯을 맡은 코치가 있으면 그만큼 더 자란다 */
      const coachG = (typeof DEPTH!=='undefined' && club) ? DEPTH.coachBonus(club, k).grow : 0;
      let g = TrainTune.baseGain * w/6 * sb * fatiguePenalty * ageF * moraleF * near * (0.7+rng()*0.6)
              * (1 + RB.grow + coachG);
      if(ageF < 0) g = Math.min(0, g);              // 전성기 이후엔 줄 수도 있다
      if(Math.abs(g) < 0.01) continue;
      const before = a.stats[k];
      a.stats[k] = clamp(a.stats[k] + g, 20, a.potential[k]);
      const d = a.stats[k]-before;
      if(Math.abs(d) >= 0.05) log.gains[k] = +( (log.gains[k]||0) + d ).toFixed(2);
    }
  }

  /* 컨디션 — 피로가 낮고 사기가 높으면 오른다 */
  const target = clamp(96 - a.fatigue*0.62 + (a.morale-60)*0.16 + RB.cond, 20, 100);
  a.condition = clamp(a.condition + (target-a.condition)*0.42 + (rng()-0.5)*TrainTune.condDrift, 15, 100);

  /* 부상 — 피로가 높을수록 급격히 위험해진다 */
  if(load > 0){
    const risk = TrainTune.injuryBase * Math.pow(1 + a.fatigue/40, TrainTune.injuryExp)
               * (1 + a.eff('injury')) * (1 + Math.max(0,load-1.6)*0.5)
               * Math.max(0.2, 1 + RB.hurt);
    if(rng() < risk){
      const inj = rollInjury(rng, a);
      a.injury = inj;
      a.condition = clamp(a.condition-22, 15, 100);
      a.morale = clamp(a.morale-14, 0, 100);
      log.events.push({ t:'injury', msg:`${a.name} 부상 — ${inj.name} (${inj.weeks}주)` });
    }
  }

  /* 이번 주의 경험치 — 부하가 클수록 많이. 장비의 xp 배수가 여기 붙는다. */
  if(typeof RPG!=='undefined'){
    const xp = (RPG.XP.trainWeek + Math.max(0,load)*RPG.XP.trainPerLoad*10) * (1 + RB.xp);
    const up = RPG.award(a, xp, '훈련');
    if(up && up.levels>0)
      log.events.push({ t:'levelup', msg:`${a.name} Lv.${a.lv} 달성 — 훈련 포인트 +${up.tp}` });
  }

  /* 성장 이력 한 점 — 나중에 꺾은선으로 보여 준다 */
  if(typeof DEPTH!=='undefined') DEPTH.logWeek(a);

  /* 돌발 — 각성·슬럼프 */
  if(!a.injury && rng() < 0.045){
    if(rng() < 0.55){
      const k = STAT_KEYS[(rng()*STAT_KEYS.length)|0];
      const room = a.potential[k]-a.stats[k];
      if(room > 1){
        const g = Math.min(room, 2.2+rng()*3.2);
        a.stats[k]+=g; a.morale=clamp(a.morale+8,0,100);
        log.events.push({ t:'break', msg:`${a.name} 각성 — ${STAT_NAME[k]} +${g.toFixed(1)}` });
      }
    } else {
      a.condition=clamp(a.condition-16,15,100); a.morale=clamp(a.morale-9,0,100);
      log.events.push({ t:'slump', msg:`${a.name} 슬럼프 — 컨디션 급락` });
    }
  }
  a.trainingWeeks++;
  return log;
}

const INJURIES = [
  { name:'햄스트링 염좌', w:[2,5] }, { name:'발목 염좌', w:[1,3] },
  { name:'종아리 근육통', w:[1,2] }, { name:'무릎 통증', w:[3,7] },
  { name:'허리 통증', w:[2,4] },     { name:'아킬레스건염', w:[4,9] },
];
function rollInjury(rng, a){
  const i = INJURIES[(rng()*INJURIES.length)|0];
  let w = i.w[0] + Math.round(rng()*(i.w[1]-i.w[0]));
  if(a.has('ironman')) w = Math.max(1, w-1);
  if(a.has('glass')) w += 1;
  return { name:i.name, weeks:w };
}
