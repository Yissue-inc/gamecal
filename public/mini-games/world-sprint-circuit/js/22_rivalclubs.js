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
  { id:'panther', name:'검은표범 클럽', nation:'KEN', spec:'sprint',  base:1.02, color:'#ff6b8a' },
  { id:'granite', name:'화강암 체육회', nation:'GER', spec:'throw',   base:1.00, color:'#c9a06a' },
  { id:'tide',    name:'조류 수영단',   nation:'AUS', spec:'swim',    base:1.01, color:'#5aaaff' },
  { id:'highland',name:'고원 육상부',   nation:'ETH', spec:'endure',  base:1.03, color:'#8affb0' },
  { id:'skyward', name:'하늘길 클럽',   nation:'USA', spec:'jump',    base:0.99, color:'#ffd75e' },
  { id:'ironbar', name:'무쇠 클럽',     nation:'JPN', spec:'hurdles', base:0.97, color:'#b48aff' },
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
      id:c.id, name:c.name, nation:c.nation, color:c.color,
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
