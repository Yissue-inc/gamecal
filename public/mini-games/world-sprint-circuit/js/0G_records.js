/* ══════════════════════════════════════════════════════════════════
   실제 세계기록 · 올림픽 기록 — **생성 파일. 손으로 고치지 말 것.**
   정본: docs/REAL_RECORDS_2026-09.md (출처 URL · 신뢰도 · 비공인 여부)
   생성: python3 tools/records_build.py   · 검사: --check (verify 가 부른다)

   값 [기록, 보유자, 연도, (1=비공인)] · m 남자 w 여자 · cmp=1 이면 게임 기록을 현실 척도로 옮길 수 있다
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const REAL_RECORDS = {
  sprint100: {"cmp":1,"wr":{"m":[9.58,"Usain Bolt",2009],"w":[10.49,"Florence Griffith Joyner",1988]},"or":{"m":[9.63,"Usain Bolt",2012],"w":[10.61,"Elaine Thompson-Herah",2020]}},
  sprint200: {"cmp":1,"wr":{"m":[19.19,"Usain Bolt",2009],"w":[21.34,"Florence Griffith Joyner",1988]},"or":{"m":[19.3,"Usain Bolt",2008],"w":[21.34,"Florence Griffith Joyner",1988]}},
  sprint400: {"cmp":1,"wr":{"m":[43.03,"Wayde van Niekerk",2016],"w":[47.6,"Marita Koch",1985]},"or":{"m":[43.03,"Wayde van Niekerk",2016],"w":[48.17,"Marileidy Paulino",2024]}},
  hurdles110: {"cmp":1,"wr":{"m":[12.75,"Ja'Kobe Tharp",2026],"w":[12.09,"Masai Russell",2026,1]},"or":{"m":[12.91,"Liu Xiang",2004],"w":[12.26,"Jasmine Camacho-Quinn",2020]}},
  hurdles400: {"cmp":1,"wr":{"m":[45.8,"Alison dos Santos",2026,1],"w":[50.37,"Sydney McLaughlin-Levrone",2024]},"or":{"m":[45.94,"Karsten Warholm",2020],"w":[50.37,"Sydney McLaughlin-Levrone",2024]}},
  steeple3000: {"cmp":1,"wr":{"m":[472.11,"Lamecha Girma",2023],"w":[524.32,"Beatrice Chepkoech",2018]},"or":{"m":[483.28,"Conseslus Kipruto",2016],"w":[532.76,"Winfred Yavi",2024]}},
  run800: {"cmp":1,"wr":{"m":[100.91,"David Rudisha",2012],"w":[113.28,"Jarmila Kratochvilova",1983]},"or":{"m":[100.91,"David Rudisha",2012],"w":[113.43,"Nadezhda Olizarenko",1980]}},
  run1500: {"cmp":1,"wr":{"m":[206.0,"Hicham El Guerrouj",1998],"w":[228.68,"Faith Kipyegon",2025]},"or":{"m":[207.65,"Cole Hocker",2024],"w":[231.29,"Faith Kipyegon",2024]}},
  run5000: {"cmp":1,"wr":{"m":[755.36,"Joshua Cheptegei",2020],"w":[838.06,"Beatrice Chebet",2025]},"or":{"m":[777.82,"Kenenisa Bekele",2008],"w":[866.17,"Vivian Cheruiyot",2016]}},
  walk20k: {"cmp":1,"wr":{"m":[4570,"Toshikazu Yamanishi",2025],"w":[5029,"Yang Jiayu",2021]},"or":{"m":[4726,"Chen Ding",2012],"w":[5116,"Qieyang Shijie",2012]}},
  marathon: {"cmp":1,"wr":{"m":[7170,"Sabastian Sawe",2026],"w":[7796,"Ruth Chepng'etich",2024]},"or":{"m":[7586,"Tamirat Tola",2024],"w":[8575,"Sifan Hassan",2024]}},
  relay4x100: {"cmp":1,"wr":{"m":[36.84,"Jamaica",2012],"w":[40.82,"USA",2012]},"or":{"m":[36.84,"Jamaica",2012],"w":[40.82,"USA",2012]}},
  relay4x400: {"cmp":1,"wr":{"m":[174.29,"USA",1993],"w":[195.17,"Soviet Union",1988]},"or":{"m":[174.43,"USA",2024],"w":[195.17,"Soviet Union",1988]}},
  longJump: {"cmp":1,"wr":{"m":[8.95,"Mike Powell",1991],"w":[7.52,"Galina Chistyakova",1988]},"or":{"m":[8.9,"Bob Beamon",1968],"w":[7.4,"Jackie Joyner-Kersee",1988]}},
  tripleJump: {"cmp":1,"wr":{"m":[18.29,"Jonathan Edwards",1995],"w":[15.74,"Yulimar Rojas",2022]},"or":{"m":[18.09,"Kenny Harrison",1996],"w":[15.67,"Yulimar Rojas",2020]}},
  highJump: {"cmp":1,"wr":{"m":[2.45,"Javier Sotomayor",1993],"w":[2.1,"Yaroslava Mahuchikh",2024]},"or":{"m":[2.39,"Charles Austin",1996],"w":[2.06,"Yelena Slesarenko",2004]}},
  poleVault: {"cmp":1,"wr":{"m":[6.31,"Armand Duplantis",2026],"w":[5.06,"Yelena Isinbayeva",2009]},"or":{"m":[6.25,"Armand Duplantis",2024],"w":[5.05,"Yelena Isinbayeva",2008]}},
  shotPut: {"cmp":1,"wr":{"m":[23.56,"Ryan Crouser",2023],"w":[22.63,"Natalya Lisovskaya",1987]},"or":{"m":[23.3,"Ryan Crouser",2020],"w":[22.41,"Ilona Slupianek",1980]}},
  discus: {"cmp":1,"wr":{"m":[75.56,"Mykolas Alekna",2025],"w":[76.8,"Gabriele Reinsch",1988]},"or":{"m":[70.0,"Roje Stona",2024],"w":[72.3,"Martina Hellmann",1988]}},
  javelin: {"cmp":1,"wr":{"m":[98.48,"Jan Zelezny",1996],"w":[72.28,"Barbora Spotakova",2008]},"or":{"m":[92.97,"Arshad Nadeem",2024],"w":[71.53,"Osleidys Menendez",2004]}},
  hammer: {"cmp":1,"wr":{"m":[86.74,"Yuriy Sedykh",1986],"w":[82.98,"Anita Wlodarczyk",2016]},"or":{"m":[84.8,"Sergey Litvinov",1988],"w":[82.29,"Anita Wlodarczyk",2016]}},
  swimFree100: {"cmp":1,"wr":{"m":[46.4,"Pan Zhanle",2024],"w":[51.68,"Marrit Steenbergen",2026]},"or":{"m":[46.4,"Pan Zhanle",2024],"w":[51.96,"Emma McKeon",2020]}},
  swimBack100: {"cmp":1,"wr":{"m":[51.6,"Thomas Ceccon",2022],"w":[57.13,"Regan Smith",2024]},"or":{"m":[51.85,"Ryan Murphy",2016],"w":[57.28,"Regan Smith",2024]}},
  swimBreast100: {"cmp":1,"wr":{"m":[56.88,"Adam Peaty",2019],"w":[64.13,"Lilly King",2017]},"or":{"m":[57.13,"Adam Peaty",2016],"w":[64.82,"Tatjana Schoenmaker",2020]}},
  swimFly100: {"cmp":1,"wr":{"m":[49.45,"Caeleb Dressel",2021],"w":[54.33,"Gretchen Walsh",2026]},"or":{"m":[49.45,"Caeleb Dressel",2020],"w":[55.38,"Gretchen Walsh",2024]}},
  swimMedley200: {"cmp":1,"wr":{"m":[112.69,"Leon Marchand",2025],"w":[125.7,"Summer McIntosh",2025]},"or":{"m":[114.06,"Leon Marchand",2024],"w":[126.56,"Summer McIntosh",2024]}},
  swimRelay4x100: {"cmp":1,"wr":{"m":[188.24,"USA",2008],"w":[207.96,"Australia",2023]},"or":{"m":[188.24,"USA",2008],"w":[208.92,"Australia",2024]}},
  diving: {"cmp":0,"wr":{},"or":{"m":[585.3,"Chen Aisen",2016],"w":[466.2,"Quan Hongchan",2020]},"ko":"10m 플랫폼 결선"},
  lifting: {"cmp":0,"wr":{"m":[261,"Alireza Yousefi",2026],"w":[181,"World Standard",2025]},"or":{"m":[265,"Lasha Talakhadze",2020],"w":[180,"Li Wenwen",2020]},"ko":"최중량급 용상"},
  archery: {"cmp":0,"wr":{"m":[702,"Brady Ellison",2019],"w":[694,"Lim Si-hyeon",2024]},"or":{"m":[700,"Kim Woo-jin",2016],"w":[694,"Lim Si-hyeon",2024]},"ko":"리커브 72발 랭킹라운드"},
  cycling: {"cmp":0,"wr":{"m":[55.433,"Jeffrey Hoogland",2023],"w":[32.268,"Jessica Salazar",2016]},"or":{"m":[60.711,"Chris Hoy",2004],"w":[33.952,"Anna Meares",2004]},"ko":"남 1km · 여 500m 독주"},
  rowing: {"cmp":0,"wr":{"m":[390.74,"Robbie Manson",2017],"w":[427.71,"Rumyana Neykova",2002]},"or":{"m":[395.77,"Oliver Zeidler",2024],"w":[433.97,"Emma Twigg",2020]},"ko":"싱글스컬 2000m"},
  trampoline: {"cmp":0,"wr":{},"or":{"m":[63.09,"Ivan Litvinovich",2024],"w":[57.305,"Rosannagh MacLennan",2012]},"ko":"올림픽 개인 결선"},
  climbSpeed: {"cmp":1,"wr":{"m":[4.54,"Zhao Yicheng",2026],"w":[5.99,"Emma Hunt",2026]},"or":{"m":[4.74,"Sam Watson",2024],"w":[6.06,"Aleksandra Miroslaw",2024]}},
  fencing: {"cmp":0,"wr":{},"or":{},"ko":"에페 — 기록 종목 아님"},
  tableTennis: {"cmp":0,"wr":{},"or":{},"ko":"경기 종목 — 기록 없음"},
  judo: {"cmp":0,"wr":{},"or":{},"ko":"경기 종목 — 기록 없음"},
  decathlon: {"cmp":1,"wr":{"m":[9126,"Kevin Mayer",2018],"w":[8358,"Austra Skujyte",2005]},"or":{"m":[9018,"Damian Warner",2020]}},
  heptathlon: {"cmp":1,"wr":{"w":[7291,"Jackie Joyner-Kersee",1988]},"or":{"w":[7291,"Jackie Joyner-Kersee",1988]}},
  triathlon: {"cmp":0,"wr":{},"or":{"m":[6213,"Alex Yee",2024],"w":[6895,"Cassandre Beaugrand",2024]},"ko":"올림픽 코스"},
  shooting: {"cmp":0,"wr":{"m":[255.0,"Danilo Sollazzo",2025],"w":[255.3,"Peng Xinlu",2025]},"or":{"m":[252.2,"Sheng Lihao",2024],"w":[251.8,"Yang Qian",2020]},"ko":"10m 공기소총 결선"},
  vault: {"cmp":0,"wr":{},"or":{"m":[16.537,"Leszek Blanik",2008],"w":[15.966,"Simone Biles",2016]},"ko":"올림픽 결선 최고점"},
  highBar: {"cmp":0,"wr":{},"or":{"m":[16.533,"Epke Zonderland",2012]},"ko":"올림픽 결선 최고점"},
  rings: {"cmp":0,"wr":{},"or":{"m":[16.6,"Chen Yibing",2008]},"ko":"올림픽 결선 최고점"},
  canoe: {"cmp":0,"wr":{},"or":{},"ko":"코스마다 달라 기록 없음"},
  golf: {"cmp":0,"wr":{},"or":{"m":[265,"Scottie Scheffler",2024],"w":[267,"Nelly Korda",2020]},"ko":"올림픽 72홀"},
  equestrian: {"cmp":0,"wr":{},"or":{},"ko":"감점+점프오프 — 기록 없음"},
  pentathlon: {"cmp":0,"wr":{},"or":{"m":[1555,"Ahmed Elgendy",2024],"w":[1461,"Michelle Gulyas",2024]},"ko":"근대5종 점수(옛 승마 규격)"},
};

/* ── 게임 기록 → 현실 척도 ──────────────────────────────────────────
   CK 결정(2026-09-12): **표시 기록만 현실 척도로.** 조작·물리·밸런스·저장값은 게임 단위 그대로다.
   화면에 기록을 적는 곳은 전부 이걸 지난다(fmtRec · HUD 시계 · 필드 판독).

   ⛔ 세계기록을 어디에 놓나 — 메달 사다리 위 **t = 1.25**(옛 금컷 너머 사다리의 1/4) 와 드라이버 실측 최고 중 먼 쪽
     · t = 1.00(옛 금컷)에 놓으면 **금을 딸 때마다 세계기록**이다 — 금보다 흔한 세계기록이 된다
     · 결선 AI 는 보통 t ≤ 1.00 · 어려움 t ≤ 1.10(0F_field) → **AI 는 세계기록을 못 깬다.** 깨는 건 사람뿐
     · 비례 환산(v × k)이라 차이(1위까지 0.08초)도 같은 k 로 옮겨진다
   ⚠ 척도를 정하는 기록은 남자 세계기록(없으면 여자 — 7종 경기). 게임 선수에 성별이 없어서 하나를 골랐다.
   ⚠ cmp=0(골프·다이빙·체조…)은 규격이 달라 옮기지 않는다 — 실제 기록은 참고로만 보여 준다. */
const REAL = { WR_T: 1.25 };
/* ⛔ 사다리 1.25 만으로는 모자랐다 — **금컷이 헐거운 종목은 드라이버가 사다리를 한참 넘는다.**
   멀리뛰기 드라이버 7.53(t 1.95)이 9.71m 로 찍혀 **세계기록을 76cm 깼다**(2026-09-12 실측).
   그래서 세계기록 자리 = 사다리 1.25 와 **드라이버 실측 최고** 중 더 먼 쪽.
   '세계기록을 깼다' = '기계가 낸 최고를 사람이 넘었다' 가 된다(드라이버는 사람의 하한이다).
   ⚠ 값은 게임 단위 · GOLD.run(ids, 4) · 장거리 3종은 1판. 물리를 바꾸면 **다시 잰다.**
   ⚠ 세단뛰기 t 3.21 · 멀리 1.95 · 높이 1.79 · 장대 1.83 — 이 금컷들은 헐겁다(CK 결정 대기와 같은 건). */
const REAL_ANCHOR_BEST = {
  sprint100: 9.78, sprint200: 19.9, sprint400: 41.81, hurdles110: 11.56, hurdles400: 42.7, steeple3000: 366.85,
  run800: 141.08, run1500: 270.86, run5000: 1010.94, walk20k: 23004.04, marathon: 16084.48,
  relay4x100: 37.87, relay4x400: 152.26,
  longJump: 7.53, tripleJump: 15.99, highJump: 2.13, poleVault: 6.8,
  shotPut: 23.28, discus: 70.75, javelin: 85.04, hammer: 66.61,
  swimFree100: 40.55, swimBack100: 44.94, swimBreast100: 53.8, swimFly100: 45.54,
  swimMedley200: 103.01, swimRelay4x100: 200.11, climbSpeed: 3.35, decathlon: 10347, heptathlon: 8480,
};
const Real = {
  _k: new Map(),
  of(def){ return (def && REAL_RECORDS[def.id]) || null; },
  /* 척도를 정하는 세계기록 [값, 보유자, 연도, 비공인(0|1), 'm'|'w']
     ⛔ 첫 판은 `slice(0,4).concat(sex)` 였다 — 비공인 칸이 **없는** 기록(대부분)은 성별이 3번 칸으로
        밀려 들어가 ①공인 기록마다 '*'(비공인) 표시 ②성별 undefined → **올림픽 기록 줄이 통째로 사라짐**
        ③올림픽 기록 경신 판정이 영영 false. 누수 검사기가 결과 화면 글자를 덤프하다 드러났다. */
  wr(def){
    const r = this.of(def); if(!r) return null;
    const pick = (a, sex) => [a[0], a[1], a[2], a[3] ? 1 : 0, sex];
    if(r.wr.m) return pick(r.wr.m, 'm');
    if(r.wr.w) return pick(r.wr.w, 'w');
    return null;
  },
  k(def){
    if(!def) return 1;
    if(this._k.has(def.id)) return this._k.get(def.id);
    let k = 1;
    const r = this.of(def), w = r && r.cmp ? this.wr(def) : null;
    if(w && typeof medalCuts === 'function'){
      const c = medalCuts(def);
      /* ⚠ 사다리 위치 t 는 **기준에서** 잰다(t=0 기준 · t=1 옛 금). 첫 판은 금에서 1.25 사다리를 더 가
         100m 세계기록이 8.14초 자리에 놓였다 — 금이 11.71초로 찍혔다. */
      let at = c.bronze + REAL.WR_T * (c.gold - c.bronze);
      const best = REAL_ANCHOR_BEST[def.id];
      if(typeof best === 'number' && (def.higher ? best > at : best < at)) at = best;
      if(at > 0 && isFinite(at)) k = w[0] / at;
    }
    this._k.set(def.id, k);
    return k;
  },
  on(def){ return this.k(def) !== 1; },
  /* 게임 값 → 화면 값. 기록이 아닌 값(DNF·undefined)은 그대로 */
  v(def, x){
    if(typeof x !== 'number' || !isFinite(x) || (typeof DNF !== 'undefined' && x >= DNF)) return x;
    return x * this.k(def);
  },
  /* 속도 — 트랙(초 종목)은 시간이 k 배로 늘었으니 속도는 ÷k, 필드(m 종목)는 공간이 k 배라 ×k.
     ⚠ 안 옮기면 '거리 ÷ 시간 ≠ 속도' 가 화면에 같이 뜬다 */
  speed(def, sp){
    if(typeof sp !== 'number') return sp;
    const k = this.k(def);
    return def && def.unit === 's' ? sp / k : def && def.unit === 'm' ? sp * k : sp;
  },
  /* 필드 경기장 눈금 — **현실 척도의 둥근 숫자** 자리에 긋는다. [{g: 게임 m, r: 표시 m}]
     ⛔ 게임 눈금에 환산 숫자만 붙이면 멀리뛰기(k 1.29)가 '2.6 · 5.2 · 7.7' 로 읽힌다.
        자리를 옮기고 숫자는 둥글게 둔다 — 착지한 모래 위 숫자와 결과 기록이 같은 말을 한다. */
  ticks(def, step, fromG, toG){
    const k = (def && def.unit === 'm') ? this.k(def) : 1;
    const out = [];
    const r0 = Math.ceil((fromG * k) / step - 1e-9) * step;
    for(let r = r0; r <= toG * k + 1e-9; r += step) out.push({ g: r / k, r: Math.round(r * 100) / 100 });
    return out;
  },
  /* 실제 기록(이미 현실 척도) 표기 — fmtRec 은 **다시 환산하므로** 쓰면 안 된다 */
  fmt(def, v){
    if(typeof v !== 'number') return '--';
    if(def.unit === 's') return (typeof fmtTime === 'function') ? fmtTime(v) : v.toFixed(2);
    const u = (typeof unitOf === 'function') ? unitOf(def) : def.unit;
    if(Number.isInteger(v) || Math.abs(v) >= 1000) return Math.round(v) + u;
    return (def.unit === 'm' ? v.toFixed(2) : String(+v.toFixed(3))) + u;
  },
  /* 종목 선택 한 줄 — '세계 9.58 · 여 10.49' · 규격이 다르면 '실제: 올림픽 72홀 265타' */
  line(def){
    const r = this.of(def); if(!r) return '';
    const sec = v => (def.unit === 's' && typeof needsSec === 'function' && needsSec(v)) ? K('초') : '';
    const f = rec => { const s = this.fmt(def, rec[0]); return s + sec(s); };
    if(r.cmp){
      const w = this.wr(def); if(!w) return '';
      let s = K('세계기록') + ' ' + f(w);
      if(w[4] === 'm' && r.wr.w) s += ' · ' + K('여') + ' ' + f(r.wr.w);
      return s;
    }
    const rec = r.or.m || r.wr.m || r.or.w || r.wr.w;
    const label = (typeof K === 'function') ? K(r.ko) : r.ko;    /* 번역은 표(08_i18n_en)로 — r.en 은 문서 원문(길다) */
    return rec ? label + ' ' + f(rec) : label;
  },
  /* 이 기록(게임 값)이 세계기록·올림픽 기록을 넘었나 — 척도를 정한 성별 기준 */
  broke(def, x){
    const r = this.of(def); if(!r || !r.cmp || typeof x !== 'number') return null;
    const w = this.wr(def), sex = w[4], shown = this.v(def, x);
    const better = (a, b) => def.higher ? a > b : a < b;
    const o = r.or[sex];
    return { wr: better(shown, w[0]), or: !!(o && better(shown, o[0])) };
  },
};
