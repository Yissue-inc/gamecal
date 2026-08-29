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
    { id:'sprint', name:'단거리 코치', stat:'speed',        wage:14, grow:0.14, icon:'co-sprint' },
    { id:'power',  name:'웨이트 코치', stat:'power',        wage:14, grow:0.14, icon:'co-power' },
    { id:'endure', name:'지구력 코치', stat:'stamina',      wage:13, grow:0.14, icon:'co-endure' },
    { id:'tech',   name:'기술 코치',   stat:'technique',    wage:16, grow:0.16, icon:'co-tech' },
    { id:'rhythm', name:'리듬 코치',   stat:'rhythm',       wage:13, grow:0.14, icon:'co-rhythm' },
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
    /* 코치 자리도 감독이 연다(4C_master) — 감독 Lv3·6·12 에서 늘어난다 */
    const slots = (typeof Master!=='undefined' && Master.coachSlots) ? Master.coachSlots() : 3;
    if(club.coaches.length >= slots)
      return `코치는 ${slots}명까지입니다 (감독 레벨을 올리면 늘어납니다)`;
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
  /* ⚠ club 은 선택이다 — 안 넘기면 시설이 없는 셈이라 옛 호출부가 그대로 돈다 */
  confidence(a, club){
    const w = a.trainingWeeks || 0;
    /* 분석실(4F_facility)이 있으면 더 빨리 알아본다. 없으면 0 이라 예전과 같다. */
    const lift = (typeof FACIL!=='undefined' && club) ? FACIL.confLift(club) : 0;
    return clamp(0.25 + w/60 + lift, 0.25, 1);   // 60주 함께하면 확신
  },
  potentialRange(a, key, club){
    const truth = a.potential[key];
    const conf = this.confidence(a, club);
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
  verdict(a, club){
    const gap = a.potOverall - a.overall;
    const conf = this.confidence(a, club);
    if(conf < 0.4) return '아직 판단하기 이르다';
    if(gap >= 22) return '크게 자랄 수 있다';
    if(gap >= 12) return '아직 여지가 있다';
    if(gap >= 5)  return '거의 다 자랐다';
    return '더 볼 것이 없다';
  },
};

/* ══════════════════════════════════════════════════════════════════
   명예의 전당 · 유산 — 세대를 잇는 고리

   ⚠ 지금까지 은퇴 선수는 **그냥 사라졌다.** Lv22 · OVR71 로 10년을 키운 선수가
      배열에서 splice 되고 끝이었다(실측: 14시즌에 7명이 그렇게 사라졌다).
      육성 게임에서 이건 가장 큰 손실이다 — 쌓은 것이 남지 않으면
      '오래 하는 이유'가 없다. 방치형·육성물이 전부 갖고 있는 회차 고리
      (우마무스메의 계승, 아이들 게임의 환생)가 여기에 해당한다.

   두 갈래로 남긴다:
     ① 전당(hall)  — 기록으로 남는다. 이력과 이름이 영구히 보관된다.
     ② 유산(legacy) — 숫자로 남는다. 클럽 전체의 성장에 아주 조금씩 보태고,
                      신인이 **계승**해 잠재치를 물려받을 수 있다.

   ⛔ 여전히 경기 계산에는 안 들어간다. 유산은 **성장**에만 붙는다.
   ══════════════════════════════════════════════════════════════════ */
Object.assign(DEPTH, {
  /* 은퇴 선수 한 명이 남기는 유산 점수.
     오래 뛴 것 · 잘한 것 · 기록을 세운 것을 함께 본다. */
  legacyOf(a){
    const ovr = a.overall || 0;
    const lv  = a.lv || 1;
    const hist = a.history || [];
    const gold = hist.filter(h=>h.rank===1).length;
    const podium = hist.filter(h=>h.rank<=3).length;
    const pbs = Object.keys(a.best||{}).length;
    return Math.round(ovr*2 + lv*6 + gold*30 + podium*10 + pbs*8);
  },

  /* 은퇴시킨다 — 전당에 올리고 유산을 적는다.
     ⚠ 선수 객체를 통째로 저장하면 세이브가 커진다. 남길 것만 추린다. */
  enshrine(club, a, year){
    if(!club || !a) return null;
    const rec = {
      name: a.name, species: a.species, speciesName: a.speciesName,
      nation: a.nation, age: a.age, lv: a.lv||1, ovr: a.overall,
      pot: Object.assign({}, a.potential),
      gold: (a.history||[]).filter(h=>h.rank===1).length,
      year: year || 0,
      legacy: this.legacyOf(a),
      spec: a.spec,
    };
    (club.hall ||= []).push(rec);
    return rec;
  },
  hall(club){ return (club && club.hall) || []; },
  legacyTotal(club){ return this.hall(club).reduce((s,r)=>s+(r.legacy||0), 0); },

  /* 클럽 전체에 붙는 성장 보너스 — 아주 얕게, 대신 영원히.
     ⚠ 세게 만들면 오래 한 사람이 새 선수를 즉시 완성시킨다. 얕아야 '역사'가 된다.
        유산 1,000점 = 성장 +5%, 상한 +25%(약 5,000점 = 20명쯤). */
  legacyBonus(club){
    const t=this.legacyTotal(club);
    return { grow: Math.min(0.25, t/20000) };
  },

  /* ── 계승 ────────────────────────────────────────────────
     전당의 선배 하나를 골라 신인이 물려받는다.
     잠재치를 선배 쪽으로 당긴다 — **현재 스탯이 아니라 잠재치다.**
     ⚠ 스탯을 물려주면 신인이 곧 완성품이라 키울 게 없다.
        잠재치만 물려주면 '가능성을 물려받고 키우는 건 여전히 내 몫'이 된다. */
  inheritCost(rec){ return Math.round(40 + (rec.legacy||0)*0.25); },
  inherit(club, rookie, rec){
    if(!club || !rookie || !rec) return '대상이 없습니다';
    if(rookie.inherited) return '이미 계승했습니다';
    const cost=this.inheritCost(rec);
    if((club.budget||0) < cost) return `코인이 부족합니다 (필요 ${cost})`;
    club.budget = +(club.budget - cost).toFixed(1);
    /* 선배의 잠재치 쪽으로 40% 당긴다. 원래보다 낮아지지는 않는다. */
    const K=(typeof STAT_KEYS!=='undefined')?STAT_KEYS:Object.keys(rookie.potential||{});
    for(const k of K){
      const mine=rookie.potential[k], theirs=(rec.pot&&rec.pot[k])||mine;
      rookie.potential[k] = Math.round(Math.max(mine, mine + (theirs-mine)*0.40));
    }
    rookie.inherited = { from: rec.name, year: rec.year };
    return null;
  },
});

/* ══════════════════════════════════════════════════════════════════
   적성 — 이미 있는데 안 보이던 것

   ⚠ speciesBias 는 처음부터 있었다. 치타는 스피드가 1.75배 빨리 오르고
      코끼리는 파워가 그렇다. 그런데 **플레이어는 그걸 모른다** — 화면 어디에도
      없다. 데이터가 있는데 안 보이면 없는 것과 같다.
      "이 선수를 어디에 쓸까"는 육성 게임의 첫 번째 질문인데, 답할 근거가
      화면에 없었다.

   등급으로 바꿔 보여 준다 — 숫자(1.75)보다 글자(S)가 빨리 읽힌다.
   ══════════════════════════════════════════════════════════════════ */
Object.assign(DEPTH, {
  /* 편향 값(0.75~1.95)을 등급으로. 1.0 이 보통이다. */
  APT: [
    { min:1.60, key:'S', color:'#ffd75e' },
    { min:1.35, key:'A', color:'#5cff9c' },
    { min:1.12, key:'B', color:'#5aaaff' },
    { min:0.92, key:'C', color:'#c9cede' },
    { min:0.78, key:'D', color:'#9aa4b8' },
    { min:0,    key:'E', color:'#ff7b6b' },
  ],
  aptOf(a, stat){
    const b = (typeof speciesBias==='function') ? speciesBias(a, stat) : 1;
    return this.APT.find(t=>b>=t.min) || this.APT[this.APT.length-1];
  },
  /* 이 선수가 가장 잘 자라는 스탯 둘 — 카드 한 줄에 쓴다 */
  topApt(a, n){
    const K=(typeof STAT_KEYS!=='undefined')?STAT_KEYS:[];
    return K.map(k=>({ k, b:(typeof speciesBias==='function')?speciesBias(a,k):1 }))
            .sort((x,y)=>y.b-x.b).slice(0, n||2);
  },
  /* 종이 특히 잘하는 종목 — 이미 SPECIES.best 에 있다 */
  bestEvents(a){
    const s = (typeof SPECIES!=='undefined') ? SPECIES[a.species] : null;
    return (s && s.best) || [];
  },
});
