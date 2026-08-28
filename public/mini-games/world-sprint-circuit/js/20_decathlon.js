/* ══════════════════════════════════════════════════════════════════
   10종 경기 — 새 물리가 아니라 **그릇**이다.

   이미 있는 열 종목을 순서대로 뛰고, 각 기록을 점수로 바꿔 더한다.
   그래서 코드도 물리를 새로 쓰지 않는다 — 하위 종목 인스턴스를 하나 들고 있다가
   끝나면 점수를 매기고 다음을 띄운다. G(화면 관리자)는 이게 그릇인 줄 모른다.

   점수는 **실제 IAAF 표**를 쓴다. 이게 이 종목의 값어치다 —
   1500m 225초와 창던지기 69m 를 같은 자로 잴 수 있게 만드는 게 10종 경기의 전부다.
     트랙(작을수록 좋음): A × (B − T)^C
     필드(클수록 좋음)  : A × (P − B)^C
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 순서도 실제와 같다. unit:'cm' 은 점수표가 센티미터를 쓴다는 뜻. */
const DECA = [
  { id:'sprint100',  A:25.4347, B:18.00, C:1.81, track:true  },
  { id:'longJump',   A:0.14354, B:220,   C:1.40, cm:true     },
  { id:'shotPut',    A:51.39,   B:1.5,   C:1.05              },
  { id:'highJump',   A:0.8465,  B:75,    C:1.42, cm:true     },
  { id:'sprint400',  A:1.53775, B:82,    C:1.81, track:true  },
  { id:'hurdles110', A:5.74352, B:28.5,  C:1.92, track:true  },
  { id:'discus',     A:12.91,   B:4.0,   C:1.10              },
  { id:'poleVault',  A:0.2797,  B:100,   C:1.35, cm:true     },
  { id:'javelin',    A:10.14,   B:7.0,   C:1.08              },
  { id:'run1500',    A:0.03768, B:480,   C:1.85, track:true  },
];

function decaPoints(slot, value){
  if(value>=DNF) return 0;
  /* ⚠ 근대5종처럼 IAAF 표가 없는 종목(펜싱·사격·승마)은 **기준 기록 대비**로 매긴다.
     0벌점처럼 값이 0 일 수 있으므로 off 로 밀어 나눗셈이 터지지 않게 한다. */
  if(slot.anchor){
    const off = slot.off || 0;
    const v = value + off, par = slot.par + off;
    if(!(v>0) || !(par>0)) return 0;
    const ratio = slot.higher ? (v/par) : (par/v);
    /* ⚠ 비율에 지수를 씌우면 **상한이 없다** — 비정상적으로 좋은 값 하나가 폭발한다
       (실측: 수영 한 종목에 40641점). 실제 근대5종도 종목당 1300점 언저리가 끝이다. */
    return clamp(Math.round(1000 * Math.pow(ratio, slot.k || 1.6)), 0, 1400);
  }
  if(!(value>0)) return 0;
  const v = slot.cm ? value*100 : value;
  const x = slot.track ? (slot.B - v) : (v - slot.B);
  if(x <= 0) return 0;
  return Math.max(0, Math.floor(slot.A * Math.pow(x, slot.C)));
}

/* 7종 경기 — 같은 그릇, 표만 다르다.
   ⚠ 클래스를 복사하면 사본이 생긴다(오늘 이미 세 번 물렸다). 표를 종목 정의에서 고른다. */
const HEPTA = [
  { id:'hurdles110', A:9.23076,  B:26.7, C:1.835, track:true },
  { id:'highJump',   A:1.84523,  B:75.0, C:1.348, cm:true    },
  { id:'shotPut',    A:56.0211,  B:1.50, C:1.05              },
  { id:'sprint200',  A:4.99087,  B:42.5, C:1.81,  track:true },
  { id:'longJump',   A:0.188807, B:210,  C:1.41,  cm:true    },
  { id:'javelin',    A:15.9803,  B:3.80, C:1.04              },
  { id:'run800',     A:0.11193,  B:254,  C:1.88,  track:true },
];
/* 근대5종 — 올림픽을 상징하는 종목이고, 마침 다섯 종목이 전부 이미 있다.
   IAAF 표가 없는 종목들이라 **기준 기록 대비**(anchor)로 매긴다. 1000점이 기준선. */
/* ⚠ par 는 **실측값**이어야 한다. 펜싱을 42초로 잡았더니 19초 승리가 곧바로 상한(1400)을
   쳤다 — 실제로는 능숙한 플레이가 10~16초에 이긴다. 승마는 무결점(0벌점)이 기준선이다. */
const PENTA = [
  { id:'fencing',      anchor:true, par:14,   off:6,  k:1.5 },   // 5투셰까지의 시간
  { id:'swimFree100',  anchor:true, par:43,   off:8,  k:2.0 },
  { id:'equestrian',   anchor:true, par:0,    off:10, k:1.8 },   // 벌점 — 0 이 기준선
  { id:'shooting',     anchor:true, par:95,   off:0,  k:2.4, higher:true },
  { id:'run800',       anchor:true, par:127,  off:20, k:2.2 },
];
const COMBINED_TABLES = { decathlon:DECA, heptathlon:HEPTA, pentathlon:PENTA };
function combinedTable(def){
  const t = COMBINED_TABLES[def && def.id];
  if(!t) throw new Error('combinedTable: 표가 없는 복합 종목 '+(def&&def.id));
  return t;
}

class DecathlonEvent {
  constructor(def){ this.def=def; this.slots=combinedTable(def); this.reset(); }
  reset(){
    this.slot=0; this.total=0; this.marks=[];
    this.phase='INTRO'; this.t=0; this.introAt=0;
    this.result=null; this.doneAt=0;
    this.sub=null; this.subDoneAt=-1e9;
    this.startSlot(0);
  }
  get qualify(){ return this.def.qualify; }
  get people(){ return this.sub && this.sub.people; }
  get cur(){ return this.slots[this.slot]; }
  get curDef(){ return EVENT_BY_ID[this.cur.id]; }

  startSlot(i){
    this.slot=i;
    if(i>=this.slots.length){ this.finish(); return; }
    const d=this.curDef;
    const Klass = G.classFor ? G.classFor(d) : null;
    if(!Klass){ /* 하위 종목이 없으면 0점 처리하고 넘어간다 */
      this.marks.push({id:d.id, value:0, pts:0}); this.startSlot(i+1); return;
    }
    this.sub = new Klass(d);
    this.sub.pIndex = 0;
    this.phase='INTRO'; this.introAt=this.t;
  }
  /* 하위 종목이 끝났다 — 점수를 매기고 다음으로 */
  scoreSlot(){
    const r=this.sub.result, slot=this.cur;
    /* ⚠ 실패를 0 으로 넘겼더니, **작을수록 좋은 종목에서 0 이 최고 기록**으로 읽혔다
       (수영 실격이 1400점 만점). 실패는 기록 없음(DNF)이다. */
    const bad = !r || r.status==='FALSE_START' || r.status==='DQ' || r.status==='TIMEOUT';
    const val = bad ? DNF : r.value;
    const pts = decaPoints(slot, val);
    this.marks.push({ id:slot.id, value:val, pts });
    this.total += pts;
    this.sub=null;
    this.startSlot(this.slot+1);
  }
  finish(){
    this.phase='DONE'; this.doneAt=this.t;
    const pass = this.total >= this.qualify;
    this.result={ status: pass?'OK':'MISSED_QUALIFY', value:this.total, rank: pass?1:2 };
    pass?Sfx.finish():Sfx.fail();
  }

  /* ── 입력은 그대로 넘긴다 ─────────────────────────── */
  onStride(side, tMs, p){
    if(this.phase==='INTRO'){ this.phase='RUN'; return; }
    if(this.sub) this.sub.onStride(side, tMs, p);
  }
  onAction(tMs, p){
    if(this.phase==='INTRO'){ this.phase='RUN'; return; }
    if(this.sub) this.sub.onAction(tMs, p);
  }
  onActionUp(tMs, p){ if(this.sub && this.sub.onActionUp) this.sub.onActionUp(tMs, p); }
  onUp(tMs, p){ if(this.sub && this.sub.onUp) this.sub.onUp(tMs, p); }
  onDown(tMs, p){ if(this.sub && this.sub.onDown) this.sub.onDown(tMs, p); }

  update(dt){
    this.t += dt*1000;
    if(this.phase==='DONE') return;
    if(this.phase==='INTRO'){
      /* 종목 소개 — 다음이 뭔지 모르고 총성을 듣는 건 불친절하다 */
      if(this.t - this.introAt > 1600) this.phase='RUN';
      return;
    }
    if(!this.sub) return;
    this.sub.update(dt);
    if(this.sub.result){
      if(this.subDoneAt < 0) this.subDoneAt = this.t;
      /* 하위 종목 결과를 잠깐 보여 주고 넘어간다 */
      if(this.t - this.subDoneAt > 1500){ this.subDoneAt=-1e9; this.scoreSlot(); }
    }
  }

  draw(ctx){
    if(this.sub) this.sub.draw(ctx);
    else { Track.drawBack(ctx, 40, 100); ctx.fillStyle='rgba(5,6,10,.7)'; ctx.fillRect(0,0,VW,VH); }
  }
  drawUI(u){
    if(this.sub) this.sub.drawUI(u);
    /* 상단 진행 띠 — 10종은 '지금 몇 번째이고 얼마나 벌었나'가 전부다 */
    const H=15;
    u.fillStyle='rgba(6,10,18,.86)'; u.fillRect(0, VH-H, VW, H);
    for(let i=0;i<this.slots.length;i++){
      const w=Math.floor((VW-96)/this.slots.length), x=6+i*w;
      const done=i<this.marks.length, now=i===this.slot;
      u.fillStyle = done ? PAL.green : now ? PAL.gold : 'rgba(255,255,255,.16)';
      u.fillRect(x, VH-H+5, w-2, 5);
    }
    txt(u, (Math.min(this.slot+1,this.slots.length))+'/'+this.slots.length, VW-84, VH-H+3, 9, PAL.dim,'right');
    txt(u, this.total+'점', VW-8, VH-H+2, 11, PAL.gold,'right',700);

    if(this.phase==='INTRO'){
      const d=this.curDef;
      u.fillStyle='rgba(5,6,10,.78)'; u.fillRect(0,0,VW,VH);
      txt(u, K('%1번째 종목').replace('%1', this.slot+1), VW/2, 84, 11, PAL.dim,'center');
      txt(u, d.name, VW/2, 100, 24, PAL.gold,'center',700);
      /* ⚠ 단위를 'm 아니면 초'로 박아 뒀었다 — 근대5종의 사격(점)·펜싱이 m 로 나온다 */
      txt(u, '기준 '+fmtRec(d, d.qualify)+(d.unit==='s'?K('초'):''),
          VW/2, 132, 11, PAL.white,'center');
      if(this.marks.length)
        txt(u, '지금까지 '+this.total+'점', VW/2, 150, 12, PAL.green,'center',700);
      txt(u,'아무 키나 눌러 시작', VW/2, VH-46, 10, PAL.dim,'center');
    }
    /* 하위 종목이 끝난 직후 — 점수 환산을 보여 준다 */
    else if(this.sub && this.sub.result && this.subDoneAt>0){
      const r=this.sub.result, d=this.curDef, pts=decaPoints(this.cur, 
        (r.status==='OK'||r.status==='MISSED_QUALIFY') ? r.value : 0);
      u.fillStyle='rgba(5,6,10,.72)'; u.fillRect(0, 74, VW, 62);
      txt(u, d.name, VW/2, 80, 10, PAL.dim,'center');
      txt(u, (d.higher && !(r.value>0)) ? '—' : fmtRec(d, r.value)+(d.unit==='s'?K('초'):''),
          VW/2, 94, 18, PAL.white,'center',700);
      txt(u, '+'+pts+'점', VW/2, 116, 15, PAL.gold,'center',700);
    }
  }
}
