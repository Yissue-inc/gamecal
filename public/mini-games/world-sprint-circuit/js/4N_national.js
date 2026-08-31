/* ══════════════════════════════════════════════════════════════════
   국가대표 — **뽑히는 것에 값을 붙인다** (3단계 국가대표 단장의 첫 층, 2026-08-31)

   ⚠ 왜 필요한가 (코드에서 확인한 것)
     `Season.pickNationalTeam()` 은 이미 있다. 시즌 시작에 자국 선수 상위 3명(올림픽 해 5명)을
     골라 `a.national = true` 를 찍고 사기를 +10 해 준다.
     그런데 **`a.national` 을 읽는 곳이 선수단 목록의 ★ 하나뿐이다** —
     뽑혀도 아무 일이 안 일어난다. 쓰기만 하고 안 읽는 값은 장식이다.

     그 함수 자신의 주석이 이렇게 말한다:
       *"소속감은 '우리 나라 국기가 붙어 있다'만으론 안 생긴다. **뽑히느냐 마느냐**가 있어야 한다."*
     맞는 말인데, 뽑힌 뒤가 비어 있었다.

   ⛔ 규칙 넷
     ① **좋기만 하면 안 된다.** 대표팀은 더 배우지만(성장 +) 소집으로 지친다(피로 +).
        공짜 보상이면 '누가 뽑히나' 를 볼 이유가 없다.
     ② **누적된다.** 몇 번 뽑혔는지(캡)가 남는다 — 3단계에서 단장이 볼 값이다.
     ③ **기존 값만 쓴다** — 사기·피로·성장 배수. 새 물리를 안 만든다.
     ④ **선발을 말해 준다.** 지금은 조용히 일어난다 — 누가 뽑혔는지 화면이 말해야 한다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const NATIONAL = {
  /* 대표팀에서 배운다 — 주간 성장 배수 */
  TRAIN_BONUS: 0.10,
  /* 소집 — 시즌 시작에 지고 들어가는 피로 */
  CALLUP_FATIGUE: 12,
  /* 뽑혔을 때 오르는 사기(기존 pickNationalTeam 이 주던 값과 같게 유지) */
  CALLUP_MORALE: 10,

  ensure(a){
    if(!a) return a;
    if(a.caps === undefined) a.caps = 0;          // 몇 시즌 뽑혔나
    if(a.national === undefined) a.national = false;
    return a;
  },

  is(a){ return !!(a && a.national); },
  caps(a){ return (a && a.caps) | 0; },

  /* ── 선발 뒤 처리 ────────────────────────────────────────
     ⚠ 선발 자체는 Season.pickNationalTeam 이 한다(누구를 뽑나는 그쪽 규칙).
        여기는 **뽑힌 결과**만 붙인다 — 두 벌로 갈라지지 않게.
     반환: 화면이 쓸 요약 */
  applyCallup(club, picked, season){
    if(!club || !picked) return null;
    /* ⛔ 한 시즌에 두 번 부르면 캡과 피로가 **겹쳐 쌓인다**(실측: 캡 2·피로 24).
       지금은 시즌 생성 때 한 번만 불리지만, 값이 누적되는 함수는 스스로 막아야 한다. */
    if(season){
      const key = (season.year || 1);
      if(season._callupYear === key) return season._callupSummary || null;
      season._callupYear = key;
    }
    for(const a of club.squad) this.ensure(a);
    for(const a of picked){
      this.ensure(a);
      a.caps = this.caps(a) + 1;
      /* ⛔ 대표팀은 공짜가 아니다 — 소집에서 지쳐 돌아온다 */
      a.fatigue = clamp((a.fatigue || 0) + this.CALLUP_FATIGUE, 0, 100);
    }
    const sum = {
      names: picked.map(a => a.name),
      caps:  picked.map(a => this.caps(a)),
      count: picked.length,
    };
    if(season) season._callupSummary = sum;
    return sum;
  },

  /* 주간 훈련 배수 — 대표팀은 더 배운다.
     ⛔ 배수 하나뿐이다. 성장 공식(31_training)을 건드리지 않는다. */
  trainMul(a){
    return this.is(a) ? (1 + this.TRAIN_BONUS) : 1;
  },

  /* 화면 한 줄 */
  capsLabel(a){
    const c = this.caps(a);
    return c > 0 ? `${c}회` : '';
  },
};
