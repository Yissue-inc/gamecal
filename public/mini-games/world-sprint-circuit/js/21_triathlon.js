/* ══════════════════════════════════════════════════════════════════
   철인3종 — 두 번째 '그릇'인데, 10종 경기와 **정반대**다.

   10종 경기는 열 종목을 각각 끝내고 점수로 환산한다. 쉬었다 간다.
   철인3종은 **끊기지 않는다**. 수영에서 힘을 다 쓰면 자전거가 무너지고,
   자전거에서 무리하면 달리기가 안 된다. 그래서 체력이 세 구간을 관통한다.
   전환(T1·T2)에도 시간이 든다 — 실제 경기에서 순위가 갈리는 자리다.

   ⚠ 하위 종목 인스턴스를 새로 만들면 체력이 초기화된다. 그게 이 종목의 핵심을
      없앤다 — 그래서 전환할 때 **누적 피로를 다음 구간에 넘긴다.**
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* ⚠ 처음엔 달리기 구간을 5000m 로 뒀는데, 그 하나가 **전체 기록의 91%** 를 먹었다 —
   철인3종이 아니라 5000m 에 수영이 붙은 꼴이었다. 스프린트 철인3종 비율로 줄였고,
   달리기는 wallSec 으로 플레이 시간까지 짧게 덮어쓴다(안 그러면 한 판이 4분을 넘는다). */
const TRI = {
  legs: [
    { id:'swimFree100', name:'수영',   share:0.30 },
    { id:'cycling',     name:'사이클', share:0.15 },
    { id:'run800',      name:'달리기', share:0.55, wallSec:48 },
  ],
  transitionMs: 2600,     // T1·T2 — 장비를 바꾸는 시간
  fatiguePerLeg: 0.30,    // 한 구간을 마칠 때 다음 구간에 넘기는 피로
};

class TriathlonEvent {
  constructor(def){ this.def=def; this.reset(); }
  reset(){
    this.leg=0; this.phase='INTRO'; this.t=0; this.introAt=0;
    this.splits=[]; this.carry=0;          // 누적 피로 (0~1)
    this.sub=null; this.transAt=-1e9;
    this.result=null; this.doneAt=0;
    this.startLeg(0);
  }
  get qualify(){ return this.def.qualify; }
  get cur(){ return TRI.legs[this.leg]; }
  get curDef(){ return EVENT_BY_ID[this.cur.id]; }
  get people(){ return this.sub && this.sub.people; }
  /* 지금까지 흐른 시간 — 구간 기록 + 전환 시간의 합 */
  get total(){ return this.splits.reduce((a,b)=>a+b.s,0)
    + (this.sub && this.sub.elapsed>0 ? this.sub.elapsed : 0); }

  startLeg(i){
    this.leg=i;
    if(i>=TRI.legs.length){ this.finish(); return; }
    const base=this.curDef, Klass=G.classFor(base);
    if(!Klass){ this.splits.push({name:this.cur.name, s:0}); this.startLeg(i+1); return; }
    /* 구간용 정의는 **사본**이다 — 원본을 건드리면 그 종목을 단독으로 할 때도 바뀐다 */
    const d = this.cur.wallSec ? Object.assign({}, base, {wallSec:this.cur.wallSec}) : base;
    this.sub=new Klass(d); this.sub.pIndex=0;
    /* ⚠ 누적 피로를 넘긴다. 이게 없으면 세 종목을 따로 하는 것과 같다 —
       철인3종이 아니라 그냥 묶음이 된다. */
    this.applyCarry(this.sub);
    this.phase = i===0 ? 'INTRO' : 'TRANS';
    this._cut = 0;                       // 전환 단축은 구간마다 새로 번다
    this.introAt=this.t; this.transAt=this.t;
  }
  applyCarry(sub){
    const c=this.carry; if(c<=0) return;
    /* 종목마다 '지친 상태'를 담는 이름이 다르다 — 있는 것에만 건다 */
    const R = sub.people || sub.runners || sub.swimmers || null;
    if(R) for(const r of R){
      if(r.stamina!==undefined) r.stamina = Math.max(0.25, r.stamina*(1-c*0.55));
      if(r.form!==undefined)    r.form    = Math.max(0.3,  r.form*(1-c*0.35));
      if(r.fatigue!==undefined) r.fatigue = Math.min(1, (r.fatigue||0) + c*0.5);
    }
    if(sub.stamina!==undefined) sub.stamina = Math.max(0.25, sub.stamina*(1-c*0.55));
    sub.triCarry = c;      // 화면에 보여 주려고
  }

  onStride(s,tMs,p){ if(this.skipIntro()) return; if(this.sub) this.sub.onStride(s,tMs,p); }
  onAction(tMs,p){
    if(this.skipIntro()) return;
    /* ⛔ 전환 구역에서는 액션이 **아무 일도 안 했다**(끝난 앞 종목으로 넘겨져 버려서).
       실측 누름의 11% 가 여기서 죽었다. 그런데 실제 철인3종에서 전환 구역은
       **뛰어서 통과하는 곳**이다 — 죽은 기다림을 조작으로 바꾼다.
       누를수록 빨리 빠져나간다(최대 45% 까지 · 완전히 건너뛰지는 못한다). */
    if(this.phase==='TRANS'){
      const cap = TRI.transitionMs*0.45;
      const before = this._cut||0;
      this._cut = Math.min(cap, before + 130);
      if(this._cut > before){
        /* ⛔ 여기서 this.say() 를 불렀다가 크래시가 났다 — **이 클래스엔 say 가 없다.**
           복합 종목은 화면을 하위 종목에 넘기므로 자기 문구 장치를 안 갖고 있다.
           ⚠ 다른 종목에 있는 메서드가 여기에도 있으리라 짐작하지 말 것. */
        Sfx.step('GOOD');
        this.transMsg = K('전환 구역 — 뛰어서 빠져나간다');
        this.transMsgAt = this.t; this.transMsgHold = 0;
      } else if(tMs - (this._capAt||-1e9) > 400){
        this._capAt = tMs; Sfx.beep(240,0.05,'sine',0.07);
      }
      return;
    }
    if(this.sub) this.sub.onAction(tMs,p);
  }
  onActionUp(tMs,p){ if(this.sub&&this.sub.onActionUp) this.sub.onActionUp(tMs,p); }
  onUp(tMs,p){ if(this.sub&&this.sub.onUp) this.sub.onUp(tMs,p); }
  onDown(tMs,p){ if(this.sub&&this.sub.onDown) this.sub.onDown(tMs,p); }
  skipIntro(){ if(this.phase==='INTRO'){ this.phase='RUN'; return true; } return false; }

  update(dt){
    this.t += dt*1000;
    if(this.phase==='DONE') return;
    if(this.phase==='INTRO'){ if(this.t-this.introAt>1500) this.phase='RUN'; return; }
    if(this.phase==='TRANS'){
      /* 전환 구역 — 시간이 흐른다. 여기서 쉬는 게 아니라 잃는 것이다. */
      const need = TRI.transitionMs - (this._cut||0);
      if(this.t-this.transAt > need){
        this.splits.push({name:'전환', s:need/1000, trans:true});
        this.phase='RUN';
      }
      return;
    }
    if(!this.sub) return;
    this.sub.update(dt);
    if(this.sub.result){
      const r=this.sub.result;
      const bad = r.status!=='OK' && r.status!=='MISSED_QUALIFY';
      const s = bad ? this.curDef.qualify*1.6 : r.value;   // 실격이면 큰 벌시간
      /* ⛔ 실격이 **조용했다**(2026-08-31 실측): 부정 출발로 수영 구간을 잃고 26초를
         벌시간으로 먹었는데 화면엔 숫자만 바뀌었다. 왜 잃었는지 모르면 다음 판에 못 고친다.
         구간 하나를 통째로 잃는 일이라, 전환 화면에 이유를 띄운다. */
      if(bad){
        /* ⚠ 조각마다 K() — 통짜 템플릿은 번역표가 못 잡는다(i18ncheck 가 잡아 준다) */
        this.transMsg = `${K(this.cur.name)} ${K('구간')} ${K(r.status==='FALSE_START'?'부정 출발':'실격')}` +
                        ` — ${K('벌시간')} ${Math.round(s)}${K('초')}`;
        this.transMsgAt = this.t; this.transMsgHold = 2400;   // 안내(700ms)보다 오래 — 이건 사고 보고다
      }
      this.splits.push({name:this.cur.name, s, bad});
      this.carry = Math.min(1, this.carry + TRI.fatiguePerLeg);
      this.sub=null;
      this.startLeg(this.leg+1);
    }
  }
  finish(){
    this.phase='DONE'; this.doneAt=this.t;
    const total=this.splits.reduce((a,b)=>a+b.s,0);
    const pass = total<=this.qualify;
    this.result={ status: pass?'OK':'MISSED_QUALIFY', value:total, rank: pass?1:2 };
    pass?Sfx.finish():Sfx.fail();
  }

  draw(ctx){
    if(this.sub && this.phase!=='TRANS') this.sub.draw(ctx);
    /* ⛔ 여기 **전환 화면이 한 벌 더** 있었다(2026-08-31 겹침 감시로 발견).
       drawUI 에도 같은 화면이 있어서 '전환 구역'·시계가 두 겹으로,
       '액션을 눌러…'(y114) 가 '운동화로'(y100~122) 를 159px 물고 있었다.
       나중에 안내를 붙이면서 **옛 화면을 안 지운 것** — 도약의 시기 루프와 같은 사고다.
       한 화면은 한 곳에서 그린다. 여기는 배경만 맡고 글은 전부 drawUI 가 그린다. */
    if(this.phase==='TRANS'){ /* 배경은 drawUI 의 덮개가 깐다 */ }
    else {
      const gt=Track.fieldBack(ctx,22);
      Track.fieldGround(ctx,{grassTop:gt, surface:'#4a4550'});
      ctx.fillStyle='rgba(5,6,10,.55)'; ctx.fillRect(0,0,VW,VH);
    }
  }
  drawUI(u){
    if(this.sub && this.phase!=='TRANS') this.sub.drawUI(u);
    /* 구간 띠 — 지금 어디이고 얼마나 걸렸나
       ⛔ 처음엔 VH-H(하단 15px)에 뒀다가 하위 종목의 조작 안내를 덮어서 위로 올렸고,
          그러자 이번엔 **띠 안에서** 레일 바늘이 총시간 숫자를 뚫었다('2:46▲82').
          한 줄에 [구간 · 피로 · 시간 · 레일] 넷을 다 넣으려 한 게 잘못이다 —
          **띠를 두 줄로 만든다**(22px). 윗줄은 이름·시간, 아랫줄은 막대·레일. */
    const H=22, BY = VH - 54;
    u.fillStyle='rgba(6,10,18,.94)'; u.fillRect(0, BY, VW, H);
    let x=6;
    TRI.legs.forEach((L,i)=>{
      const w=Math.floor((VW-120)/TRI.legs.length*(L.share*3));
      const rec=this.splits.find(s=>s.name===L.name), done=!!rec, now=i===this.leg;
      /* 잃은 구간은 초록이 아니라 빨강이다 — '지나갔다' 와 '잃었다' 는 다르다 */
      const col = rec&&rec.bad ? PAL.red : done?PAL.green : now?PAL.gold : 'rgba(255,255,255,.16)';
      u.fillStyle = col;
      u.fillRect(x, BY+12, Math.max(10,w-2), 5);
      txt(u, L.name+(rec&&rec.bad?' ✕':''), x, BY+2, 7,
          rec&&rec.bad?PAL.red:done?PAL.green:now?PAL.gold:PAL.dim,'left');
      x += Math.max(12,w);
    });
    txt(u, fmtTime(this.total), VW-8, BY+1, 11, PAL.gold,'right',700);
    /* 총 시간만으로는 좋은지 알 수 없다 — 동–은–금 자리를 같이 보인다(05_scoreboard).
       ⚠ 상단은 하위 종목이 쓴다. 하단 띠에만 얹는다. */
    if(typeof SB !== 'undefined' && this.total > 0)
      SB.rail(u, VW-84, BY+15, 62, this.total, medalCuts(this.def), !!this.def.higher);  /* ⚠ VW-70 이면 오른쪽 끝 472 가 일시정지 버튼(461~480) 밑이다 */
    /* 누적 피로 — 이 종목의 정체성이라 항상 보인다 */
    if(this.carry>0){
      const bw=54, bx=VW-80-bw;
      txt(u,'피로', bx-4, BY+2, 8, PAL.dim,'right');
      u.fillStyle='rgba(255,255,255,.16)'; u.fillRect(bx, BY+12, bw, 5);
      u.fillStyle = this.carry>0.55?PAL.red:PAL.gold;
      u.fillRect(bx, BY+12, Math.round(bw*this.carry), 5);
    }

    if(this.phase==='INTRO'){
      u.fillStyle='rgba(5,6,10,.78)'; u.fillRect(0,0,VW,VH);
      txt(u,'철인3종', VW/2, 76, 11, PAL.dim,'center');
      txt(u,'수영 → 사이클 → 달리기', VW/2, 92, 20, PAL.gold,'center',700);
      txt(u,'끊기지 않는다 — 앞 구간에서 쓴 힘이 뒤로 넘어간다', VW/2, 122, 10, PAL.white,'center');
      txt(u,'기준 '+fmtTime(this.qualify), VW/2, 140, 11, PAL.green,'center',700);
      txt(u,'아무 키나 눌러 시작', VW/2, VH-42, 10, PAL.dim,'center');
    } else if(this.phase==='TRANS'){
      /* ⚠ 줄 간격은 **글자 크기만큼** 띄운다 — 22px 짜리 밑에 10px 을 12px 아래 놓으면 문다.
         84(11) · 100(22) · 126(10) · 140(15) · 158(11) · 172(9) · 186(9) */
      const left=Math.max(0,((TRI.transitionMs-(this._cut||0))-(this.t-this.transAt))/1000);
      u.fillStyle='rgba(5,6,10,.80)'; u.fillRect(0,0,VW,VH);
      txt(u,'전환 구역', VW/2, 84, 11, PAL.dim,'center');
      txt(u, this.leg===1?'자전거로':'운동화로', VW/2, 100, 22, PAL.gold,'center',700);
      txt(u,'액션을 눌러 빨리 빠져나간다', VW/2, 126, 10, PAL.white,'center');
      txt(u, left.toFixed(1)+'초', VW/2, 140, 15, PAL.blue,'center',700);
      const last=this.splits[this.splits.length-1];
      if(last && !last.trans)
        txt(u, last.name+' '+fmtTime(last.s), VW/2, 158, 11, PAL.green,'center');
      if(this.transMsg && this.t-this.transMsgAt < (this.transMsgHold||700))
        txt(u, this.transMsg, VW/2, 172, 9, this.transMsgHold?PAL.red:PAL.dim, 'center', this.transMsgHold?700:400);
      /* ⚠ VH-42(228) 는 구간 띠(223~238) 안이다 — 덮개 위로 올린다 */
      txt(u,'여기서 쉬는 게 아니라 잃는 것이다', VW/2, 188, 9, PAL.dim,'center');
    }
  }
}
