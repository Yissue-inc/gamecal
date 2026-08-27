/* ══════════════════════════════════════════════════════════════════
   World Sprint Circuit — 규칙 상수 (정본)
   Godot 판 core/Ruleset.gd 에서 이식. 숫자를 코드 안에 흩뿌리지 않는다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const RULES = {
  /* ── 스트라이드 판정 ── */
  targetCadenceHz: 4.2,        // 목표 교대 속도. 1000/4.2 ≈ 238ms 간격
  minInputIntervalMs: 80,      // 이보다 빠르면 연타로 본다
  spamWindowMs: 60,            // 이보다 빠르면 강한 연타 페널티
  perfectWindowPct: 0.08,      // 목표 간격 대비 오차 8% 이내 = PERFECT
  goodWindowPct: 0.18,
  earlyLateWindowPct: 0.35,
  fatiguePerSpam: 0.01,

  /* ── 출발 ── */
  falseStartThresholdMs: 100,  // 총성 전 100ms 안쪽 입력 = 부정출발

  /* ── 속도 ── */
  baseSpeed: 11.25,              // m/s
  maxSpeedCap: 12.5,
  balanceScale: 1.0,
  /* 감속 계수(1/초). 두드리는 중엔 거의 안 줄고, 손을 놓으면 빠르게 죽는다.
     프레임률과 무관하게 하려고 지수감쇠로 쓴다. */
  decayActive: 0.08,
  decayIdle: 3.2,
  strideLerp: 0.75,           // 한 번의 스트라이드가 목표속도로 얼마나 끌어당기나
  /* 폼 — 리듬이 흐트러지면 떨어지고 잘 맞추면 회복된다.
     ⚠ 바닥(formFloor)을 너무 낮게 두면 한 번 무너진 초보가 영영 못 회복해
        "완주 자체를 못 하는" 절벽이 생긴다. 실측으로 잡은 값. */
  formFloor: 0.82, formCeil: 1.10,
  formGainPerfect: 0.030, formGainGood: 0.012,
  formLossMiss: 0.028, formLossRepeat: 0.060,

  /* ── 피니시 린(상체 젖히기) ── */
  leanWindowStartM: 92.0,
  leanWindowEndM: 99.5,
  leanGainMinS: 0.01,
  leanGainMaxS: 0.05,
  leanEarlyPenalty: 0.15,      // 70~92m 사이에 누르면 속도 15% 손실

  /* ── 구간 배율 (거리에 따라 낼 수 있는 속도가 다르다) ── */
  phase: [
    { untilPct: 0.20, mult: 0.85, id: 'DRIVE'      },  // 가속 구간
    { untilPct: 0.35, mult: 1.00, id: 'TRANSITION' },
    { untilPct: 0.85, mult: 1.08, id: 'MAX_VEL'    },  // 최고속 구간
    { untilPct: 1.01, mult: 1.02, id: 'FINISH'     },
  ],

  /* ── 110m 허들 ── */
  hurdleCount: 10,
  hurdleFirstM: 13.72,
  hurdleSpacingM: 9.14,
  hurdleCleanWindowM: 0.35,    // 이 안에서 누르면 Clean
  hurdleSafeWindowM: 0.65,
  hurdleClipLoss: 0.18,
  hurdleCrashLoss: 0.45,

  /* ── 멀리뛰기 ── */
  boardPositionM: 40.0,
  foulToleranceM: 0.02,
  ljFlightOptHoldMs: 350,      // 이 정도 쥐고 있어야 폼 100%

  /* ── 창던지기 ── */
  javelinFoulLineM: 30.0,
  javelinOptAngleDeg: 34.0,
  javelinChargeMs: 800,

  /* ── 해머던지기 ── */
  hammerMinSpin: 2.2, hammerOptSpin: 7.0, hammerMaxSpin: 8.5,
  hammerAutoReleaseMs: 5200,
  hammerMinAngleDeg: 24.0, hammerMaxAngleDeg: 66.0, hammerOptAngleDeg: 45.0,
  hammerSectorWindowDeg: 22.0,

  /* ── 높이뛰기 ── */
  /* 시작 높이·간격 — 실측으로 조정: 1.50/0.05 로는 잘하는 플레이어가
     16번 시기를 치르며 60초를 넘겼다. 미니게임 한 판은 짧아야 한다. */
  hjStartHeightM: 1.65,
  hjStepM: 0.06,
  hjMaxMisses: 3,
  hjApproachDurationS: 1.65,
  hjPlantWindowMs: 440,
  hjAirTapBonusM: 0.045,
  hjOptHoldMs: 160,
  hjBaseReachM: 1.35,

  /* ── 보조(난이도) ── */
  assistWidenPct: { off: 0.0, low: 0.05, high: 0.12 },

  /* ── 판정별 추진력 ── */
  impulse: { PERFECT:1.0, GOOD:0.78, EARLY:0.70, LATE:0.70, REPEAT:0.42, SPAM:0.25 },
  /* ⚠ SPAM 을 0 으로 두면 연타하는 플레이어가 영영 완주를 못 해 화면이 멈춘 것처럼 보인다.
     느리지만 굴러가게 두고, 대신 아래 기준기록(qualify)으로 탈락시킨다 — 레퍼런스와 같은 방식. */
};

/* 거리 비율에 따른 구간 배율 */
function phaseAt(distM, trackM){
  const p = distM / trackM;
  for(const ph of RULES.phase){ if(p < ph.untilPct) return ph; }
  return RULES.phase[RULES.phase.length-1];
}

/* ══ 종목표 ══
   qualify = 이 기록을 못 넘기면 탈락(레퍼런스의 QUALIFY 13sec00 과 같은 장치).
   higher  = 클수록 좋은 종목인가(던지기·뛰기) */
const EVENTS = [
  { id:'sprint100',  name:'100m 달리기',   short:'100M',    unit:'s', higher:false, qualify:13.60, distanceM:100 },
  { id:'hurdles110', name:'110m 허들',     short:'110MH',   unit:'s', higher:false, qualify:15.90, distanceM:110 },
  { id:'longJump',   name:'멀리뛰기',       short:'LJ',      unit:'m', higher:true,  qualify:5.90 },
  { id:'highJump',   name:'높이뛰기',       short:'HJ',      unit:'m', higher:true,  qualify:1.70 },
  { id:'javelin',    name:'창던지기',       short:'JAV',     unit:'m', higher:true,  qualify:52.0 },
  { id:'hammer',     name:'해머던지기',     short:'HAM',     unit:'m', higher:true,  qualify:48.0 },
];
const EVENT_BY_ID = {}; for(const e of EVENTS) EVENT_BY_ID[e.id]=e;
