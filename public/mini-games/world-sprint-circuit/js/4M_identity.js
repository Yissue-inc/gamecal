/* ══════════════════════════════════════════════════════════════════
   클럽 정체성 — **우리 클럽도 특기를 갖는다** (2단계 종목별 특화, CK 로드맵 2026-08-31)

   ⚠ 왜 필요한가 (코드에서 확인한 비대칭)
     `RIVAL_CLUBS` 는 여섯 팀 전부 `spec` 이 있다 — 검은표범은 단거리, 조류 수영단은 수영.
     그런데 **우리 클럽에는 그게 없다.** 감독은 48종목을 전부 똑같이 다루고,
     수영단을 맡든 투척부를 맡든 화면도 훈련 메뉴도 완전히 같다.
     그래서 판마다 다른 이야기가 안 나온다 — 클럽에 얼굴이 없다.

   ⛔ 규칙 넷
     ① **없어도 예전과 같다.** 특기를 안 고르면 모든 배수가 1.0 이다(옛 세이브 포함).
     ② **승점을 직접 주지 않는다.** 특기가 경기 결과를 곧바로 밀면 그건 난이도 조절이지
        정체성이 아니다. 특기는 **훈련·영입·시설**에만 붙는다 — 결과는 그 뒤에 따라온다.
     ③ **대가가 있다.** 특기 갈래가 빨리 크는 대신 **다른 갈래는 느리다.**
        만능 클럽이 최적이면 고를 이유가 없다.
     ④ **바꿀 수 있다.** 단, 시즌 중에는 못 바꾼다(오프시즌에만) — 매주 갈아타면 선택이 아니다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const IDENT = {
  /* 갈래는 SPEC_OF_KIND(32_season) 의 값과 같아야 한다 — 표를 두 벌 두면 한쪽만 고치게 된다 */
  SPECS: [
    { id:'sprint',  name:'단거리부',  desc:'100m·200m·계주 — 폭발력',
      stats:['speed','acceleration'], icon:'icon-track' },
    { id:'hurdles', name:'허들·기술부', desc:'허들·펜싱·탁구·승마 — 반응과 리듬',
      stats:['rhythm','technique'],   icon:'ic-rhythm' },
    { id:'endure',  name:'중장거리부', desc:'중장거리·경보·사이클·조정 — 버티기',
      stats:['stamina','rhythm'],     icon:'ic-stamina' },
    { id:'jump',    name:'도약부',    desc:'도약·체조·다이빙·등반 — 몸을 다루는 힘',
      stats:['acceleration','technique'], icon:'icon-field' },
    { id:'throw',   name:'투척·정밀부', desc:'투척·역도·사격·양궁·유도 — 힘과 정밀',
      stats:['power','technique'],    icon:'ic-power' },
    { id:'swim',    name:'수영부',    desc:'자유형·배영·평영·접영·계영 — 물',
      stats:['stamina','technique'],  icon:'icon-swim' },
  ],
  /* 특기 갈래의 훈련이 얼마나 빠른가 / 나머지는 얼마나 느린가
     ⛔ 처음엔 +22% / −10% 였다. 실측 3시즌: 특기를 고르면 **전체 평균이 오히려 떨어졌다**
        (53.6 → 47.3). 10명 중 2명만 이득이고 8명이 손해라서다.
        시작 선수단이 3-1-2-2-1-1 로 흩어져 있으니 어떤 갈래를 골라도 소수만 맞는다.
        → 손해를 줄이고(−6%), 대신 **모아 오는 힘**을 키운다(신인·유망주 편향).
        갈래는 '지금 이득' 이 아니라 **'몇 시즌에 걸쳐 팀을 그쪽으로 만든다'** 여야 한다. */
  IN_BONUS:  0.22,
  OUT_MALUS: 0.06,

  ensure(club){
    if(!club) return;
    if(club.spec === undefined) club.spec = null;      // null = 예전과 같다
  },
  byId(id){ return this.SPECS.find(s => s.id === id) || null; },
  of(club){ this.ensure(club); return club ? club.spec : null; },
  name(club){ const s = this.byId(this.of(club)); return s ? s.name : '종합'; },

  /* 시즌 중에는 못 바꾼다 — 매주 갈아탈 수 있으면 선택이 아니다 */
  canSet(season){ return !season || season.week <= 1 || season.week > SEASON_WEEKS; },
  set(club, season, id){
    this.ensure(club);
    if(!this.canSet(season)) return '시즌 중에는 바꿀 수 없습니다';
    if(id && !this.byId(id)) return '없는 갈래입니다';
    club.spec = id || null;
    return null;
  },

  /* ── 훈련 배수 ────────────────────────────────────────────
     ⛔ **처음엔 '선수의 갈래(a.spec)가 클럽 갈래와 맞으면' 이었다. 틀린 설계였다.**
        실측 8시즌: 단거리부인데 단거리 선수가 1명이었다 — 은퇴가 10시즌 뒤에야
        시작해서 신인이 안 들어오고, 그래서 선수단 구성이 영영 안 바뀐다.
        즉 갈래가 **15시즌쯤 되어야 값을 하는** 장식이었다.
     → **능력치**를 바꾼다. 수영부는 지구력·기술을, 투척부는 파워·기술을 더 키운다.
        열 명 전부에게 지금 당장 걸리고, 그게 '종목별 특화' 의 실제 뜻이기도 하다.
        (실제로 수영단과 투척부는 다른 걸 훈련한다 — 선수를 갈아 끼우는 게 아니라)
     ⚠ 상한을 막지 않는다. 단거리부도 파워를 키울 수 있다, 다만 느리다. */
  statMul(club, statKey){
    const s = this.byId(this.of(club));
    if(!s) return 1;
    return s.stats.indexOf(statKey) >= 0 ? (1 + this.IN_BONUS) : (1 - this.OUT_MALUS);
  },

  /* ── 갈래 전용 훈련 ────────────────────────────────────────
     ⛔ 갈래를 넣고도 **훈련 메뉴는 여섯 갈래가 전부 같았다**(기본 5종).
        그러면 '수영부' 는 배수만 다른 같은 클럽이다 — 감독이 하는 일이 안 바뀐다.
        갈래마다 그 종목에서 실제로 하는 훈련을 두 개씩 준다.
     ⚠ 기본 5종은 그대로 남는다 — 갈래를 골라도 예전 메뉴를 계속 쓸 수 있다.
     ⚠ 무게(w)는 기존 PROGRAMS 와 같은 자에서 만든다(합이 비슷해야 부하가 뜻을 갖는다). */
  EXTRA: {
    sprint: {
      spr_block: { name:'스타트 블록', desc:'출발 반응과 초반 가속',
        w:{speed:1.6,acceleration:2.6,stamina:.3,technique:.9,rhythm:1.0,power:1.0}, load:1.22 },
      spr_flyin: { name:'플라잉 30m', desc:'최고 속도 구간만 되풀이',
        w:{speed:2.6,acceleration:1.2,stamina:.5,technique:.7,rhythm:1.2,power:.8}, load:1.18 },
    },
    hurdles: {
      hur_rhythm:{ name:'허들 간격', desc:'세 걸음 리듬을 몸에 넣는다',
        w:{speed:1.0,acceleration:1.0,stamina:.7,technique:1.6,rhythm:2.4,power:.6}, load:0.95 },
      hur_react: { name:'반응 훈련', desc:'신호에 즉시 — 펜싱·탁구에도 듣는다',
        w:{speed:1.2,acceleration:1.6,stamina:.5,technique:1.4,rhythm:1.8,power:.6}, load:1.05 },
    },
    endure: {
      end_long:  { name:'장거리 지구주', desc:'천천히 오래 — 피로가 적다',
        w:{speed:.4,acceleration:.4,stamina:2.8,technique:.6,rhythm:1.4,power:.4}, load:0.78 },
      /* ⛔ 처음엔 stamina 2.2 였다 — 정규화 뒤 기본 '지구력'(2.2)과 같은데 부하만 1.25 라
         **그냥 진다**(실측). 부하가 높은 프로그램은 목표를 확실히 더 줘야 존재 이유가 생긴다. */
      end_interval:{ name:'인터벌', desc:'지구력에 막판 스피드를 붙인다',
        w:{speed:2.2,acceleration:1.2,stamina:2.8,technique:.4,rhythm:.8,power:.5}, load:1.08 },
    },
    jump: {
      jmp_plyo:  { name:'플라이오메트릭', desc:'튀어 오르는 힘',
        w:{speed:1.0,acceleration:2.2,stamina:.5,technique:1.4,rhythm:1.0,power:1.6}, load:1.28 },
      jmp_form:  { name:'공중 자세', desc:'몸을 다루는 법 — 체조·다이빙에도 듣는다',
        w:{speed:.6,acceleration:1.2,stamina:.7,technique:2.6,rhythm:1.4,power:.8}, load:0.85 },
    },
    throw: {
      thr_lift:  { name:'웨이트', desc:'순수한 힘. 피로가 크다',
        w:{speed:.6,acceleration:.8,stamina:.6,technique:.8,rhythm:.5,power:3.0}, load:1.35 },
      thr_aim:   { name:'정밀 훈련', desc:'같은 동작을 흔들림 없이 — 사격·양궁',
        w:{speed:.4,acceleration:.6,stamina:.9,technique:2.6,rhythm:1.6,power:1.0}, load:0.80 },
    },
    swim: {
      swm_stroke:{ name:'스트로크', desc:'물을 잡는 법',
        w:{speed:.8,acceleration:.8,stamina:1.6,technique:2.6,rhythm:1.4,power:.8}, load:0.92 },
      /* ⛔ 같은 이유로 stamina 를 올렸다 — 실측에서 기본 '지구력'(72.7)에 71.0 으로 졌다 */
      swm_set:   { name:'세트 훈련', desc:'거리를 나눠 되풀이 — 버티는 힘',
        w:{speed:.6,acceleration:.5,stamina:3.4,technique:1.3,rhythm:.9,power:.5}, load:1.10 },
    },
  },

  /* 기본 5종 + 우리 갈래 전용 2종 */
  programKeys(club){
    const base = Object.keys(PROGRAMS).filter(k => !k.includes('_'));
    const sp = this.of(club);
    if(!sp || !this.EXTRA[sp]) return base;
    return base.concat(Object.keys(this.EXTRA[sp]));
  },
  /* 갈래 전용인가 — 화면이 표시로 갈라 준다 */
  isExtra(key){ return String(key).includes('_'); },

  /* 신인·유망주가 우리 갈래로 올 확률 — 특기부는 그 갈래 선수를 더 잘 모은다 */
  rookieSpec(club, rng, fallback){
    const sp = this.of(club);
    if(!sp) return fallback;
    return ((rng ? rng() : Math.random()) < 0.75) ? sp : fallback;
  },

  /* 화면 한 줄 */
  line(club){
    const s = this.byId(this.of(club));
    if(!s) return '아직 안 정했습니다 — 모든 갈래가 같습니다';
    return `${s.desc}  ·  ${K('그 갈래')} +${Math.round(this.IN_BONUS*100)}% · ${K('나머지')} −${Math.round(this.OUT_MALUS*100)}%`;
  },
};

/* ── 클럽 갈래 화면 ──────────────────────────────────────── */
class IdentityScreen extends Screen0 {
  constructor(mg){ super(mg); IDENT.ensure(mg.club); }
  get hdBg(){ return 'bg-office'; } get hdBgDim(){ return 0.82; }
  get rows(){
    const C = this.mg.club, cur = IDENT.of(C);
    const count = id => C.squad.filter(a => a.spec === id).length;
    return IDENT.SPECS.map(s => ({
      label:(cur === s.id ? '● ' : '○ ') + K(s.name), _id:s.id, icon:s.icon,
      sub:`${K(s.desc)}  ·  ${K('우리 선수')} ${count(s.id)}`,
      right: cur === s.id ? '◎' : '▶',
      rightColor: cur === s.id ? PAL.gold : PAL.dim,
      color: cur === s.id ? PAL.gold : PAL.white,
    })).concat([{ label:'종합 (특기 없음)', _id:null,
      sub:'모든 갈래가 같습니다 — 예전과 같은 클럽',
      right: cur ? '▶' : '◎', rightColor: cur ? PAL.dim : PAL.gold }]);
  }
  confirm(){
    const r = this.rows[this.sel]; if(!r) return;
    const err = IDENT.set(this.mg.club, this.mg.season, r._id);
    if(err){ this.mg.toast(err); Sfx.fail(); return; }
    this.mg.toast(`${IDENT.name(this.mg.club)}`);
    Sfx.record();
    if(this.mg.save) this.mg.save();
  }
  draw(u){
    const C = this.mg.club;
    UI.header(u, K('클럽 갈래'), IDENT.name(C));
    txt(u, K(IDENT.line(C)), 8, 27, 9,
        IDENT.of(C) ? PAL.gold : PAL.dim);
    if(!IDENT.canSet(this.mg.season))
      txt(u, K('시즌 중에는 바꿀 수 없습니다'), VW-8, 27, 9, PAL.red, 'right');
    UI.list(u, this.rows, this.sel, 8, 40, VW - 16, 24, 7);
    UI.footer(u, '확인 정한다   취소 돌아가기');
  }
}

/* ⛔ 갈래 전용 프로그램을 **PROGRAMS 에 합친다.** 그래야 `trainWeek(a, program, …)` 이
   예전 그대로 `PROGRAMS[program]` 만 보면 된다 — 훈련 코드를 한 줄도 안 고친다.
   ⚠ 키에 밑줄(_)이 있는 것이 갈래 전용이다(programKeys/isExtra 가 그걸로 가른다).

   ⛔ **무게 합을 기본 5종에 맞춰 정규화한다.** 안 하면 전용 프로그램이 그냥 더 좋다 —
      내가 손으로 적은 표는 합이 7.0~8.0 이었는데 기본은 5.9~6.4 였다.
      그러면 갈래를 고른 클럽은 기본 5종을 영영 안 쓰고, 그건 선택이 아니라 상위 호환이다
      (실측: thr_aim 이 technical 과 같은 부하에 더 높은 무게 — 공짜 이득).
      **모양은 내가 정하고, 크기는 코드가 맞춘다.** 그래야 표를 늘려도 안 새어 나간다. */
const PROGRAM_WEIGHT_SUM = 6.2;      // 기본 5종의 중앙값
if(typeof PROGRAMS !== 'undefined'){
  for(const sp in IDENT.EXTRA){
    for(const key in IDENT.EXTRA[sp]){
      const P = IDENT.EXTRA[sp][key];
      const sum = Object.values(P.w).reduce((a, b) => a + b, 0);
      if(sum > 0){
        const k = PROGRAM_WEIGHT_SUM / sum;
        for(const st in P.w) P.w[st] = +(P.w[st] * k).toFixed(3);
      }
      PROGRAMS[key] = P;
    }
  }
}
