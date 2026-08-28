/* ══════════════════════════════════════════════════════════════════
   World Sprint Circuit — 규칙 상수 (정본)
   Godot 판 core/Ruleset.gd 에서 이식. 숫자를 코드 안에 흩뿌리지 않는다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 기록 없음(실격·시간초과·부정출발)의 정본 값.
   ⚠ 예전엔 99.99 였고 화면은 '99 이상이면 기록 없음'으로 판정했다. 종목이 100초를
      넘기 시작하자(조정 107초 · 1500m 237초) **멀쩡한 기록이 '--.--' 로 지워졌다.**
      어떤 종목도 닿지 못할 값으로 올린다. */
const DNF = 99999;

/* 종목별 '등장 동물' 배역표.
   ⚠ 종목 파일에 종족 이름을 손으로 적어 두면 오타가 조용히 넘어간다 — 화면엔 폴백
      사각형이 나오고 콘솔에 404 만 쌓인다. 실측: 펜싱 'fox'(진짜는 greyfox) ·
      스피드클라이밍 'gecko'(아예 없는 종). 어셋 검사기도 종족표만 봐서 통과시켰다.
      여기 등록하면 부팅 때 한 번에 검사한다(99_main.js verifyCasts). */
/* 경기 결과 상태의 정본. 화면(20_screens)의 제목표가 이걸 전부 덮는지 부팅 때 검사한다.
   ⚠ 'DQ' 가 제목표에 없어서 실격 화면에 **영문 enum 'DQ' 가 그대로** 떴다(20km 경보).
      표에 없으면 원문이 나가는 구조라 조용히 새어 나간다. */
const RESULT_STATUS = ['OK','MISSED_QUALIFY','FALSE_START','DQ','TIMEOUT','ALL_FOUL'];

const SPRITE_CASTS = {};
function cast(where, list){ SPRITE_CASTS[where] = list; return list; }

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
  pvStartM: 3.60,            // 장대높이뛰기 시작 높이

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
/* ⚠ 기준 기록(qualify)은 실측으로 다시 잡았다(2026-08-27).
   예전 값은 실제 주파 기록의 2배 가까이 느슨해서 **실력과 무관하게 100% 통과**했다
   (100m: 사람이 10.3초를 뛰는데 기준이 13.6초, 수영 자유형은 40초에 기준 80초).
   기준이 아무 의미가 없으면 '통과했다'가 아무 느낌도 아니다.
   지금 기준 = **보통과 서툰의 중간값** — 능숙·보통은 통과하고 서툰은 자주 실패한다.
   ⚠ 처음엔 보통x1.07 로 잡았는데 서툰이 0% 였다. 못하는 사람이 한 번도 못 넘으면
      기준이 벽이 된다 — 가끔은 넘어야 다시 해 본다. */
const EVENTS = [
  /* ── 트랙: 단거리 ── */
  { id:'sprint100',  name:'100m 달리기',  short:'100M',  unit:'s', higher:false, qualify:11.30, distanceM:100, kind:'sprint', tip:'좌·우를 일정한 박자로 번갈아 — 빨리가 아니라 고르게 · 총성 전엔 부정 출발' },
  { id:'sprint200',  name:'200m 달리기',  short:'200M',  unit:'s', higher:false, qualify:21.80, distanceM:200, kind:'sprint', tip:'좌·우를 일정한 박자로 — 곡선에서도 그 박자를 잃지 않는다' },
  { id:'sprint400',  name:'400m 달리기',  short:'400M',  unit:'s', higher:false, qualify:44.50, distanceM:400, kind:'middle', tip:'좌·우를 일정한 박자로 — 한 바퀴다. 초반에 다 쓰면 무너진다' },
  { id:'hurdles110', name:'110m 허들',    short:'110MH', unit:'s', higher:false, qualify:13.60, distanceM:110, kind:'hurdles',
    hurdle:{ count:10, first:13.72, spacing:9.14 } , tip:'좌·우를 일정한 박자로 달리다 허들 앞에서 액션' },
  /* 400m 허들 — 허들이 낮고 간격이 넓다. 지구력 종목에 가깝다. */
  { id:'hurdles400', name:'400m 허들',    short:'400MH', unit:'s', higher:false, qualify:47.00, distanceM:400, kind:'hurdles',
    hurdle:{ count:10, first:45.0, spacing:35.0 } , tip:'허들 10개 · 보폭이 흐트러지면 발이 안 맞는다' },
  /* 3000m 장애물 — 고정 장애물과 물웅덩이. 5번째마다 물이다. */
  { id:'steeple3000',name:'3000m 장애물', short:'3000SC',unit:'s', higher:false, qualify:420.0, distanceM:3000, kind:'hurdles',
    hurdle:{ count:28, first:80.0, spacing:100.0, waterEvery:5 } , tip:'허들 + 물웅덩이 · 물 앞에서는 일찍 뛴다' },
  /* ── 트랙: 중·장거리 ── */
  { id:'run800',     name:'800m 달리기',  short:'800M',  unit:'s', higher:false, qualify:136.0, parS:127.0, distanceM:800,  kind:'middle', tip:'▲▼ 페이스(여유·유지·승부) · 액션 = 스퍼트 1회' },
  { id:'run1500',    name:'1500m 달리기', short:'1500M', unit:'s', higher:false, qualify:255.0, parS:238.0, distanceM:1500, kind:'middle', tip:'▲▼ 페이스 배분이 전부 · 승부는 한 번뿐' },
  { id:'run5000',    name:'5000m 달리기', short:'5000M', unit:'s', higher:false, qualify:855.0, parS:792.0, distanceM:5000, kind:'middle', tip:'▲▼ 페이스 · 길다. 유지로 가다 마지막에 지른다' },
  { id:'walk20k',    name:'20km 경보',    short:'20KW',  unit:'s', higher:false, qualify:8650.0, parS:7800.0, distanceM:20000, kind:'walk', tip:'▲▼ 페이스 · 너무 빠른 케이던스는 경고, 3회면 실격' },
  /* 마라톤 — 거리가 한 자릿수 더 크다. 압축비는 MiddleEvent 가 스스로 계산한다.
     ⚠ par 는 다른 거리처럼 6.3m/s 로 잡으면 1시간51분이 된다(사람 세계기록보다 빠르다).
        거리가 늘면 페이스는 떨어진다 — 5.34m/s 로 잡아 2시간12분에 둔다. */
  { id:'marathon', name:'마라톤', short:'MAR', unit:'s', higher:false, qualify:8700,
    parS:7900, distanceM:42195, kind:'middle',
    tip:'▲▼ 페이스 · 가장 긴 종목이다. 초반에 지르면 뒤가 없다' },
  /* ── 트랙: 계주 ── */
  { id:'relay4x100', name:'4×100m 계주',  short:'4×100', unit:'s', higher:false, qualify:49.50, distanceM:400, kind:'relay', legs:4, tip:'좌·우를 일정한 박자로 · 인계 구역에서 액션(속도가 비슷할 때)' },
  { id:'relay4x400', name:'4×400m 계주',  short:'4×400', unit:'s', higher:false, qualify:210.0, parS:196.0, distanceM:1600, kind:'relay', legs:4, tip:'한 바퀴씩 네 명 · 인계 품질이 13초를 가른다' },
  /* ── 필드: 도약 ── */
  { id:'longJump',   name:'멀리뛰기',      short:'LJ',    unit:'m', higher:true,  qualify:5.90,  kind:'jump', tip:'좌·우로 달려 구름판에서 액션 · 공중에서 액션을 쥐었다 놓는다' },
  { id:'tripleJump', name:'세단뛰기',      short:'TJ',    unit:'m', higher:true,  qualify:11.00, kind:'jump', tip:'홉·스텝·점프 — 정점마다 액션' },
  { id:'highJump',   name:'높이뛰기',      short:'HJ',    unit:'m', higher:true,  qualify:1.70,  kind:'jump', tip:'좌·우로 달려 액션으로 뛰고, 좌·우로 몸을 넘긴다' },
  { id:'poleVault',  name:'장대높이뛰기',  short:'PV',    unit:'m', higher:true,  qualify:5.40,  kind:'jump', tip:'액션으로 폴을 꽂고 좌·우로 몸을 끌어올린다' },
  /* ── 필드: 투척 ── */
  { id:'shotPut',    name:'포환던지기',    short:'SP',    unit:'m', higher:true,  qualify:15.50, kind:'throw', tip:'액션을 눌러 힘을 모으고 가득 찼을 때 놓는다' },
  { id:'discus',     name:'원반던지기',    short:'DT',    unit:'m', higher:true,  qualify:48.00, kind:'throw', tip:'좌·우 번갈아 회전을 올리고 액션으로 놓는다' },
  { id:'javelin',    name:'창던지기',      short:'JAV',   unit:'m', higher:true,  qualify:52.0,  kind:'throw', tip:'좌·우로 달려 액션 · 릴리스 각도가 45°에 가까울수록 멀리 간다' },
  { id:'hammer',     name:'해머던지기',    short:'HAM',   unit:'m', higher:true,  qualify:48.0,  kind:'throw', tip:'좌·우 번갈아 회전 · 회전이 많을수록 멀리 가지만 놓치기 쉽다' },
  /* ── 수영 ── */
  { id:'swimFree100',  name:'자유형 100m',  short:'100FR', unit:'s', higher:false, qualify:43.0, distanceM:100, kind:'swim', stroke:'free', tip:'좌·우 번갈아 젓고, 제때 액션으로 숨 쉬고, 벽 앞에서 액션으로 턴'  },
  { id:'swimBack100',  name:'배영 100m',    short:'100BK', unit:'s', higher:false, qualify:47.0, distanceM:100, kind:'swim', stroke:'back', tip:'배영 · 숨은 자유롭지만 벽이 안 보인다'  },
  { id:'swimBreast100',name:'평영 100m',    short:'100BR', unit:'s', higher:false, qualify:50.0, distanceM:100, kind:'swim', stroke:'breast', tip:'평영 · 느리지만 리듬 창이 넓다'},
  { id:'swimFly100',   name:'접영 100m',    short:'100FL', unit:'s', higher:false, qualify:48.0, distanceM:100, kind:'swim', stroke:'fly', tip:'접영 · 가장 빠르게 지치니 호흡을 놓치지 말 것'   },
  /* 다이빙 — 이 게임 유일의 '점수' 종목. 3시기 중 최고점. */
  { id:'diving',       name:'다이빙',       short:'DIVE',  unit:'점', higher:true,  qualify:60.0, kind:'dive', tip:'좌·우로 반동 → 액션으로 도약 → 좌·우 회전 → 액션으로 편다' },
  /* 역도 — 힘 종목. 성공하면 무게가 오르고, 실패해야 시기를 쓴다. */
  { id:'lifting',      name:'역도',         short:'LIFT',  unit:'kg', higher:true,  qualify:140.0, kind:'lift', tip:'좌·우로 자세를 잡고 액션을 길게 눌러 든다 · 기우는 반대쪽을 누른다' },
  /* 양궁 — 이 게임 유일의 '정지 조준'. 6발 합계 60점 만점. */
  { id:'archery',      name:'양궁',         short:'ARCH',  unit:'점', higher:true,  qualify:42.0, kind:'aim', tip:'액션을 누르고 있으면 당겨진다 · 좌·우로 조준 · 떼면 발사' },
  /* 트랙 사이클 — 기어 변속과 스퍼트가 핵심. */
  { id:'cycling',      name:'트랙 사이클',   short:'CYCL',  unit:'s', higher:false, qualify:34.0, parS:29.0, distanceM:500, kind:'cycle', tip:'좌·우로 페달 · ▲▼ 기어 · 액션 = 스퍼트 1회' },
  /* 조정 — 이 게임 유일의 '일정함' 종목. 빠름이 아니라 흔들리지 않음이 점수다. */
  { id:'rowing',       name:'조정 500m',     short:'ROW',   unit:'s', higher:false, qualify:96.0, parS:86.0, distanceM:500, kind:'row', tip:'좌·우를 천천히 고르게 — 빠름이 아니라 일정함이 속도다' },
  /* 트램폴린 — 10회를 끊지 않고 잇는다. 실수 한 번의 비용이 남은 회차 내내 따라온다. */
  { id:'trampoline',   name:'트램폴린',     short:'TRAM',  unit:'점', higher:true,  qualify:52.0, kind:'tramp', tip:'매트에 닿는 순간 액션 · 좌·우 회전 · 착지 전에 액션으로 편다' },
  /* 스피드 클라이밍 — 실제 형식이 이미 1대1이다. 한 판 7초, 이 게임에서 가장 짧다. */
  { id:'climbSpeed',   name:'스피드 클라이밍', short:'CLMB', unit:'s', higher:false, qualify:6.30, parS:5.20, kind:'climb', tip:'좌·우를 고르게 — 정확하면 빨라진다 · 액션 = 도약 1회' },
  /* 펜싱 — 이 게임에서 유일하게 '리듬'이 아니라 '거리'가 축인 종목. 5투셰 선취까지의 시간. */
  { id:'fencing',      name:'펜싱 에페',    short:'FENC', unit:'s', higher:false, qualify:52.0, parS:42.0, kind:'fence', tip:'← 물러서기 · → 다가가기 · 액션 = 런지 · 뻗을 때 물러서면 받아넘긴다' },
  /* 10종 경기 — 새 물리가 아니라 **그릇**이다. 있는 열 종목을 이어 뛰고 IAAF 표로 합산한다. */
  { id:'decathlon',    name:'10종 경기',    short:'DEC',   unit:'점', higher:true,  qualify:6500, parS:7200, kind:'combined', tip:'열 종목을 이어서 · 각 종목의 조작 그대로' },
  /* 철인3종 — 두 번째 그릇. 10종과 달리 **끊기지 않는다**(피로가 구간을 관통한다). */
  { id:'triathlon',    name:'철인3종',      short:'TRI',   unit:'s', higher:false, qualify:285, parS:250, kind:'tri', tip:'수영 → 사이클 → 달리기 · 앞 구간에서 쓴 힘이 뒤로 넘어간다' },
  /* 사격 — 양궁과 달리 거리가 없다. 축은 **호흡**이다. 10발 소수점 채점(109.0 만점). */
  { id:'shooting',     name:'10m 공기소총', short:'AR10', unit:'점', higher:true,  qualify:95.0, parS:99.0, kind:'shoot', tip:'액션을 눌러 숨을 참고 가장 잔잔할 때 뗀다 · ▲ 다시 호흡' },
  /* 7종 경기 — 10종과 **같은 그릇**을 쓴다. 표(HEPTA)만 다르다. */
  { id:'heptathlon',   name:'7종 경기',     short:'HEP',   unit:'점', higher:true,  qualify:6800, parS:7300, kind:'combined', tip:'일곱 종목을 이어서 · 각 종목의 조작 그대로' },
  /* 개인혼영 — 한 경기 안에서 영법이 **세 번 바뀐다**. 리듬이 그때마다 새로 잡혀야 한다.
     접영 → 배영 → 평영 → 자유형 (실제 순서) */
  { id:'swimMedley200',name:'개인혼영 200m', short:'200IM', unit:'s', higher:false, qualify:126.0, parS:112.0,
    distanceM:200, kind:'swim', stroke:'fly', medley:true , tip:'접영→배영→평영→자유형 · 영법마다 리듬을 새로 잡는다' },
  /* 탁구 — 이 게임에 없던 **랠리** 장르. 상대를 어디로 뛰게 만드느냐가 축이다. */
  { id:'tableTennis',  name:'탁구',         short:'TT',    unit:'s', higher:false, qualify:140.0, parS:110.0, kind:'rally', tip:'←→ 로 설 자리와 코스를 정하고, 공이 올 때 액션' },
  /* 유도 — 격투기가 통째로 비어 있었다. 붙잡고 버티다 한순간에 뒤집는 종목. */
  { id:'judo',         name:'유도',         short:'JUDO',  unit:'s', higher:false, qualify:45.0, parS:20.0, kind:'grap', tip:'좌·우 번갈아 깃 싸움 · 저울이 기울면 액션으로 메친다' },
  /* 기계체조 도마 — 축은 **손 짚기**. 그 짧은 순간에 높이가 정해지고, 높이가 난도를 허락한다. */
  { id:'vault',        name:'도마',         short:'VT',    unit:'점', higher:true,  qualify:11.50, parS:13.20, kind:'gym', tip:'좌·우로 달려 구름판, 도마에 닿을 때 다시 액션 · 좌·우 비틀기' },
  /* 카누 슬라럼 — 이 게임에 없던 **가로 조종**. 기록 = 내려온 시간 + 벌점. */
  { id:'canoe',        name:'카누 슬라럼',   short:'CSL',   unit:'s', higher:false, qualify:80.0, parS:70.0, kind:'slalom', tip:'번갈아 저으면 빨라지고, 한쪽만 저으면 그 반대로 돈다' },
  /* 골프 — 유일하게 **여러 번에 나눠** 목표에 다가간다. 기록은 파 대비(적을수록 좋다). */
  { id:'golf',         name:'골프 3홀',     short:'GOLF',  unit:'타', higher:false, qualify:0.0, parS:-3.0, kind:'golf', tip:'←→ 조준 · ▲▼ 클럽 · 액션 3번(시작·세기·정확도)' },
  /* 승마 장애물 — 허들과 달리 간격이 제각각이다. 축은 **보폭 계산**(라인 보기). */
  { id:'equestrian',   name:'승마 장애물',   short:'JUMP',  unit:'벌점', higher:false, qualify:8.0, parS:0.0, kind:'ride', tip:'▲▼ 보폭 · 좌·우 한 걸음 · 도약대에 발이 맞으면 액션' },
  /* 철봉 — 이 게임에서 유일하게 **놓았다가 다시 잡는** 종목. 스윙이 난도를 허락한다. */
  { id:'highBar',      name:'철봉',         short:'HB',    unit:'점', higher:true,  qualify:10.50, parS:11.80, kind:'gym', tip:'좌·우로 흔들어 스윙을 키우고 액션으로 이탈 · 다시 액션으로 잡는다' },
  /* 링 — 이 게임에서 유일하게 '누르지 않는 것'이 잘하는 종목 */
  { id:'rings', name:'링', short:'RG', unit:'점', higher:true, qualify:10.8,
    parS:12.4, kind:'gym',
    tip:'좌·우로 흔들림을 되잡아 버틴다 — 많이 누를수록 감점' },
  /* 근대5종 — 펜싱·수영·승마·사격·달리기. 다섯 종목이 이미 다 있어서 그릇만 얹었다. */
  { id:'pentathlon',   name:'근대5종',      short:'PENT',  unit:'점', higher:true,  qualify:2600, parS:3500, kind:'combined', tip:'펜싱·수영·승마·사격·달리기 다섯 종목' },
  /* 수영 계영 — 앞 주자가 **벽을 찍는 순간**이 출발 신호다. 먼저 뛰면 실격. */
  { id:'swimRelay4x100', name:'계영 4×100m', short:'4×100F', unit:'s', higher:false,
    qualify:220.0, parS:205.0, distanceM:400, kind:'swim', stroke:'free' , tip:'네 명이 이어 헤엄친다 · ▲ 인계는 벽을 찍기 직전에(먼저 뛰면 실격)' , legs:4, legEvent:'swimFree100'},
];
/* tip = 종목 선택 화면에서 미리 보여 주는 조작 한 줄.
   ⚠ 46종목이 각기 다른 조작인데, 시작한 뒤 잠깐 뜨는 한 줄이 설명의 전부였다 —
      처음 하는 사람은 펜싱·카누를 고르면 무엇을 눌러야 할지 모른 채 시작한다. */
const EVENT_BY_ID = {}; for(const e of EVENTS) EVENT_BY_ID[e.id]=e;
