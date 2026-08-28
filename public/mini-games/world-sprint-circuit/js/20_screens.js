/* ══════════════════════════════════════════════════════════════════
   화면 — 타이틀 / 종목 선택 / 결과
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const ST = { TITLE:0, SELECT:1, PLAY:2, RESULT:3, MANAGER:4, CAREER:5, SETTINGS:6, NATION:7, SHARE:8 };
/* 실제로 플레이 가능한 종목. 여기 없는 건 선택 화면에서 '준비 중'으로 잠근다.
   ⚠ 목록만 늘려놓고 구현이 없으면 플레이어는 빈 화면을 만난다. */
/* 아케이드(직접 뛰기)에서 조작이 구현된 종목.
   ⚠ 감독 모드는 14종목 전부 돌지만, 아케이드는 화면·조작이 있는 것만 연다.
      목록만 늘리고 구현이 없으면 플레이어는 빈 화면을 만난다. */
const READY = ['sprint100','sprint200','sprint400','hurdles110','hurdles400','steeple3000',
               'longJump','tripleJump','highJump',
               'shotPut','discus','javelin','hammer','relay4x100',
               'swimFree100','swimBack100','swimBreast100','swimFly100','poleVault','diving','lifting','archery','cycling','rowing','trampoline',
               /* 이 다섯은 감독 모드에만 있고 플레이할 수 없었다 — 2026-08-28 아케이드 개방 */
               'run800','run1500','run5000','walk20k','relay4x400','climbSpeed','fencing','decathlon','triathlon','shooting','heptathlon','swimMedley200','tableTennis'];

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
      swimFree100:SwimEvent, swimBack100:SwimEvent, swimBreast100:SwimEvent, swimFly100:SwimEvent, swimMedley200:SwimEvent, tableTennis:TableTennisEvent,
      poleVault:PoleVaultEvent, diving:DivingEvent, lifting:LiftingEvent, archery:ArcheryEvent,
      cycling:CyclingEvent, rowing:RowingEvent, trampoline:TrampolineEvent,
      climbSpeed:ClimbEvent, fencing:FencingEvent, decathlon:DecathlonEvent, heptathlon:DecathlonEvent, triathlon:TriathlonEvent, shooting:ShootingEvent,
      run800:MiddleEvent, run1500:MiddleEvent, run5000:MiddleEvent, walk20k:MiddleEvent }[def.id];
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
    Input.flush();
  },

  titleSel:0,
  updTitle(){
    const items = MG.hasSave() ? 3 : 2;
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
      const hasSave=MG.hasSave();
      const pick = hasSave ? this.titleSel : this.titleSel+1;   // 0=이어하기 1=새 클럽 2=직접 뛰기
      if(pick===0){ MG.load() ? this.state=ST.MANAGER : MG.newGame() || (this.state=ST.MANAGER); this.state=ST.MANAGER; }
      else if(pick===1){ this.state=ST.NATION; this.natSel=0; }   // 새 클럽 → 국가부터 고른다
      else this.state=ST.SELECT;
    }
  },

  updSelect(){
    const playable = EVENTS.filter(e=>READY.includes(e.id));
    /* 인원 — ▲▼. 종목 고르는 자리에서 바로 정한다(따로 화면을 파면 아무도 안 들어간다) */
    if(Input.pressed('up'))   { Party.count = Math.min(4, Party.count+1); Sfx.ui(); }
    if(Input.pressed('down')) { Party.count = Math.max(1, Party.count-1); Sfx.ui(); }
    if(Input.pressed('left')){ this.sel=(this.sel+EVENTS.length-1)%EVENTS.length; Sfx.ui(); }
    if(Input.pressed('right')){ this.sel=(this.sel+1)%EVENTS.length; Sfx.ui(); }
    if(Input.pressed('action')){
      const def = EVENTS[this.sel];
      if(!playable.includes(def)){ this.toast('아직 준비 중인 종목입니다'); Sfx.beep(180,0.12,'sawtooth',0.12); return; }
      Sfx.ui(); this.start(def);
    }
    if(Input.pressed('back')){ this.state=ST.TITLE; Sfx.ui(); }
  },

  updPlay(dt){
    const ev=this.event, now=ev.t;
    /* ⚠ 입력을 '플레이어별'로 라우팅한다. 종목은 pIdx 를 받아 자기 선수에게 넘긴다.
       턴제 종목은 지금 차례인 사람만 조작한다 — 남의 차례에 눌러도 안 먹는다. */
    const versus = Party.on && Party.modeFor(this.def)==='versus';
    const lo = versus ? 0 : (Party.on ? Party.turn : 0);
    const hi = versus ? Party.count-1 : lo;
    for(let p=lo; p<=hi; p++){
      if(Party.pressed(p,'left'))  ev.onStride(-1, Math.round(now), p);
      if(Party.pressed(p,'right')) ev.onStride( 1, Math.round(now), p);
      if(Party.pressed(p,'action')) ev.onAction(Math.round(now), p);
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
        this.newRecord = Save.record(this.def.id, r.value, this.def.higher);
        if(this.newRecord) Sfx.record();
      } else this.newRecord=false;
      /* 턴제 — 아직 남은 사람이 있으면 같은 종목을 다음 사람으로 다시 시작한다 */
      if(Party.on && Party.modeFor(this.def)==='turn'){
        Party.recordMark(r.value, r.status==='OK');
        if(!Party.lastTurn){
          Party.nextTurn();
          this.start(this.def, true);         // keepMatch — 기록을 안 지운다
          return;
        }
      }
      /* 커리어 — 판을 넘어 쌓인다. 기록 하나만 남고 끝나면 다시 켤 이유가 없다. */
      if(typeof Career!=='undefined'){
        const ok = r.status==='OK' && (this.def.higher ? r.value>=this.def.qualify : r.value<=this.def.qualify);
        const tier = (ev.player && ev.player.tier) || 0;
        Career.finishRace(this.def, ok, this.newRecord, tier);
      }
      this.state=ST.RESULT; this.resultAt=this.t;
    }
  },

  /* 커리어 알림 — 랭크가 오르거나 뱃지를 땄을 때 결과 화면 위에 겹쳐 띄운다 */
  drawCareerPops(u){
    if(typeof Career==='undefined') return;
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
    const w=230, x=VW/2-w/2, y=44;
    plate(u, x, y, w, 40, .92);
    u.strokeStyle = p.kind==='rank' ? p.rank.color : PAL.gold;
    u.lineWidth=2; u.strokeRect(x+.5,y+.5,w-1,39);
    if(p.kind==='rank'){
      txt(u, '랭크 상승', VW/2, y+6, 9, PAL.dim, 'center');
      txt(u, p.rank.name, VW/2, y+18, 16, p.rank.color, 'center', 700);
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
        VW-8, 6, 9, PAL.dim,'right');
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
    txt(uctx,'취소 돌아가기', VW/2, VH-14, 9, PAL.dim,'center');
    txt(uctx,'▲▼ 공유 카드   ·   확인/취소 돌아가기', VW/2, VH-12, 9, PAL.dim,'center');
  },

  /* ── 설정 ────────────────────────────────────────────
     ⚠ 소리는 setMuted() 함수만 있고 UI 가 없었다. 언어·조작도 흩어져 있었다.
     한 화면에 모은다 — 출시 기본기다. */
  setSel:0,
  get settingRows(){
    return [
      { k:'vol',  label:'효과음',   get:()=>Sfx.vol,    set:(v)=>Sfx.setVol(v) },
      { k:'amb',  label:'관중 소리', get:()=>Sfx.ambVol, set:(v)=>Sfx.setAmb(v) },
      { k:'mute', label:'음소거',   toggle:true },
      { k:'lang', label:'언어',     toggle:true },
      { k:'ctrl', label:'조작',     toggle:true },
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
      else if(r.k==='lang'){ if(typeof setLang==='function') setLang(LANG==='ko'?'en':'ko'); }
      else if(r.k==='ctrl'){ Ctrl.set(Ctrl.mode==='touch'?'keyboard':'touch'); }
      else if(r.k==='back'){ this.state=ST.TITLE; }
      Sfx.ui();
    }
    if(Input.pressed('back')||Input.pressed('pause')){ this.state=ST.TITLE; Sfx.ui(); }
  },
  drawSettings(ctx,uctx){
    Track.drawBack(ctx, 40, 100);
    ctx.fillStyle='rgba(5,6,10,.82)'; ctx.fillRect(0,0,VW,VH);
    plate(uctx, 0, 0, VW, 22, .86);
    txt(uctx,'설정', 8, 5, 13, PAL.gold,'left',700);
    const rows=this.settingRows;
    const x=64, w=VW-128;
    rows.forEach((r,i)=>{
      const y=44+i*28, on=i===this.setSel;
      uctx.fillStyle = on?'rgba(255,215,94,.16)':'rgba(22,26,38,.7)';
      uctx.fillRect(x,y,w,24);
      uctx.strokeStyle = on?PAL.gold:'#3a4258'; uctx.lineWidth=1;
      uctx.strokeRect(x+.5,y+.5,w-1,23);
      txt(uctx, r.label, x+10, y+6, 11, on?PAL.gold:PAL.white,'left',on?700:400);
      if(r.set){
        const bw=120, bx=x+w-bw-40, by=y+9, v=r.get();
        uctx.fillStyle='rgba(255,255,255,.14)'; uctx.fillRect(bx,by,bw,6);
        uctx.fillStyle=Sfx.muted?PAL.dim:PAL.green; uctx.fillRect(bx,by,Math.round(bw*v),6);
        txt(uctx, Math.round(v*100)+'%', x+w-10, y+6, 10, PAL.dim,'right');
      } else if(r.k==='mute'){
        txt(uctx, Sfx.muted?'켜짐':'꺼짐', x+w-10, y+6, 11, Sfx.muted?PAL.red:PAL.dim,'right',700);
      } else if(r.k==='lang'){
        txt(uctx, LANG==='ko'?'한국어':'English', x+w-10, y+6, 11, PAL.blue,'right',700);
      } else if(r.k==='ctrl'){
        txt(uctx, Ctrl.mode==='touch'?'화면 버튼':'키보드', x+w-10, y+6, 11, PAL.blue,'right',700);
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
        : (def.higher ? r.v.toFixed(2)+def.unit : r.v.toFixed(2)+'초');
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
      MG.newGame(null, null, NATIONS[this.natSel].code);
      this.state=ST.MANAGER; Sfx.ui();
    }
    if(Input.pressed('back')){ this.state=ST.TITLE; Sfx.ui(); }
  },
  drawNation(ctx,uctx){
    Track.drawBack(ctx, 40, 100);
    ctx.fillStyle='rgba(5,6,10,.84)'; ctx.fillRect(0,0,VW,VH);
    plate(uctx, 0, 0, VW, 22, .86);
    txt(uctx,'어느 나라를 대표합니까', 8, 5, 13, PAL.gold,'left',700);
    const cols=8, fw=46, fh=28, gx=18, gy=34;
    NATIONS.forEach((n,i)=>{
      const x=gx+(i%cols)*(fw+10), y=gy+((i/cols)|0)*(fh+16);
      const on=i===this.natSel;
      if(on){ uctx.fillStyle='rgba(255,215,94,.25)'; uctx.fillRect(x-3,y-3,fw+6,fh+6); }
      drawFlag(uctx, x, y, fw, fh, n.code);
      if(on){ uctx.strokeStyle=PAL.gold; uctx.lineWidth=2; uctx.strokeRect(x-2.5,y-2.5,fw+5,fh+5); }
    });
    const sel=NATIONS[this.natSel];
    txt(uctx, nationName(sel.code), VW/2, VH-42, 17, PAL.gold, 'center', 700);
    txt(uctx, sel.code, VW/2, VH-24, 10, PAL.dim, 'center');
    txt(uctx,'◀▶▲▼ 고르고 확인으로 시작   ·   취소 돌아가기', VW/2, VH-13, 9, PAL.dim,'center');
  },

  updResult(){
    if(this.t - this.resultAt < 350) return;      // 입력 씹힘 방지 — 결과가 뜨자마자 넘어가지 않게
    if(Input.pressed('action')){ Sfx.ui(); this.start(this.def); }
    if(Input.pressed('back')||Input.pressed('pause')){ Sfx.ui(); this.backToSelect(); }
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
      case ST.PLAY:   this.event.draw(ctx); this.event.drawUI(uctx); break;
      case ST.RESULT: this.event.draw(ctx);
        (Party.on? this.drawVersusResult(uctx) : this.drawResult(uctx));
        /* 신기록 띠 — 자기 최고를 세운 순간을 크게 짚어 준다 */
        if(this.newRecord && typeof BG!=='undefined'){
          const age = this.t - this.resultAt;
          if(age < 2600){
            const a = age<200? age/200 : (age>2300? (2600-age)/300 : 1);
            uctx.save(); uctx.globalAlpha = clamp(a,0,1);
            if(!BG.obj(uctx, 'record-banner', VW/2, 40, 32)){
              plate(uctx, VW/2-84, 16, 168, 22, .9);
              uctx.strokeStyle=PAL.gold; uctx.lineWidth=2; uctx.strokeRect(VW/2-83.5,16.5,167,21);
            }
            txt(uctx, '개인 최고 기록', VW/2, 21, 12, PAL.gold, 'center', 700);
            uctx.restore();
          }
        }
        this.drawCareerPops(uctx); break;
    }
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
      txt(uctx, R.name, bx, by-11, 11, R.color, 'left', 700);
      const nc=Career.nextCp;
      txt(uctx, nc===null ? `CP ${Career.d.cp}` : `CP ${Career.d.cp} / ${nc}`,
          bx+bw, by-11, 9, PAL.dim, 'right');
      uctx.fillStyle='rgba(255,255,255,.12)'; uctx.fillRect(bx,by,bw,5);
      uctx.fillStyle=R.color; uctx.fillRect(bx,by,Math.round(bw*pr),5);
      txt(uctx, `뱃지 ${Career.badgeCount()} / ${BADGES.length}`, VW/2, by+8, 8, PAL.dim, 'center');
    }
    const hasSave=MG.hasSave();
    const items = (hasSave?[['이어하기','저장된 클럽으로 계속']]:[])
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
    ctx.fillStyle='rgba(5,6,10,.72)'; ctx.fillRect(0,0,VW,VH);
    txt(uctx,'종목 선택', VW/2, 18, 15, PAL.gold,'center',700);
    const cw=140, gap=10, total=EVENTS.length;
    for(let i=0;i<total;i++){
      const e=EVENTS[i];
      const rel=i-this.sel;
      const x=VW/2 + rel*(cw+gap);
      if(x<-cw || x>VW+cw) continue;
      const on = i===this.sel;
      const ready = READY.includes(e.id);
      const y=64, h=112;
      uctx.fillStyle = on?'rgba(255,215,94,.16)':'rgba(22,26,38,.8)';
      uctx.fillRect(x-cw/2, y, cw, h);
      uctx.strokeStyle = on?PAL.gold:'#3a4258'; uctx.lineWidth=2;
      uctx.strokeRect(x-cw/2, y, cw, h);
      txt(uctx, e.short, x, y+10, 20, on?PAL.gold:PAL.white,'center',700);
      txt(uctx, e.name,  x, y+36, 12, PAL.white,'center');
      txt(uctx, '기준 '+(e.higher? e.qualify.toFixed(2)+e.unit : e.qualify.toFixed(2)+'초'),
          x, y+56, 9, PAL.dim,'center');
      const b=Save.data.best[e.id];
      txt(uctx, b!==undefined ? '최고 '+(e.higher?b.toFixed(2)+e.unit:b.toFixed(2)+'초') : '기록 없음',
          x, y+70, 10, b!==undefined?PAL.blue:PAL.dim,'center');
      if(!ready) txt(uctx,'준비 중', x, y+90, 10, PAL.red,'center',700);
    }
    /* 인원과 키 안내 */
    {
      const n=Party.count, def=EVENTS[this.sel];
      const mode = n>1 ? (Party.modeFor(def)==='versus' ? '동시 대결' : '턴제') : '';
      txt(uctx, `▲▼ 인원  ${n}인 ${mode}`, VW/2, 186, 11, n>1?PAL.gold:PAL.dim, 'center', n>1?700:400);
      if(n>1){
        for(let p=0;p<n;p++){
          const x = VW/2 + (p-(n-1)/2)*112;
          uctx.fillStyle = PARTY_COLOR[p]; uctx.fillRect(x-46, 202, 92, 2);
          txt(uctx, 'P'+(p+1), x-42, 206, 9, PARTY_COLOR[p], 'left', 700);
          txt(uctx, PARTY_KEYS[p].label, x+42, 206, 8, PAL.dim, 'right');
        }
      }
    }
    txt(uctx, Ctrl.mode==='touch'?'◀ ▶ 로 고르고 액션으로 시작':'← → 로 고르고 SPACE 로 시작',
        VW/2, VH-26, 11, PAL.white,'center');
  },

  drawResult(uctx){
    const ev=this.event, r=ev.result, d=this.def;
    uctx.fillStyle='rgba(5,6,10,.82)'; uctx.fillRect(0,0,VW,VH);
    const title = { OK:'통과', MISSED_QUALIFY:'기준기록 미달', FALSE_START:'부정 출발',
                    TIMEOUT:'시간 초과', ALL_FOUL:'세 번 모두 파울' }[r.status] || r.status;
    const col   = r.status==='OK' ? PAL.green : PAL.red;
    txt(uctx, title, VW/2, 30, 20, col,'center',700);
    txt(uctx, d.name, VW/2, 56, 12, PAL.dim,'center');

    if(r.status==='FALSE_START'){
      txt(uctx,'총성 전에 움직였습니다', VW/2, 88, 13, PAL.white,'center');
      txt(uctx,'총소리를 듣고 나서 두드리세요', VW/2, 108, 11, PAL.dim,'center');
    } else {
      const unit = d.higher?'m':'초';
      /* 거리 종목은 그대로, 시간 종목은 fmtTime 이 분:초 까지 책임진다 */
      const shown = d.higher ? (r.value>0?r.value.toFixed(2):'--.--') : fmtTime(r.value);
      txt(uctx, shown+unit, VW/2, 82, 30, PAL.gold,'center',700);
      txt(uctx, '기준 '+(d.higher?d.qualify.toFixed(2):fmtTime(d.qualify))+unit, VW/2, 116, 11, PAL.dim,'center');
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
      if(this.newRecord) txt(uctx,'★ 개인 최고기록!', VW/2, 168, 13, PAL.gold,'center',700);
    }
    txt(uctx, Ctrl.mode==='touch'?'액션: 다시  ·  일시정지: 종목 선택':'SPACE: 다시  ·  Q: 종목 선택',
        VW/2, VH-30, 11, PAL.white,'center');
  },
};
