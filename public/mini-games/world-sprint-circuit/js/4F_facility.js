/* ══════════════════════════════════════════════════════════════════
   시설 — 클럽에 쌓이는 것

   ⚠ 리뷰의 E안("매주 고를 것이 두 개뿐이다")과 F안("후반 밀도")을 같이 답한다.
      그런데 **F안은 재 보고 통째로 버렸다.**

   ── 재 보고 알게 된 것 (tools/economy.js · 20시즌 × 시드 3) ──────

      연차   자금   상금   최고Lv  중앙Lv  인원  평균OVR
        1    381    121      14      10    10      50
        5    874    131      28      21    10      71
        9   1218     64      36      27     9      81   ← 정점
       13   1362     24      39      25     8      76
       17   1456     24      35      16     8      66
       20   1529     35      28      22     8      70

   ① **F안(Lv50+ 각성)은 죽은 콘텐츠다.** 최고 레벨은 13년차 39가 정점이고
      그 뒤로 **내려간다**(고레벨 선수가 은퇴하고 신인으로 채워지니까).
      Lv50 에 무엇을 놓아도 아무도 못 본다 — 종족 도감의 '등급 완성'과 같은 함정.

   ② 진짜 후반 문제는 다른 것이었다. **클럽이 9년차부터 쇠퇴한다.**
      신인 보충은 `while(squad.length < 8)` 로 **8명까지만**, 그것도
      `tier 0.3~0.72` 의 약체다. 그동안 리그는 해마다 세진다(LEAGUE_GROWTH).
      상금이 131 → 18 로 마르는데 **재건할 돈이 그때 없다** — 고리가 닫힌다.

   ③ 자금은 1,529 까지 **놀고 있다.** 코인을 쓸 곳이 모자란다.

   그래서 시설은 ②와 ③을 같이 푼다: **쌓인 코인을 영구 성장으로 바꾼다.**
   특히 유소년 아카데미는 들어오는 신인의 질을 올려 ②를 정면으로 친다.

   ⛔ 경기 계산엔 안 닿는다. 전부 **성장 통로**(grow/rest/hurt/cond)와
      신인 tier 하나뿐이다 — 스킬과 달리 여기서는 약속을 안 깬다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const FACIL = {
  MAX: 5,
  /* ⚠ 값은 실측 위에 얹었다. 시즌당 상금이 평균 63(정점 131) 이므로
     1단계 80 은 "한 시즌 벌어 한 칸" 이다. 5단계까지 2,020 — 20시즌 누적
     상금(1,269)보다 크다. 하나를 끝까지 올릴지 여럿을 얕게 깔지 고르게 된다. */
  COST: [80, 160, 320, 560, 900],
  costOf(lv){ return this.COST[lv] !== undefined ? this.COST[lv] : null; },   // lv=현재 단계
  totalTo(lv){ let s=0; for(let i=0;i<lv;i++) s+=this.COST[i]; return s; },

  /* ⚠ 줄 문구는 **낱말만 번역표를 탄다.** 문장을 통째로 조립하면 표에서 못 찾는다
     (실측: 영어판 시설 화면이 '성장 +7.0% → +10.5%' 처럼 절반이 한국어로 남았다).
     낱말을 K() 로 옮기고 숫자는 코드가 붙인다. `nums` 는 숫자뿐이라 번역이 필요 없다. */
  KINDS: {
    train: { name:'훈련장',   icon:'fc-train',
      desc:'선수가 더 빨리 자란다',
      line:l=>`${K('성장')} +${(l*3.5).toFixed(1)}%`,
      /* 화살표 오른쪽엔 라벨을 안 되풀이한다 — 왼쪽이 이미 뭘 재는지 말했다 */
      nums:l=>`+${(l*3.5).toFixed(1)}%`,
      eff:l=>({ grow: l*0.035 }) },
    med:   { name:'의무실',   icon:'fc-med',
      desc:'부상이 줄고 피로가 잘 빠진다',
      /* ⚠ '부상' 은 번역표에서 이미 **건수**('Injuries')다. 여기서 재는 건 확률이라
         낱말을 갈라 둔다 — 한국어로도 '부상률' 이 정확하다. */
      line:l=>`${K('부상률')} −${(l*9).toFixed(0)}% · ${K('회복')} +${(l*0.7).toFixed(1)}`,
      nums:l=>`−${(l*9).toFixed(0)}% · +${(l*0.7).toFixed(1)}`,
      eff:l=>({ hurt: -l*0.09, rest: l*0.7 }) },
    dorm:  { name:'기숙사',   icon:'fc-dorm',
      desc:'컨디션이 잘 오른다',
      line:l=>`${K('컨디션')} +${(l*1.1).toFixed(1)}`,
      nums:l=>`+${(l*1.1).toFixed(1)}`,
      eff:l=>({ cond: l*1.1 }) },
    lab:   { name:'분석실',   icon:'fc-lab',
      desc:'선수의 잠재치를 빨리 알아본다',
      line:l=>`${K('스카우트 확신')} +${(l*12).toFixed(0)}%`,
      nums:l=>`+${(l*12).toFixed(0)}%`,
      eff:l=>({ conf: l*0.12 }) },
    /* ⛔ 이 하나가 위의 ②를 정면으로 친다 — 들어오는 신인이 좋아진다.
       ⚠ 신인 tier 는 0.3~0.72 다. 5단계면 +0.275 — 상단이 약 1.0 에 닿는다.
          "약체만 들어와서 클럽이 늙는다"를 여기서 막는다. */
    youth: { name:'유소년 아카데미', icon:'fc-youth',
      desc:'들어오는 신인이 좋아진다',
      line:l=>`${K('신인 자질')} +${(l*5.5).toFixed(1)}%`,
      nums:l=>`+${(l*5.5).toFixed(1)}%`,
      eff:l=>({ rookie: l*0.055 }) },
  },
  ids(){ return Object.keys(this.KINDS); },

  /* ── 클럽의 상태 ─────────────────────────────────────────
     ⚠ 옛 세이브엔 없다. 읽기 전에 통과시킨다 — 없으면 전부 0단계라
        **시설 층이 없던 때와 같다.** */
  ensure(club){
    if(!club) return club;
    if(!club.facil || typeof club.facil!=='object') club.facil = {};
    for(const id of this.ids()) if(!(id in club.facil)) club.facil[id] = 0;
    return club;
  },
  lv(club, id){ this.ensure(club); return club.facil[id]|0; },
  totalLv(club){ this.ensure(club); return this.ids().reduce((s,id)=>s+(club.facil[id]|0),0); },

  nextCost(club, id){
    const l = this.lv(club, id);
    return l >= this.MAX ? null : this.costOf(l);
  },
  canBuild(club, id){
    const c = this.nextCost(club, id);
    if(c === null) return '최고 단계입니다';
    if((club.budget||0) < c) return `자금 ${c} 필요`;
    return null;
  },
  build(club, id){
    if(this.canBuild(club, id) !== null) return false;
    const c = this.nextCost(club, id);
    club.budget = +((club.budget||0) - c).toFixed(1);
    club.facil[id] = this.lv(club, id) + 1;
    return true;
  },

  /* ── 효과 ────────────────────────────────────────────────
     ⛔ 전부 0단계면 전부 0 을 돌려준다 → 예전과 완전히 같다. */
  bonus(club){
    const out = { grow:0, rest:0, hurt:0, cond:0, conf:0, rookie:0 };
    if(!club || !club.facil) return out;
    for(const id of this.ids()){
      const l = club.facil[id]|0; if(!l) continue;
      const e = this.KINDS[id].eff(l);
      for(const k in out) if(e[k]) out[k] += e[k];
    }
    return out;
  },
  /* 신인 자질 — endSeason 이 부른다. 시설이 없으면 0 이다. */
  rookieLift(club){ return this.bonus(club).rookie; },
  /* 스카우트 확신 — DEPTH.confidence 가 부른다 */
  confLift(club){ return this.bonus(club).conf; },

  /* 화면 한 줄 */
  summary(club){
    this.ensure(club);
    const on = this.ids().filter(id=>club.facil[id]>0);
    if(!on.length) return '아직 없음';
    return on.map(id=>`${this.KINDS[id].name} ${club.facil[id]}`).join(' · ');
  },
};
