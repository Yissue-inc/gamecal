/* ══════════════════════════════════════════════════════════════════
   동물 50종 — 종목마다 특기가 다르다.
   ⚠ 설계 원칙: **못하는 건 없다. 더 잘하는 게 있을 뿐이다.**
      bias 는 성장 '속도'를 바꾼다. 상한을 막지 않는다.
      치타도 던지기를 배울 수 있다 — 다만 코끼리보다 오래 걸린다.

   rare 는 희귀도(1 흔함 ~ 5 전설). 스카우트에서 나올 확률과 잠재치 상한에 쓴다.
   ⚠ 희귀도가 높다고 모든 종목을 잘하는 게 아니다. **더 뾰족하다.**
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* bias 1.0 = 표준. 최저 0.75 — 그 아래로 내려가면 '못하는 종'이 된다. */
const SPECIES = {
  /* ── 단거리 12종 (speed·acceleration) ───────────────────── */
  cheetah  :{name:'치타',tag:'단거리',spec:'sprint',rare:5,color:'#e8b04b',note:'순간 속도는 따라올 종이 없다',
             bias:{speed:1.75,acceleration:1.45,stamina:0.78,technique:0.95,rhythm:1.05,power:0.85},best:['sprint100']},
  hound    :{name:'그레이하운드',tag:'단거리',spec:'sprint',rare:3,color:'#c9c2b6',note:'리듬이 흔들리지 않는다',
             bias:{speed:1.50,acceleration:1.35,stamina:1.00,technique:1.05,rhythm:1.25,power:0.80},best:['sprint100']},
  rabbit   :{name:'토끼',tag:'단거리',spec:'sprint',rare:1,color:'#e8dcd0',note:'출발이 폭발적이다',
             bias:{speed:1.30,acceleration:1.60,stamina:0.85,technique:1.00,rhythm:1.10,power:0.90},best:['sprint100']},
  ostrich  :{name:'타조',tag:'단거리',spec:'sprint',rare:3,color:'#8a7a6a',note:'속도와 지구력을 함께 갖췄다',
             bias:{speed:1.45,acceleration:1.15,stamina:1.35,technique:0.90,rhythm:1.10,power:0.90},best:['sprint400']},
  pronghorn:{name:'가지뿔영양',tag:'단거리',spec:'sprint',rare:4,color:'#c0a070',note:'오래 빠르게 달린다',
             bias:{speed:1.55,acceleration:1.20,stamina:1.40,technique:0.95,rhythm:1.05,power:0.80},best:['sprint400']},
  hare     :{name:'산토끼',tag:'단거리',spec:'sprint',rare:2,color:'#b09878',note:'지그재그로 치고 나간다',
             bias:{speed:1.40,acceleration:1.50,stamina:0.95,technique:1.05,rhythm:1.00,power:0.85},best:['sprint200']},
  jackal   :{name:'자칼',tag:'단거리',spec:'sprint',rare:2,color:'#a08860',note:'끈질기게 따라붙는다',
             bias:{speed:1.35,acceleration:1.25,stamina:1.25,technique:1.05,rhythm:1.10,power:0.85},best:['sprint200']},
  roadrunner:{name:'로드러너',tag:'단거리',spec:'sprint',rare:3,color:'#7a9a6a',note:'발이 땅에 안 닿는 것 같다',
             bias:{speed:1.50,acceleration:1.40,stamina:1.00,technique:1.00,rhythm:1.15,power:0.75},best:['sprint200']},
  horse    :{name:'말',tag:'단거리',spec:'sprint',rare:4,color:'#8a6448',note:'보폭이 압도적이다',
             bias:{speed:1.60,acceleration:1.20,stamina:1.20,technique:0.90,rhythm:1.00,power:1.05},best:['sprint400']},
  greyfox  :{name:'여우',tag:'단거리',spec:'sprint',rare:2,color:'#c87a4a',note:'영리하게 페이스를 나눈다',
             bias:{speed:1.30,acceleration:1.30,stamina:1.10,technique:1.20,rhythm:1.15,power:0.80},best:['sprint200']},
  gazelle  :{name:'가젤',tag:'단거리',spec:'sprint',rare:3,color:'#d8b888',note:'가볍고 우아하다',
             bias:{speed:1.45,acceleration:1.35,stamina:1.10,technique:1.10,rhythm:1.10,power:0.78},best:['sprint100']},
  swift    :{name:'칼새',tag:'단거리',spec:'sprint',rare:4,color:'#6a7a8a',note:'멈추는 법을 모른다',
             bias:{speed:1.65,acceleration:1.30,stamina:1.15,technique:0.95,rhythm:1.20,power:0.75},best:['sprint100']},

  /* ── 허들 8종 (technique·rhythm) ─────────────────────────── */
  impala   :{name:'임팔라',tag:'허들',spec:'hurdles',rare:3,color:'#c98b5a',note:'장애물 감각이 타고났다',
             bias:{speed:1.35,acceleration:1.15,stamina:1.10,technique:1.40,rhythm:1.30,power:0.85},best:['hurdles110']},
  kangaroo :{name:'캥거루',tag:'허들',spec:'hurdles',rare:3,color:'#b07a4a',note:'뛰어넘는 데 특화됐다',
             bias:{speed:1.15,acceleration:1.35,stamina:0.95,technique:1.40,rhythm:1.15,power:1.10},best:['hurdles110']},
  frog     :{name:'개구리',tag:'허들',spec:'hurdles',rare:1,color:'#5cb06a',note:'짧은 도약이 정확하다',
             bias:{speed:0.95,acceleration:1.45,stamina:0.90,technique:1.45,rhythm:1.20,power:1.05},best:['hurdles110']},
  springbok:{name:'스프링복',tag:'허들',spec:'hurdles',rare:3,color:'#d0a878',note:'튀어오르듯 넘는다',
             bias:{speed:1.30,acceleration:1.30,stamina:1.05,technique:1.40,rhythm:1.25,power:0.90},best:['hurdles110']},
  lynx     :{name:'스라소니',tag:'허들',spec:'hurdles',rare:4,color:'#b0a090',note:'착지가 소리 없다',
             bias:{speed:1.25,acceleration:1.30,stamina:1.00,technique:1.50,rhythm:1.25,power:0.95},best:['hurdles110']},
  deer     :{name:'사슴',tag:'허들',spec:'hurdles',rare:2,color:'#a87850',note:'겁이 많지만 잘 넘는다',
             bias:{speed:1.25,acceleration:1.20,stamina:1.15,technique:1.35,rhythm:1.25,power:0.88},best:['hurdles110']},
  serval   :{name:'서벌',tag:'허들',spec:'hurdles',rare:4,color:'#e0c088',note:'다리가 길어 허들이 낮다',
             bias:{speed:1.35,acceleration:1.25,stamina:1.00,technique:1.45,rhythm:1.20,power:0.90},best:['hurdles110']},
  wallaby  :{name:'왈라비',tag:'허들',spec:'hurdles',rare:2,color:'#9a7858',note:'작지만 리듬이 좋다',
             bias:{speed:1.15,acceleration:1.35,stamina:1.05,technique:1.35,rhythm:1.35,power:0.95},best:['hurdles110']},

  /* ── 중거리 8종 (stamina·rhythm) ⚠ 15종 판에 없던 구멍 ──── */
  wolf     :{name:'늑대',tag:'중거리',spec:'endure',rare:3,color:'#7a7a86',note:'하루 종일 달릴 수 있다',
             bias:{speed:1.10,acceleration:1.00,stamina:1.70,technique:1.10,rhythm:1.30,power:0.90},best:['run800']},
  husky    :{name:'허스키',tag:'중거리',spec:'endure',rare:2,color:'#b8c0c8',note:'지치는 걸 즐긴다',
             bias:{speed:1.05,acceleration:1.00,stamina:1.75,technique:1.05,rhythm:1.30,power:0.92},best:['run1500']},
  camel    :{name:'낙타',tag:'중거리',spec:'endure',rare:3,color:'#c8a878',note:'바닥나지 않는다',
             bias:{speed:0.95,acceleration:0.90,stamina:1.90,technique:1.05,rhythm:1.25,power:1.00},best:['run1500']},
  caribou  :{name:'순록',tag:'중거리',spec:'endure',rare:3,color:'#9a8878',note:'먼 길을 아는 다리',
             bias:{speed:1.10,acceleration:0.95,stamina:1.75,technique:1.10,rhythm:1.25,power:0.95},best:['run1500']},
  antelope :{name:'영양',tag:'중거리',spec:'endure',rare:2,color:'#c0a880',note:'꾸준하다',
             bias:{speed:1.20,acceleration:1.05,stamina:1.55,technique:1.10,rhythm:1.25,power:0.85},best:['run800']},
  hyena    :{name:'하이에나',tag:'중거리',spec:'endure',rare:2,color:'#a09078',note:'끝까지 물고 늘어진다',
             bias:{speed:1.10,acceleration:1.05,stamina:1.60,technique:1.10,rhythm:1.20,power:1.00},best:['run800']},
  albatross:{name:'알바트로스',tag:'중거리',spec:'endure',rare:5,color:'#e0e4ea',note:'멈추지 않는 법을 안다',
             bias:{speed:1.15,acceleration:0.95,stamina:1.95,technique:1.15,rhythm:1.30,power:0.85},best:['run1500']},
  ant      :{name:'개미',tag:'중거리',spec:'endure',rare:4,color:'#7a4a3a',note:'체구 대비 지구력이 비상식적이다',
             bias:{speed:0.95,acceleration:1.10,stamina:1.85,technique:1.20,rhythm:1.25,power:1.10},best:['run800']},

  /* ── 도약 11종 (technique·acceleration·power) ────────────── */
  squirrel :{name:'다람쥐',tag:'도약',spec:'jump',rare:1,color:'#a8703c',note:'몸놀림이 가볍다',
             bias:{speed:1.20,acceleration:1.55,stamina:0.85,technique:1.45,rhythm:1.15,power:0.85},best:['longJump']},
  flea     :{name:'벼룩',tag:'도약',spec:'jump',rare:4,color:'#6a5a4a',note:'체구 대비 폭발력이 비상식적이다',
             bias:{speed:0.90,acceleration:1.70,stamina:0.80,technique:1.40,rhythm:1.05,power:1.20},best:['highJump']},
  goat     :{name:'산양',tag:'도약',spec:'jump',rare:2,color:'#d8d2c4',note:'높이 뛰는 데 두려움이 없다',
             bias:{speed:0.95,acceleration:1.35,stamina:1.05,technique:1.60,rhythm:1.00,power:1.00},best:['highJump']},
  grasshopper:{name:'메뚜기',tag:'도약',spec:'jump',rare:2,color:'#8ab04a',note:'한 번에 멀리 간다',
             bias:{speed:1.00,acceleration:1.60,stamina:0.85,technique:1.35,rhythm:1.05,power:1.15},best:['longJump']},
  ibex     :{name:'아이벡스',tag:'도약',spec:'jump',rare:4,color:'#b0a488',note:'절벽에서도 뛴다',
             bias:{speed:1.00,acceleration:1.35,stamina:1.10,technique:1.65,rhythm:1.00,power:1.00},best:['highJump']},
  jerboa   :{name:'저비',tag:'도약',spec:'jump',rare:3,color:'#d8c090',note:'작고 튀어오른다',
             bias:{speed:1.10,acceleration:1.65,stamina:0.85,technique:1.40,rhythm:1.05,power:0.95},best:['longJump']},
  monkey   :{name:'원숭이',tag:'도약',spec:'jump',rare:1,color:'#9a7a5a',note:'공중에서 자세를 잡는다',
             bias:{speed:1.10,acceleration:1.40,stamina:1.00,technique:1.50,rhythm:1.15,power:0.95},best:['tripleJump']},
  lemur    :{name:'여우원숭이',tag:'도약',spec:'jump',rare:2,color:'#c8c0b0',note:'세 번 연속으로 뛴다',
             bias:{speed:1.10,acceleration:1.45,stamina:1.00,technique:1.50,rhythm:1.20,power:0.90},best:['tripleJump']},
  puma     :{name:'퓨마',tag:'도약',spec:'jump',rare:4,color:'#b89878',note:'도약 거리가 비현실적이다',
             bias:{speed:1.30,acceleration:1.45,stamina:1.00,technique:1.45,rhythm:1.05,power:1.05},best:['longJump']},
  cricket  :{name:'귀뚜라미',tag:'도약',spec:'jump',rare:1,color:'#7a6a4a',note:'가볍게 튄다',
             bias:{speed:0.95,acceleration:1.55,stamina:0.90,technique:1.40,rhythm:1.15,power:1.00},best:['tripleJump']},
  dolphin  :{name:'돌고래',tag:'도약',spec:'jump',rare:5,color:'#7ab0d0',note:'물 밖에서도 솟구친다',
             bias:{speed:1.25,acceleration:1.40,stamina:1.20,technique:1.60,rhythm:1.20,power:1.05},best:['highJump']},

  /* ── 투척 11종 (power·technique) ─────────────────────────── */
  elephant :{name:'코끼리',tag:'투척',spec:'throw',rare:4,color:'#b49ad6',note:'던지는 힘이 압도적이다',
             bias:{speed:0.80,acceleration:0.85,stamina:1.25,technique:1.15,rhythm:0.90,power:1.85},best:['hammer']},
  gorilla  :{name:'고릴라',tag:'투척',spec:'throw',rare:3,color:'#5a5a66',note:'회전력이 좋다',
             bias:{speed:0.85,acceleration:1.00,stamina:1.10,technique:1.30,rhythm:0.95,power:1.75},best:['hammer']},
  hippo    :{name:'하마',tag:'투척',spec:'throw',rare:3,color:'#9a7a8a',note:'무게로 던진다',
             bias:{speed:0.78,acceleration:0.85,stamina:1.25,technique:1.20,rhythm:0.85,power:1.90},best:['shotPut']},
  bear     :{name:'곰',tag:'투척',spec:'throw',rare:3,color:'#7a5a3c',note:'지치지 않는다',
             bias:{speed:0.90,acceleration:0.95,stamina:1.40,technique:1.10,rhythm:0.90,power:1.70},best:['shotPut']},
  octopus  :{name:'문어',tag:'투척',spec:'throw',rare:5,color:'#d06a7a',note:'팔이 많아 자세가 정교하다',
             bias:{speed:0.85,acceleration:1.05,stamina:1.00,technique:1.85,rhythm:1.10,power:1.35},best:['javelin']},
  rhino    :{name:'코뿔소',tag:'투척',spec:'throw',rare:4,color:'#8a8a90',note:'밀어내는 힘이 무섭다',
             bias:{speed:0.85,acceleration:0.95,stamina:1.20,technique:1.10,rhythm:0.88,power:1.90},best:['shotPut']},
  bison    :{name:'들소',tag:'투척',spec:'throw',rare:3,color:'#6a5648',note:'어깨가 산 같다',
             bias:{speed:0.88,acceleration:0.95,stamina:1.35,technique:1.10,rhythm:0.90,power:1.80},best:['discus']},
  crab     :{name:'게',tag:'투척',spec:'throw',rare:2,color:'#e06a4a',note:'집게가 회전을 만든다',
             bias:{speed:0.82,acceleration:1.00,stamina:1.10,technique:1.55,rhythm:1.00,power:1.55},best:['discus']},
  eagle    :{name:'독수리',tag:'투척',spec:'throw',rare:4,color:'#8a7060',note:'멀리 보고 던진다',
             bias:{speed:1.00,acceleration:1.05,stamina:1.10,technique:1.70,rhythm:1.05,power:1.40},best:['javelin']},
  mantis   :{name:'사마귀',tag:'투척',spec:'throw',rare:3,color:'#7ab05a',note:'팔이 채찍처럼 뻗는다',
             bias:{speed:0.90,acceleration:1.15,stamina:0.95,technique:1.75,rhythm:1.10,power:1.40},best:['javelin']},
  walrus   :{name:'바다코끼리',tag:'투척',spec:'throw',rare:2,color:'#a08878',note:'상체만으로 던진다',
             bias:{speed:0.78,acceleration:0.85,stamina:1.25,technique:1.20,rhythm:0.88,power:1.80},best:['discus']},
};
const SPECIES_KEYS = Object.keys(SPECIES);

/* 희귀도 — 스카우트에서 나올 가중치와 잠재치 보정 */
const RARITY = {
  1:{ name:'흔함',   weight:34, potBonus:0,  color:'#8a8a96' },
  2:{ name:'우수',   weight:26, potBonus:3,  color:'#5cff9c' },
  3:{ name:'정예',   weight:22, potBonus:6,  color:'#5aaaff' },
  4:{ name:'영웅',   weight:13, potBonus:10, color:'#b06bff' },
  5:{ name:'전설',   weight:5,  potBonus:15, color:'#ffd75e' },
};
function rarityOf(a){ return (SPECIES[a.species] && SPECIES[a.species].rare) || 1; }

/* 종별 성장 배율 */
function speciesBias(a, stat){
  const s = SPECIES[a.species];
  if(!s) return 1;
  return s.bias[stat] ?? 1;
}
function speciesFavors(a, eventId){
  const s = SPECIES[a.species];
  return !!(s && s.best.includes(eventId));
}
function speciesName(a){ return SPECIES[a.species]?.name || '?'; }

/* 희귀도 가중 추첨 — 스카우트 지역이 좋을수록 상위 등급이 잘 나온다 */
function pickSpecies(rng, opt){
  opt = opt||{};
  const pool = opt.spec ? SPECIES_KEYS.filter(k=>SPECIES[k].spec===opt.spec) : SPECIES_KEYS;
  const lift = opt.rareLift || 0;                  // 0~1, 높을수록 희귀종이 잘 나온다
  let total=0; const w=[];
  for(const k of pool){
    const r = SPECIES[k].rare;
    const weight = RARITY[r].weight * (1 + lift*(r-1)*0.55);
    w.push(weight); total += weight;
  }
  let x = rng()*total;
  for(let i=0;i<pool.length;i++){ x -= w[i]; if(x<=0) return pool[i]; }
  return pool[pool.length-1];
}
