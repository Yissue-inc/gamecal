/* ══════════════════════════════════════════════════════════════════
   선수 — 감독 모드의 중심.
   플레이어는 이 값들을 '직접' 못 바꾼다. 훈련을 지시하고 결과를 본다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 재현 가능한 난수 — 같은 시드면 같은 경기가 나와야 리플레이·검증이 된다 */
function makeRng(seed){
  let s = (seed>>>0) || 1;
  return function(){ s ^= s<<13; s>>>=0; s ^= s>>17; s ^= s<<5; s>>>=0; return s/4294967296; };
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
    });
  }
  get overall(){
    // 주 종목군에 맞는 가중 평균 — 던지기 선수의 '전체'를 스피드로 재면 안 된다
    const W = {
      sprint : { speed:.30, acceleration:.22, stamina:.14, technique:.12, rhythm:.18, power:.04 },
      hurdles: { speed:.24, acceleration:.16, stamina:.14, technique:.24, rhythm:.18, power:.04 },
      jump   : { speed:.22, acceleration:.18, stamina:.06, technique:.24, rhythm:.10, power:.20 },
      throw  : { speed:.08, acceleration:.10, stamina:.06, technique:.26, rhythm:.10, power:.40 },
    }[this.spec];
    let s=0; for(const k of STAT_KEYS) s += this.stats[k]*W[k];
    return Math.round(s);
  }
  get potOverall(){
    const save=this.stats; this.stats=this.potential;
    const v=this.overall; this.stats=save; return v;
  }
  has(t){ return this.traits.includes(t); }
  eff(key){ let v=0; for(const t of this.traits) v += (TRAITS[t].eff[key]||0); return v; }
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
}

/* ── 선수 생성 ───────────────────────────────────────────── */
function rollAthlete(rng, opt){
  opt = opt||{};
  const spec = opt.spec || ['sprint','sprint','hurdles','jump','throw'][(rng()*5)|0];
  const age  = opt.age ?? (17 + ((rng()*5)|0));
  const growth = ['early','normal','normal','late'][(rng()*4)|0];
  const tier = opt.tier ?? (0.35 + rng()*0.5);       // 0~1 재능
  const pot = {}, st = {};
  const BIAS = {
    sprint : { speed:14, acceleration:10, rhythm:8,  power:-4, technique:-2, stamina:0 },
    hurdles: { technique:14, rhythm:10, speed:6,  stamina:2,  power:-6, acceleration:0 },
    jump   : { power:12, technique:10, acceleration:8, stamina:-10, speed:2, rhythm:-4 },
    throw  : { power:20, technique:12, speed:-12, acceleration:-8, stamina:-6, rhythm:-4 },
  }[spec];
  for(const k of STAT_KEYS){
    const base = 40 + tier*46 + (BIAS[k]||0) + gauss(rng)*7;
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
  const P = rng()<0.5 ? NAME_KO : NAME_EN;
  const sep = P===NAME_KO ? '' : ' ';
  const name = P===NAME_KO
    ? P.last[(rng()*P.last.length)|0] + P.first[(rng()*P.first.length)|0]
    : P.first[(rng()*P.first.length)|0] + sep + P.last[(rng()*P.last.length)|0];
  return new Athlete({ id:'a'+Math.floor(rng()*1e9).toString(36), name, age, growth, traits,
                       stats:st, potential:pot, spec,
                       condition: 55+Math.round(rng()*30), morale: 50+Math.round(rng()*25) });
}
