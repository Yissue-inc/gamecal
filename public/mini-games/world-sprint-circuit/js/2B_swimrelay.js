/* ══════════════════════════════════════════════════════════════════
   수영 계영 4×100m 자유형

   달리기엔 계주가 둘인데 수영엔 없었다. 그런데 수영 계영은 달리기 계주와 **다른 것**을 잰다.
   달리기는 바통을 주고받는 **구역**이 있어 '어디서 넘기느냐'가 문제지만,
   수영은 앞 선수가 **벽을 찍는 순간**이 곧 출발 신호다 —
     · 먼저 뛰면 **실격**(팀 전체가 끝난다). 늦으면 그만큼 잃는다
     · 그래서 이 종목은 **0에 최대한 붙이되 절대 음수가 되면 안 되는** 판정이다
   ⚠ SwimEvent 를 상속해 영법·리듬·호흡·턴을 그대로 쓴다 — 계영만의 것은 **인계**뿐이다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const SWIMRELAY = {
  legs: 4,
  legM: 100,
  exWindow: 420,        // 벽을 찍기 전 이 안에서 뛰면 '빠른 인계'
  exPerfect: 90,        // 이 안이면 완벽 — 이득이 크다
  /* ⚠ 0.55/0.22 는 200초짜리 경기에서 **0.8%** 라 체감이 없었다 — 인계를 아예 안 해도
     기록이 같았다. 늦은 인계에는 대가를 붙이고 이득도 키운다(총 6초쯤 갈린다). */
  gainPerfect: 1.2,     // 완벽한 인계로 버는 시간(초)
  gainGood: 0.4,
  lossLate: 0.8,        // 안 뛰면 그만큼 잃는다
};

class SwimRelayEvent extends SwimEvent {
  constructor(def){ super(def); }
  reset(){
    /* 한 구간(100m)짜리 수영을 그대로 쓰고, 구간을 넘기며 4번 반복한다 */
    this.legIndex = 0;
    this.legTimes = [];
    this.exchanges = [];
    this.teamBonus = 0;
    /* ⚠ 'dq' 는 SwimEvent 의 프록시가 **선수의 실격**에 이미 쓰고 있는 이름이다.
       팀 실격을 같은 이름에 담았더니 선수 실격과 뒤섞여 **모든 판이 실격**으로 끝났다
       (오늘 humans 숫자/배열 충돌과 같은 종류). 이름을 갈라 놓는다. */
    this.teamDq = false;
    this.armed = false;          // 다음 주자가 출발대에 섰나
    this.armedAt = -1e9;
    this.trackMOne = SWIMRELAY.legM;
    super.reset();
    this.trackM = SWIMRELAY.legM;      // 한 번에 100m 만 헤엄친다
    this.spTeam = ['dolphin','orca','sealion','penguin'];
  }
  get qualify(){ return this.def.qualify; }
  /* 팀 기록 = 지난 구간 합 + 지금 구간 경과 − 인계 이득 */
  get teamTime(){
    const done = this.legTimes.reduce((a,b)=>a+b,0);
    const cur = this.phase==='SET' ? 0 : Math.max(0, this.elapsed);
    return Math.max(0, done + cur - this.teamBonus);
  }
  /* 앞 주자가 벽에 닿기까지 남은 시간(초) — 인계 판정의 축 */
  get toWall(){
    const me=this.swimmers[0];
    const left = this.trackM - me.dist;
    return me.speed>0.05 ? left/me.speed : 9;
  }

  /* ⚠ 인계를 액션에 얹었더니 **벽 근처의 평범한 호흡**이 부정 출발로 찍혀 매 판 실격이었다.
     액션은 이미 호흡과 턴이 쓰는 키다 — 한 키에 '실격당할 수 있는 동작'을 겹치면 안 된다.
     인계는 ▲ 로 따로 뺀다. */
  onUp(tMs, pIdx){
    const last = this.legIndex >= SWIMRELAY.legs-1;
    if(!last && this.phase==='RUN' && !this.armed && this.toWall < 1.4){
      this.armed=true; this.armedAt=this.t;
      const ms = this.toWall*1000;      // 벽까지 남은 시간(ms)
      if(ms > SWIMRELAY.exWindow){
        this.say('너무 일찍 뛰었다 — 실격', true);
        this.teamDq=true; Sfx.fail();
      } else {
        const q = ms<=SWIMRELAY.exPerfect ? 'PERFECT' : 'GOOD';
        this.exchanges.push(q);
        this.teamBonus += q==='PERFECT' ? SWIMRELAY.gainPerfect : SWIMRELAY.gainGood;
        this.say(q==='PERFECT'?'완벽한 인계!':'인계');
        Sfx.beep(q==='PERFECT'?1240:820, 0.1,'square',0.14);
      }
      return;
    }
  }

  update(dt){
    if(this.teamDq && this.phase!=='DONE'){
      this.phase='DONE'; this.doneAt=this.t;
      this.result={status:'DQ', value:DNF, rank:3};
      return;
    }
    const wasDone = this.phase==='DONE';
    super.update(dt);
    if(!wasDone && this.phase==='DONE' && !this.teamDq){
      /* 한 구간이 끝났다 — 다음 주자로 넘긴다 */
      const me=this.swimmers[0];
      this.legTimes.push(me.dq ? this.def.qualify*0.4 : (me.finishTimeS||this.elapsed));
      if(!this.armed && this.legIndex < SWIMRELAY.legs-1){
        /* 안 뛰었다 — 반응만큼 늦게 출발한 셈 */
        this.exchanges.push('LATE'); this.teamBonus -= SWIMRELAY.lossLate;
        this.say('인계가 늦었다', true);
      }
      if(this.legIndex >= SWIMRELAY.legs-1){
        const total=this.teamTime;
        const pass = total<=this.qualify;
        this.result={status: pass?'OK':'MISSED_QUALIFY', value:total, rank:1};
        this.phase='DONE';
        pass?Sfx.finish():Sfx.fail();
        return;
      }
      /* 다음 구간 시작 — 상태만 초기화하고 팀 기록은 이어 간다 */
      this.legIndex++;
      const keepTimes=this.legTimes, keepEx=this.exchanges, keepBonus=this.teamBonus, keepLeg=this.legIndex;
      super.reset();
      this.trackM = SWIMRELAY.legM;
      this.legTimes=keepTimes; this.exchanges=keepEx; this.teamBonus=keepBonus; this.legIndex=keepLeg;
      this.armed=false; this.result=null;
      /* 이미 출발한 상태로 시작한다 — 총성을 다시 기다리지 않는다 */
      this.phase='RUN'; this.gunMs=this.t;
      this.spTeam = ['dolphin','orca','sealion','penguin'];
    }
  }

  drawUI(u){
    super.drawUI(u);
    /* 계영만의 정보 — 구간·팀 기록·인계 */
    plate(u, 0, 30, VW, 22, .74);
    txt(u, K('%1번 주자').replace('%1', this.legIndex+1)+' / '+SWIMRELAY.legs,
        8, 34, 11, PAL.gold,'left',700);
    txt(u, K('팀 기록')+' '+fmtTime(this.teamTime), VW/2, 34, 12,
        this.teamTime<=this.qualify?PAL.green:PAL.white,'center',700);
    if(this.teamBonus>0)
      txt(u, '−'+this.teamBonus.toFixed(2)+K('초'), VW-8, 34, 10, PAL.green,'right',700);
    /* 인계 창 — 마지막 주자가 아니면 언제 뛸지 보여 준다 */
    const last=this.legIndex>=SWIMRELAY.legs-1;
    if(!last && this.phase==='RUN' && !this.armed){
      const ms=this.toWall*1000;
      if(ms<1400){
        /* ⚠ VH-30 은 수영의 리듬 막대와 겹쳤다 — 인계는 더 위에 둔다 */
        const bw=150, bx=VW/2-bw/2, by=VH-62;
        u.fillStyle='rgba(255,255,255,.14)'; u.fillRect(bx,by,bw,10);
        /* 초록 = 뛰어도 되는 구간, 왼쪽 붉은 부분 = 너무 이르다 */
        u.fillStyle='rgba(92,255,156,.42)';
        u.fillRect(bx+bw*(1-SWIMRELAY.exWindow/1400), by, bw*(SWIMRELAY.exWindow/1400), 10);
        u.fillStyle='rgba(255,90,74,.35)';
        u.fillRect(bx, by, bw*(1-SWIMRELAY.exWindow/1400), 10);
        const k=clamp(1-ms/1400,0,1);
        u.fillStyle=PAL.white; u.fillRect(bx+bw*k-1, by-3, 2, 16);
        txt(u, K('인계 — 벽을 찍기 직전에 ▲'), VW/2, by-14, 10,
            ms<=SWIMRELAY.exWindow?PAL.green:PAL.red,'center',700);
      }
    }
    if(this.exchanges.length)
      txt(u, this.exchanges.map(e=>e==='PERFECT'?'◎':e==='GOOD'?'○':'×').join(' '),
          8, 46, 11, PAL.gold,'left',700);
  }
}
