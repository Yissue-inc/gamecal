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
  onAction(tMs,p){ if(this.skipIntro()) return; if(this.sub) this.sub.onAction(tMs,p); }
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
      if(this.t-this.transAt > TRI.transitionMs){
        this.splits.push({name:'전환', s:TRI.transitionMs/1000, trans:true});
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
    else {
      const gt=Track.fieldBack(ctx,22);
      Track.fieldGround(ctx,{grassTop:gt, surface:'#4a4550'});
      ctx.fillStyle='rgba(5,6,10,.55)'; ctx.fillRect(0,0,VW,VH);
    }
  }
  drawUI(u){
    if(this.sub && this.phase!=='TRANS') this.sub.drawUI(u);
    /* 구간 띠 — 지금 어디이고 얼마나 걸렸나 */
    const H=15;
    u.fillStyle='rgba(6,10,18,.86)'; u.fillRect(0, VH-H, VW, H);
    let x=6;
    TRI.legs.forEach((L,i)=>{
      const w=Math.floor((VW-120)/TRI.legs.length*(L.share*3));
      const done=this.splits.some(s=>s.name===L.name), now=i===this.leg;
      u.fillStyle = done?PAL.green : now?PAL.gold : 'rgba(255,255,255,.16)';
      u.fillRect(x, VH-H+5, Math.max(10,w-2), 5);
      txt(u, L.name, x, VH-H+1, 7, done?PAL.green:now?PAL.gold:PAL.dim,'left');
      x += Math.max(12,w);
    });
    txt(u, fmtTime(this.total), VW-8, VH-H+2, 11, PAL.gold,'right',700);
    /* 누적 피로 — 이 종목의 정체성이라 항상 보인다 */
    if(this.carry>0){
      const bw=54, bx=VW-70-bw;
      txt(u,'피로', bx-4, VH-H+3, 8, PAL.dim,'right');
      u.fillStyle='rgba(255,255,255,.16)'; u.fillRect(bx, VH-H+5, bw, 5);
      u.fillStyle = this.carry>0.55?PAL.red:PAL.gold;
      u.fillRect(bx, VH-H+5, Math.round(bw*this.carry), 5);
    }

    if(this.phase==='INTRO'){
      u.fillStyle='rgba(5,6,10,.78)'; u.fillRect(0,0,VW,VH);
      txt(u,'철인3종', VW/2, 76, 11, PAL.dim,'center');
      txt(u,'수영 → 사이클 → 달리기', VW/2, 92, 20, PAL.gold,'center',700);
      txt(u,'끊기지 않는다 — 앞 구간에서 쓴 힘이 뒤로 넘어간다', VW/2, 122, 10, PAL.white,'center');
      txt(u,'기준 '+fmtTime(this.qualify), VW/2, 140, 11, PAL.green,'center',700);
      txt(u,'아무 키나 눌러 시작', VW/2, VH-42, 10, PAL.dim,'center');
    } else if(this.phase==='TRANS'){
      const left=Math.max(0,(TRI.transitionMs-(this.t-this.transAt))/1000);
      u.fillStyle='rgba(5,6,10,.72)'; u.fillRect(0,0,VW,VH);
      txt(u,'전환 구역', VW/2, 84, 11, PAL.dim,'center');
      txt(u, this.leg===1?'자전거로':'운동화로', VW/2, 100, 22, PAL.gold,'center',700);
      txt(u, left.toFixed(1)+'초', VW/2, 130, 15, PAL.white,'center',700);
      const last=this.splits[this.splits.length-1];
      if(last && !last.trans)
        txt(u, last.name+' '+fmtTime(last.s), VW/2, 152, 11, PAL.green,'center');
      txt(u,'여기서 쉬는 게 아니라 잃는 것이다', VW/2, VH-42, 9, PAL.dim,'center');
    }
  }
}
