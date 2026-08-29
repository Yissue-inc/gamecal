/* ══════════════════════════════════════════════════════════════════
   감독 — '나'

   ⚠ 이 게임에는 지금까지 **팀은 있는데 '나'가 없었다.**
      · 클럽 이름은 국가에서 자동으로 지어졌다("대한민국 트랙 클럽")
      · 커리어 점수(CP)와 랭크(신인→전설)는 있었지만 **아무것도 열지 않았다** —
        타이틀 화면에 글자로만 떴다
      · 감독 레벨과 선수 레벨이 **서로 아무 관계도 없었다**

   포켓몬·AFK아레나가 하는 방식:
      포켓몬 — 배지가 높아야 강한 포켓몬이 말을 듣는다
      AFK아레나 — 플레이어 레벨이 영웅 레벨의 **상한**이다
   둘 다 "마스터를 키워야 파트너를 더 키울 수 있다"는 한 줄로 묶여 있다.
   그래서 마스터가 장식이 아니라 **자원**이 된다.

   여기서도 같은 고리를 만든다:
      **선수 레벨 상한 = 감독 레벨 × 2 + 8**
   내 선수를 더 키우고 싶으면 나도 커야 한다. 그리고 내가 크는 길은
   경기를 하는 것이다(CP 는 아케이드·감독 모드 양쪽에서 쌓인다) —
   두 모드가 처음으로 한 줄에 꿰인다.

   ⛔ 여전히 경기 계산에는 손대지 않는다. 상한은 **성장**을 막을 뿐이다.
   ⚠ 상한을 넘은 선수의 레벨을 **깎지 않는다.** 옛 세이브를 벌하면 안 된다 —
      더 오르지 않을 뿐이다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const Master = {
  KEY: 'wsc_master',

  /* ── 정체 ────────────────────────────────────────────────
     이름과 얼굴. 없으면 기본값. Save 와 따로 두어 클럽을 새로 만들어도 남는다
     — 감독은 클럽보다 오래 산다. */
  load(){
    try{
      const d=JSON.parse(localStorage.getItem(this.KEY));
      if(d && typeof d==='object') return Object.assign(this.blank(), d);
    }catch(e){}
    return this.blank();
  },
  blank(){ return { name:'', face:0, clubsRun:0, seasonsDone:0 }; },
  save(d){ try{ localStorage.setItem(this.KEY, JSON.stringify(d)); }catch(e){} },
  get d(){ return (this._d ||= this.load()); },
  setName(n){ this.d.name = String(n||'').slice(0,10); this.save(this.d); },
  setFace(i){ this.d.face = i|0; this.save(this.d); },
  get name(){ return this.d.name || '이름 없는 감독'; },

  /* ── 레벨 ────────────────────────────────────────────────
     커리어 점수(CP)에서 나온다 — 이미 쌓고 있던 값을 재활용한다.
     ⚠ 새 통화를 만들면 또 하나를 쌓아야 한다. 있는 것을 쓴다.
     곡선: Lv = floor(√CP / 4) + 1
       CP    207(1시즌) → Lv 4 · 상한 16
       CP  1,035(5시즌) → Lv 9 · 상한 26
       CP  3,312(16시즌)→ Lv15 · 상한 38
     실측한 선수 최고 레벨(16시즌 Lv36)보다 **아주 조금 위**에 둔다 —
     닿을 듯 말 듯해야 상한이 의미를 갖는다. */
  MAX_LV: 40,
  cp(){ return (typeof Career!=='undefined' && Career.d) ? (Career.d.cp||0) : 0; },
  lv(){ return Math.min(this.MAX_LV, Math.floor(Math.sqrt(this.cp())/4) + 1); },
  cpFor(lv){ return Math.pow((lv-1)*4, 2); },
  progress(){
    const l=this.lv();
    if(l>=this.MAX_LV) return 1;
    const a=this.cpFor(l), b=this.cpFor(l+1);
    return clamp((this.cp()-a)/Math.max(1,b-a), 0, 1);
  },
  toNext(){ const l=this.lv(); return l>=this.MAX_LV ? 0 : Math.max(0, this.cpFor(l+1)-this.cp()); },

  /* ── 감독이 여는 것 ──────────────────────────────────────
     포켓몬의 배지가 하는 일. 레벨이 오르면 할 수 있는 게 늘어난다. */
  athleteCap(){ return this.lv()*2 + 8; },        // 선수 레벨 상한
  coachSlots(){ return this.lv()>=12 ? 4 : this.lv()>=6 ? 3 : this.lv()>=3 ? 2 : 1; },
  squadCap(){ return Math.min(18, 10 + Math.floor(this.lv()/4)); },
  scoutRegions(){ return this.lv()>=10 ? 3 : this.lv()>=4 ? 2 : 1; },

  /* 다음 레벨에 열리는 것 한 줄 — 화면이 "왜 키워야 하나"를 말할 수 있게 */
  nextUnlock(){
    const l=this.lv();
    const at=(n,txt)=> l<n ? { lv:n, text:txt } : null;
    return at(3,'코치 2명') || at(4,'스카우트 지역 2곳') || at(6,'코치 3명')
        || at(10,'스카우트 지역 3곳') || at(12,'코치 4명')
        || (l<this.MAX_LV ? { lv:l+1, text:`선수 레벨 상한 ${this.athleteCap()+2}` } : null);
  },

  /* 시즌을 마칠 때마다 기록 — 감독의 이력 */
  noteSeason(){ this.d.seasonsDone=(this.d.seasonsDone||0)+1; this.save(this.d); },
  noteClub(){ this.d.clubsRun=(this.d.clubsRun||0)+1; this.save(this.d); },
};
