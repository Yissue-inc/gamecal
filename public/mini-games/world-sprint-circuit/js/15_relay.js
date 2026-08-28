/* ══════════════════════════════════════════════════════════════════
   4×100m 계주 — 아케이드
   ⚠ 이 종목의 핵심은 '빨리 달리기'가 아니라 **바통 인계**다.
      인계 구역(20m) 안에서만 넘길 수 있고, 다음 주자가 미리 달리기 시작해
      속도가 붙었을 때 넘기면 오히려 빨라진다(러닝 스타트).
      너무 이르면 다음 주자가 느리고, 너무 늦으면 구역을 벗어나 실격이다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const RELAY = {
  legM: 100,               // 한 구간
  zoneM: 20,               // 인계 구역 폭
  startAheadM: 8,          // 다음 주자가 앞에서 출발한다
  optOverlap: 0.72,        // 이 정도 속도비에서 넘기면 최적
};

class RelayEvent extends SprintEvent {
  constructor(def){ super(def); }
  reset(){
    this.phase='SET'; this.t=0;
    this.gunMs = 1400 + Math.random()*1600;
    this.setBeeps=0;
    this.trackM = 400;
    this.mPerPx = 0.30;
    /* 우리 팀 4명 — 각자 자기 구간을 달린다 */
    this.legs=[];
    const spTeam=['cheetah','hound','rabbit','gazelle'];
    for(let i=0;i<4;i++){
      const r=new Runner(1,{},true, i===0 ? 400 : 400);   // 남은 거리는 인계 때 다시 잡는다
      r.reset(this.gunMs); r.species=spTeam[i]; r.legIndex=i;
      this.legs.push(r);
    }
    this.cur=0;                       // 지금 달리는 주자
    this.legs[0].started=false;
    /* 다음 주자 — 인계 구역에서 미리 달린다 */
    this.nextRunning=false; this.nextDist=0; this.nextSpeed=0;
    this.handoffs=[];                 // 각 인계 품질
    this.baseM=0;                     // 앞 구간들의 누적 거리
    /* 상대 팀 2개 */
    this.rivals=[];
    for(let i=0;i<2;i++){
      const skill=0.66+i*0.14+Math.random()*0.08;
      this.rivals.push({ lane:i===0?0:2, dist:0, speed:0, skill,
        target: (RELAY.legM*4) / (44 - skill*7) });   // 목표 평균속도
    }
    this.doneAt=0; this.result=null; this.camM=0; this.flash=0;
    this.msg=''; this.msgAt=-1e9;
    this.dq=false;
  }
  get qualify(){ return this.def.qualify; }
  get teamDist(){ return this.baseM + (this.legs[this.cur]?this.legs[this.cur].distM:0); }

  say(m, bad){ this.msg=m; this.msgAt=this.t; this.msgBad=!!bad;
    bad? Sfx.beep(200,0.14,'sawtooth',0.12) : Sfx.beep(1046,0.10,'square',0.12); }

  onStride(side, tMs){
    if(this.phase==='DONE') return;
    if(this.phase!=='RUN'){
      if(tMs < this.gunMs && tMs > this.gunMs-1200){
        this.legs[0].falseStart=true; this.phase='DONE'; this.doneAt=this.t;
        this.result={ status:'FALSE_START', value:99.99, rank:3 }; Sfx.fail();
      }
      return;
    }
    const r=this.legs[this.cur];
    const j=r.stride(side, tMs, 'off');
    if(j) Sfx.step(j);
  }
  /* 액션 = 바통 인계.
     ⚠ 판정은 '주자가 몇 m 달렸나'가 아니라 **팀이 트랙의 어디에 있나**로 한다.
        예전엔 인계할 때마다 100m 를 통째로 적립해서, 일찍 넘기면 거리를 공짜로
        건너뛰었다 — 엉성한 인계(32.67초)가 잘한 인계(33.46초)보다 빨랐다. */
  zoneEnd(i){ return (i+1)*RELAY.legM; }          // i 번째 인계가 끝나야 하는 지점
  onAction(tMs){
    if(this.phase!=='RUN' || this.cur>=3) return;
    const end=this.zoneEnd(this.cur);
    const into = this.teamDist - (end - RELAY.zoneM);
    if(into < 0){ this.say('아직 인계 구역이 아니다', true); this.legs[this.cur].speed*=0.94; return; }
    this.handoff(tMs);
  }
  handoff(tMs){
    const r=this.legs[this.cur];
    const nxt=this.legs[this.cur+1];
    /* 인계 품질 — 두 주자의 속도가 비슷할수록 좋다 */
    const ratio = r.speed>0 ? clamp(this.nextSpeed/r.speed, 0, 1.4) : 0;
    const q = clamp(1 - Math.abs(ratio - RELAY.optOverlap)/0.72, 0.08, 1);
    this.handoffs.push(q);
    /* 다음 주자는 지금 속도를 이어받는다 */
    nxt.started=true;
    /* ⚠ 완벽한 인계라도 앞 주자 속도를 그대로 물려받지는 않는다.
       1.04 로 두니 33.33초가 나왔다 — 세계기록이 36.84초다.
       실제 계주가 개인기록 합보다 빠른 건 러닝스타트 덕이지 공짜가 아니다. */
    /* 러닝스타트 — 잘 넘기면 다음 주자가 이미 속도를 갖고 출발한다.
       이게 계주가 개인기록 합보다 빠른 이유다. 너무 인색하면(0.86) 오히려 느려진다. */
    nxt.speed = lerp(r.speed*0.42, r.speed*1.02, q);
    /* 좋은 인계는 '탄력'을 남긴다 — 몇 초 동안 목표 속도가 올라간다.
       나쁜 인계는 반대로 깎인다. 이게 계주가 개인기록 합보다 빠른/느린 이유다. */
    nxt.momentum = lerp(0.93, 1.09, q); nxt._mom0 = nxt.momentum; nxt.momentumT = 0;
    nxt.flying = true;            // 이미 달리는 중이다 — 가속 구간을 건너뛴다
    nxt.distM = 0;
    nxt.lastInputMs = tMs;            // 리듬을 이어서 시작
    /* 실제로 달린 만큼만 적립한다. 남은 거리는 다음 주자가 뛴다. */
    this.baseM += r.distM;
    nxt.trackM = Math.max(20, 400 - this.baseM);
    this.cur++;
    this.nextRunning=false; this.nextDist=0; this.nextSpeed=0;
    this.say(q>0.75? `완벽한 인계! ${Math.round(q*100)}%` :
             q>0.45? `인계 ${Math.round(q*100)}%` : `엉성한 인계 ${Math.round(q*100)}%`, q<0.45);
    Sfx.beep(q>0.75?1320:660, 0.12, 'square', 0.14);
  }

  update(dt){
    this.t += dt*1000;
    const now=this.t;
    if(this.phase==='SET'){
      const want=Math.min(3, Math.floor((this.gunMs-now>0? 3-(this.gunMs-now)/450 : 3)));
      if(want>this.setBeeps && want<=3){ this.setBeeps=want; Sfx.set(); }
      if(now>=this.gunMs){ this.phase='RUN'; Sfx.gun(); this.flash=1; }
    }
    if(this.phase==='RUN'){
      const r=this.legs[this.cur];
      r.simulate(dt, now);
      /* 다음 주자 — 구역이 가까워지면 스스로 달리기 시작한다 */
      if(this.cur<3){
        const left = this.zoneEnd(this.cur) - this.teamDist;
        if(!this.nextRunning && left < RELAY.zoneM + RELAY.startAheadM){
          this.nextRunning=true; this.nextSpeed=0; this.nextDist=0;
        }
        if(this.nextRunning){
          this.nextSpeed = Math.min(r.speed*1.15, this.nextSpeed + dt*7.5);
          this.nextDist += this.nextSpeed*dt;
        }
      }
      /* 구역을 벗어나면 실격 */
      if(this.cur<3 && this.teamDist > this.zoneEnd(this.cur) + 2){
        this.dq=true; this.phase='DONE'; this.doneAt=now;
        this.result={ status:'DQ', value:99.99, rank:3 };
        this.say('인계 구역을 놓쳤다 — 실격', true); Sfx.fail();
      }
      /* 마지막 주자 완주 */
      if(this.cur===3 && r.finished){
        const total=(now-this.gunMs)/1000 - (r.leanBonusS||0);
        this.phase='DONE'; this.doneAt=now;
        const pass = total<=this.qualify;
        this.result={ status: pass?'OK':'MISSED_QUALIFY', value:total, rank:this.rankOf() };
        pass? Sfx.finish() : Sfx.fail();
      }
      /* 상대 팀 */
      for(const rv of this.rivals){
        rv.speed += (rv.target - rv.speed)*Math.min(1, dt*1.6);
        rv.dist += rv.speed*dt;
      }
      if(this.elapsed > this.qualify + 14){
        this.phase='DONE'; this.doneAt=now;
        this.result={ status:'TIMEOUT', value:99.99, rank:3 }; Sfx.fail();
      }
    }
    const focus=this.teamDist;
    this.camM += (Math.max(0, focus - VW*this.mPerPx*0.34) - this.camM)*Math.min(1, dt*8);
    this.flash=Math.max(0, this.flash-dt*4);
    Sfx.crowd(clamp((this.legs[this.cur]?this.legs[this.cur].speed:0)/12,0,1)*(this.phase==='RUN'?1:0.3));
  }
  rankOf(){
    const mine=this.teamDist;
    let r=1; for(const rv of this.rivals) if(rv.dist>mine) r++;
    return r;
  }
  draw(ctx){
    Track.drawBack(ctx, this.camM, 400);
    Track.drawLanes(ctx, this.camM, this.mPerPx);
    Track.drawMarks(ctx, this.camM, this.mPerPx);
    /* 인계 구역 표시 */
    for(let i=1;i<4;i++){
      const z0=i*RELAY.legM - RELAY.zoneM, z1=i*RELAY.legM;
      const x0=Math.round((z0-this.camM)/this.mPerPx), x1=Math.round((z1-this.camM)/this.mPerPx);
      if(x1<0||x0>VW) continue;
      ctx.fillStyle='rgba(92,255,156,.13)';
      for(const y of Track.LANE_Y) ctx.fillRect(x0, y, x1-x0, Track.LANE_H-6);
      ctx.fillStyle='rgba(92,255,156,.55)';
      for(const y of Track.LANE_Y){ ctx.fillRect(x0, y, 1, Track.LANE_H-6); ctx.fillRect(x1, y, 1, Track.LANE_H-6); }
    }
    Track.drawFinish(ctx, this.camM, this.mPerPx, 400);
    const px=(m)=>Math.round((m-this.camM)/this.mPerPx);
    /* 상대 팀 */
    const col=['#5aaaff','#ffd75e','#ff6b8a'];
    this.rivals.forEach((rv,i)=>{
      const y=Track.LANE_Y[rv.lane]+Track.LANE_H-10, x=px(rv.dist);
      if(x<-20||x>VW+20) return;
      if(CharHD.enabled) (this._hd=this._hd||[]).push({sp:'hound', x, y, ph:(this.t*0.004+i)%1,
        o:{rare:3, moving:true, t:this.t}});
      else drawRunner(ctx, x, y, (this.t*0.004+i)%1, col[rv.lane]);
    });
    /* 우리 주자 */
    const r=this.legs[this.cur];
    const my=Track.LANE_Y[1]+Track.LANE_H-10;
    const mx=px(this.teamDist);
    if(CharHD.enabled) (this._hd=this._hd||[]).push({sp:r.species, x:mx, y:my, ph:r.stridePhase,
      o:{rare:(SPECIES[r.species]&&SPECIES[r.species].rare)||3, moving:this.phase==='RUN', t:this.t,
         crouch:this.phase==='SET'}});
    else drawRunner(ctx, mx, my, r.stridePhase, '#ffd75e', {crouch:this.phase==='SET'});
    /* 다음 주자 — 앞에서 미리 달린다 */
    if(this.nextRunning && this.cur<3){
      const nx=px(this.baseM + RELAY.legM + this.nextDist - RELAY.startAheadM);
      const n=this.legs[this.cur+1];
      if(CharHD.enabled) (this._hd=this._hd||[]).push({sp:n.species, x:nx, y:my, ph:(this.t*0.005)%1,
        o:{rare:(SPECIES[n.species]&&SPECIES[n.species].rare)||3, moving:true, t:this.t}});
      else drawRunner(ctx, nx, my, (this.t*0.005)%1, '#a0e8ff');
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.5})`; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    if(this._hd){ for(const c of this._hd) CharHD.draw(u, c.sp, c.x, c.y, c.ph, c.o); this._hd=null; }
    HUD.race(u, { timeS:Math.max(0,this.elapsed), speed:this.legs[this.cur].speed,
      distM:this.teamDist, trackM:400, qualify:this.qualify, best:Save.data.best[this.def.id] });
    /* 주자 표시 */
    plate(u, 6, 34, 116, 12+4*11, .8);
    txt(u,'주자',11,36,8,PAL.dim);
    this.legs.forEach((r,i)=>{
      const on=i===this.cur, done=i<this.cur;
      const nm=(SPECIES[r.species]&&SPECIES[r.species].name)||'?';
      txt(u, `${i+1} ${nm}`, 11, 46+i*11, 9, on?PAL.gold:(done?PAL.dim:PAL.white), 'left', on?700:400);
      const q=this.handoffs[i];
      if(q!==undefined) txt(u, Math.round(q*100)+'%', 118, 46+i*11, 8,
        q>0.75?PAL.green:q>0.45?PAL.gold:PAL.red, 'right');
    });
    if(this.phase==='SET'){
      plate(u,VW/2-76,VH/2-24,152,42,.72);
      txt(u,'제자리에',VW/2,VH/2-18,15,PAL.gold,'center',700);
      txt(u,'총성을 기다리세요',VW/2,VH/2,10,PAL.dim,'center');
    } else if(this.phase==='RUN'){
      const r=this.legs[this.cur];
      const now=this.t, tgt=r.targetIntervalMs();
      const err = r.lastInputMs<-1e8?0:clamp(((now-r.lastInputMs)-tgt)/tgt,-1,1);
      HUD.rhythm(u,{nextSide:-r.lastSide||1, phaseErr:err, form:r.form});
      HUD.judge(u, r.lastJudge, now-r.lastJudgeMs);
      if(this.cur<3){
        const left = this.zoneEnd(this.cur) - this.teamDist;
        const inZone = left <= RELAY.zoneM;
        if(inZone){
          const ratio = r.speed>0? this.nextSpeed/r.speed : 0;
          const good = Math.abs(ratio-RELAY.optOverlap) < 0.2;
          txt(u, good? '지금 넘겨!' : `인계 구역 — ${left.toFixed(0)}m 남음`,
              VW/2, 56, good?16:12, good?PAL.green:PAL.gold, 'center', 700);
          txt(u, '늦게 넘길수록 마지막 주자가 덜 뜁니다', VW/2, 70, 9, PAL.dim, 'center');
          /* 속도 맞추기 게이지 */
          const w=170,x=(VW-w)/2,y=76;
          plate(u,x-4,y-4,w+8,16,.7);
          u.fillStyle='rgba(242,245,250,.14)'; u.fillRect(x,y,w,8);
          u.fillStyle='rgba(92,255,156,.5)';
          u.fillRect(x+w*(RELAY.optOverlap-0.14), y, w*0.28, 8);
          u.fillStyle=PAL.white; u.fillRect(x+w*clamp(ratio,0,1.2)/1.2-1, y-2, 2, 12);
        } else if(left < RELAY.zoneM+20){
          txt(u, `인계 구역까지 ${(left-RELAY.zoneM).toFixed(0)}m`, VW/2, 56, 11, PAL.dim,'center');
        }
      }
    }
    if(this.msg && this.t-this.msgAt<900){
      const a=1-(this.t-this.msgAt)/900; u.save(); u.globalAlpha=a;
      txt(u,this.msg,VW/2,94,13,this.msgBad?PAL.red:PAL.green,'center',700); u.restore();
    }
  }
}
