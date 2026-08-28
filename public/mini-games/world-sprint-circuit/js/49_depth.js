/* ══════════════════════════════════════════════════════════════════
   육성 심화 — FM 이 갖고 있고 우리가 없던 것들

   ⛔ 여전히 **경기 계산에는 손대지 않는다.** 46_rpg 와 같은 약속이다.
      여기 있는 것은 전부 '선수를 어떻게 키우나'에 관한 것이다.

   FM 을 FM 답게 만드는 장치를 셋으로 추렸다:
     ① 코치 — 감독 혼자 다 못 한다. 분야별 코치를 고용하면 그 분야가 잘 자란다.
     ② 성장 이력 — 이 선수가 **어떻게** 여기까지 왔는지 남는다(주별 그래프).
     ③ 스카우트 리포트 — 잠재치를 숫자로 다 보여 주지 않는다. **범위**로 본다.

   ⚠ ③ 이 제일 중요하다. 지금은 잠재치가 정확한 숫자로 보인다 — 그러면 판단할
      게 없다. FM 의 재미는 '이 선수가 정말 클까?'를 **모르는 채로** 거는 데 있다.
      다만 기존 화면을 안 바꾸기로 했으므로, 정확한 값은 그대로 두고
      **스카우트 리포트라는 새 화면**에서 범위와 확신도를 보여 준다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const DEPTH = {
  /* ── ① 코치 ─────────────────────────────────────────────
     주급을 받고, 자기 분야의 성장을 밀어 준다.
     ⚠ 효과는 훈련에만 붙는다(46_rpg 의 장비와 같은 통로). 경기력 아님. */
  COACHES: [
    { id:'sprint', name:'단거리 코치', stat:'speed',        wage:14, grow:0.14, icon:'icon-tp' },
    { id:'power',  name:'웨이트 코치', stat:'power',        wage:14, grow:0.14, icon:'icon-tp' },
    { id:'endure', name:'지구력 코치', stat:'stamina',      wage:13, grow:0.14, icon:'icon-tp' },
    { id:'tech',   name:'기술 코치',   stat:'technique',    wage:16, grow:0.16, icon:'icon-tp' },
    { id:'rhythm', name:'리듬 코치',   stat:'rhythm',       wage:13, grow:0.14, icon:'icon-tp' },
    { id:'medic',  name:'의무 트레이너',stat:null, wage:18, hurt:-0.22, rest:1.6, icon:'icon-gear' },
  ],
  coachOf(id){ return this.COACHES.find(c=>c.id===id) || null; },
  hired(club){ return (club && club.coaches) || []; },
  isHired(club, id){ return this.hired(club).includes(id); },
  wageBill(club){
    return this.hired(club).reduce((s,id)=>{ const c=this.coachOf(id); return s + (c?c.wage:0); }, 0);
  },
  hire(club, id){
    const c=this.coachOf(id); if(!c) return '없는 코치';
    club.coaches = club.coaches || [];
    if(club.coaches.includes(id)) return '이미 고용했습니다';
    if(club.coaches.length >= 3) return '코치는 3명까지입니다';
    const fee = c.wage*4;                       // 계약금 = 4주치
    if((club.budget||0) < fee) return `코인이 부족합니다 (필요 ${fee})`;
    club.budget = +(club.budget - fee).toFixed(1);
    club.coaches.push(id);
    return null;
  },
  fire(club, id){
    if(!club.coaches) return '고용한 코치가 없습니다';
    const i=club.coaches.indexOf(id); if(i<0) return '고용하지 않은 코치입니다';
    club.coaches.splice(i,1); return null;
  },
  /* 훈련이 읽는 값 — 장비와 같은 모양으로 돌려준다(합쳐 쓰기 쉽게) */
  coachBonus(club, statKey){
    const out={ grow:0, rest:0, hurt:0 };
    for(const id of this.hired(club)){
      const c=this.coachOf(id); if(!c) continue;
      if(c.grow && (!c.stat || c.stat===statKey)) out.grow += c.grow;
      if(c.rest) out.rest += c.rest;
      if(c.hurt) out.hurt += c.hurt;
    }
    return out;
  },

  /* ── ② 성장 이력 ─────────────────────────────────────────
     주마다 OVR 을 한 점씩 남긴다. 화면에서 꺾은선으로 그린다.
     ⚠ 무한히 쌓이면 세이브가 커진다 — 200점(약 8시즌)에서 앞을 버린다. */
  MAX_HISTORY: 200,
  logWeek(a){
    if(!a) return;
    (a.ovrLog ||= []).push(a.overall);
    if(a.ovrLog.length > this.MAX_HISTORY) a.ovrLog.shift();
  },

  /* ── ③ 스카우트 리포트 ───────────────────────────────────
     잠재치를 정확히 알려 주지 않는다. **범위와 확신도**로 준다.
     같은 선수를 오래 데리고 있을수록(훈련 주차) 범위가 좁아진다 —
     '지켜봐야 안다'가 게임이 된다.

     ⚠ 난수를 매번 굴리면 볼 때마다 범위가 흔들린다. 선수 id 로 고정한다. */
  confidence(a){
    const w = a.trainingWeeks || 0;
    return clamp(0.25 + w/60, 0.25, 1);          // 60주 함께하면 확신
  },
  potentialRange(a, key){
    const truth = a.potential[key];
    const conf = this.confidence(a);
    const span = (1-conf) * 26;                  // 확신이 낮으면 ±13
    /* 선수마다 고정된 치우침 — 같은 선수는 늘 같은 방향으로 잘못 본다 */
    let h = 0; const sid = String(a.id||a.name) + key;
    for(let i=0;i<sid.length;i++) h = (h*31 + sid.charCodeAt(i)) >>> 0;
    const bias = ((h % 1000)/1000 - 0.5) * span * 0.6;
    const lo = clamp(Math.round(truth - span/2 + bias), 20, 99);
    const hi = clamp(Math.round(truth + span/2 + bias), 20, 99);
    return { lo:Math.min(lo,hi), hi:Math.max(lo,hi), conf };
  },
  confName(c){
    return c>=0.9 ? '확실함' : c>=0.7 ? '높음' : c>=0.45 ? '보통' : '낮음';
  },
  /* 한 줄 총평 — 리포트의 얼굴 */
  verdict(a){
    const gap = a.potOverall - a.overall;
    const conf = this.confidence(a);
    if(conf < 0.4) return '아직 판단하기 이르다';
    if(gap >= 22) return '크게 자랄 수 있다';
    if(gap >= 12) return '아직 여지가 있다';
    if(gap >= 5)  return '거의 다 자랐다';
    return '더 볼 것이 없다';
  },
};
