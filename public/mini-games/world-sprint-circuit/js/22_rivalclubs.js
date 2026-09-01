/* ══════════════════════════════════════════════════════════════════
   라이벌 클럽 — 리그에 '누구'가 있어야 한다.

   ⚠ 예전엔 대회마다 상대를 새로 뽑아 쓰고 버렸다. 이름이 매번 달라지니
      **이겨도 누구를 이겼는지 모르고, 져도 누구에게 졌는지 모른다.**
      감독 모드인데 리그에 사람이 없었다.

   여섯 클럽을 고정으로 두고, 상대 선수는 그 클럽 소속으로 만든다.
     · 클럽마다 **잘하는 종목군**이 다르다 — 던지기 강팀은 던지기에서 강하다
     · 해마다 조금씩 강해진다(우리도 강해지니까)
     · 대회 승점을 클럽별로 합산해 **리그 순위표**를 만든다
   그래야 "올해는 흑표범을 잡아야 한다" 같은 목표가 생긴다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const RIVAL_CLUBS = [
  /* ⚠ base 를 1.02~1.07 로 뒀더니 **상대 전체가 강해져** 우리 클럽이 3시즌 내내 꼴찌에
     금메달 0개였다. 클럽은 '누구인가'를 주는 장치지 난이도 손잡이가 아니다 —
     평균이 1.00 이 되도록 두고, 차이는 특기 종목군에서만 낸다. */
  { id:'panther', crest:'club-crest-black-panther', name:'검은표범 클럽', nation:'KEN', spec:'sprint',  base:1.02, color:'#ff6b8a' },
  { id:'granite', crest:'club-crest-granite', name:'화강암 체육회', nation:'GER', spec:'throw',   base:1.00, color:'#c9a06a' },
  { id:'tide', crest:'club-crest-birds',    name:'조류 수영단',   nation:'AUS', spec:'swim',    base:1.01, color:'#5aaaff' },
  { id:'highland', crest:'club-crest-highland',name:'고원 육상부',   nation:'ETH', spec:'endure',  base:1.03, color:'#8affb0' },
  { id:'skyward', crest:'club-crest-skyway', name:'하늘길 클럽',   nation:'USA', spec:'jump',    base:0.99, color:'#ffd75e' },
  { id:'ironbar', crest:'club-crest-iron', name:'무쇠 클럽',     nation:'JPN', spec:'hurdles', base:0.97, color:'#b48aff' },
];

/* ⚠ 국가 코드는 **3글자**다(KOR·JPN·USA). 2글자로 적었더니 drawFlag 가 조용히
   회색 네모를 그렸다 — 화면에서만 보이고 오류는 안 났다. 로드할 때 잡는다. */
(function checkRivalClubNations(){
  if(typeof NATION_BY_CODE==='undefined') return;
  const bad = RIVAL_CLUBS.filter(c=>!NATION_BY_CODE[c.nation]).map(c=>c.id+':'+c.nation);
  if(bad.length) throw new Error('RIVAL_CLUBS 국가 코드가 표에 없다 — '+bad.join(' '));
})();

const RivalLeague = {
  /* 시즌마다 새로 만든다 — 클럽은 그대로, 성적만 초기화 */
  init(season){
    season.leagueTable = {};
    for(const c of RIVAL_CLUBS) season.leagueTable[c.id] = { pts:0, g:0, s:0, b:0 };
  },
  /* 어느 클럽이 이 종목을 맡을지 — 잘하는 클럽이 더 자주, 하지만 독점하지는 않는다 */
  pickFor(ev, rng, i){
    const spec = (typeof SPEC_OF_KIND!=='undefined') ? SPEC_OF_KIND[ev.kind] : null;
    const w = RIVAL_CLUBS.map(c => (c.spec===spec ? 3.2 : 1));
    let sum=w.reduce((a,b)=>a+b,0), r=rng()*sum;
    for(let k=0;k<w.length;k++){ r-=w[k]; if(r<=0) return RIVAL_CLUBS[k]; }
    return RIVAL_CLUBS[(i||0) % RIVAL_CLUBS.length];
  },
  /* 그 클럽이 이 종목에서 얼마나 센가 — 특기면 세고 아니면 평범하다 */
  strengthOf(club, ev, year){
    const spec = (typeof SPEC_OF_KIND!=='undefined') ? SPEC_OF_KIND[ev.kind] : null;
    const fit = club.spec===spec ? 1.07 : 0.96;
    return club.base * fit;   /* 해마다 세지는 건 리그 기준(LEAGUE_GROWTH)이 이미 한다 */
  },
  /* ── 클럽 명단 — 라이벌도 '사람'이어야 한다 ──────────────────────────
     ⛔ 이 파일 맨 위는 "이겨도 누구를 이겼는지 모른다"로 시작하는데, 고친 것은
        **클럽까지**였다. 선수는 여전히 대회마다 새로 굴렸다. 실측(한 시즌·185명 출전):
          · 고유 이름 153개 중 27개가 반복 등장
          · 그중 **22개는 다른 클럽 소속**으로 나왔다
            (ANITA WIJAYA: W6 하늘길 → W12 무쇠 → W18 무쇠 · 스탯 207→263→204)
        같은 사람이 시즌 중에 클럽을 옮기고 능력이 오르내렸다. 이름이 거짓말을 했다.
     그래서 클럽마다 **시즌 명단**을 만들어 두고 거기서 뽑아 쓴다.
     ⚠ 실력은 예전과 똑같이 대회마다 목표치에 맞춰 스케일한다 —
        바뀌는 건 **누가 나오나**뿐이다(리그 밸런스는 건드리지 않는다).
     ⛔ 난수는 **메인 rng 를 안 쓴다.** 두 이유다:
        ① 여기서 뽑으면 그 뒤 모든 대회 결과가 밀린다
        ② 불러오기가 `new Season(c, Date.now()^0x99, {restore:true})` 로 **매번 새 시드**를
           쓴다 — 메인 rng 로 만들면 저장할 때마다 명단이 통째로 바뀐다.
        클럽 이름 + 연도 + 클럽 id 를 해시해 쓴다(저장을 안 건드려도 안 흔들린다). */
  ROSTER_N: 16,
  _rosterRng(season, club){
    const s = String((season.club && season.club.name) || '') + '|' + (season.year||1) + '|' + club.id;
    let h = 2166136261;
    for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return makeRng(h>>>0);
  },
  ALL_SPECS: ['sprint','hurdles','endure','jump','throw','swim'],
  ensureRoster(season){
    if(typeof rollAthlete==='undefined') return null;
    const key = String((season.club && season.club.name)||'') + '|' + (season.year||1);
    if(season._rosterKey === key && season.rivalRoster) return season.rivalRoster;
    const out = {};
    /* ⛔ 중복 검사는 **명단 전체**로 해야 한다. 클럽마다 따로 검사했더니 두 클럽이
       같은 이름을 뽑아 4명이 여전히 두 클럽 소속으로 나왔다(실측 22→4, 0 이 아니었다).
       이름 풀은 하나인데 검사만 여섯 갈래였다. */
    const seen = new Set((season.club && season.club.squad || []).map(a=>a.name));
    for(const c of RIVAL_CLUBS){
      const rng = this._rosterRng(season, c);
      const list = [];
      for(let i=0;i<this.ROSTER_N;i++){
        /* 절반은 특기 종목군 — 던지기 강팀에 던지는 사람이 실제로 있어야 한다 */
        const sp = (i < this.ROSTER_N/2) ? c.spec : this.ALL_SPECS[i % this.ALL_SPECS.length];
        let a = null;
        for(let k=0;k<8;k++){
          a = rollAthlete(rng, { spec:sp, tier:0.55, age:20+((rng()*8)|0) });
          if(!seen.has(a.name)) break;
        }
        if(!a || seen.has(a.name)) continue;
        seen.add(a.name);
        /* ⛔ 이름만 고정하면 **같은 사람의 실력이 대회마다 출렁인다.**
           실측(한 시즌): 반복 등장하는 52명의 스탯 총합 진폭 중앙값 26%, 11명은 50% 이상
           (JAN VAN DIJK 208↔356). 예전엔 이름이 매번 달라 안 보이던 것이 이제 보인다.
           선수마다 **고정 편차**를 준다 — 평균 1.00 이라 리그 난이도는 그대로고,
           "저 사람은 늘 까다롭다"가 성립한다. */
        list.push({ name:a.name, species:a.species, spec:sp, bias: 0.94 + rng()*0.12 });
      }
      out[c.id] = list;
    }
    season.rivalRoster = out; season._rosterKey = key;
    return out;
  },
  /* 이 클럽에서 이 종목에 내보낼 사람 — 특기가 맞는 사람 우선, 이미 나온 사람은 제외 */
  identityFor(season, club, ev, used){
    const R = this.ensureRoster(season); if(!R) return null;
    const list = R[club.id] || [];
    const free = list.filter(x => !used.has(x.name));
    if(!free.length) return null;
    const spec = (typeof SPEC_OF_KIND!=='undefined') ? SPEC_OF_KIND[ev.kind] : null;
    const pref = free.filter(x => x.spec === spec);
    const pool = pref.length ? pref : free;
    return pool[(season.rng() * pool.length) | 0];
  },
  colorOf(clubId){ const c = RIVAL_CLUBS.find(x=>x.id===clubId); return c ? c.color : null; },

  /* 한 종목의 결과를 클럽 승점으로 — 클럽당 **최상위 한 명만** 센다.
     ⚠ 모든 선수를 세면 라이벌은 34종목 전부에 선수가 있고 우리는 8~10명뿐이라
        구조적으로 못 이긴다(실측: 올림픽 해에 라이벌 1056점 vs 우리 566점).
        실제 클럽 대항전도 종목별 대표 성적으로 매긴다. 우리 승점은 그대로 전원 합산이라,
        **한 종목에 둘을 넣는 선수층**이 그대로 이점이 된다. */
  tallyEvent(season, rows, info){
    if(!season.leagueTable) return;
    const best = {};
    for(const r of rows){
      const id = r.athlete && r.athlete.clubId;
      if(!id) continue;
      if(best[id]===undefined || r.rank < best[id]) best[id] = r.rank;
    }
    for(const id in best){
      const t = season.leagueTable[id]; if(!t) continue;
      const rk = best[id];
      t.pts += (info.pts[rk-1] || 0);
      if(rk===1) t.g++; else if(rk===2) t.s++; else if(rk===3) t.b++;
    }
  },
  /* 우리를 포함한 순위표 — 감독이 보고 싶은 건 '내가 몇 등인가' 다 */
  table(season){
    const rows = RIVAL_CLUBS.map(c=>({
      id:c.id, name:c.name, nation:c.nation, color:c.color, crest:c.crest,
      pts:(season.leagueTable&&season.leagueTable[c.id]?season.leagueTable[c.id].pts:0),
      g:(season.leagueTable&&season.leagueTable[c.id]?season.leagueTable[c.id].g:0),
      mine:false,
    }));
    rows.push({ id:'__mine', name:season.club.name, nation:season.club.nation,
                color:'#ffffff', pts:Math.round(season.points), g:season.medals.gold, mine:true });
    rows.sort((a,b)=> b.pts-a.pts || b.g-a.g);
    rows.forEach((r,i)=>r.rank=i+1);
    return rows;
  },
  myRank(season){ const t=this.table(season); return (t.find(r=>r.mine)||{}).rank || t.length; },
};
