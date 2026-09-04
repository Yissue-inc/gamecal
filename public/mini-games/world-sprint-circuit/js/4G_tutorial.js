/* ══════════════════════════════════════════════════════════════════
   튜토리얼 — 설명하지 않고 **겪게 한다** (CK 제안 2026-08-30)

   ⚠ 왜 필요한가 (처음부터 플레이해 보고 나온 결론)
     이 게임은 두 개의 게임이다 — 리듬으로 뛰는 아케이드와, 24주를 굴리는 감독.
     그런데 처음 켠 사람은 **둘 다 맨몸으로** 만난다.
       · 100m 를 눌러도 왜 느린지 모른다(박자를 모르니까)
       · 새 클럽을 시작하면 신인 10명과 24주가 통째로 쏟아진다
     실측: 화면 하나에 조각이 40개 넘고, 첫 지시가 '팀 사기' 였다.

   ⛔ 규칙 세 가지
     ① **좋은 것으로 먼저 겪게 한다.** 전설 종족·최고 선수단으로 시작한다 —
        튜토리얼에서까지 약체로 헤매면 게임의 재미를 못 만난다.
        (내 실력이 아니라 게임이 뭘 주는지를 먼저 보여 준다)
     ② **한 걸음에 한 가지.** 한 화면에서 한 가지만 배운다.
     ③ **건너뛸 수 있다.** 두 번째 사람에게 튜토리얼은 벽이다.

   ⚠ 기존 시스템을 안 바꾼다 — 튜토리얼은 **평소 화면을 그대로 쓰고**
      그 위에 안내를 얹는다. 그래야 배운 것이 본 게임에서 그대로 통한다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const Tutorial = {
  KEY: 'wsc_tut_done',
  on: false,
  step: 0,
  /* 안내 문구가 뜬 시각 — 너무 빨리 넘어가면 못 읽는다 */
  shownAt: 0,

  /* ── 걸음 ────────────────────────────────────────────────
     each: { say(무엇을 배우나), hint(지금 뭘 누르나), enter(자리 만들기), done(넘어갈 조건) }
     ⚠ done 이 없으면 확인 키로 넘어간다. */
  STEPS: [
    /* ⛔ 여기 '박자가 전부입니다' 라고 적혀 있었다 — 바로 아래 힌트가 '규칙은 교대 하나뿐이다'
       라서 **같은 화면에서 서로 다른 말을 했다.** 연타 모델로 바꿀 때 힌트만 고치고
       제목은 두고 온 것이다(2026-09-04 첫 실행 감사에서 화면으로 잡았다). */
    { say:'교대가 전부입니다',
      hint:'좌·우를 **번갈아** 빠르게 — 규칙은 교대 하나뿐이다',
      enter(){
        /* 전설 치타로 100m — 게임이 가장 잘 보이는 자리에서 시작한다 */
        Party.count = 1;
        Tutorial.forceSpecies = 'cheetah';
        G.start(EVENTS.find(e=>e.id==='sprint100'));
      },
      done(){ return G.state===ST.RESULT; } },

    /* ⛔ 처음엔 '확인을 누르세요' 였다. 그런데 결과 화면의 확인은 **경기를 다시 시작**한다 —
       다음 걸음이 감독 화면을 열어도 그 뒤에 경기가 다시 켜져 덮어썼다(실측 state=PLAY).
       튜토리얼은 남의 화면 규칙과 다투지 않는다. **읽을 시간을 주고 스스로 넘어간다.** */
    { say:'기록이 남습니다',
      hint:'개인 최고를 깨면 커리어가 오릅니다',
      hold:2600 },

    { say:'이제 감독입니다',
      hint:'최고 선수들을 맡았습니다. 매주 **세 명까지** 직접 지도합니다',
      enter(){
        MG.newGame(null, 20260830, 'KOR');
        Tutorial.boostSquad(MG.club);
        /* ⚠ 경기가 남아 있으면 다음 프레임에 그쪽이 화면을 되찾는다 — 확실히 끊는다 */
        G.event = null;
        G.state = ST.MANAGER;
        MG.stack = [new OfficeScreen(MG)];
      },
      done(){ return MG.stack.length>0 &&
                     MG.stack[MG.stack.length-1] instanceof TrainScreen; },
      wait:'훈련 지시를 여세요' },

    { say:'지도한 선수는 더 자랍니다',
      hint:'세 명을 고르고 확인 — 나머지는 팀 프로그램대로 훈련합니다',
      done(){ return Object.keys(MG.focus).length >= 1; } },

    { say:'대회에서 승점을 법니다',
      hint:'주를 넘기면 대회 주가 옵니다. 출전표를 짜고 결과를 봅니다',
      done(){ return true } },
  ],

  /* 최고 선수단 — 튜토리얼에서만. 게임의 재미가 어디 있는지 먼저 보여 준다.
     ⛔ 본 게임의 신인 생성에는 손대지 않는다. 여기서 만든 클럽만 세다. */
  boostSquad(club){
    if(!club) return;
    const rare = Object.keys(SPECIES).filter(n=>SPECIES[n].rare>=4);
    club.squad.forEach((a,i)=>{
      if(rare.length) a.species = rare[i % rare.length];
      /* ⛔ speciesName 은 **getter** 다 — 대입하면 TypeError 가 나고, 그 예외가
         아래 스탯 강화까지 통째로 건너뛴다(실측: '최고 선수단' 인데 OVR 54/46/41).
         종족만 바꾸면 이름은 알아서 따라온다. */
      /* ⚠ overall 은 **스탯에서 계산되는 getter** 다(직접 대입해도 안 먹는다).
         그리고 잠재치가 천장이라 스탯만 올리면 도로 잘린다 — 둘 다 올린다.
         실측: 62 로만 올렸더니 OVR 54/46/41 이었다. '최고 선수단' 이 아니다. */
      for(const k in a.stats){
        a.potential[k] = Math.max(a.potential[k]||0, 96);
        a.stats[k] = Math.max(a.stats[k], 78 + (i%3)*4);
      }
      a.condition = 88; a.morale = 88; a.fatigue = 4;
      if(typeof RPG!=='undefined'){ RPG.ensure(a); a.tp = 6; }
      if(typeof SKILL!=='undefined') SKILL.ensure(a);
      if(typeof recalcOverall==='function') recalcOverall(a);
    });
    club.budget = Math.max(club.budget, 600);
  },

  start(){
    this.on = true; this.step = 0; this.shownAt = 0;
    this.enterStep();
  },
  enterStep(){
    const s = this.STEPS[this.step];
    if(!s){ this.finish(); return; }
    this.shownAt = (typeof G!=='undefined') ? G.t : 0;
    if(s.enter) { try{ s.enter(); }catch(e){ console.warn('튜토리얼 걸음 실패', e); } }
  },
  next(){
    this.step++;
    if(this.step >= this.STEPS.length) this.finish();
    else this.enterStep();
  },
  finish(){
    this.on = false; this.forceSpecies = null;
    try{ localStorage.setItem(this.KEY, '1'); }catch(e){}
    G.state = ST.TITLE;
  },
  skip(){ this.finish(); },
  seen(){
    try{ return localStorage.getItem(this.KEY)==='1'; }catch(e){ return false; }
  },

  /* 매 프레임 — 걸음이 끝났나 본다.
     ⚠ 조건이 참이 되자마자 넘기면 안내를 읽을 틈이 없다. 최소 1.2초는 보여 준다. */
  update(){
    if(!this.on) return;
    const s = this.STEPS[this.step]; if(!s) return;
    const age = (typeof G!=='undefined' ? G.t : 0) - this.shownAt;
    if(age < 1200) return;
    /* hold: 읽을 시간만 주고 스스로 넘어간다(남의 화면 규칙과 안 다툰다) */
    if(s.hold){ if(age >= s.hold) this.next(); return; }
    if(s.done && s.done()) this.next();
  },

  /* 안내 — **평소 화면 위에** 얹는다. 화면을 새로 만들지 않는다. */
  draw(u){
    if(!this.on) return;
    const s = this.STEPS[this.step]; if(!s) return;
    /* ⛔ y=26 고정이라 **감독 화면의 지표 줄을 덮었다**(자금·승점·메달이 가려짐).
       화면마다 비어 있는 자리가 다르다 — 경기는 위(하늘), 감독은 아래가 빈다.
       ⛔ 그래서 경기/결과는 26 으로 옮겼는데 **거기도 임자가 있었다** —
          결과 화면의 제목('부정 출발' y30~50)과 순위표 옆 거리 표시를 덮었다
          (2026-08-31 튜토리얼 층: 새 플레이가 제일 먼저 보는 화면인데 안 밟혀 있었다).
       ⚠ 이번엔 **재서 골랐다** — 결과 화면의 글자들을 전부 모아 빈 띠를 찾으니
          y 119~215 가 96px 비어 있었다(경기 중에도 그 자리는 트랙이라 글자가 없다).
          자리를 고를 때는 재 본다. 짐작하면 세 번째로 또 부딪힌다. */
    const H = 34, y = (typeof G!=='undefined' && G.state===ST.MANAGER) ? VH-56 : 150;
    plate(u, 8, y, VW-16, H, 0.88);
    u.strokeStyle = PAL.gold; u.lineWidth = 1;
    u.strokeRect(8.5, y+0.5, VW-17, H-1);
    txt(u, `${this.step+1} / ${this.STEPS.length}`, 14, y+4, 8, PAL.dim, 'left');
    txt(u, K(s.say), VW/2, y+3, 12, PAL.gold, 'center', 700);
    /* 굵게 표시한 부분(**…**)은 그냥 벗긴다 — 한 줄에 두 색을 섞으면 읽기가 더 어렵다 */
    txt(u, K(s.hint).replace(/\*\*/g, ''), VW/2, y+18, 9, PAL.white, 'center');
    txt(u, K('P 건너뛰기'), VW-14, y+4, 8, PAL.dim, 'right');
  },
};
