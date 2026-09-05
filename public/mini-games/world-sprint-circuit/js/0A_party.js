/* ══════════════════════════════════════════════════════════════════
   멀티플레이 — 한 키보드에 1~4명.

   두 가지 방식이 있고 종목에 따라 자동으로 갈린다.
     · 동시 대결(versus) — 트랙·수영. 각자 레인 하나씩 잡고 같이 달린다.
     · 턴제(turn)       — 도약·투척. 한 명씩 돌아가며 하고 기록으로 겨룬다.
       (도약·투척은 화면에 한 명만 설 수 있다 — 동시에 하면 뭘 보는지 모른다)

   ⚠ 1인용일 때 P1 은 예전 키를 그대로 쓴다(A/D/←/→/Space).
     여러 명일 때만 A/D/S 로 좁힌다 — 화살표를 P2 에게 줘야 하기 때문이다.
     혼자 하던 사람의 손버릇을 뺏지 않는다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* ⚠ `label` 은 **좌·우·액션 셋만** 적는다. 위/아래는 `udLabel` 로 따로 둔다 —
     ▲▼ 를 쓰는 종목(중장거리 페이스·경보·사이클 변속)에서만 화면에 붙이기 위해서다.
     ⛔ 없으면 2인용 800m 에서 P2 는 자기 페이스 키가 **↑ 와 오른쪽 Shift** 라는 걸
        어디서도 못 듣는다(2026-09-04 발견). 화살표를 액션에 뺏겨 아래가 Shift 로 밀린
        건 P2 뿐이라 더 그렇다 — 다른 사람 키를 보고 유추할 수도 없다. */
const PARTY_KEYS = [
  { left:'KeyA',       right:'KeyD',        action:'KeyS',      up:'KeyW',       down:'KeyX',      label:'A / D · S',      udLabel:'W / X' },
  { left:'ArrowLeft',  right:'ArrowRight',  action:'ArrowDown', up:'ArrowUp',    down:'ShiftRight',label:'← / → · ↓',      udLabel:'↑ / R-Shift' },
  { left:'KeyJ',       right:'KeyL',        action:'KeyK',      up:'KeyI',       down:'KeyM',      label:'J / L · K',      udLabel:'I / M' },
  { left:'Numpad4',    right:'Numpad6',     action:'Numpad5',   up:'Numpad8',    down:'Numpad2',   label:'숫자4 / 6 · 5',  udLabel:'숫자8 / 2' },
];
/* 1인용 전용 — 예전 키를 전부 살려 둔다 */
/* ⚠ 예전엔 action 에 KeyS·ArrowDown 이 같이 들어 있었다. 방향키가 그냥 '보조 액션'이던
   시절의 값인데, 사이클 변속·중장거리 페이스·펜싱 등 **아래키가 뜻을 갖는 종목이 6개**
   생기면서 ▼ 한 번에 '기어 내림 + 스퍼트'가 동시에 일어났다.
   화면 버튼(▼)도 같은 코드를 쓰므로 모바일에서는 이걸 피할 방법이 아예 없었다. */
const SOLO_KEYS = { left:['KeyA','ArrowLeft'], right:['KeyD','ArrowRight'],
                    action:['Space','KeyK','Enter'],
                    up:['KeyW','ArrowUp'], down:['KeyX','KeyS','ArrowDown'] };

/* 겹치면 로드할 때 실패한다 — 조용히 두 동작이 같이 일어나는 건 화면만 봐서는 못 잡는다 */
(function checkSoloKeyOverlap(){
  const dir = new Set([...SOLO_KEYS.up, ...SOLO_KEYS.down]);
  const bad = SOLO_KEYS.action.filter(c=>dir.has(c));
  if(bad.length) throw new Error('SOLO_KEYS: 액션과 방향이 겹친다 — '+bad.join(' '));
})();

const PARTY_COLOR = ['#5aaaff','#ffd75e','#ff6b8a','#8affb0'];
/* 종족은 플레이어마다 다르게 — 누가 누군지 한눈에 */
const PARTY_SPECIES = ['cheetah','kangaroo','elephant','ostrich'];

const Party = {
  count: 1,
  names: ['P1','P2','P3','P4'],
  get on(){ return this.count > 1; },
  color(i){ return PARTY_COLOR[i % PARTY_COLOR.length]; },
  species(i){ return PARTY_SPECIES[i % PARTY_SPECIES.length]; },
  keyLabel(i){ return this.on ? PARTY_KEYS[i].label : 'A/D/←/→ · Space'; },
  udLabel(i){ return this.on ? PARTY_KEYS[i].udLabel : 'W/↑ · X/S/↓'; },
  /* 이 종목이 위/아래를 쓰나 — 클래스에 onUp/onDown 이 있으면 쓴다.
     ⚠ 종목마다 목록에 적으면 새 종목에서 또 빠진다(이 코드베이스가 병렬 목록으로 물린 자리다).
        **구현 자체를 물어본다.** */
  usesUpDown(def){
    if(typeof G==='undefined' || !G.classFor) return false;
    const K = G.classFor(def);
    return !!(K && K.prototype && (K.prototype.onUp || K.prototype.onDown));
  },

  /* 이번 프레임에 i번 플레이어가 act 를 눌렀나 */
  pressed(i, act){
    if(!this.on && i===0) return SOLO_KEYS[act].some(c=>Input.pressBuf[c]);
    const k=PARTY_KEYS[i]; return k ? !!Input.pressBuf[k[act]] : false;
  },
  /* 이 프레임에 눌린 그 키의 **실제 시각**(performance.now 기준).
     ⚠ 판정은 프레임 시각으로 하고 있었다 — PERFECT 창이 ±19ms 인데 프레임이
        16.7ms 다. 사람이 정확히 쳐도 프레임에 걸려 GOOD 으로 내려앉는다.
        실제 눌린 시각은 이미 Input.pressTime 에 있었는데 아무도 안 썼다. */
  pressAt(i, act){
    const codes = (!this.on && i===0) ? SOLO_KEYS[act]
                : (PARTY_KEYS[i] ? [PARTY_KEYS[i][act]] : []);
    for(const c of codes) if(Input.pressBuf[c] && Input.pressTime[c]!==undefined) return Input.pressTime[c];
    return null;
  },
  released(i, act){
    if(!this.on && i===0) return SOLO_KEYS[act].some(c=>Input.relBuf[c]);
    const k=PARTY_KEYS[i]; return k ? !!Input.relBuf[k[act]] : false;
  },
  down(i, act){
    if(!this.on && i===0) return SOLO_KEYS[act].some(c=>Input.keys[c]);
    const k=PARTY_KEYS[i]; return k ? !!Input.keys[k[act]] : false;
  },

  /* 종목이 동시 대결인가 턴제인가 */
  modeFor(def){
    if(!def) return 'turn';
    /* ⚠ 계주는 뺐다 — 네 명이 이어 달리는 종목이라 한 사람이 네 구간을 다 뛴다.
       여기에 또 사람을 넣으면 누가 누구인지 알 수 없다. 팀끼리 겨루도록 턴제로. */
    /* 펜싱은 1대1 종목이라 **정확히 2인일 때만** 동시다. 3~4인은 순번제로 각자 AI와 붙는다. */
    if(['fence','rally','grap'].includes(def.kind)) return this.count===2 ? 'versus' : 'turn';
    return ['sprint','middle','hurdles','walk','swim','climb'].includes(def.kind)
      ? 'versus' : 'turn';
  },

  /* ── 턴제 진행 상태 ─────────────────────────────────── */
  turn: 0,            // 지금 누구 차례인가
  marks: [],          // 각자의 기록
  startMatch(){ this.turn=0; this.marks=new Array(this.count).fill(null); },
  recordMark(v, ok){ this.marks[this.turn] = ok ? v : null; },
  get lastTurn(){ return this.turn >= this.count-1; },
  nextTurn(){ this.turn++; },
  /* 기록순 등수 — higher 면 큰 값이 1등 */
  ranking(higher){
    return this.marks.map((v,i)=>({i, v}))
      .sort((a,b)=>{
        if(a.v===null && b.v===null) return 0;
        if(a.v===null) return 1;
        if(b.v===null) return -1;
        return higher ? b.v-a.v : a.v-b.v;
      });
  },
};
