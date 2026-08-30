/* ══════════════════════════════════════════════════════════════════
   화면 — 타이틀 / 종목 선택 / 결과
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 종목 갈래 — 39종목을 가로 캐러셀로 두면 끝까지 38번을 눌러야 한다(실측).
   ⚠ 14종목일 땐 괜찮았고 39종목에서 무너졌다. 갈래로 묶고 격자로 펼친다. */
const EVENT_GROUPS = [
  /* icon 은 발주서와 같은 이름이다. 없으면 글자만 나온다(화면은 안 깨진다). */
  { key:'track', name:'트랙',   icon:'icon-track', kinds:['sprint','middle','hurdles','walk','relay'] },
  { key:'field', name:'필드',   icon:'icon-field', kinds:['jump','throw'] },
  { key:'swim',  name:'수영',   icon:'icon-swim',  kinds:['swim'] },
  { key:'combo', name:'복합',   icon:'icon-combo', kinds:['combined','tri'] },
  /* ⚠ '그 외'가 13개가 되면서 잡동사니가 됐다 — 맞붙는 종목은 성격이 뚜렷하니 뗀다 */
  { key:'duel',  name:'맞대결', icon:'icon-duel',  kinds:['fence','rally','grap'] },
  { key:'other', name:'그 외',  icon:'icon-other', kinds:null },   // 나머지 전부
];
function groupOf(def){
  for(const g of EVENT_GROUPS) if(g.kinds && g.kinds.includes(def.kind)) return g.key;
  return 'other';
}
function eventsInGroup(key){ return EVENTS.filter(e=>groupOf(e)===key); }

/* 결과 화면 제목 — RESULT_STATUS(00_rules)를 전부 덮어야 한다(부팅 때 검사) */
function def_qualifyOf(ev){ return ev && ev.def ? ev.def.qualify : 0; }

const RESULT_TITLE = { OK:'통과', MISSED_QUALIFY:'기준기록 미달', FALSE_START:'부정 출발',
                       DQ:'실격', TIMEOUT:'시간 초과', ALL_FOUL:'세 번 모두 파울' };

const ST = { TITLE:0, SELECT:1, PLAY:2, RESULT:3, MANAGER:4, CAREER:5, SETTINGS:6, NATION:7, SHARE:8 };
/* 실제로 플레이 가능한 종목. 여기 없는 건 선택 화면에서 '준비 중'으로 잠근다.
   ⚠ 목록만 늘려놓고 구현이 없으면 플레이어는 빈 화면을 만난다. */
/* 아케이드(직접 뛰기)에서 조작이 구현된 종목.
   ⚠ 감독 모드는 14종목 전부 돌지만, 아케이드는 화면·조작이 있는 것만 연다.
      목록만 늘리고 구현이 없으면 플레이어는 빈 화면을 만난다. */
const READY = ['sprint100','sprint200','sprint400','hurdles110','hurdles400','steeple3000','marathon','rings',
               'longJump','tripleJump','highJump',
               'shotPut','discus','javelin','hammer','relay4x100',
               'swimFree100','swimBack100','swimBreast100','swimFly100','poleVault','diving','lifting','archery','cycling','rowing','trampoline',
               /* 이 다섯은 감독 모드에만 있고 플레이할 수 없었다 — 2026-08-28 아케이드 개방 */
               'run800','run1500','run5000','walk20k','relay4x400','climbSpeed','fencing','decathlon','triathlon','shooting','heptathlon','swimMedley200','tableTennis','judo','vault','canoe','golf','equestrian','highBar','pentathlon','swimRelay4x100'];

const G = {
  state: ST.TITLE,
  event: null,        // 진행 중인 종목 인스턴스
  def: null,
  sel: 0,             // 종목 선택 커서
  t: 0,
  toastMsg:'', toastAt:-1e9,

  toast(m){ this.toastMsg=m; this.toastAt=this.t; },

  /* ⚠ 이 표는 **한 벌만** 있어야 한다. 10종 경기가 하위 종목을 직접 띄우면서 사본이
     생길 뻔했는데, 오늘 이미 두 번(대회 배율 표·사람 목록 이름) 사본 때문에 한쪽만
     고치는 사고를 냈다. 종목 → 클래스는 여기서만 정한다. */
  classFor(def){
    return def && { sprint100:SprintEvent, sprint200:SprintEvent, sprint400:SprintEvent,
      hurdles110:HurdlesEvent, hurdles400:HurdlesEvent, steeple3000:HurdlesEvent,
      longJump:LongJumpEvent, tripleJump:TripleJumpEvent, highJump:HighJumpEvent,
      shotPut:ShotPutEvent, discus:DiscusEvent, javelin:JavelinEvent, hammer:HammerEvent,
      relay4x100:RelayEvent, relay4x400:RelayEvent,
      swimFree100:SwimEvent, swimBack100:SwimEvent, swimBreast100:SwimEvent, swimFly100:SwimEvent, swimMedley200:SwimEvent, swimRelay4x100:SwimRelayEvent, tableTennis:TableTennisEvent, judo:JudoEvent, vault:VaultEvent, canoe:CanoeEvent, golf:GolfEvent, equestrian:EquestrianEvent, highBar:HighBarEvent,
      poleVault:PoleVaultEvent, diving:DivingEvent, lifting:LiftingEvent, archery:ArcheryEvent,
      cycling:CyclingEvent, rowing:RowingEvent, trampoline:TrampolineEvent,
      climbSpeed:ClimbEvent, fencing:FencingEvent, decathlon:DecathlonEvent, heptathlon:DecathlonEvent, pentathlon:DecathlonEvent, triathlon:TriathlonEvent, shooting:ShootingEvent,
      run800:MiddleEvent, run1500:MiddleEvent, run5000:MiddleEvent, walk20k:MiddleEvent,
      marathon:MiddleEvent, rings:RingsEvent }[def.id];
  },

  start(def, keepMatch){
    this.def = def;
    /* 새 대결이면 기록판을 비운다. 턴 넘김(keepMatch)이면 유지한다. */
    if(Party.on && !keepMatch) Party.startMatch();
    const Klass = this.classFor(def);
    if(!Klass){ this.toast('아직 준비 중인 종목입니다'); this.state=ST.SELECT; return; }
    this.event = new Klass(def);
    if(Ctrl.playPad) Ctrl.playPad(this.event);
    this.newRecord = false;
    /* 종목이 지금 누구 것인지 알려 준다 — 캐릭터·색을 그 사람 것으로 */
    this.event.pIndex = (Party.on && Party.modeFor(def)==='turn') ? Party.turn : 0;
    this.state = ST.PLAY;
  },
  backToSelect(){
    if(Ctrl.playPad) Ctrl.playPad(null); this.state=ST.SELECT; this.event=null; },

  /* ── 진행 ── */
  update(dt){
    this.t += dt*1000;
    switch(this.state){
      case ST.TITLE:  this.updTitle(); break;
      case ST.MANAGER: MG.update(dt); return;      // 감독 모드는 자체 입력 처리(flush 포함)
      case ST.SELECT: this.updSelect(); break;
      case ST.PLAY:   this.updPlay(dt); break;
      case ST.RESULT: this.updResult(); break;
      case ST.CAREER:   this.updCareer(); break;
      case ST.SETTINGS: this.updSettings(); break;
      case ST.NATION: this.updNation(); break;
      case ST.SHARE:  this.updShare(); break;
    }
    if(typeof Tutorial!=='undefined'){
      /* 튜토리얼 중 P 는 **건너뛰기**다 — 두 번째 사람에게 튜토리얼은 벽이다.
         ⚠ 일시정지보다 먼저 잡아 두 동작이 겹치지 않게 한다. */
      if(Tutorial.on && Input.pressed('pause')){ Tutorial.skip(); Sfx.ui(); Input.flush(); return; }
      Tutorial.update();
    }
    Input.flush();
  },

  titleSel:0,
  /* ⚠ 처음 켠 사람에게 기본 선택이 '새 클럽 시작'(감독 모드)이었다 — **한 번도
     뛰어 보지 않은 사람이 24주 경영 시뮬로 바로 들어간다.** 육상 게임을 켠 사람이
     제일 먼저 하고 싶은 건 달리는 것이다. 아무 기록도 없으면 '직접 뛰기'에 손을 둔다. */
  titleDefaulted:false,
  updTitle(){
    /* ⛔ 처음 켠 사람은 두 게임(리듬 아케이드·24주 감독)을 맨몸으로 만난다.
       튜토리얼을 **맨 위**에 둔다 — 이미 해 본 사람에게는 안 보인다. */
    const tut = (typeof Tutorial!=='undefined') && !Tutorial.seen();
    const items = (MG.hasSave() ? 3 : 2) + (tut ? 1 : 0);
    if(!this.titleDefaulted){
      this.titleDefaulted = true;
      const 뛴적있다 = Object.keys(Save.data.best||{}).length > 0;
      if(!MG.hasSave() && !뛴적있다) this.titleSel = 1;      // 0=새 클럽 1=직접 뛰기
    }
    if(Input.pressed('up'))   { this.titleSel=(this.titleSel+items-1)%items; Sfx.ui(); }
    if(Input.pressed('down')) { this.titleSel=(this.titleSel+1)%items; Sfx.ui(); }
    /* 커리어 화면 — 쌓인 걸 볼 데가 있어야 모으는 의미가 생긴다 */
    if(Input.pressed('up')&&false){}
    if(Input.keys['KeyB']&&!this._bLatch){ this._bLatch=true; this.state=ST.CAREER; Sfx.ui(); }
    if(!Input.keys['KeyB']) this._bLatch=false;
    if(Input.pressed('pause')){ this.state=ST.SETTINGS; this.setSel=0; Sfx.ui(); }
    /* 언어 전환 — 출시 대상이 스팀·모바일이라 게임 안에서 바꿀 수 있어야 한다 */
    if(Input.pressed('left')||Input.pressed('right')){
      if(typeof setLang==='function'){ setLang(LANG==='ko'?'en':'ko'); Sfx.ui(); }
    }
    if(Input.pressed('action')){
      Sfx.ui();
      /* 튜토리얼이 있으면 0번이다 — 나머지는 한 칸씩 밀린다 */
      if(tut && this.titleSel===0){ Tutorial.start(); return; }
      const off = tut ? 1 : 0;
      const hasSave=MG.hasSave();
      const pick = hasSave ? (this.titleSel-off) : (this.titleSel-off+1);   // 0=이어하기 1=새 클럽 2=직접 뛰기
      if(pick===0){ MG.load() ? this.state=ST.MANAGER : MG.newGame() || (this.state=ST.MANAGER); this.state=ST.MANAGER; }
      else if(pick===1){ this.state=ST.NATION; this.natSel=0; }   // 새 클럽 → 국가부터 고른다
      else this.state=ST.SELECT;
    }
  },

  selGroup: 0,
  get selEvents(){ return eventsInGroup(EVENT_GROUPS[this.selGroup].key); },
  /* this.sel 은 **갈래 안의 자리**다. 갈래를 바꾸면 범위 안으로 접는다. */
  clampSel(){ const n=this.selEvents.length; if(n) this.sel=clamp(this.sel,0,n-1); else this.sel=0; },
  updSelect(){
    const COLS=5;
    const list=this.selEvents, n=list.length;
    if(Input.pressed('left')){ this.sel=(this.sel+n-1)%n; Sfx.ui(); }
    if(Input.pressed('right')){ this.sel=(this.sel+1)%n; Sfx.ui(); }
    /* ▲▼ 는 격자의 위아래 줄. 맨 윗줄에서 ▲ 를 더 누르면 **앞 갈래**로 넘어간다 —
       갈래 전환에 별도 키를 두면 아무도 안 쓴다(인원 조절이 ▲▼ 를 쓰던 자리라 Q/E 로 옮겼다). */
    if(Input.pressed('up')){
      if(this.sel>=COLS){ this.sel-=COLS; }
      else { this.selGroup=(this.selGroup+EVENT_GROUPS.length-1)%EVENT_GROUPS.length;
             this.sel=0; this.clampSel(); }
      Sfx.ui();
    }
    if(Input.pressed('down')){
      if(this.sel+COLS < n){ this.sel+=COLS; }
      else { this.selGroup=(this.selGroup+1)%EVENT_GROUPS.length; this.sel=0; this.clampSel(); }
      Sfx.ui();
    }
    /* 인원 — [ ] 로. 종목 고르는 자리에서 바로 정한다(따로 화면을 파면 아무도 안 들어간다).
       ⚠ 처음엔 Q/E 로 뒀는데 **Q 가 '뒤로'와 겹쳐서**(map.back = Escape·KeyQ·Backspace)
          인원을 줄이려다 화면이 통째로 나가 버렸다. 안 겹치는 키를 쓴다. */
    if(Input.keys['BracketRight'] && !this._eLatch){ this._eLatch=true; Party.count=Math.min(4,Party.count+1); Sfx.ui(); }
    if(!Input.keys['BracketRight']) this._eLatch=false;
    if(Input.keys['BracketLeft'] && !this._qLatch){ this._qLatch=true; Party.count=Math.max(1,Party.count-1); Sfx.ui(); }
    if(!Input.keys['BracketLeft']) this._qLatch=false;
    /* 캐릭터 모드 — **경기 직전 이 자리에서** 고른다(CK: 경기 할 때만 고른다).
       ⚠ 다른 키와 안 겹치는 M 을 쓴다. 감독 화면에는 이 키가 없다 — 거기선 안 바뀐다. */
    if(Input.keys['KeyM'] && !this._mLatch){
      this._mLatch=true;
      if(typeof CharMode!=='undefined'){ CharMode.toggle(); Sfx.ui(); }
    }
    if(!Input.keys['KeyM']) this._mLatch=false;
    this.clampSel();
    if(Input.pressed('action')){
      const def=this.selEvents[this.sel]; if(!def) return;
      if(!READY.includes(def.id)){ this.toast('아직 준비 중인 종목입니다'); Sfx.beep(180,0.12,'sawtooth',0.12); return; }
      Sfx.ui(); this.start(def);
    }
    if(Input.pressed('back')){ this.state=ST.TITLE; Sfx.ui(); }
  },

  updPlay(dt){
    const ev=this.event, now=ev.t;
    /* 이 프레임이 끝나면 경기 시각은 여기가 된다 — 키가 눌린 순간을 여기서 되짚는다.
       ⚠ 예전엔 ev.t(이전 프레임 시각)를 그대로 판정에 넣었다. 한 프레임 늦고
          16.7ms 로 뭉갠 값이다. PERFECT 창(±19ms)과 거의 같은 크기의 잡음이었다. */
    const evEnd = now + dt*1000;
    const at = (p, act)=>{
      const pt = Party.pressAt ? Party.pressAt(p, act) : null;
      if(pt===null || Input.frameNow===undefined) return Math.round(now);
      return Math.round(clamp(evEnd - (Input.frameNow - pt), now - 40, evEnd));
    };
    /* ⚠ 입력을 '플레이어별'로 라우팅한다. 종목은 pIdx 를 받아 자기 선수에게 넘긴다.
       턴제 종목은 지금 차례인 사람만 조작한다 — 남의 차례에 눌러도 안 먹는다. */
    const versus = Party.on && Party.modeFor(this.def)==='versus';
    const lo = versus ? 0 : (Party.on ? Party.turn : 0);
    const hi = versus ? Party.count-1 : lo;
    for(let p=lo; p<=hi; p++){
      if(Party.pressed(p,'left'))  ev.onStride(-1, at(p,'left'), p);
      if(Party.pressed(p,'right')) ev.onStride( 1, at(p,'right'), p);
      if(Party.pressed(p,'action')) ev.onAction(at(p,'action'), p);
      if(Party.released(p,'action') && ev.onActionUp) ev.onActionUp(Math.round(now), p);
      /* 위/아래 — 사이클 변속처럼 종목이 쓰면 넘긴다 */
      if(ev.onUp   && Party.pressed(p,'up'))   ev.onUp(Math.round(now), p);
      if(ev.onDown && Party.pressed(p,'down')) ev.onDown(Math.round(now), p);
    }
    if(Input.pressed('pause')||Input.pressed('back')){ this.backToSelect(); Sfx.ui(); return; }
    ev.update(dt);
    if(ev.phase==='DONE' && now - ev.doneAt > 1100){
      // 기록 갱신 확인
      const r=ev.result;
      if(r.status==='OK'){
        /* 일일 도전(4B_daily) — 아케이드에서 그냥 뛰어도 오늘 종목이면 담긴다.
           ⚠ 따로 '일일 도전 모드'에서만 인정하면 같은 경기를 두 번 뛰게 된다. */
        if(typeof Daily!=='undefined' && Daily.pending(this.def.id))
          Daily.record(this.def.id, r.value, r.status);
        this.newRecord = Save.record(this.def.id, r.value, this.def.higher);
        /* 관중은 한 겹이 아니다 — 신기록엔 함성, 실패엔 탄식. 소리 정체성의 절반이 관중이다. */
        if(this.newRecord){ Sfx.record(); Sfx.roar(); }
        else if(r.rank===1) Sfx.roar();
      } else {
        this.newRecord=false;
        if(typeof Daily!=='undefined' && Daily.pending(this.def.id))
          Daily.record(this.def.id, r.value, r.status);
        if(r.status!=='OK') Sfx.gasp();
      }
      /* 턴제 — 아직 남은 사람이 있으면 같은 종목을 다음 사람으로 다시 시작한다 */
      if(Party.on && Party.modeFor(this.def)==='turn'){
        Party.recordMark(r.value, r.status==='OK');
        if(!Party.lastTurn){
          Party.nextTurn();
          this.start(this.def, true);         // keepMatch — 기록을 안 지운다
          return;
        }
      }
      /* 커리어 — 판을 넘어 쌓인다. 기록 하나만 남고 끝나면 다시 켤 이유가 없다.
         ⛔ 그런데 **랭크가 오르거나 뱃지를 딸 때만** 화면에 뭔가 떴다.
            실측: 한 판이 기준 통과 12 CP · 미달 4 · 개인 최고 +25 인데 다음 랭크는 300 이다
            → 팝업은 **10~25판에 한 번**. 그 사이의 판들은 아무것도 안 쌓이는 것처럼 보인다.
            시스템은 그대로 두고 **번 것을 결과 화면에 적는다** — 얼마를 벌었는지 모르면
            쌓이는 줄도 모른다. 그래서 앞뒤로 재 둔다. */
      const cp0 = (typeof Career!=='undefined') ? Career.d.cp : 0;
      if(typeof Career!=='undefined'){
        const ok = r.status==='OK' && (this.def.higher ? r.value>=this.def.qualify : r.value<=this.def.qualify);
        const tier = (ev.player && ev.player.tier) || 0;
        Career.finishRace(this.def, ok, this.newRecord, tier);
      }
      this.cpGain = (typeof Career!=='undefined') ? Career.d.cp - cp0 : 0;
      this.state=ST.RESULT; this.resultAt=this.t;
    }
  },

  /* 커리어 알림 — 랭크가 오르거나 뱃지를 땄을 때 결과 화면 위에 겹쳐 띄운다 */
  drawCareerPops(u){
    if(typeof Career==='undefined') return;
    /* ⚠ 신기록 띠가 떠 있는 동안엔 **집지도 않는다** — 집으면 Career.take() 가 비워져
       띠가 끝난 뒤에 보여 줄 것이 없어진다. */
    if(this.newRecord && (this.t - this.resultAt) < 2600) return;
    if(!this._pops || !this._pops.length){
      const got = Career.take();
      if(got.length){ this._pops = got; this._popAt = this.t; }
    }
    if(!this._pops || !this._pops.length) return;
    const age = this.t - this._popAt;
    if(age > 2600){ this._pops.shift(); this._popAt = this.t; return; }
    const p = this._pops[0];
    const a = age<220 ? age/220 : (age>2300 ? (2600-age)/300 : 1);
    u.save(); u.globalAlpha = clamp(a,0,1);
    /* ⚠ y=44 였다 — 종목 이름(56)과 결과 숫자(82)를 덮었다. 커리어 줄 바로 위로 내린다.
       (줄은 팝업이 떠 있는 동안 자리를 비켜 준다 — drawCareerLine 참고) */
    const w=230, x=VW/2-w/2, y=(Ctrl.mode==='touch'? VH-100 : VH-76);
    plate(u, x, y, w, 40, .92);
    u.strokeStyle = p.kind==='rank' ? p.rank.color : PAL.gold;
    u.lineWidth=2; u.strokeRect(x+.5,y+.5,w-1,39);
    if(p.kind==='rank'){
      /* 별이 모여 하나로 — 랭크는 35시즌에 다섯 번 오르는 게 전부다.
         ⚠ 이 팝업은 이미 age(=this.t - this._popAt)를 갖고 있다. 새 시간을 만들지 말 것 —
            두 벌이 되면 어긋난다. */
      if(age < 1200)
        BG.fx(u, 'fx-rank-up', VW/2, y+34, 44, clamp(age/1200, 0, 0.999), 5);
      txt(u, '랭크 상승', VW/2, y+6, 9, PAL.dim, 'center');
      /* 뱃지가 있으면 이름 왼쪽에 — 랭크 상승은 이 게임에서 제일 드문 순간이다 */
      const ri = RANKS.indexOf(p.rank);
      const im = (ri>=0) ? BG.get(RANK_ICON[ri]) : null;
      if(im){ u.drawImage(im, VW/2-58, y+14, 22, 22);
              txt(u, p.rank.name, VW/2+8, y+18, 16, p.rank.color, 'center', 700); }
      else    txt(u, p.rank.name, VW/2, y+18, 16, p.rank.color, 'center', 700);
    } else {
      txt(u, p.badge.icon+'  '+p.badge.name, VW/2, y+7, 13, PAL.gold, 'center', 700);
      txt(u, p.badge.desc, VW/2, y+24, 9, PAL.dim, 'center');
    }
    u.restore();
  },

  updCareer(){
    /* ⚠ 공유 카드(45_share.js)는 다 만들어 놓고 **어디에서도 닿을 수 없었다** —
       스크립트 태그조차 없었다. 있는데 못 가는 건 없는 것과 같다. */
    if(Input.pressed('up')||Input.pressed('down')){ this.openShare(); return; }
    if(Input.pressed('back')||Input.pressed('action')||Input.pressed('pause')){
      this.state=ST.TITLE; Sfx.ui();
    }
  },
  openShare(){
    if(typeof Share==='undefined'){ this.toast('공유 카드를 불러오지 못했습니다'); return; }
    try{ this.shareCv = Share.build(); }
    catch(e){ this.toast('공유 카드를 만들지 못했습니다'); return; }
    this.shareSaved = false; this.state = ST.SHARE; Sfx.ui();
  },
  updShare(){
    if(Input.pressed('action')){
      /* 내려받기는 **덤**이다 — iframe 안에서는 막힐 수 있어서 화면 카드가 주 경로다 */
      const ok = Share.download();
      this.shareSaved = true;
      this.toast(ok ? '이미지를 내려받았습니다' : '화면을 캡처해 공유하세요');
      Sfx.ui(); return;
    }
    if(Input.pressed('back')||Input.pressed('pause')){ this.state=ST.CAREER; Sfx.ui(); }
  },
  drawShare(ctx,uctx){
    ctx.fillStyle='#05070c'; ctx.fillRect(0,0,VW,VH);
    const cv=this.shareCv;
    if(!cv){ txt(uctx,'카드를 만들지 못했습니다', VW/2, VH/2, 12, PAL.red,'center',700); return; }
    /* 9:16 카드를 16:9 화면에 — 세로를 꽉 채우고 가운데 */
    const h = VH-30, w = Math.round(h * cv.width/cv.height);
    const x = Math.round(VW/2 - w/2), y = 8;
    uctx.imageSmoothingEnabled = true;
    uctx.drawImage(cv, x, y, w, h);
    uctx.strokeStyle='rgba(255,215,94,.5)'; uctx.lineWidth=1;
    uctx.strokeRect(x-.5, y-.5, w+1, h+1);
    txt(uctx,'공유 카드', 10, 10, 11, PAL.gold,'left',700);
    txt(uctx,'스크린샷으로 공유하세요', 10, 24, 9, PAL.dim,'left');
    txt(uctx, '확인 내려받기  ·  취소 돌아가기', VW/2, VH-14, 9, PAL.dim,'center');
  },
  drawCareer(ctx,uctx){
    Track.drawBack(ctx, 40, 100);
    ctx.fillStyle='rgba(5,6,10,.80)'; ctx.fillRect(0,0,VW,VH);
    const C=Career, R=C.rank;
    /* 엠블럼 — 이 화면은 '내가 쌓아 온 것'이라 브랜드 마크가 있어야 할 자리다.
       어셋이 없으면 아무것도 안 그린다. */
    uctx.save(); uctx.globalAlpha=0.13;
    BG.obj(uctx, 'brand-emblem', VW-56, VH-14, 96);
    uctx.restore();
    plate(uctx, 0, 0, VW, 22, .86);
    txt(uctx,'커리어', 8, 5, 13, PAL.gold,'left',700);
    txt(uctx, `${C.d.races}경기 · 최고 ${C.d.pbs}회 · 금 ${C.d.golds} · 시즌 ${C.d.seasons}`,
        VW-30, 6, 9, PAL.dim,'right');
    /* 랭크 */
    const bw=VW-64, bx=32, by=44;
    txt(uctx, R.name, bx, by-13, 15, R.color,'left',700);
    const nc=C.nextCp;
    txt(uctx, nc===null? `CP ${C.d.cp}` : `CP ${C.d.cp} / ${nc}`, bx+bw, by-11, 10, PAL.dim,'right');
    uctx.fillStyle='rgba(255,255,255,.12)'; uctx.fillRect(bx,by,bw,7);
    uctx.fillStyle=R.color; uctx.fillRect(bx,by,Math.round(bw*C.progress),7);
    /* 계단 눈금 — 다음이 어디인지 보인다 */
    RANKS.forEach((r,i)=>{
      if(i===0) return;
      const last=RANKS[RANKS.length-1].cp;
      const x=bx+Math.round(bw*Math.min(1,r.cp/last));
      uctx.fillStyle='rgba(255,255,255,.28)'; uctx.fillRect(x,by-2,1,11);
    });
    /* 뱃지 격자 */
    txt(uctx, `뱃지 ${C.badgeCount()} / ${BADGES.length}`, 32, 66, 10, PAL.white,'left',700);
    /* ⚠ 6열 68px 로 짰더니 영어 뱃지 이름이 칸을 넘쳐 옆 칸과 겹쳤다(실측).
       3열로 넓히고, 칸 밖으로 나가지 않게 clip 으로 가둔다 —
       어떤 언어가 와도 옆 칸을 침범하지 않는다. */
    const cols=3, cw=138, ch=32, gx=32, gy=80;
    BADGES.forEach((b,i)=>{
      const x=gx+(i%cols)*cw, y=gy+((i/cols)|0)*ch;
      const got=!!C.d.badges[b.id];
      const w=cw-8, h=ch-6;
      uctx.fillStyle = got? 'rgba(255,215,94,.14)' : 'rgba(255,255,255,.045)';
      uctx.fillRect(x,y,w,h);
      uctx.strokeStyle = got? PAL.gold : '#3a4258'; uctx.lineWidth=1;
      uctx.strokeRect(x+.5,y+.5,w-1,h-1);
      uctx.save(); uctx.beginPath(); uctx.rect(x+2,y+1,w-4,h-2); uctx.clip();
      txt(uctx, got? b.icon : '·', x+6, y+3, 12, got?PAL.gold:PAL.dim,'left',700);
      txt(uctx, b.name, x+20, y+4, 9, got?PAL.white:PAL.dim,'left', got?700:400);
      txt(uctx, got? b.desc : '???', x+20, y+16, 7, PAL.dim,'left');
      uctx.restore();
    });
    /* ⚠ 안내 문구를 두 줄 겹쳐 그리고 있었다(VH-14 와 VH-12) — 화면에서 글자가 서로
       뭉개져 '돌아가기'가 두 번 겹쳐 보였다. 한 줄이면 된다. */
    txt(uctx,'▲▼ 공유 카드   ·   확인/취소 돌아가기', VW/2, VH-13, 9, PAL.dim,'center');
  },

  /* ── 설정 ────────────────────────────────────────────
     ⚠ 소리는 setMuted() 함수만 있고 UI 가 없었다. 언어·조작도 흩어져 있었다.
     한 화면에 모은다 — 출시 기본기다. */
  setSel:0,
  get settingRows(){
    return [
      { k:'vol',  label:'효과음',   get:()=>Sfx.vol,    set:(v)=>Sfx.setVol(v) },
      { k:'amb',  label:'관중 소리', get:()=>Sfx.ambVol, set:(v)=>Sfx.setAmb(v) },
      { k:'bgm',  label:'음악',     get:()=>(typeof Music!=='undefined'?Music.vol:0),
                                    set:(v)=>{ if(typeof Music!=='undefined') Music.setVol(v); } },
      { k:'mute', label:'음소거',   toggle:true },
      /* 박자 안내 — 리듬을 익힌 사람에겐 잔소리다. 끌 수 있어야 한다. */
      { k:'metro', label:'박자 소리', toggle:true },
      { k:'lang', label:'언어',     toggle:true },
      { k:'ctrl', label:'조작',     toggle:true },
      /* ⚠ 종목 선택에서 인원은 [ ] 키로 바꾼다 — 화면 버튼에는 그 키가 없다.
         터치로만 하는 사람이 2인 플레이를 아예 못 켜면 안 되므로 여기에도 둔다. */
      { k:'party', label:'인원',    toggle:true },
      { k:'back', label:'돌아가기', action:true },
    ];
  },
  updSettings(){
    const rows=this.settingRows, n=rows.length;
    if(Input.pressed('up'))   { this.setSel=(this.setSel+n-1)%n; Sfx.ui(); }
    if(Input.pressed('down')) { this.setSel=(this.setSel+1)%n; Sfx.ui(); }
    const r=rows[this.setSel];
    const dLeft=Input.pressed('left'), dRight=Input.pressed('right');
    if(r.set && (dLeft||dRight)){
      r.set(clamp(r.get() + (dRight?0.1:-0.1), 0, 1));
      Sfx.ui();
    }
    if(Input.pressed('action')||((dLeft||dRight)&&r.toggle)){
      if(r.k==='mute'){ Sfx.toggleMute(); }
      else if(r.k==='metro'){ Sfx.metroOn = !(Sfx.metroOn!==false); Sfx.savePrefs(); }
      else if(r.k==='lang'){ if(typeof setLang==='function') setLang(LANG==='ko'?'en':'ko'); }
      else if(r.k==='ctrl'){ Ctrl.set(Ctrl.mode==='touch'?'keyboard':'touch'); }
      else if(r.k==='party'){
        Party.count = dLeft ? Math.max(1,Party.count-1) : Math.min(4,Party.count+1);
      }
      else if(r.k==='back'){ this.state=ST.TITLE; }
      Sfx.ui();
    }
    if(Input.pressed('back')||Input.pressed('pause')){ this.state=ST.TITLE; Sfx.ui(); }
  },
  drawSettings(ctx,uctx){
    Track.drawBack(ctx, 40, 100);
    ctx.fillStyle='rgba(5,6,10,.82)'; ctx.fillRect(0,0,VW,VH);
    plate(uctx, 0, 0, VW, 22, .86);
    /* 제목 옆 아이콘 — 어셋이 없으면 글자만 나온다(예전 그대로) */
    { const im=BG.get('ic-settings');
      if(im){ uctx.drawImage(im, 8, 4, 13, 13); txt(uctx,'설정', 25, 5, 13, PAL.gold,'left',700); }
      else txt(uctx,'설정', 8, 5, 13, PAL.gold,'left',700); }
    const rows=this.settingRows;
    const x=64, w=VW-128;
    /* ⚠ 줄 간격 28px 는 7줄 기준이었다 — '박자 소리'를 넣자 마지막 줄이 하단
       안내와 겹쳤다. 줄 수에 맞춰 간격을 계산한다(항목이 또 늘어도 안 겹친다). */
    const top=40, bot=VH-24;
    const gap=Math.min(28, Math.floor((bot-top)/rows.length));
    const rh=gap-4;
    rows.forEach((r,i)=>{
      const y=top+i*gap, on=i===this.setSel;
      uctx.fillStyle = on?'rgba(255,215,94,.16)':'rgba(22,26,38,.7)';
      uctx.fillRect(x,y,w,rh);
      uctx.strokeStyle = on?PAL.gold:'#3a4258'; uctx.lineWidth=1;
      uctx.strokeRect(x+.5,y+.5,w-1,rh-1);
      const ty=y+Math.round((rh-11)/2)-1;
      txt(uctx, r.label, x+10, ty, 11, on?PAL.gold:PAL.white,'left',on?700:400);
      if(r.set){
        const bw=120, bx=x+w-bw-40, by=y+Math.round(rh/2)-3, v=r.get();
        uctx.fillStyle='rgba(255,255,255,.14)'; uctx.fillRect(bx,by,bw,6);
        uctx.fillStyle=Sfx.muted?PAL.dim:PAL.green; uctx.fillRect(bx,by,Math.round(bw*v),6);
        txt(uctx, Math.round(v*100)+'%', x+w-10, ty, 10, PAL.dim,'right');
      } else if(r.k==='mute'){
        txt(uctx, Sfx.muted?'켜짐':'꺼짐', x+w-10, ty, 11, Sfx.muted?PAL.red:PAL.dim,'right',700);
      } else if(r.k==='metro'){
        txt(uctx, Sfx.metroOn!==false?'켜짐':'꺼짐', x+w-10, ty, 11,
            Sfx.metroOn!==false?PAL.green:PAL.dim,'right',700);
      } else if(r.k==='lang'){
        txt(uctx, LANG==='ko'?'한국어':'English', x+w-10, ty, 11, PAL.blue,'right',700);
      } else if(r.k==='ctrl'){
        txt(uctx, Ctrl.mode==='touch'?'화면 버튼':'키보드', x+w-10, ty, 11, PAL.blue,'right',700);
      } else if(r.k==='party'){
        txt(uctx, Party.count+K('인'), x+w-10, ty, 11,
            Party.count>1?PAL.gold:PAL.blue,'right',700);
      }
    });
    txt(uctx,'▲▼ 이동 · ◀▶ 조절 · 확인 전환 · 취소 돌아가기', VW/2, VH-16, 9, PAL.dim,'center');
  },

  /* ── 여러 명일 때의 결과 ────────────────────────────
     ⚠ 1인용 결과판은 '내 기록 하나'만 보여준다. 여러 명이면 **누가 이겼나**가
        전부다 — 등수부터 큼직하게. */
  drawVersusResult(u){
    const def=this.def, ev=this.event;
    const versus = Party.modeFor(def)==='versus';
    /* 기록 모으기 */
    let rows;
    if(versus){
      /* ⚠ 종목마다 사람 목록의 이름이 달라 하나만 보다가 수영에서 터졌고, 중장거리를
         붙일 때 **세 번째 이름(runners)** 이 생겼다. 이름을 늘리는 대신 정본 접근자
         `ev.people` 을 종목마다 달았다 — 여기는 그것만 본다. */
      const ppl = ev.people || [];
      rows = ppl.map((h,i)=>({ i, v: (h.dq||!h.finished) ? null : h.finishTimeS }));
      rows.sort((a,b)=> a.v===null ? 1 : b.v===null ? -1 : a.v-b.v);
    } else {
      rows = Party.ranking(!!def.higher);
    }
    u.fillStyle='rgba(5,6,10,.80)'; u.fillRect(0,0,VW,VH);
    txt(u, def.name, VW/2, 16, 13, PAL.dim, 'center');
    const win = rows[0];
    txt(u, 'P'+(win.i+1)+' 승리', VW/2, 34, 22, PARTY_COLOR[win.i], 'center', 700);
    const x=90, w=VW-180;
    rows.forEach((r,k)=>{
      const y=74+k*30;
      u.fillStyle = k===0 ? 'rgba(255,215,94,.16)' : 'rgba(22,26,38,.75)';
      u.fillRect(x,y,w,26);
      u.fillStyle = PARTY_COLOR[r.i]; u.fillRect(x,y,3,26);
      txt(u, (k+1)+'위', x+12, y+7, 12, k===0?PAL.gold:PAL.dim, 'left', 700);
      txt(u, 'P'+(r.i+1), x+46, y+7, 13, PARTY_COLOR[r.i], 'left', 700);
      const val = r.v===null ? '기록 없음'
        : (v=>v + (def.unit==='s' && needsSec(v) ? K('초') : ''))(fmtRec(def, r.v));
      txt(u, val, x+w-12, y+6, 14, r.v===null?PAL.dim:PAL.white, 'right', 700);
    });
    txt(u, '확인 다시   ·   취소 종목 선택', VW/2, VH-16, 9, PAL.dim, 'center');
  },

  /* ── 국가 선택 ──────────────────────────────────────
     ⚠ 새 클럽을 시작할 때 처음 정하는 것. 이 나라가 클럽 이름이 되고,
        선수 대부분이 이 나라 사람이 되고, 메달표에 이 나라로 오른다. */
  natSel:0,
  updNation(){
    const N=NATIONS.length, cols=8;
    if(Input.pressed('left'))  { this.natSel=(this.natSel+N-1)%N; Sfx.ui(); }
    if(Input.pressed('right')) { this.natSel=(this.natSel+1)%N; Sfx.ui(); }
    if(Input.pressed('up'))    { this.natSel=(this.natSel+N-cols)%N; Sfx.ui(); }
    if(Input.pressed('down'))  { this.natSel=(this.natSel+cols)%N; Sfx.ui(); }
    if(Input.pressed('action')){
      /* ⚠ MG.newGame() 은 끝에서 곧바로 저장한다 — 기존 세이브가 **말없이 사라진다.**
         쌓아 온 클럽이 오조작 한 번에 날아가면 안 된다. 세이브가 있으면 한 번 묻는다. */
      if(MG.hasSave() && !this.natConfirm){ this.natConfirm=true; Sfx.beep(420,0.1,'square',0.12); return; }
      this.natConfirm=false;
      MG.newGame(null, null, NATIONS[this.natSel].code);
      this.state=ST.MANAGER; Sfx.ui();
    }
    if(Input.pressed('back')){
      if(this.natConfirm){ this.natConfirm=false; Sfx.ui(); return; }
      this.state=ST.TITLE; Sfx.ui();
    }
  },
  drawNation(ctx,uctx){
    Track.drawBack(ctx, 40, 100);
    ctx.fillStyle='rgba(5,6,10,.84)'; ctx.fillRect(0,0,VW,VH);
    plate(uctx, 0, 0, VW, 22, .86);
    txt(uctx,'어느 나라를 대표합니까', 8, 5, 13, PAL.gold,'left',700);
    /* ⛔ 40개 / 8열 = 5줄인데 줄 간격이 44 였다 → 5행이 y 210~238 을 쓰고,
       아래 나라 이름이 VH-42(=228) 에서 17px 로 그려져 **국기 위에 얹혔다**(실측 10px).
       간격을 40 으로 좁히고 격자를 4px 올린다 — 5행이 190~218 에서 끝나 10px 이 남는다.
       ⚠ 나라가 늘면 여기가 다시 부딪힌다. 줄 수에 맞춰 계산한다. */
    const cols=8, fw=46, fh=28, gx=18, gy=30;
    const rows = Math.ceil(NATIONS.length/cols);
    /* 아래 이름표(VH-42)까지 10px 을 비운다. 나라가 늘면 간격이 알아서 좁아진다 —
       숫자를 손으로 다시 맞출 자리를 없앤다. */
    const step = Math.min(40, Math.floor((VH-52-gy)/Math.max(1,rows)));
    NATIONS.forEach((n,i)=>{
      const x=gx+(i%cols)*(fw+10), y=gy+((i/cols)|0)*step;
      const on=i===this.natSel;
      if(on){ uctx.fillStyle='rgba(255,215,94,.25)'; uctx.fillRect(x-3,y-3,fw+6,fh+6); }
      drawFlag(uctx, x, y, fw, fh, n.code);
      if(on){ uctx.strokeStyle=PAL.gold; uctx.lineWidth=2; uctx.strokeRect(x-2.5,y-2.5,fw+5,fh+5); }
    });
    const sel=NATIONS[this.natSel];
    txt(uctx, nationName(sel.code), VW/2, VH-42, 17, PAL.gold, 'center', 700);
    txt(uctx, sel.code, VW/2, VH-24, 10, PAL.dim, 'center');
    txt(uctx,'◀▶▲▼ 고르고 확인으로 시작   ·   취소 돌아가기', VW/2, VH-13, 9, PAL.dim,'center');
    /* 덮어쓰기 경고 — 되돌릴 수 없는 일은 반드시 한 번 묻는다 */
    if(this.natConfirm){
      uctx.fillStyle='rgba(5,6,10,.88)'; uctx.fillRect(0,0,VW,VH);
      txt(uctx,'이미 저장된 클럽이 있습니다', VW/2, 88, 14, PAL.red,'center',700);
      txt(uctx,'새로 시작하면 그 클럽은 사라집니다', VW/2, 110, 12, PAL.white,'center');
      txt(uctx,'확인 다시 누르면 새로 시작 · 취소로 돌아가기', VW/2, 140, 11, PAL.dim,'center');
    }
  },

  updResult(){
    if(this.t - this.resultAt < 350) return;      // 입력 씹힘 방지 — 결과가 뜨자마자 넘어가지 않게
    /* 감독 모드가 빌려 쓰는 중이면 결과를 넘겨주고 돌아간다 */
    if(this.mgHook){
      if(Input.pressed('action')||Input.pressed('back')||Input.pressed('pause')){
        const hook=this.mgHook; this.mgHook=null; Sfx.ui();
        this.state = ST.MANAGER;
        hook(this.event ? this.event.result : null, this.playQuality());
      }
      return;
    }
    if(Input.pressed('action')){ Sfx.ui(); this.start(this.def); }
    if(Input.pressed('back')||Input.pressed('pause')){ Sfx.ui(); this.backToSelect(); }
  },

  /* ── 감독 모드 ↔ 아케이드 다리 ─────────────────────────────
     '직접 뛰기'를 고른 종목은 여기로 온다. 아케이드를 그대로 띄우고,
     끝나면 **손놀림의 품질**만 감독 모드로 돌려준다.

     ⛔ 왜 기록 자체를 안 넘기나: 아케이드는 기본 스탯으로 달린다. 그 기록을
        그대로 쓰면 **선수를 키운 의미가 사라진다**(누가 뛰든 같은 기록).
        시뮬레이션(선수 스탯)이 기본 기록을 정하고, 내 손은 그 위에 ±4% 를 얹는다.
        키운 만큼 빠르고, 잘 친 만큼 더 빠르다 — 두 재미가 곱해진다. */
  playForManager(def, onDone){
    this.mgHook = onDone;
    this.start(def);
  },
  /* 이번 판을 얼마나 잘 쳤나 — 0(엉망) ~ 1(완벽). 스탯과 무관한 순수 손놀림. */
  playQuality(){
    const ev=this.event; if(!ev) return 0.5;
    const p = ev.player || (ev.runners && ev.runners[0]) || (ev.climbers && ev.climbers[0]);
    const j = p && p.judge;
    if(j){
      const good = (j.PERFECT|0)*1 + (j.GOOD|0)*0.55;
      const all  = (j.PERFECT|0)+(j.GOOD|0)+(j.EARLY|0)+(j.LATE|0)+(j.REPEAT|0)+(j.SPAM|0);
      if(all >= 5) return clamp(good/all, 0, 1);
    }
    /* 판정이 없는 종목(점수제)은 기준기록 대비로 본다 */
    const r=ev.result;
    if(r && r.value>0 && r.value<DNF && def_qualifyOf(ev)){
      const q=def_qualifyOf(ev);
      const ratio = ev.def.higher ? r.value/q : q/r.value;
      return clamp((ratio-0.8)/0.45, 0, 1);
    }
    return 0.5;
  },

  /* ── 그리기 ── */
  draw(ctx, uctx){
    /* ⚠ 바탕칠은 '배경층'이 한다. 예전엔 여기서 게임 캔버스를 통째로 검게 칠했는데,
       게임 캔버스가 배경층 위에 있어서 고해상도 배경이 무조건 가려졌다(실측).
       게임 캔버스는 투명하게 비우고, 그 위에 픽셀 요소만 올린다. */
    ctx.clearRect(0,0,VW,VH);
    if(Screen.bctx){ Screen.bctx.fillStyle=PAL.black; Screen.bctx.fillRect(0,0,VW,VH); }
    switch(this.state){
      case ST.TITLE:  this.drawTitle(ctx,uctx); break;
      case ST.MANAGER: MG.draw(ctx,uctx); break;
      case ST.CAREER: this.drawCareer(ctx,uctx); break;
      case ST.SETTINGS: this.drawSettings(ctx,uctx); break;
      case ST.NATION: this.drawNation(ctx,uctx); break;
      case ST.SHARE:  this.drawShare(ctx,uctx); break;
      case ST.SELECT: this.drawSelect(ctx,uctx); break;
      case ST.PLAY:   this.event.draw(ctx); this.event.drawUI(uctx);
                      this.drawTurnBadge(uctx); break;
      case ST.RESULT: this.event.draw(ctx);
        (Party.on? this.drawVersusResult(uctx) : this.drawResult(uctx));
        /* ⛔ 여기 '신기록 띠' 가 y=16~38 에 있었다. 제목(y=30, 20px)과 겹치고,
           아래 y=168 의 '★ 개인 최고기록!' 과 **같은 말을 두 번** 했다.
           게다가 뱃지 팝업(y=44)까지 같은 판에 떠서 가장 기뻐야 할 순간이
           가장 어지러웠다(실측: 첫 PB + 기준 통과 한 판에 셋이 겹침).
           띠는 아래 PB 자리로 내렸다(drawResult) — 한 번만 말한다. */
        this.drawCareerPops(uctx); break;
    }
    /* 튜토리얼 안내 — **평소 화면 위에** 얹는다(화면을 새로 만들지 않는다) */
    if(typeof Tutorial!=='undefined') Tutorial.draw(uctx);
    // 토스트
    if(this.t - this.toastAt < 1600){
      const a=1-(this.t-this.toastAt)/1600;
      uctx.save(); uctx.globalAlpha=a;
      plate(uctx, VW/2-90, VH-56, 180, 18, .8);
      txt(uctx, this.toastMsg, VW/2, VH-52, 11, PAL.gold, 'center'); uctx.restore();
    }
  },

  drawTitle(ctx,uctx){
    /* 첫 화면 배경 — 전용 아트가 있으면 그걸 쓰고, 없으면 달리는 트랙으로 폴백한다 */
    const hasArt = BG.fill(BG.ctx(), 'title-backdrop', 0, VH);
    if(!hasArt){
      Track.drawBack(ctx, this.t*0.0006, 100);
      Track.drawLanes(ctx, this.t*0.0006, 0.16);
      for(let i=0;i<3;i++){
        const y=Track.laneFoot(i);
        const x=((this.t*0.06 + i*160) % (VW+60)) - 30;
        drawRunner(ctx, x, y, (this.t*0.0016+i*0.3)%1, ['#5aaaff','#ffd75e','#ff6b8a'][i]);
      }
    }
    /* 글자를 읽히게 하는 어둠 — 아트가 있으면 위쪽만 살짝, 없으면 전면 */
    if(hasArt){
      const g=uctx.createLinearGradient(0,0,0,VH);
      g.addColorStop(0,'rgba(5,6,10,.74)'); g.addColorStop(0.42,'rgba(5,6,10,.42)');
      g.addColorStop(1,'rgba(5,6,10,.80)');
      uctx.fillStyle=g; uctx.fillRect(0,0,VW,VH);
    } else { ctx.fillStyle='rgba(5,6,10,.5)'; ctx.fillRect(0,0,VW,VH); }
    /* 로고 — 어셋이 오면 글자 대신 그림을 쓴다.
       ⚠ 높이 30 으로 넣었더니 1024x320 로고가 96px 폭이 돼 **글자를 읽을 수 없었다**.
          제목은 제목만 한 크기여야 한다. */
    /* ⚠ brand-logo 는 워드마크가 아니라 **엠블럼**이다. 그림으로 갈아 끼웠더니 화면에서
       게임 이름이 통째로 사라졌다 — 엠블럼은 엠블럼대로 얹고 이름은 이름대로 쓴다. */
    const mark = BG.obj(uctx, 'brand-logo', VW/2, 56, 44);
    txt(uctx,'WORLD SPRINT CIRCUIT', VW/2, mark?58:34, mark?15:24, PAL.gold, 'center', 700);
    txt(uctx,'육상부 감독이 되어 선수를 키운다', VW/2, mark?76:66, 11, PAL.white, 'center');
    /* 커리어 랭크 — 판을 넘어 쌓인 것이 첫 화면에 보여야 다시 켤 이유가 된다 */
    if(typeof Career!=='undefined'){
      const R=Career.rank, pr=Career.progress, bw=200, bx=VW/2-bw/2, by=104;
      /* 밝은 배경 아트 위에서는 얇은 글씨가 묻힌다 — 받침을 깐다 */
      uctx.fillStyle='rgba(6,10,18,.55)'; uctx.fillRect(bx-8, by-14, bw+16, 26);
      /* 랭크 뱃지 — 어셋이 온 등급부터 그림으로. 없으면 이름만 나온다(예전 그대로) */
      let rx = bx;
      { const im = BG.get(RANK_ICON[Career.rankIdx]);
        if(im){ uctx.drawImage(im, bx, by-14, 18, 18); rx = bx+21; } }
      txt(uctx, R.name, rx, by-11, 11, R.color, 'left', 700);
      const nc=Career.nextCp;
      txt(uctx, nc===null ? `CP ${Career.d.cp}` : `CP ${Career.d.cp} / ${nc}`,
          bx+bw, by-11, 9, PAL.dim, 'right');
      uctx.fillStyle='rgba(255,255,255,.12)'; uctx.fillRect(bx,by,bw,5);
      uctx.fillStyle=R.color; uctx.fillRect(bx,by,Math.round(bw*pr),5);
      txt(uctx, `뱃지 ${Career.badgeCount()} / ${BADGES.length}`, VW/2, by+8, 8, PAL.dim, 'center');
    }
    const hasSave=MG.hasSave();
    /* 튜토리얼 — 처음 켠 사람에게만, 맨 위에. 한 번 하면 사라진다. */
    const tutRow = (typeof Tutorial!=='undefined' && !Tutorial.seen())
      ? [['처음이라면','전설 선수로 한 판 · 최고 선수단으로 한 주']] : [];
    const items = tutRow
      .concat(hasSave?[['이어하기','저장된 클럽으로 계속']]:[])
      .concat([['새 클럽 시작','신인 6명으로 처음부터'],['직접 뛰기','아케이드 모드 — 내가 조작한다']]);
    items.forEach((it,i)=>{
      const y=124+i*27, on=i===this.titleSel;
      uctx.fillStyle = on?'rgba(255,215,94,.16)':'rgba(22,26,38,.7)';
      uctx.fillRect(VW/2-110, y, 220, 24);
      uctx.strokeStyle = on?PAL.gold:'#3a4258'; uctx.lineWidth=2;
      uctx.strokeRect(VW/2-110, y, 220, 24);
      txt(uctx, it[0], VW/2, y+3, 12, on?PAL.gold:PAL.white,'center',700);
      txt(uctx, it[1], VW/2, y+14, 8, PAL.dim,'center');
    });
    /* 언어 — 어느 나라 플레이어든 첫 화면에서 바로 바꿀 수 있어야 한다 */
    const lw=104, lx=VW/2-lw/2, ly=VH-42;
    uctx.fillStyle='rgba(22,26,38,.7)'; uctx.fillRect(lx,ly,lw,18);
    uctx.strokeStyle='#3a4258'; uctx.lineWidth=1; uctx.strokeRect(lx+.5,ly+.5,lw-1,17);
    txt(uctx,'◀', lx+8, ly+4, 10, PAL.dim,'left');
    txt(uctx, LANG==='ko'?'한국어':'English', VW/2, ly+4, 11, PAL.gold,'center',700);
    txt(uctx,'▶', lx+lw-8, ly+4, 10, PAL.dim,'right');
    txt(uctx,'▲▼ 이동 · 확인 선택   |   ◀▶ 언어 · B 커리어 · P 조작', VW/2, VH-20, 9, PAL.dim,'center');
  },

  drawSelect(ctx,uctx){
    Track.drawBack(ctx, 40, 100);
    ctx.fillStyle='rgba(5,6,10,.78)'; ctx.fillRect(0,0,VW,VH);
    txt(uctx,'종목 선택', 10, 8, 13, PAL.gold,'left',700);

    /* 갈래 탭 — 어디에 뭐가 있는지 한눈에 */
    const tabY=26;
    let tx=10;
    EVENT_GROUPS.forEach((g,i)=>{
      const on=i===this.selGroup, cnt=eventsInGroup(g.key).length;
      const label=`${K(g.name)} ${cnt}`;
      const hasIcon = !!(g.icon && BG.cache && BG.cache[g.icon]);
      const w=Math.max(46, label.length*7+14+(hasIcon?12:0));
      uctx.fillStyle = on?'rgba(255,215,94,.18)':'rgba(22,26,38,.7)';
      uctx.fillRect(tx, tabY, w, 16);
      uctx.strokeStyle = on?PAL.gold:'#3a4258'; uctx.lineWidth=1;
      uctx.strokeRect(tx+.5, tabY+.5, w-1, 15);
      txt(uctx, label, tx+w/2, tabY+3, 10, on?PAL.gold:PAL.dim,'center', on?700:400);
      tx += w+4;
    });

    /* 격자 — 한 화면에 갈래 전체가 들어온다 */
    const list=this.selEvents, COLS=5, cw=90, ch=42, gx=8, gy=52;
    const gapX=(VW-16-COLS*cw)/(COLS-1);
    list.forEach((e,i)=>{
      const c=i%COLS, r=(i/COLS)|0;
      const x=gx+c*(cw+gapX), y=gy+r*(ch+6);
      if(y+ch>VH-52) return;                       // 넘치면 안 그린다(줄 수를 맞춰 뒀다)
      const on=i===this.sel, ready=READY.includes(e.id);
      uctx.fillStyle = on?'rgba(255,215,94,.18)':'rgba(20,24,36,.82)';
      uctx.fillRect(x, y, cw, ch);
      uctx.strokeStyle = on?PAL.gold:(ready?'#3a4258':'#2a2030'); uctx.lineWidth= on?2:1;
      uctx.strokeRect(x+ (on?1:0.5), y+(on?1:0.5), cw-(on?2:1), ch-(on?2:1));
      /* ⚠ 짧은 이름이 긴 종목(3000SC)은 기록과 글자가 겹쳤다 — 길면 글자를 줄인다 */
      txt(uctx, e.short, x+6, y+4, e.short.length>5?9:11,
          on?PAL.gold:(ready?PAL.white:'#6a5a70'),'left',700);
      const bst=Save.data.best[e.id];
      if(bst!==undefined){
        const t=fmtRec(e, bst);
        txt(uctx, t, x+cw-6, y+5, t.length>6?8:9, PAL.blue,'right');
      }
      txt(uctx, e.name, x+6, y+18, 9, ready?PAL.dim:'#5a4a60','left');
      /* ⛔ 트랙 종목만 단위가 없어 '기준 11.30' 이 뭔지 알 수 없었다(실측: 처음 플레이).
         필드는 '5.90m', 점수 종목은 '60점' 인데 시간만 맨숫자였다. 단위는 종목이 안다. */
      { const q = fmtRec(e, e.qualify);
        const unit = e.unit==='s' ? (needsSec(q) ? K('초') : '') : '';
        txt(uctx, K('기준')+' '+q+unit, x+6, y+30, 8, PAL.dim,'left'); }
      if(!ready) txt(uctx, K('준비 중'), x+cw-6, y+30, 8, PAL.red,'right',700);
    });

    /* 고른 종목 한 줄 요약 + 인원 */
    const def=list[this.sel];
    /* 조작 한 줄이 들어오면서 50→58 로 키웠다. 격자는 y=190 에서 끝나므로 안 겹친다. */
    plate(uctx, 0, VH-58, VW, 58, .84);
    if(def){
      txt(uctx, def.name, 10, VH-55, 13, PAL.gold,'left',700);
      const bst=Save.data.best[def.id];
      txt(uctx, bst!==undefined
            ? K('최고')+' '+fmtRec(def, bst)
            : K('기록 없음'),
          10, VH-42, 9, bst!==undefined?PAL.blue:PAL.dim,'left');
      /* ⚠ 46종목이 각기 다른 조작인데 설명이 '시작한 뒤 잠깐 뜨는 한 줄'뿐이었다.
         고르는 자리에서 미리 보여 준다 — 무엇을 누를지 모른 채 시작하게 두지 않는다. */
      if(def.tip) txt(uctx, K(def.tip), 10, VH-30, 9, '#cfd6e8','left');
    }
    const n=Party.count;
    const mode = n>1 ? (Party.modeFor(def)==='versus' ? K('동시 대결') : K('턴제')) : '';
    /* ⚠ '[ ]' 는 **대괄호 두 키**를 뜻하는데, 사이가 벌어져 있어 화면에서는
       '빈 상자' 로 읽힌다(처음 켠 사람이 두 번째로 보는 화면이다).
       슬래시를 넣어 '두 개의 키' 임을 못 박는다 — ◀▶ 처럼 붙일 수는 없다([]는 배열로 읽힌다). */
    txt(uctx, `[ / ] ${K('인원')}  ${n}${K('인')} ${mode}`, VW-10, VH-55, 11,
        n>1?PAL.gold:PAL.dim,'right', n>1?700:400);
    /* 캐릭터 모드 — 지금 무엇으로 뛰는지 시작 전에 보인다.
       ⚠ 픽셀은 **경기 중에만** 적용된다. 감독 화면은 언제나 HD 다. */
    if(typeof CharMode!=='undefined'){
      const px = CharMode.mode==='pixel';
      txt(uctx, `M  ${K('캐릭터')}  ${K(CharMode.label)}`, VW-10, VH-42, 9,
          px?PAL.blue:PAL.dim, 'right', px?700:400);
    }
    if(n>1){
      let px=VW-10;
      for(let p=n-1;p>=0;p--){
        const lab='P'+(p+1)+' '+PARTY_KEYS[p].label;
        txt(uctx, lab, px, VH-42, 8, PARTY_COLOR[p],'right');
        px -= lab.length*4.6+10;
      }
    }
    txt(uctx, K('◀▶ 고르기 · ▲▼ 줄·갈래 · 확인 시작 · 취소 뒤로'), VW/2, VH-14, 9, PAL.dim,'center');
    /* 화면 버튼에는 [ ] 가 없다 — 터치일 때는 인원 칸을 눌러 바꾸도록 안내한다 */
    if(Ctrl.mode==='touch')
      txt(uctx, K('인원은 설정에서 (일시정지)'), VW-10, VH-18, 8, PAL.dim,'right');
  },

  /* ⚠ 처음 하는 사람이 최대 속도로 연타하면 **100m 를 완주조차 못 한다**(실측:
     EARLY 136 · PERFECT 0 · 시간 초과). 그런데 결과 화면은 '시간 초과' 네 글자만
     보여 줬다 — 무엇을 고쳐야 하는지 한마디도 없이. 이 게임은 하이퍼 올림픽처럼
     보이지만 연타 게임이 아니다(목표 간격 238ms ±43ms). 그 사실을 **실패한 그
     자리에서** 알려 주지 않으면 사람은 같은 실패를 반복하다 그만둔다.
     판정 기록이 이미 답을 갖고 있다 — 읽어서 말해 준다. */
  diagnose(ev){
    const p = ev.player || (ev.runners && ev.runners[0]);
    const j = p && p.judge; if(!j) return null;
    const total = (j.PERFECT|0)+(j.GOOD|0)+(j.EARLY|0)+(j.LATE|0)+(j.REPEAT|0)+(j.SPAM|0);
    if(total < 6) return null;
    if((j.SPAM|0) > total*0.15)   return '연타는 오히려 느려집니다 — 리듬을 맞추세요';
    if((j.REPEAT|0) > total*0.15) return '같은 쪽을 연달아 눌렀습니다 — 좌·우를 번갈아';
    const early=j.EARLY|0, late=j.LATE|0, good=(j.PERFECT|0)+(j.GOOD|0);
    if(early > total*0.4 && early > late*2)
      return '너무 빨리 두드렸습니다 — 아래 게이지의 초록 칸에 맞추세요';
    if(late > total*0.4 && late > early*2)
      return '조금씩 늦습니다 — 게이지보다 살짝 먼저 누르세요';
    if(good > total*0.7) return null;      // 잘하고 있다 — 잔소리 금지
    return '아래 게이지의 초록 칸에서 두드리면 빨라집니다';
  },

  drawResult(uctx){
    const ev=this.event, r=ev.result, d=this.def;
    uctx.fillStyle='rgba(5,6,10,.82)'; uctx.fillRect(0,0,VW,VH);
    const title = RESULT_TITLE[r.status] || r.status;
    const col   = r.status==='OK' ? PAL.green : PAL.red;
    txt(uctx, title, VW/2, 30, 20, col,'center',700);
    txt(uctx, d.name, VW/2, 56, 12, PAL.dim,'center');

    /* 종목이 사유를 실어 보내면 그걸 그대로 보여 준다 — 화면이 종목 규칙을 다시
       적으면 규칙이 바뀔 때 한쪽만 고치게 된다. */
    if(r.reason && r.status!=='OK' && r.status!=='MISSED_QUALIFY'){
      txt(uctx, r.reason, VW/2, 88, 13, PAL.white,'center');
      if(r.status==='FALSE_START') txt(uctx,'총소리를 듣고 나서 두드리세요', VW/2, 108, 11, PAL.dim,'center');
    }
    else if(r.status==='FALSE_START'){
      txt(uctx,'총성 전에 움직였습니다', VW/2, 88, 13, PAL.white,'center');
      txt(uctx,'총소리를 듣고 나서 두드리세요', VW/2, 108, 11, PAL.dim,'center');
    }
    else if(r.status==='DQ' || r.status==='TIMEOUT'){
      /* ⚠ 여기서 제목을 다시 찍고 있었다 — 화면에 '시간 초과'가 두 번 나왔다 */
      const why = this.diagnose(ev);
      txt(uctx, why || K('완주하지 못했습니다'), VW/2, 88, 13, PAL.white,'center');
    }
    else {
      /* ⚠ 예전엔 단위를 '거리 아니면 초'로 갈랐다 — 다이빙 72.96점이 **72.96m** 로,
         역도 210kg 이 210m 로 나왔다. 단위는 종목이 들고 있다. */
      const sfx  = d.unit==='s' ? K('초') : '';      // fmtRec 은 시간에만 단위를 안 붙인다
      const void_ = d.higher && !(r.value>0);      // 거리·점수 종목의 0 = 실패
      const shown = void_ ? '--.--' : fmtRec(d, r.value);
      const q = fmtRec(d, d.qualify);
      txt(uctx, shown + (needsSec(shown)?sfx:''), VW/2, 82, 30, PAL.gold,'center',700);
      txt(uctx, '기준 '+q+(needsSec(q)?sfx:''), VW/2, 116, 11, PAL.dim,'center');
      const p=ev.player;
      if(p){
        const line = `PERFECT ${p.judge.PERFECT}  ·  GOOD ${p.judge.GOOD}  ·  놓침 ${p.judge.EARLY+p.judge.LATE}`;
        txt(uctx, line, VW/2, 136, 10, PAL.white,'center');
        let sub = p.reactionMs>=0 ? `반응 ${Math.round(p.reactionMs)}ms` : '';
        if(ev.marks===undefined && r.rank) sub += (sub?'  ·  ':'')+`순위 ${r.rank}위`;
        if(p.hurdlesClean!==undefined && ev.marks===undefined && this.def.id==='hurdles110')
          sub += `  ·  허들 ${p.hurdlesClean}/${RULES.hurdleCount}`;
        if(sub) txt(uctx, sub, VW/2, 150, 10, PAL.dim,'center');
      } else if(ev.marks){
        /* ⚠ 세 시기를 한 문자열로 붙이면 숫자가 6개라 번역 자리표가 안 맞는다 —
           조각마다 번역하고 붙인다. */
        txt(uctx, ev.marks.map((m,i)=>K('%1차 %2').replace('%1',i+1)
              .replace('%2', m===null?K('파울'):m.toFixed(2))).join('   '),
            VW/2, 138, 10, PAL.white,'center');
      }
      if(this.newRecord){
        /* 신기록 — 띠 그림 위에 한 번만 쓴다(위쪽 중복 띠는 없앴다) */
        /* ⚠ 자리를 정확히 나눈다 — 위는 sub 줄(150~160), 아래는 커리어 팝업(VH-80=190).
           띠는 **162~186** 안에만 있어야 한다(BG.obj 는 바닥 기준이라 바닥 186·높이 24). */
        /* ⚠ 이 띠는 **크기가 곧 가독성**이다. 원본 576×96 에서 글씨가 앉는 가운데 띠는
           높이의 30% 다 — 24px 로 그리면 띠가 7px 라 12px 한글이 장식 위로 삐져나가
           통째로 안 읽혔다(실측 2회). 40px 이라야 띠가 174~186 이 되어 11px 이 앉는다.
           ⚠ 색도 함께: 가운데 띠는 rgb(235,189,60)·밝기 188 이라 **금색 글씨는 사라진다.**
              그림 위에는 어두운 글씨, 폴백 판에는 금색.
           ⛔ 40px 을 쓰면 아래 커리어 팝업(VH-76)과 겹친다 — 그래서 **시간을 나눠 쓴다.**
              팝업이 떠 있는 동안엔 띠를 접는다(커리어 줄과 같은 규칙).
              팝업은 2.6초씩이고 결과 화면은 그보다 오래 머문다. */
        if(this.resultStage() === 'banner'){
          const bAge = this.t - this.resultAt;
          uctx.save();
          uctx.globalAlpha = bAge < 200 ? bAge/200 : (bAge > 2300 ? (2600-bAge)/300 : 1);
          /* ⛔ 세 번 잘못 맞췄다. 원인은 코드가 아니라 **어셋의 여백**이었다 —
             record-banner 는 576×96 인데 **그림이 4~40행에만 있고 아래 58%가 빈칸**이다.
             BG.obj 는 바닥 기준이라, 높이 H 로 그리면 리본은 상자 위쪽에 뜨고
             내가 계산한 글씨 자리는 그 아래 **빈칸에 앉았다.** 그래서 안 읽혔다.
             (행별 불투명도로 재서 알았다 — 눈으로는 세 번 다 못 봤다.)
             평평한 띠는 12~32행 = 높이의 12.5~33%. H=58 이면 띠가 165~177 → 11px 이 든다.
           ⚠ 색: 띠는 rgb(235,189,60)·밝기 224 라 금색 글씨는 사라진다 → 어두운 글씨.
           ⛔ 여백 탓에 상자가 커서 아래 팝업(VH-76)과 겹친다 — 시간을 나눠 쓴다. */
          const onArt = BG.obj(uctx, 'record-banner', VW/2, 216, 58);
          if(onArt) BG.fx(uctx, 'record-sparkle', VW/2, 186, 18, ((this.t-this.resultAt)%900)/900, 4);
          else {
            plate(uctx, VW/2-84, 164, 168, 20, .9);
            uctx.strokeStyle=PAL.gold; uctx.lineWidth=2; uctx.strokeRect(VW/2-83.5,164.5,167,19);
          }
          txt(uctx,'개인 최고 기록', VW/2, onArt?166:168, onArt?11:12,
              onArt?'#3b2c0c':PAL.gold, 'center', 700);
          uctx.restore();
        }
      }
      else if(r.status==='MISSED_QUALIFY'){
        const why = this.diagnose(ev);
        if(why) txt(uctx, why, VW/2, 168, 11, PAL.gold,'center');
      }
    }
    this.drawCareerLine(uctx);
    /* ⚠ 화면 버튼은 캔버스 위에 얹힌 DOM 이다. 안내를 VH-30 에 두면 가로 폰에서
       오른쪽 아래 '액션' 버튼이 그 위에 앉는다(실측 812×375). 버튼 위로 올린다. */
    txt(uctx, Ctrl.mode==='touch'?'액션: 다시  ·  일시정지: 종목 선택':'SPACE: 다시  ·  Q: 종목 선택',
        VW/2, Ctrl.mode==='touch'? VH-54 : VH-30, 11, PAL.white,'center');
  },

  /* ── 이 판으로 얼마나 나아갔나 ────────────────────────────
     ⛔ 결과 화면이 **기록만** 말하고 있었다. 커리어는 조용히 쌓이다가 10~25판에
        한 번 팝업으로만 나타났다 — 그 사이의 판은 남는 게 없어 보인다.
        기록은 자기 최고를 깬 판에만 기쁘다. 그 나머지 판에도 눈에 보이는 걸음이 있어야
        '한 판 더'가 된다.
     ⚠ 시스템은 안 건드린다. Career 가 이미 갖고 있는 값을 **적기만** 한다.
     ⚠ 실패한 판(부정 출발·시간 초과)도 4 CP 를 준다 — 그래서 성공 갈래 밖에 둔다.
        빈손으로 돌려보내지 않는 게 이 줄의 목적이다. */
  /* ── 턴제 2인 이상: 지금 누구 차례인가 ─────────────────────
     ⛔ 턴제 종목(멀리뛰기·투척·양궁… 30종 넘는다)에서 **누구 차례인지 화면에 없었다.**
        `시기 1/3` 은 시기 수지 사람이 아니다. 2인용에서 이건 치명적이다 —
        누가 키보드를 잡아야 하는지 모른 채 경기가 시작된다.
     ⚠ 종목마다 넣으면 30곳을 고쳐야 하고 새 종목에서 또 빠진다.
        **공용 그리기 루프에 한 번만** 얹는다.
     ⚠ 위쪽은 종목마다 다른 계기판이 쓴다 — 안 겹치도록 화면 **왼쪽 아래**에 둔다
        (리듬 띠 GAUGE_Y=242 바로 위). */
  drawTurnBadge(u){
    if(typeof Party==='undefined' || !Party.on) return;
    if(Party.modeFor(this.def) !== 'turn') return;
    const i = Party.turn|0, col = Party.color(i);
    const keys = PARTY_KEYS[i % PARTY_KEYS.length];
    const label = 'P'+(i+1), y = Track.GAUGE_Y - 20;
    /* ⚠ 96px 로 잡았더니 '차례' 와 키 라벨이 맞붙었다('차례A / D · S').
       키 라벨은 '숫자4 / 6 · 5' 처럼 길어질 수 있어 **글자 폭을 재서** 칸을 잡는다. */
    u.font = '8px "Galmuri11","Nanum Gothic Coding",monospace';
    const kw = Math.ceil(u.measureText(keys.label).width);
    const w = Math.max(104, 58 + kw + 8);
    plate(u, 6, y, w, 17, 0.86);
    u.strokeStyle = col; u.lineWidth = 1; u.strokeRect(6.5, y+0.5, w-1, 16);
    txt(u, label, 12, y+3, 11, col, 'left', 700);
    /* 키를 같이 적는다 — 2인용은 '내 키가 뭐였지'가 매 차례 생긴다 */
    txt(u, K('차례'), 34, y+4, 9, PAL.white, 'left');
    txt(u, keys.label, 6 + w - 4, y+5, 8, PAL.dim, 'right');
  },

  /* ── 결과 화면 아래 칸은 **하나**다. 셋이 시간을 나눠 쓴다 ──────
     ① 신기록 띠(2.6초) → ② 커리어 팝업(뱃지·랭크, 각 2.6초) → ③ 커리어 줄(계속)
     ⚠ 예전엔 셋이 같은 자리에 동시에 그려져 서로를 덮었다. 자리를 늘릴 수는 없으니
        순서를 준다 — 제일 드문 것(신기록)이 먼저다. */
  resultStage(){
    if(this.newRecord && (this.t - this.resultAt) < 2600) return 'banner';
    if(this._pops && this._pops.length) return 'pop';
    return 'line';
  },

  drawCareerLine(u){
    if(typeof Career==='undefined') return;
    if(this.resultStage() !== 'line') return;
    const y = Ctrl.mode==='touch' ? VH-78 : VH-54;
    const R = Career.rank, nx = Career.nextCp, cp = Career.d.cp;
    const bw = 168, bx = VW/2 - bw/2;
    /* 번 것 — 0 이면 아예 안 쓴다(빈 '+0' 은 없느니만 못하다) */
    if(this.cpGain > 0)
      txt(u, '커리어 +' + this.cpGain, bx - 8, y - 1, 11, PAL.gold, 'right', 700);
    if(!(typeof UIK!=='undefined' && UIK.bar(u, bx, y + 1, bw, 7, Career.progress, R.color))){
      u.fillStyle='rgba(6,9,16,.85)'; u.fillRect(bx, y+1, bw, 7);
      u.strokeStyle='#2a3450'; u.lineWidth=1; u.strokeRect(bx+.5, y+1.5, bw-1, 6);
      u.fillStyle=R.color; u.fillRect(bx+1, y+2, Math.round((bw-2)*Career.progress), 5);
    }
    txt(u, K(R.name), bx + bw + 8, y - 1, 11, R.color, 'left', 700);
    /* 다음 계단까지 — 최고 랭크면 누적을 보여 준다(분모가 없다) */
    txt(u, nx===null ? `${UIK.n(cp)} CP` : `${UIK.n(cp)} / ${UIK.n(nx)}`,
        VW/2, y + 10, 9, PAL.dim, 'center');
  },
};
