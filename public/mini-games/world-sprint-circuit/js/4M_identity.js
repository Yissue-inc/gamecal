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
