/* ══════════════════════════════════════════════════════════════════
   커리어 — 판을 넘어 쌓이는 것.

   ⚠ 지금 저장 데이터는 {best, unlocked, lastEvent} 뿐이었다. 한 판 끝나면
     기록 하나만 남고 아무것도 안 쌓인다 — 다시 켤 이유가 없다.
   ROAR(월드컵 응원 게임)의 랭크 사다리를 가져오되 단위를 이 게임에 맞춘다:
     ROAR = 평생 응원 포인트 / 여기 = **커리어 점수(CP)**.

   CP 를 어디서 주는가 (모으는 행위가 곧 게임을 하는 행위여야 한다)
     · 아케이드 완주        기준 통과 +12 · 미통과 +4
     · 개인 최고 경신       +25
     · 감독 대회 승점       그 대회에서 딴 승점 그대로
     · 시즌 완주            +40
   ⚠ 판정 창이나 기록에는 아무 영향도 주지 않는다. 순수하게 '얼마나 했나' 다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* ROAR 과 같은 다섯 계단. 간격은 이 게임의 CP 획득 속도에 맞춰 다시 잡았다. */
/* 계단 간격은 실측으로 잡았다: 감독 1시즌 ≈ 207 CP, 아케이드 전 종목 자기최고 ≈ 800 CP.
   ⚠ 처음엔 전설을 12,000 으로 뒀는데 60시즌이 걸렸다 — 사다리가 아니라 벽이다. */
/* ⚠ 이름은 소문자 rank-1 … rank-5 다. 어셋 검사기가 소문자만 읽는다.
   ⚠ 파일이 오는 등급부터 붙는다 — 없으면 색 원으로 물러난다(RANK_ICON 참조). */
const RANK_ICON = { 0:'rank-1', 1:'rank-2', 2:'rank-3', 3:'rank-4', 4:'rank-5' };
const RANKS = [
  { cp:0,    name:'신인',  color:'#8a8a96' },   // 시작
  { cp:300,  name:'선수',  color:'#5cff9c' },   // 1~2시즌
  { cp:1200, name:'주전',  color:'#5aaaff' },   // 5~6시즌
  { cp:3000, name:'간판',  color:'#b06bff' },   // 14시즌
  { cp:8000, name:'전설',  color:'#ffd75e' },   // 35시즌 — 오래 하는 사람의 자리
];

/* 뱃지 — '해냈다'가 분명한 것만. 애매한 건 안 넣는다. */
const BADGES = [
  { id:'first',    name:'첫 결승선',   desc:'아무 종목이나 완주했다',        icon:'▶' },
  { id:'qualify',  name:'기준 통과',   desc:'기준 기록을 넘었다',            icon:'✓' },
  { id:'pb10',     name:'기록의 사람', desc:'개인 최고를 10번 경신했다',     icon:'★' },
  { id:'allTrack', name:'트랙 순회',   desc:'달리기 종목을 모두 완주했다',   icon:'∞' },
  { id:'allField', name:'필드 순회',   desc:'도약·투척을 모두 완주했다',     icon:'◆' },
  { id:'allSwim',  name:'네 영법',     desc:'수영 네 종목을 모두 완주했다',  icon:'≈' },
  { id:'tier5',    name:'무결점',      desc:'한 경기에서 5단까지 올렸다',    icon:'⚡' },
  { id:'gold',     name:'첫 금메달',   desc:'대회에서 1위를 했다',           icon:'●' },
  { id:'season',   name:'한 시즌',     desc:'시즌을 끝까지 마쳤다',          icon:'◐' },
  { id:'gold10',   name:'금메달 10',   desc:'금메달을 10개 모았다',          icon:'◉' },
  { id:'legend',   name:'전설',        desc:'최고 랭크에 올랐다',            icon:'♛' },
];

const Career = {
  /* Save.data.career 안에 산다 — 저장 구조를 하나만 쓴다 */
  get d(){
    const s = Save.data;
    if(!s.career) s.career = { cp:0, races:0, pbs:0, golds:0, seasons:0,
                               done:{}, badges:{}, bestTier:0 };
    /* 옛 저장본에 필드가 없을 수 있다 — 없으면 채운다 */
    const c=s.career;
    if(!c.done) c.done={};
    if(!c.badges) c.badges={};
    if(c.bestTier===undefined) c.bestTier=0;
    return c;
  },
  get rankIdx(){
    const cp=this.d.cp; let i=0;
    for(let k=0;k<RANKS.length;k++) if(cp>=RANKS[k].cp) i=k;
    return i;
  },
  get rank(){ return RANKS[this.rankIdx]; },
  /* 다음 계단까지 얼마나 왔나 (0~1). 최고 랭크면 1. */
  get progress(){
    const i=this.rankIdx;
    if(i>=RANKS.length-1) return 1;
    const a=RANKS[i].cp, b=RANKS[i+1].cp;
    return clamp((this.d.cp-a)/(b-a), 0, 1);
  },
  get nextCp(){
    const i=this.rankIdx;
    return i>=RANKS.length-1 ? null : RANKS[i+1].cp;
  },

  _pending: [],                      // 화면에 띄울 알림 (랭크업·뱃지)
  take(){ const p=this._pending; this._pending=[]; return p; },

  add(cp, why){
    const before=this.rankIdx;
    this.d.cp += cp;
    if(this.rankIdx>before) this._pending.push({kind:'rank', rank:this.rank});
    Save.write();
    return cp;
  },
  grant(id){
    if(this.d.badges[id]) return false;
    const b=BADGES.find(x=>x.id===id); if(!b) return false;
    this.d.badges[id]=1;
    this._pending.push({kind:'badge', badge:b});
    Save.write();
    return true;
  },

  /* ── 판이 끝날 때 부르는 것들 ───────────────────────── */
  /* 아케이드 한 판. def=종목 정의, ok=기준 통과, pb=개인최고 경신, tier=최고 콤보단계 */
  finishRace(def, ok, pb, tier){
    const c=this.d;
    c.races++;
    c.done[def.id]=1;
    if(tier!==undefined && tier>c.bestTier) c.bestTier=tier;
    this.add(ok? 12 : 4);
    if(pb){ c.pbs++; this.add(25); }
    this.grant('first');
    if(ok) this.grant('qualify');
    if(c.pbs>=10) this.grant('pb10');
    if(tier>=5) this.grant('tier5');
    this.checkSets();
    Save.write();
  },
  /* 감독 대회 하나 */
  finishMeet(points, golds){
    this.add(Math.max(0, Math.round(points||0)));
    if(golds>0){ this.d.golds += golds; this.grant('gold'); }
    if(this.d.golds>=10) this.grant('gold10');
    Save.write();
  },
  finishSeason(){
    this.d.seasons++;
    this.add(40);
    this.grant('season');
    Save.write();
  },
  /* 종목 묶음을 다 돌았는지 */
  checkSets(){
    if(typeof EVENTS==='undefined') return;
    const done=this.d.done;
    const all=(kinds)=> EVENTS.filter(e=>kinds.includes(e.kind)).every(e=>done[e.id]);
    if(all(['sprint','middle','hurdles','walk','relay'])) this.grant('allTrack');
    if(all(['jump','throw'])) this.grant('allField');
    if(all(['swim'])) this.grant('allSwim');
    if(this.rankIdx>=RANKS.length-1) this.grant('legend');
  },
  badgeCount(){ return Object.keys(this.d.badges).length; },
};
