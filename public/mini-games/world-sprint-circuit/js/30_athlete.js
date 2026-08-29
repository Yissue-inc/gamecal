/* ══════════════════════════════════════════════════════════════════
   선수 — 감독 모드의 중심.
   플레이어는 이 값들을 '직접' 못 바꾼다. 훈련을 지시하고 결과를 본다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 재현 가능한 난수 — 같은 시드면 같은 경기가 나와야 리플레이·검증이 된다 */
function makeRng(seed){
  /* ⚠ 시드를 그대로 쓰면 안 된다. xorshift 는 작은 시드에서 **첫 출력들이 계속 작게** 나온다.
     실측: makeRng(100+i*31) 로 12번 돌렸더니 부정출발(확률 1.5%)이 5번(42%) 났다.
     시드를 먼저 섞고(splitmix 계열) 몇 번 버려서 예열한다. */
  let x = (seed>>>0) || 0x9e3779b9;
  x ^= 0x9e3779b9; x = Math.imul(x ^ (x>>>16), 0x21f0aaad) >>> 0;
  x = Math.imul(x ^ (x>>>15), 0x735a2d97) >>> 0;
  let s = (x ^ (x>>>15)) >>> 0 || 1;
  const step = ()=>{ s ^= s<<13; s>>>=0; s ^= s>>>17; s ^= s<<5; s>>>=0; return s/4294967296; };
  for(let i=0;i<12;i++) step();          // 예열
  return step;
}
/* 정규분포(박스-뮐러) — 실력의 흔들림은 균등분포가 아니다 */
function gauss(rng){
  let u=0,v=0; while(u===0) u=rng(); while(v===0) v=rng();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

const STAT_KEYS = ['speed','acceleration','stamina','technique','rhythm','power'];
const STAT_NAME = { speed:'스피드', acceleration:'가속', stamina:'지구력',
                    technique:'기술', rhythm:'리듬', power:'파워' };

/* 성장형 — 언제 크는가. FM 의 potential, 우마의 성장보정에 해당 */
const GROWTH = {
  early : { name:'조숙',   peak:21, curve:1.35 },
  normal: { name:'표준',   peak:25, curve:1.00 },
  late  : { name:'대기만성', peak:28, curve:0.78 },
};
/* 특성 — 같은 스탯이어도 경기에서 다르게 움직인다 */
const TRAITS = {
  starter   : { name:'출발 특화', desc:'반응이 빠르다',            eff:{ reaction:-0.30 } },
  closer    : { name:'뒷심',      desc:'후반에 안 죽는다',          eff:{ lateFade:-0.45 } },
  metronome : { name:'메트로놈',  desc:'리듬이 흔들리지 않는다',    eff:{ sigma:-0.22 } },
  glass     : { name:'유리몸',    desc:'부상 위험이 높다',          eff:{ injury:+0.9 } },
  ironman   : { name:'강골',      desc:'잘 지치지 않는다',          eff:{ fatigue:-0.35, injury:-0.4 } },
  bigGame   : { name:'승부사',    desc:'큰 경기에서 강하다',        eff:{ bigGame:+0.35 } },
  nervous   : { name:'새가슴',    desc:'큰 경기에서 약하다',        eff:{ bigGame:-0.35 } },
  hurdler   : { name:'허들 감각', desc:'허들을 잘 넘는다',          eff:{ hurdle:+0.5 } },
  springy   : { name:'용수철',    desc:'도약이 좋다',              eff:{ jump:+0.4 } },
  cannon    : { name:'대포팔',    desc:'던지기가 강하다',          eff:{ throw:+0.45 } },
};

/* ⚠ 두 이름 체계를 섞지 말 것 — 예전엔 '최LUCA' 같은 이름이 나왔다 */
const NAME_KO = { last:['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권'],
                  first:['민준','서연','도윤','하은','시우','지아','예준','수아','주원','채원',
                         '지호','유나','건우','소율','태윤','하준','서아'] };
const NAME_EN = { last:['OKAFOR','ROSSI','HADDAD','MBEKI','SILVA','NOVAK','SHARMA','TANAKA','DUBOIS','REYES',
                        'ANDERSEN','COSTA','KELLY','NAKAMURA','OSEI'],
                  first:['JAMAL','LUCA','OMAR','NIA','KOFI','ELENA','RAVI','MAYA','TARO','SOFIA',
                         'ANDRE','LEILA','HUGO','AMARA','NOAH'] };

class Athlete {
  constructor(o){
    Object.assign(this, {
      id: o.id, name: o.name, age: o.age ?? 18,
      nation: o.nation || 'KOR',   // 소속 국가 — LA 2028 을 겨냥한 소속감
      national: false,             // 국가대표로 뽑혔나
      growth: o.growth || 'normal',
      traits: o.traits || [],
      stats: Object.assign({}, o.stats),
      potential: Object.assign({}, o.potential),   // 각 스탯의 상한
      /* 상태 — 매주 변한다 */
      condition: o.condition ?? 70,   // 0~100 컨디션(폼)
      fatigue: o.fatigue ?? 0,        // 0~100 피로. 높으면 훈련 효율↓·부상↑
      morale: o.morale ?? 60,         // 0~100 사기. 경기 결과·출전 기회로 변함
      injury: null,                   // {weeks, name} 또는 null
      /* 이력 */
      best: {}, history: [],
      trainingWeeks: 0,
      spec: o.spec || 'sprint',       // 주 종목군: sprint | hurdles | jump | throw
      species: o.species || 'cheetah',
    });
  }
  get overall(){
    // 주 종목군에 맞는 가중 평균 — 던지기 선수의 '전체'를 스피드로 재면 안 된다
    const W = {
      sprint : { speed:.30, acceleration:.22, stamina:.14, technique:.12, rhythm:.18, power:.04 },
      hurdles: { speed:.24, acceleration:.16, stamina:.14, technique:.24, rhythm:.18, power:.04 },
      jump   : { speed:.22, acceleration:.18, stamina:.06, technique:.24, rhythm:.10, power:.20 },
      throw  : { speed:.08, acceleration:.10, stamina:.06, technique:.26, rhythm:.10, power:.40 },
      endure : { speed:.14, acceleration:.08, stamina:.42, technique:.12, rhythm:.20, power:.04 },
    }[this.spec] || { speed:.2, acceleration:.15, stamina:.2, technique:.2, rhythm:.15, power:.1 };
    let s=0; for(const k of STAT_KEYS) s += this.stats[k]*W[k];
    return Math.round(s);
  }
  get potOverall(){
    const save=this.stats; this.stats=this.potential;
    const v=this.overall; this.stats=save; return v;
  }
  has(t){ return this.traits.includes(t); }
  /* ⚠ 특성과 **같은 통로**로 스킬(4E_skill)을 더한다. 이게 스킬이 경기에 닿는
     유일한 자리다 — 시뮬레이션은 이미 이 값을 읽고 있어 배선이 따로 없다.
     ⛔ 장착한 스킬이 없으면 SKILL.eff 는 0 이다 → 스킬 층이 없던 때와 완전히 같다.
        `tools/skill_neutral.js` 가 소수점까지 대조한다. */
  eff(key){
    let v=0;
    for(const t of this.traits) v += (TRAITS[t].eff[key]||0);
    if(typeof SKILL!=='undefined') v += SKILL.eff(this, key);
    return v;
  }
  get available(){ return !this.injury; }

  /* 나이에 따른 성장 여력 — 전성기를 지나면 마이너스가 된다 */
  ageFactor(){
    const g=GROWTH[this.growth];
    const d=this.age - g.peak;
    if(d <= 0) return 1 + Math.min(0.35, (-d)*0.045*g.curve);
    return Math.max(-0.55, 1 - d*0.28);
  }
  /* 컨디션 종합 — 경기력에 직접 곱해진다 */
  formScore(){
    return clamp(this.condition/100 * (1 - this.fatigue/220) * (0.85 + this.morale/100*0.25), 0.35, 1.12);
  }
  label(){
    const g=GROWTH[this.growth];
    return `${this.name} (${this.age}) ${this.overall}/${this.potOverall} ${g.name}`;
  }
  get speciesName(){ return (typeof SPECIES!=='undefined' && SPECIES[this.species]) ? SPECIES[this.species].name : ''; }
}

/* ── 선수 생성 ───────────────────────────────────────────── */
function rollAthlete(rng, opt){
  opt = opt||{};
  /* 종을 먼저 고른다 — 종이 주 종목군을 정한다.
     opt.spec 이 지정되면 그 종목군의 종 중에서 고른다. */
  let speciesKey = opt.species;
  if(!speciesKey){
    /* 희귀도 가중 추첨 — 좋은 스카우트일수록 상위 등급이 잘 나온다 */
    speciesKey = pickSpecies(rng, { spec:opt.spec, rareLift:opt.rareLift||0 });
  }
  const SP = SPECIES[speciesKey];
  const spec = SP ? SP.spec : (opt.spec || 'sprint');
  const age  = opt.age ?? (17 + ((rng()*5)|0));
  const growth = ['early','normal','normal','late'][(rng()*4)|0];
  const tier = opt.tier ?? (0.35 + rng()*0.5);       // 0~1 재능
  const pot = {}, st = {};
  const BIAS = {
    sprint : { speed:14, acceleration:10, rhythm:8,  power:-4, technique:-2, stamina:0 },
    hurdles: { technique:14, rhythm:10, speed:6,  stamina:2,  power:-6, acceleration:0 },
    jump   : { power:12, technique:10, acceleration:8, stamina:-10, speed:2, rhythm:-4 },
    throw  : { power:20, technique:12, speed:-12, acceleration:-8, stamina:-6, rhythm:-4 },
    endure : { stamina:22, rhythm:10, speed:-2, technique:2, acceleration:-8, power:-12 },
  }[spec] || {};
  for(const k of STAT_KEYS){
    /* 종 특성을 잠재치에 반영하되 **깎지 않고 얹는 방향**으로 쓴다.
       (bias 1.0 이 기준, 그 위로만 보너스를 준다 — '못하는 종'을 만들지 않는다) */
    const sp = SP ? Math.max(0, (SP.bias[k]||1) - 1) * 13 : 0;
    /* 희귀도 보정 — 전설종은 잠재치가 높다. 다만 bias 가 뾰족해서 '전부 잘하는' 건 아니다. */
    const rb = SP ? (RARITY[SP.rare]?.potBonus || 0) : 0;
    const base = 40 + tier*46 + (BIAS[k]||0) + sp + rb + gauss(rng)*7;
    pot[k] = clamp(Math.round(base + 6 + rng()*16), 30, 99);
    // 어릴수록 현재치가 잠재치에서 멀다
    const gap = clamp((26-age)/9, 0.12, 0.62) * (0.6 + rng()*0.6);
    st[k]  = clamp(Math.round(pot[k]*(1-gap)), 20, pot[k]);
  }
  const traits=[]; const pool=Object.keys(TRAITS);
  const n = rng()<0.18 ? 2 : (rng()<0.7 ? 1 : 0);
  while(traits.length<n){
    const t=pool[(rng()*pool.length)|0];
    if(!traits.includes(t)) traits.push(t);
  }
  /* ⚠ 예전엔 언어와 무관하게 50:50 이었다. 영어판에서 선수 절반이 한글 이름으로
     나와 화면이 섞였다(수집한 미번역 문자열 389개 중 80개가 그냥 사람 이름이었다).
     한국어판은 국제 대회 느낌으로 섞고, 영어판은 로마자 이름만 쓴다. */
  /* ── 국적 ────────────────────────────────────────────
     ⚠ 이름은 국적을 따라간다. 한국 국적인데 로마자 이름이면 소속감이 안 산다.
        opt.nation 을 주면 그 나라, 없으면 40개국에서 고른다. */
  const nation = opt.nation ||
    (typeof NATIONS!=='undefined' ? NATIONS[(rng()*NATIONS.length)|0].code : 'KOR');
  /* 이름은 국적을 따라간다 — 지역별 풀에서 뽑는다 */
  let name = null;
  if(nation!=='KOR' && typeof nationName2==='function') name = nationName2(nation, rng);
  if(!name){
    const P = (nation==='KOR') ? NAME_KO : NAME_EN;
    name = (P===NAME_KO)
      ? P.last[(rng()*P.last.length)|0] + P.first[(rng()*P.first.length)|0]
      : P.first[(rng()*P.first.length)|0] + ' ' + P.last[(rng()*P.last.length)|0];
  }
  return new Athlete({ id:'a'+Math.floor(rng()*1e9).toString(36), name, nation, age, growth, traits,
                       stats:st, potential:pot, spec, species:speciesKey,
                       condition: 55+Math.round(rng()*30), morale: 50+Math.round(rng()*25) });
}
