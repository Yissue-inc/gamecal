/* ══════════════════════════════════════════════════════════════════
   AI 난이도 — 라이벌이 얼마나 센가 (CK 제안 2026-08-30)

   ⚠ 왜 필요한가
     라이벌 실력이 종목마다 **하드코딩**돼 있었다(`0.62 + i*0.16 + rand*0.1`).
     처음 켠 사람에게는 3위가 기본값이고, 익숙해진 사람에게는 늘 이길 상대다.
     둘 다 재미가 없다 — 한쪽은 벽이고 한쪽은 심심하다.

   ⛔ 이건 **기록에 손대지 않는다.** 내 기록·메달·기준은 난이도와 무관하다 —
      난이도를 낮춰 금메달을 딸 수 있으면 금이 금이 아니다.
      난이도가 바꾸는 것은 **누구와 나란히 뛰는가** 하나뿐이다.
      (그래서 '쉬움'으로 놓아도 기록이 부풀지 않는다 — 상대만 느려진다)

   ⚠ 값은 실측 위에 얹었다. 지금 기본값(보통)이 0.62~0.94 구간을 쓴다.
      쉬움 −0.14 / 어려움 +0.12 — 어려움은 사람의 완벽한 박자(±0ms)와 겨룰 만하게.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const AI = {
  KEY: 'wsc_ai',
  /* off 는 없다 — 혼자 뛰면 순위가 없어져 '3위'라는 결과가 무의미해진다 */
  LEVELS: ['easy', 'normal', 'hard'],
  NAME:   { easy:'쉬움', normal:'보통', hard:'어려움' },
  /* 라이벌 실력에 더하는 값 */
  BONUS:  { easy:-0.14, normal:0, hard:+0.12 },
  /* 라이벌의 손떨림 배수 — 어려울수록 정확해진다 */
  JITTER: { easy:1.35, normal:1.0, hard:0.72 },

  level: 'normal',

  load(){
    try{ const v=localStorage.getItem(this.KEY);
         if(this.LEVELS.indexOf(v)>=0) this.level = v; }catch(e){}
    return this.level;
  },
  set(l){
    if(this.LEVELS.indexOf(l)<0) return;
    this.level = l;
    try{ localStorage.setItem(this.KEY, l); }catch(e){}
  },
  cycle(){ this.set(this.LEVELS[(this.LEVELS.indexOf(this.level)+1) % this.LEVELS.length]); },
  get label(){ return this.NAME[this.level] || this.NAME.normal; },

  /* 종목이 계산한 기본 실력에 난이도를 얹는다.
     ⚠ 0.30~1.00 으로 묶는다 — 아래로 새면 라이벌이 걸어가고, 위로 새면 사람이 못 이긴다. */
  skill(base){
    return clamp(base + (this.BONUS[this.level] || 0), 0.30, 1.00);
  },
  jitter(base){
    return base * (this.JITTER[this.level] || 1);
  },

  /* ⛔ **시간 배수**(클수록 느린 라이벌)에 쓴다 — skill 과 부호가 반대다.
     등반·중거리는 라이벌을 '기준기록 × k' 로 만든다. 여기에 skill 을 쓰면
     어려움이 라이벌을 **느리게** 만든다(정반대). 그래서 함수를 따로 둔다.
     ⚠ 같은 0.14 를 그냥 빼면 종목마다 체감이 다르다 — 실력 폭(0.80)으로 나눠 비율로 옮긴다. */
  pace(mult){
    const b = this.BONUS[this.level] || 0;
    return Math.max(0.55, mult * (1 - b/0.80));
  },
};
