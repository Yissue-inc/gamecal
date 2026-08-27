/* ══════════════════════════════════════════════════════════════════
   화면 — 타이틀 / 종목 선택 / 결과
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const ST = { TITLE:0, SELECT:1, PLAY:2, RESULT:3 };
/* 실제로 플레이 가능한 종목. 여기 없는 건 선택 화면에서 '준비 중'으로 잠근다.
   ⚠ 목록만 늘려놓고 구현이 없으면 플레이어는 빈 화면을 만난다. */
const READY = ['sprint100','hurdles110','longJump','highJump','javelin','hammer'];

const G = {
  state: ST.TITLE,
  event: null,        // 진행 중인 종목 인스턴스
  def: null,
  sel: 0,             // 종목 선택 커서
  t: 0,
  toastMsg:'', toastAt:-1e9,

  toast(m){ this.toastMsg=m; this.toastAt=this.t; },

  start(def){
    this.def = def;
    const Klass = { sprint100:SprintEvent, hurdles110:HurdlesEvent, longJump:LongJumpEvent,
                    highJump:HighJumpEvent, javelin:JavelinEvent, hammer:HammerEvent }[def.id];
    if(!Klass){ this.toast('아직 준비 중인 종목입니다'); this.state=ST.SELECT; return; }
    this.event = new Klass(def);
    this.newRecord = false;
    this.state = ST.PLAY;
  },
  backToSelect(){ this.state=ST.SELECT; this.event=null; },

  /* ── 진행 ── */
  update(dt){
    this.t += dt*1000;
    switch(this.state){
      case ST.TITLE:  this.updTitle(); break;
      case ST.SELECT: this.updSelect(); break;
      case ST.PLAY:   this.updPlay(dt); break;
      case ST.RESULT: this.updResult(); break;
    }
    Input.flush();
  },

  updTitle(){
    if(Input.pressed('action') || Input.pressed('left') || Input.pressed('right')){
      Sfx.ui(); this.state=ST.SELECT;
    }
  },

  updSelect(){
    const playable = EVENTS.filter(e=>READY.includes(e.id));
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
    if(Input.pressed('left'))  ev.onStride(-1, Math.round(now));
    if(Input.pressed('right')) ev.onStride( 1, Math.round(now));
    if(Input.pressed('action')) ev.onAction(Math.round(now));
    if(Input.released('action') && ev.onActionUp) ev.onActionUp(Math.round(now));
    if(Input.pressed('pause')||Input.pressed('back')){ this.backToSelect(); Sfx.ui(); return; }
    ev.update(dt);
    if(ev.phase==='DONE' && now - ev.doneAt > 1100){
      // 기록 갱신 확인
      const r=ev.result;
      if(r.status==='OK'){
        this.newRecord = Save.record(this.def.id, r.value, this.def.higher);
        if(this.newRecord) Sfx.record();
      } else this.newRecord=false;
      this.state=ST.RESULT; this.resultAt=this.t;
    }
  },

  updResult(){
    if(this.t - this.resultAt < 350) return;      // 입력 씹힘 방지 — 결과가 뜨자마자 넘어가지 않게
    if(Input.pressed('action')){ Sfx.ui(); this.start(this.def); }
    if(Input.pressed('back')||Input.pressed('pause')){ Sfx.ui(); this.backToSelect(); }
  },

  /* ── 그리기 ── */
  draw(ctx, uctx){
    ctx.fillStyle=PAL.black; ctx.fillRect(0,0,VW,VH);
    switch(this.state){
      case ST.TITLE:  this.drawTitle(ctx,uctx); break;
      case ST.SELECT: this.drawSelect(ctx,uctx); break;
      case ST.PLAY:   this.event.draw(ctx); this.event.drawUI(uctx); break;
      case ST.RESULT: this.event.draw(ctx); this.drawResult(uctx); break;
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
    Track.drawBack(ctx, this.t*0.0006, 100);
    Track.drawLanes(ctx, this.t*0.0006, 0.16);
    // 데모로 달리는 선수들
    for(let i=0;i<3;i++){
      const y=Track.LANE_Y[i]+Track.LANE_H-10;
      const x=((this.t*0.06 + i*160) % (VW+60)) - 30;
      drawRunner(ctx, x, y, (this.t*0.0016+i*0.3)%1, ['#5aaaff','#ffd75e','#ff6b8a'][i]);
    }
    ctx.fillStyle='rgba(5,6,10,.5)'; ctx.fillRect(0,0,VW,VH);
    txt(uctx,'WORLD SPRINT CIRCUIT', VW/2, 88, 24, PAL.gold, 'center', 700);
    txt(uctx,'좌 · 우를 번갈아 두드려 달린다', VW/2, 120, 12, PAL.white, 'center');
    if(Math.floor(this.t/500)%2===0)
      txt(uctx, Ctrl.mode==='touch'?'액션 버튼을 누르세요':'SPACE 를 누르세요', VW/2, 162, 12, PAL.blue,'center',700);
    txt(uctx,'조작 방식은 일시정지(P)에서 언제든 바꿀 수 있습니다', VW/2, VH-22, 9, PAL.dim,'center');
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
      txt(uctx, (r.value>=99?'--.--':r.value.toFixed(2))+unit, VW/2, 82, 30, PAL.gold,'center',700);
      txt(uctx, '기준 '+d.qualify.toFixed(2)+unit, VW/2, 116, 11, PAL.dim,'center');
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
        txt(uctx, ev.marks.map((m,i)=>`${i+1}차 ${m===null?'파울':m.toFixed(2)}`).join('   '),
            VW/2, 138, 10, PAL.white,'center');
      }
      if(this.newRecord) txt(uctx,'★ 개인 최고기록!', VW/2, 168, 13, PAL.gold,'center',700);
    }
    txt(uctx, Ctrl.mode==='touch'?'액션: 다시  ·  일시정지: 종목 선택':'SPACE: 다시  ·  Q: 종목 선택',
        VW/2, VH-30, 11, PAL.white,'center');
  },
};
