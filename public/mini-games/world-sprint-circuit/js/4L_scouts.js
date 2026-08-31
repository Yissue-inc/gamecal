/* ══════════════════════════════════════════════════════════════════
   스카우트 — 파견이 아니라 **사람** (FM 12기둥 ⑦, CK 지시 2026-08-31)

   ⚠ 왜 필요한가
     지금은 '지역에 돈을 넣으면 몇 주 뒤 후보가 나온다' 다. 그건 자판기지 스태프가 아니다.
     FM 의 스카우트는 **누구를 고용했느냐**가 결과를 바꾼다 — 담당 지역, 보는 눈,
     그리고 그 사람의 주급.

   ⛔ 규칙 넷
     ① **기존 파견 시스템을 안 갈아엎는다.** 파견은 그대로고, 누가 가느냐만 생긴다.
        고용한 스카우트가 없으면 예전과 **완전히 같다**(임시 인력으로 간다).
     ② **눈이 정보를 연다.** 좋은 스카우트는 후보를 **level 2~3** 으로 데려온다 —
        기존 안개(fogStat)를 그대로 쓴다. 새 물리가 아니다.
     ③ **전문 지역이 있다.** 자기 지역이면 더 잘 보고 더 좋은 후보를 찾는다.
     ④ **주급을 받는다.** 코치와 같은 줄에서 인건비를 먹는다 — 공짜 이득이 없어야 한다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const SCOUT = {
  /* 고용할 수 있는 사람들 — 시즌마다 명단이 조금씩 바뀐다 */
  POOL: [
    { id:'sc_kim',   name:'김 실장',   region:'local', eye:0.72, wage:5,  desc:'국내를 오래 봤다' },
    { id:'sc_tan',   name:'탄 선생',   region:'asia',  eye:0.66, wage:7,  desc:'아시아 학교를 다 안다' },
    { id:'sc_duval', name:'뒤발',      region:'world', eye:0.80, wage:12, desc:'세계 어디든 간다' },
    { id:'sc_park',  name:'박 코치',   region:'youth', eye:0.75, wage:8,  desc:'어린 선수를 알아본다' },
    { id:'sc_novak', name:'노박',      region:'world', eye:0.58, wage:6,  desc:'싸고 발이 넓다' },
    { id:'sc_han',   name:'한 선배',   region:'local', eye:0.88, wage:14, desc:'눈이 아주 밝다' },
  ],
  MAX: 2,                    // 동시에 데리고 있을 수 있는 인원

  ensure(club){
    if(!club) return;
    if(!Array.isArray(club.scoutStaff)) club.scoutStaff = [];
  },
  byId(id){ return this.POOL.find(s => s.id === id) || null; },
  hired(club){
    this.ensure(club);
    return club.scoutStaff.map(id => this.byId(id)).filter(Boolean);
  },
  has(club, id){ this.ensure(club); return club.scoutStaff.indexOf(id) >= 0; },

  wageBill(club){
    return this.hired(club).reduce((s, x) => s + x.wage, 0);
  },

  hire(club, id){
    this.ensure(club);
    const s = this.byId(id); if(!s) return '없는 스카우트입니다';
    if(this.has(club, id)) return '이미 함께 일하고 있습니다';
    if(club.scoutStaff.length >= this.MAX) return `스카우트는 ${this.MAX}명까지입니다`;
    const fee = s.wage * 4;                                  // 계약금 = 4주치(코치와 같은 규칙)
    if((club.budget || 0) < fee) return `자금이 부족합니다 (필요 ${fee})`;
    club.budget = +(club.budget - fee).toFixed(1);
    club.scoutStaff.push(id);
    return null;
  },
  fire(club, id){
    this.ensure(club);
    const i = club.scoutStaff.indexOf(id);
    if(i < 0) return '함께 일하고 있지 않습니다';
    club.scoutStaff.splice(i, 1);
    return null;
  },

  /* ── 파견에 붙는 값 ────────────────────────────────────────
     ⛔ 고용한 사람이 없으면 **전부 기본값**이라 예전과 같다.
     반환: { eye, tierLift, name } */
  forRegion(club, regionId){
    const list = this.hired(club);
    if(!list.length) return { eye:0, tierLift:0, name:null };
    /* 그 지역 전문가가 있으면 그 사람, 없으면 눈이 제일 밝은 사람이 대신 간다 */
    const own = list.filter(s => s.region === regionId).sort((a, b) => b.eye - a.eye)[0];
    const s = own || list.slice().sort((a, b) => b.eye - a.eye)[0];
    const fit = own ? 1 : 0.55;                              // 남의 지역은 절반만 값을 한다
    return { eye: s.eye * fit, tierLift: (own ? 0.10 : 0.04) * s.eye, name: s.name };
  },

  /* 후보가 처음 보이는 정보 단계 — 눈이 밝으면 2~3 으로 데려온다 */
  startLevel(eye, rng){
    if(eye <= 0) return 1;
    const r = rng ? rng() : Math.random();
    if(eye >= 0.78 && r < eye - 0.30) return 3;
    if(r < eye) return 2;
    return 1;
  },
};

/* ── 스카우트 고용 화면 ────────────────────────────────────── */
class ScoutStaffScreen extends Screen0 {
  constructor(mg){ super(mg); SCOUT.ensure(mg.club); }
  get hdBg(){ return 'bg-office'; } get hdBgDim(){ return 0.82; }
  get rows(){
    const C = this.mg.club;
    const REG = { local:'국내', asia:'아시아', world:'세계', youth:'유소년' };
    return SCOUT.POOL.map(s => {
      const on = SCOUT.has(C, s.id);
      return { label:(on ? '● ' : '○ ') + K(s.name), _id:s.id,
        sub:`${K(REG[s.region] || s.region)} · ${K('보는 눈')} ${Math.round(s.eye*100)} · ${K(s.desc)}`,
        right: on ? K('해고') : `${s.wage*4}`,
        rightColor: on ? PAL.red : (C.budget >= s.wage*4 ? PAL.gold : PAL.dim),
        color: on ? PAL.green : PAL.white };
    });
  }
  confirm(){
    const r = this.rows[this.sel]; if(!r) return;
    const C = this.mg.club;
    const err = SCOUT.has(C, r._id) ? SCOUT.fire(C, r._id) : SCOUT.hire(C, r._id);
    if(err){ this.mg.toast(err); Sfx.fail(); return; }
    Sfx.ui(); if(this.mg.save) this.mg.save();
  }
  draw(u){
    const C = this.mg.club;
    UI.header(u, K('스카우트'), `${K('자금')} ${Math.round(C.budget)}`);
    txt(u, `${SCOUT.hired(C).length} / ${SCOUT.MAX} · ${K('주급 합')} ${SCOUT.wageBill(C)}`,
        8, 27, 9, PAL.dim);
    UI.list(u, this.rows, this.sel, 8, 40, VW - 16, 24, 6);
    UI.footer(u, '확인 고용/해고   취소 돌아가기');
  }
}
