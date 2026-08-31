/* ══════════════════════════════════════════════════════════════════
   계약 — 선수는 **영원히 우리 것이 아니다** (FM 12기둥 ①, CK 지시 2026-08-31)

   ⚠ 왜 필요한가 (실사표로 확인한 것)
     주급도 사기도 나이도 은퇴도 있는데 **계약이 없었다.** 한 번 들어온 선수는
     은퇴할 때까지 우리 것이다. 그러면 감독이 할 일이 '키우기' 하나로 줄고,
     20시즌 곡선에서 본 것처럼 **자금이 2400 까지 쌓이는데 쓸 곳이 없다.**
     FM 의 주간 긴장 절반은 계약에서 온다 — 재계약·자유이적·몸값.

   ⛔ 규칙 다섯
     ① **잃을 수 있어야 한다.** 안 챙기면 좋은 선수가 공짜로 나간다. 그게 이 층의 전부다.
     ② **미리 알려 준다.** 마지막 해에 들어서면 화면이 말한다 — 모르고 잃으면 사고다.
     ③ **요구는 실력을 따라간다.** 잘 크는 선수는 비싸진다. 사기가 낮으면 더 비싸진다.
     ④ **거절도 결과다.** 안 잡으면 그 자리에 신인이 들어온다(정원은 유지된다).
     ⑤ **기존 값만 쓴다** — overall·potOverall·나이·사기·자금. 새 물리를 안 만든다.

   ⚠ 주급(wageOf)은 이미 매주 나간다. 계약은 그 위에 **기간과 재계약 비용**을 얹는다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const CONTRACT = {
  /* 재계약에 드는 일시금 = 새 주급 × 이 배수 (FM 의 계약금에 해당) */
  SIGN_WEEKS: 6,
  MIN_YEARS: 1,
  MAX_YEARS: 4,

  ensure(a, rng){
    if(!a) return a;
    if(!a.contract || typeof a.contract !== 'object'){
      const r = rng ? rng() : Math.random();
      a.contract = {
        years: 2 + ((r * 3) | 0),                 // 2~4년
        wage: (typeof wageOf === 'function') ? wageOf(a) : 1,
      };
    }
    return a;
  },
  ensureAll(club, rng){
    if(!club || !club.squad) return;
    for(const a of club.squad) this.ensure(a, rng);
  },

  yearsLeft(a){ return (a && a.contract) ? (a.contract.years | 0) : 0; },
  isFinalYear(a){ return this.yearsLeft(a) <= 1; },

  /* ── 재계약 요구 ────────────────────────────────────────
     ⚠ '지금 주급' 이 아니라 **지금 실력에 맞는 주급**에서 출발한다 —
        안 그러면 크게 자란 선수를 옛날 값으로 붙잡을 수 있다(그러면 육성이 공짜다). */
  demand(a){
    this.ensure(a);
    const base = (typeof wageOf === 'function') ? wageOf(a) : (a.overall * 0.2);
    /* 잠재치가 높으면 본인도 안다 */
    const potK = 1 + clamp(((a.potOverall || a.overall) - a.overall) / 100, 0, 0.35);
    /* 사기가 낮으면 더 부른다(혹은 안 남는다) */
    const morK = 1 + clamp((60 - (a.morale ?? 60)) / 100, -0.12, 0.30);
    /* 전성기를 지난 선수는 싸진다 */
    const ageK = a.age >= 30 ? 0.82 : a.age >= 27 ? 0.93 : 1;
    const wage = +(base * potK * morK * ageK).toFixed(1);
    const years = a.age >= 30 ? 1 : a.age >= 27 ? 2 : 3;
    return { wage, years, fee: Math.round(wage * this.SIGN_WEEKS) };
  },

  /* 이 선수가 우리 제안을 받아들일까 — 사기가 바닥이면 돈으로도 안 된다 */
  willStay(a, offerWage){
    const d = this.demand(a);
    /* ⛔ **관계(4H_clublife)가 돈을 대신한다.** 나를 따르는 선수는 조금 깎아도 남고,
       등을 돌린 선수는 제값을 줘도 안 남는다. 그게 사건을 쌓는 이유다 —
       사건이 계약에서 값을 하지 않으면 그건 그냥 팝업이다. */
    const rel = (typeof CLUBLIFE !== 'undefined') ? CLUBLIFE.rel(a) : 0;
    const need = d.wage * (0.92 - clamp(rel, -100, 100) / 100 * 0.18);   // 관계 100 → 0.74배도 수락
    if(offerWage < need) return false;
    if(rel <= -55) return false;                       // 등을 돌렸으면 돈으로 안 된다
    /* 사기가 바닥이면 관계가 좋아도 위태롭다 */
    if((a.morale ?? 60) < 20 && rel < 40) return false;
    return true;
  },

  renew(club, a, opt){
    this.ensure(a);
    const d = this.demand(a);
    const fee = (opt && opt.fee !== undefined) ? opt.fee : d.fee;
    if((club.budget || 0) < fee) return { ok:false, msg:'자금이 부족합니다' };
    if(!this.willStay(a, d.wage))  return { ok:false, msg:'선수가 재계약을 거절했습니다' };
    club.budget = +(club.budget - fee).toFixed(1);
    a.contract.years = clamp(d.years, this.MIN_YEARS, this.MAX_YEARS);
    a.contract.wage  = d.wage;
    a.morale = clamp((a.morale ?? 60) + 12, 0, 100);
    return { ok:true, msg:'재계약', years:a.contract.years, wage:d.wage, fee };
  },

  /* ── 시즌 종료 ──────────────────────────────────────────
     년수를 하나 깎고, 0 이 된 선수는 **떠난다**(자유이적).
     ⛔ 은퇴 처리 뒤·신인 보충 **앞**에 부른다 — 그래야 빈자리가 그 해에 채워진다. */
  tickSeason(club){
    this.ensureAll(club);
    const left = [];
    for(const a of club.squad.slice()){
      a.contract.years = (a.contract.years | 0) - 1;
      if(a.contract.years <= 0){
        left.push({ name:a.name, age:a.age, overall:a.overall });
        club.squad.splice(club.squad.indexOf(a), 1);
      }
    }
    return left;
  },

  /* 이번 시즌 안에 만료되는 선수 — 화면이 이걸로 경고한다 */
  expiring(club){
    if(!club || !club.squad) return [];
    this.ensureAll(club);
    return club.squad.filter(a => this.isFinalYear(a))
                     .sort((x, y) => y.overall - x.overall);
  },
};

/* ── 계약 화면 ─────────────────────────────────────────────
   ⚠ 새 조작을 안 배우게 한다 — 평소 목록(Screen0)과 같은 규칙이다. */
class ContractScreen extends Screen0 {
  constructor(mg){ super(mg); CONTRACT.ensureAll(mg.club); }
  get hdBg(){ return 'bg-office'; } get hdBgDim(){ return 0.82; }
  get list(){
    return this.mg.club.squad.slice().sort((x, y) => {
      const a = CONTRACT.yearsLeft(x), b = CONTRACT.yearsLeft(y);
      if(a !== b) return a - b;                 // 곧 끝나는 사람부터
      return y.overall - x.overall;
    });
  }
  get rows(){
    const C = this.mg.club;
    return this.list.map(a => {
      const yl = CONTRACT.yearsLeft(a), d = CONTRACT.demand(a);
      const fin = yl <= 1;
      const can = C.budget >= d.fee;
      return { label:`${a.speciesName} ${a.name}`,
        sub:`${K('요구')} ${d.wage}/${K('주')} · ${K('계약금')} ${d.fee} · ${d.years}${K('년')}`
            + (typeof CLUBLIFE!=='undefined'
                ? `  ·  ${K('관계')} ${K(CLUBLIFE.relLabel(CLUBLIFE.rel(a)))}` : ''),
        right:`${yl}${K('년')}`,
        rightColor: fin ? PAL.red : yl <= 2 ? PAL.gold : PAL.dim,
        color: fin ? (can ? PAL.white : PAL.dim) : PAL.white,
        _a:a, _d:d };
    });
  }
  confirm(){
    const r = this.rows[this.sel]; if(!r) return;
    const res = CONTRACT.renew(this.mg.club, r._a);
    if(!res.ok){ this.mg.toast(res.msg); Sfx.fail(); return; }
    this.mg.toast(`${r._a.name} — ${res.years}${K('년')} · ${res.wage}/${K('주')}`);
    Sfx.record();
    if(this.mg.save) this.mg.save();
  }
  draw(u){
    const C = this.mg.club;
    const exp = CONTRACT.expiring(C).length;
    UI.header(u, K('계약'), `${K('자금')} ${Math.round(C.budget)}`);
    txt(u, exp ? `${K('올해 끝나는 계약')} ${exp}` : K('올해 끝나는 계약 없음'),
        8, 27, 9, exp ? PAL.red : PAL.dim);
    UI.list(u, this.rows, this.sel, 8, 40, VW - 16, 24, 7);
    UI.footer(u, '확인 재계약   취소 돌아가기');
  }
}
