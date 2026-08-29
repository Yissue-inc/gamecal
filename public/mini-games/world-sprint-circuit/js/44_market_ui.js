/* ══════════════════════════════════════════════════════════════════
   스카우트 · 영입 · 이적 화면
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const MONEY = (v)=> (v>=0?'':'-') + Math.abs(Math.round(v));

/* ── 사무소 (허브) ────────────────────────────────────────── */
class MarketScreen extends Screen0 {
  get M(){ return this.mg.season.market; }
  get rows(){
    const M=this.M;
    return [
      { label:'스카우트 파견', icon:'ic-scout', sub:`파견 중 ${M.scouts.length} / ${MarketTune.scoutSlots}` +
          (M.scouts.length?` — ${M.scouts.map(s=>`${s.name}(${s.weeksLeft}주)`).join(', ')}`:''), right:'▶' },
      { label:'영입 후보', icon:'ic-market', sub: M.prospects.length? `${M.prospects.length}명 대기 중` : '스카우트를 보내야 후보가 생깁니다',
        right:String(M.prospects.length), rightColor:M.prospects.length?PAL.green:PAL.dim },
      { label:'이적 제안', icon:'ic-offer', sub: M.offers.length? `우리 선수에게 들어온 제안 ${M.offers.length}건` : '받은 제안 없음',
        right:String(M.offers.length), rightColor:M.offers.length?PAL.gold:PAL.dim },
      { label:'선수 방출', icon:'ic-release', sub:'선수단을 정리한다 (몸값의 25%만 회수)', right:'▶' },
    ];
  }
  confirm(){
    const M=this.M;
    if(this.sel===0) this.mg.push(new ScoutScreen(this.mg));
    else if(this.sel===1){
      if(!M.prospects.length){ this.mg.toast('아직 후보가 없습니다 — 스카우트를 보내세요'); Sfx.fail(); return; }
      this.mg.push(new ProspectScreen(this.mg));
    }
    else if(this.sel===2){
      if(!M.offers.length){ this.mg.toast('들어온 제안이 없습니다'); Sfx.fail(); return; }
      this.mg.push(new OfferScreen(this.mg));
    }
    else this.mg.push(new ReleaseScreen(this.mg));
  }
  draw(u){
    const C=this.mg.club, M=this.M;
    UI.header(u, '선수 사무소', `${C.year}년차 · ${this.mg.season.week}주`);
    // 재정 요약
    const wages = C.squad.reduce((s,a)=>s+wageOf(a),0);
    const income = MarketTune.weeklySponsor + C.reputation*MarketTune.repBonus;
    plate(u, 8, 28, VW-16, 28, .78);
    const cells=[
      ['자금', MONEY(C.budget), C.budget<20?PAL.red:PAL.gold],
      ['주간 수입', '+'+income.toFixed(1), PAL.green],
      ['주급 지출', '-'+wages.toFixed(1), PAL.red],
      ['수지', (income-wages>=0?'+':'')+(income-wages).toFixed(1), income-wages>=0?PAL.green:PAL.red],
      ['명성', C.reputation.toFixed(2), PAL.blue],
    ];
    cells.forEach((c,i)=>{
      const cx=14+i*Math.floor((VW-28)/cells.length);
      txt(u,c[0],cx,32,8,PAL.dim); txt(u,c[1],cx,42,12,c[2],'left',700);
    });
    UI.list(u, this.rows, this.sel, 8, 62, VW-16, 26, 4);
    txt(u,'수지가 마이너스면 자금이 계속 줄어듭니다. 선수단이 클수록 주급이 큽니다.',
        8, VH-30, 9, PAL.dim);
    UI.footer(u,'▲▼ 이동   확인 선택   취소 돌아가기');
  }
}

/* ── 스카우트 파견 ───────────────────────────────────────── */
class ScoutScreen extends Screen0 {
  get M(){ return this.mg.season.market; }
  get rows(){
    return this.M.regions().map(r=>({
      label:r.name, sub:`${r.weeks}주 소요 · ${r.young?'어린 선수 위주 (잠재력 편차 큼)':'즉시 전력 위주'}`,
      right:`${r.cost}`, rightColor: this.mg.club.budget>=r.cost?PAL.gold:PAL.red,
      right2: r.id==='world'?'최고 등급 가능':'' }));
  }
  confirm(){
    const r=this.M.regions()[this.sel];
    const err=this.M.sendScout(r.id);
    if(err){ this.mg.toast(err); Sfx.fail(); return; }
    Sfx.ui(); this.mg.toast(`${r.name}으로 스카우트를 보냈습니다 (${r.weeks}주)`);
    this.mg.pop();
  }
  draw(u){
    const M=this.M;
    UI.header(u,'스카우트 파견',`자금 ${MONEY(this.mg.club.budget)}`);
    txt(u,`동시에 ${MarketTune.scoutSlots}명까지 · 지금 ${M.scouts.length}명 파견 중`,8,27,9,PAL.dim);
    UI.list(u,this.rows,this.sel,8,42,VW-16,26,4);
    txt(u,'멀리 보낼수록 좋은 선수를 찾지만 오래 걸리고 비쌉니다.',8,VH-30,9,PAL.dim);
    UI.footer(u,'확인 파견   취소 돌아가기');
  }
}

/* ── 영입 후보 ───────────────────────────────────────────── */
class ProspectScreen extends Screen0 {
  get M(){ return this.mg.season.market; }
  get rows(){
    return this.M.prospects.map(p=>{
      const a=p.athlete;
      return { label:`${UI.rareStars(a)} ${a.speciesName} ${a.name} (${a.age})`, nation:a.nation,
        color: UI.rareColor(a),
        sub:`${SPECIES[a.species]?SPECIES[a.species].best.map(id=>EVENT_BY_ID[id].short).join('·'):''} · ${fogOverall(a,p.level)} · ${GROWTH[a.growth].name}`,
        right:`${p.ask}`, rightColor: this.mg.club.budget>=p.ask?PAL.gold:PAL.red,
        right2:`정보 ${'●'.repeat(p.level)}${'○'.repeat(3-p.level)} · ${p.weeksLeft}주 남음` };
    });
  }
  confirm(){ this.mg.push(new ProspectDetail(this.mg, this.M.prospects[this.sel])); }
  draw(u){
    UI.header(u,'영입 후보',`자금 ${MONEY(this.mg.club.budget)} · 선수단 ${this.mg.club.squad.length}/${MarketTune.squadMax}`);
    txt(u,'정보 ●●● 가 채워질수록 실제 능력에 가깝습니다. 기다릴수록 드러나지만 뺏길 수도 있습니다.',8,27,9,PAL.dim);
    UI.list(u,this.rows,this.sel,8,42,VW-16,26,6);
    UI.footer(u,'확인 자세히   취소 돌아가기');
  }
}
class ProspectDetail extends Screen0 {
  constructor(mg,p){ super(mg); this.p=p; }
  get rows(){ return [{label:'영입한다'},{label:'보류'}]; }
  confirm(){
    if(this.sel===1){ this.mg.pop(); return; }
    const err=this.mg.season.market.sign(this.p);
    if(err){ this.mg.toast(err); Sfx.fail(); return; }
    Sfx.record(); this.mg.toast(`${this.p.athlete.name} 영입 완료`);
    this.mg.pop();
  }
  draw(u){
    const p=this.p, a=p.athlete;
    UI.header(u, `${a.speciesName} ${a.name}`, `${a.age}세 · ${GROWTH[a.growth].name}`);
    txt(u, UI.rareStars(a)+' '+UI.rareName(a), VW-8, 5, 9, UI.rareColor(a), 'right', 700);
    txt(u, fogOverall(a,p.level), 8, 28, 15, PAL.gold,'left',700);
    const SP2=SPECIES[a.species];
    if(SP2) txt(u, '주 종목 '+SP2.best.map(id=>EVENT_BY_ID[id].short).join(' · '), 8, 46, 9, PAL.green);
    txt(u, {sprint:'단거리',hurdles:'허들',jump:'도약',throw:'투척'}[a.spec], VW-8, 28, 11, PAL.blue,'right');
    txt(u, `이적료 ${p.ask}   주급 ${wageOf(a).toFixed(1)}`, 8, 57, 11,
        this.mg.club.budget>=p.ask?PAL.white:PAL.red);
    txt(u, `정보 ${'●'.repeat(p.level)}${'○'.repeat(3-p.level)}`, VW-8, 46, 10, PAL.dim,'right');

    let y=72;
    for(const k of STAT_KEYS){
      txt(u, STAT_NAME[k], 8, y, 9, PAL.dim);
      txt(u, fogStat(a.stats[k], p.level), 60, y, 10, PAL.white);
      txt(u, '잠재 '+fogStat(a.potential[k], p.level-1), 120, y, 9, PAL.blue);
      y+=13;
    }
    txt(u,'특성',210,62,8,PAL.dim);
    if(p.level<2) txt(u,'더 지켜봐야 합니다',210,72,9,PAL.dim);
    else if(!a.traits.length) txt(u,'없음',210,72,9,PAL.dim);
    else a.traits.forEach((t,i)=>{
      txt(u,TRAITS[t].name,210,72+i*20,10, ['glass','nervous'].includes(t)?PAL.red:PAL.green,'left',700);
      txt(u,TRAITS[t].desc,210,83+i*20,8,PAL.dim);
    });
    UI.list(u,this.rows,this.sel,8,VH-52,120,16,2);
    UI.footer(u,'확인 선택   취소 돌아가기');
  }
}

/* ── 이적 제안 ───────────────────────────────────────────── */
class OfferScreen extends Screen0 {
  get M(){ return this.mg.season.market; }
  get rows(){
    return this.M.offers.map(o=>{
      const a=this.mg.club.byId(o.athleteId);
      if(!a) return { label:'(선수 없음)', dim:true };
      return { label:`${a.name} — ${o.from}`,
        sub:`OVR ${a.overall} / 잠재 ${a.potOverall} · 몸값 ${valueOf(a)}`,
        right:`${o.price}`, rightColor: o.price>valueOf(a)?PAL.green:PAL.gold,
        right2:`${o.weeksLeft}주 남음` };
    });
  }
  confirm(){
    const o=this.M.offers[this.sel];
    const a=this.mg.club.byId(o.athleteId);
    this.mg.push(new OfferDetail(this.mg, o, a));
  }
  draw(u){
    UI.header(u,'이적 제안',`자금 ${MONEY(this.mg.club.budget)}`);
    txt(u,'주축을 팔면 자금이 생기지만 남은 선수들의 사기가 떨어집니다.',8,27,9,PAL.dim);
    UI.list(u,this.rows,this.sel,8,42,VW-16,26,6);
    UI.footer(u,'확인 자세히   취소 돌아가기');
  }
}
class OfferDetail extends Screen0 {
  constructor(mg,o,a){ super(mg); this.o=o; this.a=a; }
  get rows(){ return [{label:'수락한다 — 보낸다', color:PAL.gold},{label:'거절한다'}]; }
  confirm(){
    if(this.sel===1){ this.mg.season.market.offers.splice(this.mg.season.market.offers.indexOf(this.o),1);
      Sfx.ui(); this.mg.toast('제안을 거절했습니다'); this.mg.pop(); return; }
    const err=this.mg.season.market.acceptOffer(this.o);
    if(err){ this.mg.toast(err); Sfx.fail(); return; }
    Sfx.ui(); this.mg.toast(`${this.a.name} 이적 — ${this.o.price} 수령`);
    this.mg.pop();
  }
  draw(u){
    const a=this.a, o=this.o;
    UI.header(u, a?a.name:'-', o.from);
    if(!a){ UI.footer(u,'취소'); return; }
    txt(u,`제안액 ${o.price}`,VW/2,32,22,PAL.gold,'center',700);
    const v=valueOf(a);
    txt(u, o.price>=v*1.25?'몸값보다 후한 제안입니다' : o.price>=v*0.95?'적정한 제안입니다':'몸값보다 낮습니다',
        VW/2, 60, 11, o.price>=v*1.25?PAL.green:o.price>=v*0.95?PAL.white:PAL.red, 'center');
    txt(u,`평가 몸값 ${v}   ·   주급 ${wageOf(a).toFixed(1)}`,VW/2,76,10,PAL.dim,'center');
    txt(u,`OVR ${a.overall} / 잠재 ${a.potOverall} · ${a.age}세 · ${GROWTH[a.growth].name}`,VW/2,92,11,PAL.white,'center');
    txt(u,'보내면 남은 선수 전원 사기 -6',VW/2,110,9,PAL.red,'center');
    UI.list(u,this.rows,this.sel,8,VH-52,160,16,2);
    UI.footer(u,'확인 선택   취소 돌아가기');
  }
}

/* ── 방출 ────────────────────────────────────────────────── */
class ReleaseScreen extends Screen0 {
  get rows(){
    return this.mg.club.squad.map(a=>({
      label:a.name+` (${a.age})`, nation:a.nation,
      sub:`OVR ${a.overall} / 잠재 ${a.potOverall} · 주급 ${wageOf(a).toFixed(1)}`,
      right:`+${Math.round(valueOf(a)*0.25)}`, rightColor:PAL.dim,
      color: a.injury?PAL.red:PAL.white }));
  }
  confirm(){
    const a=this.mg.club.squad[this.sel];
    const err=this.mg.season.market.release(a);
    if(err){ this.mg.toast(err); Sfx.fail(); return; }
    Sfx.ui(); this.mg.toast(`${a.name} 방출`);
    if(this.sel>=this.mg.club.squad.length) this.sel=Math.max(0,this.mg.club.squad.length-1);
  }
  draw(u){
    UI.header(u,'선수 방출',`선수단 ${this.mg.club.squad.length} (최소 ${MarketTune.squadMin})`);
    txt(u,'방출하면 주급이 줄지만 몸값의 25%만 회수됩니다. 되돌릴 수 없습니다.',8,27,9,PAL.red);
    UI.list(u,this.rows,this.sel,8,42,VW-16,26,6);
    UI.footer(u,'확인 방출   취소 돌아가기');
  }
}
