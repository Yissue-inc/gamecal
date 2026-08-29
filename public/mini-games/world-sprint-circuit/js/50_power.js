/* ══════════════════════════════════════════════════════════════════
   종합력 — 한 선수의 모든 것을 숫자 하나로

   ⚠ 실측으로 잡은 문제(측정: 같은 시드 선수 둘):

        갓 들어온 신인            OVR 36 · Lv 1  · 스킬 0 · 장비 0
        Lv30 · 스킬 3 · 전설장비 3  OVR 36 · Lv 30 · 스킬 3 · 장비 3
        → 화면에 뜨는 차이: **0**

      플레이어가 30레벨을 올리고 전설 장비를 세 개 끼워도 **화면의 숫자가
      한 톨도 안 움직인다.** OVR 은 스탯만 보기 때문이다.
      뒷단에는 층이 아홉 개인데 앞단에는 그게 하나도 안 보였다.

   AFK아레나의 전투력, 에픽세븐의 CP, FM 의 별점이 하는 일이 정확히 이것이다 —
   **뭘 하든 오르는 숫자 하나.** 그게 있어야 "내가 키우고 있다"가 느껴진다.

   ⛔ 이건 **표시 전용**이다. 경기 계산에 한 줄도 안 들어간다.
      시뮬레이션은 예전 그대로 스탯·특성·스킬을 읽는다.
      여기서 숫자를 어떻게 합치든 경기 결과는 바뀌지 않는다.

   ⚠ 그래도 **거짓말은 안 한다.** 가중치는 실측한 영향력에 맞춰 잡았다:
        컨디션 30→100 이 100m 를 11.48→9.39초로 바꾼다(실측) — 그래서 크게 친다
        경기 스킬은 3칸 최강 조합이 -2.58% (실측) — 그래서 작게 친다
        장비·레벨은 **성장**에만 작용한다 — 지금 빠른 게 아니라 앞으로 클 것이므로
        따로 '성장력'으로 갈라 놓는다. 한 숫자에 뭉뚱그리면 그건 거짓말이다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const Power = {
  /* ── 지금 경기력 ─────────────────────────────────────────
     "이 선수를 지금 대회에 내보내면 얼마나 하나" */
  /* ⚠ a.overall 은 **반올림된** 값이다. 그걸 쓰면 스피드 +1(가중치 0.30 → +0.3)이
     반올림에 먹혀 **이 게임에서 제일 흔한 행동이 +0 을 띄운다**(실측).
     반올림 전 가중합을 직접 쓴다 — 포인트 하나가 30 을 올린다. */
  rawOverall(a){
    if(!a || !a.stats) return 0;
    const W = (typeof specWeights==='function') ? specWeights(a.spec) : null;
    if(!W) return a.overall || 0;
    let s=0; for(const k of STAT_KEYS) s += (a.stats[k]||0) * W[k];
    return s;
  },
  rawPotential(a){
    if(!a || !a.potential) return 0;
    const W = (typeof specWeights==='function') ? specWeights(a.spec) : null;
    if(!W) return a.potOverall || 0;
    let s=0; for(const k of STAT_KEYS) s += (a.potential[k]||0) * W[k];
    return s;
  },
  /* 스탯만 — **훈련이 실제로 바꾼 것**. 주간 결산의 헤드라인은 이 값을 쓴다.
     ⚠ 경기력으로 한 주를 재면 피로가 성장을 덮는다(실측: 개인이 +58·+53 인 주에
        클럽 경기력은 **+2**). 열심히 훈련한 주에 "아무 일도 없었다"가 뜬다.
        컨디션·피로는 상단 칸이 이미 따로 말하고 있다. 여기서는 성장만 센다. */
  statOf(a){ return Math.round(this.rawOverall(a) * 100); },

  /* 잠재 여력 — 돌파는 여기를 민다(경기력은 아직 안 오른다) */
  roomOf(a){ return Math.round(Math.max(0, this.rawPotential(a) - this.rawOverall(a)) * 100); },
  of(a){
    if(!a) return 0;
    let v = this.rawOverall(a) * 100;

    /* 컨디션 — 실측상 가장 크게 흔든다(100m 11.48↔9.39초).
       60 을 기준으로 ±. 최상이면 +600, 최악이면 -450 정도. */
    v += ((a.condition ?? 70) - 60) * 15;

    /* 피로 — 컨디션과 따로 논다. 쌓이면 경기에서 무너진다 */
    v -= (a.fatigue || 0) * 6;

    /* 경기 스킬 — 실측 크기(3칸 -2.58%)에 맞춰 작게.
       ⚠ 여기를 크게 잡으면 숫자가 거짓말을 한다. */
    if(typeof SKILL !== 'undefined'){
      for(const id of SKILL.equipped(a)){
        const d = SKILL.def(id);
        if(d && d.branch === 'race') v += 90 + d.tier * 45;
      }
    }

    /* 특성 — 스킬과 같은 통로로 경기에 작용한다. 같은 대역으로 친다 */
    if(a.traits && typeof TRAITS !== 'undefined'){
      for(const t of a.traits){
        const e = TRAITS[t] && TRAITS[t].eff; if(!e) continue;
        /* 좋은 쪽이면 더하고 나쁜 쪽이면 뺀다 — 유리몸·새가슴은 마이너스다 */
        let good = 0;
        for(const k in e){
          const bad = (k==='injury' || k==='sigma' || k==='reaction' || k==='lateFade' || k==='fatigue');
          good += bad ? -e[k] : e[k];
        }
        v += good * 300;
      }
    }
    return Math.max(0, Math.round(v));
  },

  /* ── 성장력 ──────────────────────────────────────────────
     "이 선수가 한 주에 얼마나 빨리 자라나" — **속도**지 남은 양이 아니다.
     100 = 보통. 148 이면 보통 선수보다 48% 빨리 자란다.

     ⚠ 처음엔 '남은 잠재치 + 안 쓴 포인트'로 잡았다. **실측하고 버렸다**:
        훈련 포인트를 써서 스탯을 올렸더니 종합 수치가 **−12** 로 떨어졌다.
        남은 잠재치와 안 쓴 포인트를 자산으로 세니, 그걸 쓰는 순간 손해로 보인 것이다.
        플레이어가 좋은 일을 했는데 빨간 숫자가 뜨면 그건 틀린 피드백이다.

     ⛔ 그리고 이 값은 **훈련 코드가 실제로 쓰는 것과 같은 항목**만 더한다
        (31_training.js 의 RB.grow + coachG). 화면이 148 이라고 하면 진짜로 1.48 배다.
        남은 잠재치는 바로 옆 'OVR 39 · 잠재 89' 가 이미 말하고 있다. */
  growthOf(a, club){
    if(!a) return 100;
    let g = 0;
    if(typeof RPG   !== 'undefined') g += RPG.bonus(a).grow || 0;          // 장비
    if(typeof SKILL !== 'undefined') g += SKILL.growBonus(a).grow || 0;    // 육성 스킬
    if(typeof DEPTH !== 'undefined' && club){
      g += (DEPTH.legacyBonus(club) || {}).grow || 0;                      // 유산
      g += (DEPTH.coachBonus(club, null) || {}).grow || 0;                 // 코치
    }
    if(typeof Codex !== 'undefined' && Codex.growBonus) g += Codex.growBonus().grow || 0;
    if(typeof FACIL !== 'undefined' && club) g += FACIL.bonus(club).grow || 0;
    /* ⚠ 나이·사기도 훈련이 실제로 곱하는 값이다(31_training: ageF · moraleF).
       빼놓으면 "성장력 148 인데 왜 안 크지"가 된다 — 전성기가 지난 선수는
       ageF 가 0 이하로도 간다. 화면이 그걸 말해 줘야 한다. */
    const ageF = (typeof a.ageFactor==='function') ? a.ageFactor() : 1;
    const moraleF = 0.82 + (a.morale ?? 60)/100*0.32;
    return Math.max(0, Math.round((1 + g) * Math.max(0, ageF) * moraleF * 100));
  },

  /* 클럽 전체 — 목록·리그표에서 "우리 팀이 얼마나 세나" */
  clubOf(club){
    if(!club || !club.squad) return 0;
    /* ⚠ 합이 아니라 **상위 8명 평균**이다. 합으로 하면 선수를 많이 데리고 있는
       것만으로 숫자가 커져서, 약한 선수를 껴안고 있는 게 이득처럼 보인다. */
    const v = club.squad.map(a=>this.of(a)).sort((x,y)=>y-x).slice(0,8);
    return v.length ? Math.round(v.reduce((s,x)=>s+x,0)/v.length) : 0;
  },

  /* ── 내역 ────────────────────────────────────────────────
     큰 숫자 하나가 앞에 서고, 눌러 보면 어디서 왔는지 나온다.
     ⚠ 숫자만 있고 근거가 없으면 "왜 올랐지"를 못 배운다. */
  breakdown(a){
    const rows = [];
    /* ⚠ 여기서 a.overall(반올림)을 쓰면 **행 합계가 큰 숫자와 안 맞는다**(실측 42 차이).
       숫자가 자기 내역과 어긋나면 그 숫자를 못 믿게 된다 — of() 와 같은 값을 쓴다. */
    rows.push({ k:'스탯', v: Math.round(this.rawOverall(a)*100), note:`OVR ${a.overall}` });
    const cond = Math.round(((a.condition ?? 70) - 60) * 15);
    rows.push({ k:'컨디션', v:cond, note: (typeof UI!=='undefined'&&UI.condName)?UI.condName(a.condition):'' });
    const fat = -Math.round((a.fatigue||0)*6);
    if(fat) rows.push({ k:'피로', v:fat, note:`${Math.round(a.fatigue)}` });
    let sk=0, n=0;
    if(typeof SKILL!=='undefined')
      for(const id of SKILL.equipped(a)){ const d=SKILL.def(id);
        if(d && d.branch==='race'){ sk += 90 + d.tier*45; n++; } }
    if(n) rows.push({ k:'스킬', v:sk, note:`경기 스킬 ${n}개` });
    let tr=0;
    if(a.traits && typeof TRAITS!=='undefined')
      for(const t of a.traits){ const e=TRAITS[t]&&TRAITS[t].eff; if(!e) continue;
        let g=0; for(const k in e){
          const bad=(k==='injury'||k==='sigma'||k==='reaction'||k==='lateFade'||k==='fatigue');
          g += bad ? -e[k] : e[k]; }
        tr += g*300; }
    if(tr) rows.push({ k:'특성', v:Math.round(tr),
      note:(a.traits||[]).map(t=>TRAITS[t]&&TRAITS[t].name).filter(Boolean).join(', ') });
    return rows;
  },

  /* ── 변화를 잡아 둔다 ────────────────────────────────────
     ⚠ 숫자가 조용히 바뀌면 아무도 못 느낀다. 뭘 하고 나면 **+N 이 떠야** 한다.
        화면이 행동 직전에 mark(), 직후에 delta() 를 부른다. */
  /* ⚠ 두 숫자를 **더해서** 재면 안 된다(실측): 포인트를 써서 스탯을 올렸더니
     합계가 -12 로 떨어져 빨간 숫자가 떴다. 좋은 일을 했는데 손해로 보인 것이다.
     경기력과 성장력은 서로 반대로 움직이는 게 정상이므로 **따로** 잰다. */
  _mark: {},
  mark(a, club){ if(!a) return;
    this._mark[a.id] = { p:this.of(a), g:this.growthOf(a, club), r:this.roomOf(a) }; },
  delta(a, club){
    const b = a && this._mark[a.id];
    if(!b) return { p:0, g:0, r:0 };
    delete this._mark[a.id];
    return { p:this.of(a)-b.p, g:this.growthOf(a, club)-b.g, r:this.roomOf(a)-b.r }; },
};
