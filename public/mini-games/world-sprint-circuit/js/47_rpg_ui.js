/* ══════════════════════════════════════════════════════════════════
   육성 화면 — 레벨·훈련 포인트·장비

   ⛔ 이 파일은 **기존 화면을 고치지 않는다.** 새 화면 두 개를 얹고,
      사무소 메뉴에 줄 하나를 더할 뿐이다. 지우면 예전 그대로 돌아간다.

   왜 화면이 중요한가: 육성 층은 이미 돌고 있다(경험치가 쌓이고 장비가 나온다).
   그런데 **안 보이면 없는 시스템이다.** 방치형·육성물의 재미는 숫자가 오르는
   것을 '보는' 데서 나온다 — 그래서 여기서는 크게, 색으로, 즉시 보여 준다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 경험치 막대 하나 — 어디서나 같은 모양으로 */
function drawXpBar(u, a, x, y, w){
  const lv = a.lv||1, cur = a.xp||0, need = RPG.xpToNext(lv);
  const p = clamp(cur/need, 0, 1);
  u.fillStyle='rgba(255,255,255,.12)'; u.fillRect(x, y, w, 5);
  u.fillStyle = PAL.blue; u.fillRect(x, y, Math.round(w*p), 5);
  txt(u, 'Lv.'+lv, x, y-10, 10, PAL.gold, 'left', 700);
  txt(u, `${cur} / ${need}`, x+w, y-9, 8, PAL.dim, 'right');
}

/* ── 육성 — 선수 고르기 ─────────────────────────────────── */
class GrowPickScreen extends Screen0 {
  get rows(){
    return this.mg.club.squad.map(a=>{
      RPG.ensure(a);
      const eq = RPG.SLOTS.filter(s=>a.equip && a.equip[s]).length;
      return { label:`${a.speciesName} ${a.name}`,
        sub:`Lv.${a.lv} · 훈련 포인트 ${a.tp} · 장비 ${eq}/3 · OVR ${a.overall}`,
        right: a.tp>0 ? '●'+a.tp : '', rightColor: a.tp>0?PAL.gold:PAL.dim,
        color: a.tp>0 ? PAL.gold : PAL.white, nation:a.nation };
    });
  }
  confirm(){
    const a=this.mg.club.squad[this.sel]; if(!a) return;
    this.mg.push(new GrowScreen(this.mg, a));
  }
  draw(u){
    const inv=(this.mg.club.inventory||[]).length;
    UI.header(u, '육성', `창고 ${inv}개 · 포인트가 있는 선수는 ●로 표시`);
    const tot=this.mg.club.squad.reduce((s,a)=>s+(a.tp||0),0);
    txt(u, tot>0 ? K('쓸 수 있는 훈련 포인트 %1').replace('%1', tot) : K('훈련 포인트가 쌓이면 여기서 씁니다'),
        8, 27, 9, tot>0?PAL.gold:PAL.dim);
    UI.list(u, this.rows, this.sel, 8, 40, VW-16, 24, 7);
    UI.footer(u, '확인 선택   취소 돌아가기');
  }
}

/* ── 육성 — 한 선수 ─────────────────────────────────────── */
class GrowScreen extends Screen0 {
  constructor(mg, a){ super(mg); this.a=RPG.ensure(a); this.tab=0; }   // 0=스탯 1=장비
  get rows(){
    const a=this.a;
    if(this.tab===0){
      return STAT_KEYS.map(k=>{
        const cap=a.potential[k], cur=a.stats[k];
        const full = cur>=cap-0.01;
        return { label:STAT_NAME[k]||k,
          sub: full ? '잠재치에 닿았다' : `${cur.toFixed(1)} → 잠재 ${Math.round(cap)}`,
          right: full ? '최대' : '+1',
          rightColor: full?PAL.dim:(a.tp>0?PAL.green:PAL.dim),
          color: full?PAL.dim:PAL.white, _k:k, _full:full };
      });
    }
    /* 장비 탭 — 낀 것 3칸 + 창고 */
    const rows = RPG.SLOTS.map(s=>{
      const it=a.equip && a.equip[s];
      return { label:RPG.SLOT_NAME[s], sub: it ? RPG.itemLine(it) : '비어 있음',
        right: it ? RPG.itemName(it) : '—',
        rightColor: it ? RPG.rarityOf(it.r).color : PAL.dim, _slot:s, _worn:true };
    });
    const inv=this.mg.club.inventory||[];
    inv.forEach((it,i)=>{
      rows.push({ label:'  '+RPG.itemName(it), sub:RPG.itemLine(it), right:'착용',
        rightColor:RPG.rarityOf(it.r).color, color:RPG.rarityOf(it.r).color, _inv:i });
    });
    if(!inv.length) rows.push({ label:'  창고가 비었다', sub:'대회에서 장비가 나옵니다', color:PAL.dim });
    return rows;
  }
  update(now){
    /* ◀▶ 로 탭 전환 — 스탯과 장비를 오간다 */
    if(Input.pressed('left')||Input.pressed('right')){
      this.tab = this.tab?0:1; this.sel=0; Sfx.ui(); return;
    }
    super.update(now);
  }
  confirm(){
    const a=this.a, r=this.rows[this.sel]; if(!r) return;
    if(this.tab===0){
      if(r._full){ Sfx.fail(); this.mg.toast('잠재치에 닿았습니다'); return; }
      const err=RPG.spendTp(a, r._k, 1);
      if(err){ Sfx.fail(); this.mg.toast(err); return; }
      Sfx.record(); Screen.shake(0.3);
      this.mg.toast(`${STAT_NAME[r._k]||r._k} +1  (남은 포인트 ${a.tp})`);
      return;
    }
    /* 장비 */
    if(r._worn){
      const it=RPG.unequip(a, r._slot);
      if(it){ (this.mg.club.inventory ||= []).push(it); Sfx.ui(); this.mg.toast('벗었습니다'); }
      else { Sfx.fail(); }
      return;
    }
    if(r._inv!==undefined){
      const inv=this.mg.club.inventory;
      const it=inv[r._inv]; if(!it) return;
      const res=RPG.equip(a, it);
      if(typeof res==='string'){ Sfx.fail(); this.mg.toast(res); return; }
      inv.splice(r._inv,1);
      if(res.removed) inv.push(res.removed);
      Sfx.record(); Screen.shake(0.25);
      this.mg.toast(RPG.itemName(it)+' 착용');
    }
  }
  draw(u){
    const a=this.a;
    UI.header(u, `${a.speciesName} ${a.name}`, `${a.age}세 · OVR ${a.overall} / 잠재 ${a.potOverall}`);
    /* 레벨·경험치 — 화면 맨 위에 크게. 이게 이 화면의 주인공이다. */
    drawXpBar(u, a, 8, 36, VW-120);
    txt(u, K('훈련 포인트'), VW-8, 26, 9, PAL.dim, 'right');
    txt(u, String(a.tp||0), VW-8, 35, 17, (a.tp>0?PAL.gold:PAL.dim), 'right', 700);
    /* 탭 */
    ['스탯 올리기','장비'].forEach((nm,i)=>{
      const on=i===this.tab, x=8+i*74;
      u.fillStyle = on?'rgba(255,215,94,.18)':'rgba(22,26,38,.7)';
      u.fillRect(x, 48, 70, 14);
      u.strokeStyle = on?PAL.gold:'#3a4258'; u.lineWidth=1; u.strokeRect(x+.5,48.5,69,13);
      txt(u, K(nm), x+35, 51, 9, on?PAL.gold:PAL.dim, 'center', on?700:400);
    });
    UI.list(u, this.rows, this.sel, 8, 66, VW-16, 21, 6);
    UI.footer(u, '확인 사용/착용 · ◀▶ 탭 · 취소 돌아가기');
  }
}

/* ── 대회 결과에 붙는 육성 보상 피드 ─────────────────────────
   ⚠ 이게 도파민이 나오는 자리다. 경기 끝나고 '무엇을 벌었나'를 즉시 보여 준다. */
function drawRpgFeed(u, feed, x, y, w){
  if(!feed || !feed.length) return 0;
  let n=0;
  for(const f of feed.slice(-4)){
    const yy = y + n*12;
    if(f.drop){
      const c=RPG.rarityOf(f.drop.r).color;
      txt(u, '◆ '+RPG.itemName(f.drop), x, yy, 9, c, 'left', 700);
      txt(u, f.name, x+w, yy, 8, PAL.dim, 'right');
    } else {
      txt(u, `${f.name}  +${f.xp} XP`, x, yy, 9, PAL.blue, 'left');
      if(f.lv) txt(u, `Lv.${f.lv} ↑  포인트 +${f.tp}`, x+w, yy, 9, PAL.gold, 'right', 700);
      else     txt(u, f.ev||'', x+w, yy, 8, PAL.dim, 'right');
    }
    n++;
  }
  return n*12;
}

/* ── 돌아왔을 때 ─────────────────────────────────────────────
   ⚠ 방치 보상은 **돌아온 순간 보여 주지 않으면 없는 것과 같다.**
      조용히 숫자만 올려 두면 아무도 자기가 뭘 벌었는지 모른다. */
class IdleReturnScreen extends Screen0 {
  constructor(mg, rep){ super(mg); this.rep=rep; }
  get rows(){ return []; }
  update(now){ if(Input.pressed('action')||Input.pressed('back')){ Sfx.ui(); this.mg.pop(); } }
  draw(u){
    const R=this.rep;
    const h=Math.floor(R.sec/3600), m=Math.floor(R.sec%3600/60);
    UI.header(u, '자동 훈련', h? `${h}시간 ${m}분 동안` : `${m}분 동안`);
    txt(u, K('선수들이 스스로 훈련했습니다'), VW/2, 34, 11, PAL.dim, 'center');
    plate(u, VW/2-110, 48, 220, 42, .88);
    txt(u, K('1인당 얻은 경험치'), VW/2, 52, 9, PAL.dim, 'center');
    txt(u, R.per.toLocaleString(), VW/2, 62, 24, PAL.blue, 'center', 700);
    let y=102;
    const ups = R.rows.filter(r=>r.lv);
    if(ups.length){
      txt(u, K('레벨 업'), 14, y, 9, PAL.dim); y+=12;
      for(const r of ups.slice(0,7)){
        txt(u, r.name, 20, y, 10, PAL.gold, 'left', 700);
        txt(u, `Lv.${r.lv}  ·  훈련 포인트 +${r.tp}`, VW-20, y, 10, PAL.gold, 'right');
        y+=13;
      }
    } else {
      txt(u, K('아직 레벨이 오르지는 않았습니다'), VW/2, y+8, 10, PAL.dim, 'center');
    }
    txt(u, K('오래 비울수록 쌓이지만 12시간에서 멈춥니다'), VW/2, VH-34, 9, PAL.dim, 'center');
    UI.footer(u, '확인 계속');
  }
}

/* ── 시상식 ─────────────────────────────────────────────────
   대회에서 금메달을 땄으면 단상에 세운다.

   ⚠ 왜 만들었나: 이 게임에는 **의식(ceremony)이 없었다.** 1위를 해도 표에 숫자
      한 줄이 늘 뿐이었다. Summer Games 같은 고전이 지금도 기억되는 이유의 절반이
      개·폐회식과 시상식이다 — 이긴 것을 '치르는' 자리가 있어야 이긴 기분이 난다.
   ⚠ 기존 흐름은 안 바꾼다. 금메달이 없으면 이 화면은 아예 안 뜬다. */
class PodiumScreen extends Screen0 {
  constructor(mg, meet){
    super(mg);
    this.meet=meet; this.t=0;
    /* 우리 선수의 1·2·3위를 모은다 — 없으면 이 화면은 열리지 않는다 */
    this.winners=[];
    for(const e of (meet.events||[])){
      for(const r of e.rows){
        if(r.rank<=3 && mg.club.has(r.athlete))
          this.winners.push({ rank:r.rank, a:r.athlete, ev:e.ev, value:r.value });
      }
    }
    /* ⚠ 올림픽에서 22명이 입상하면 22번을 넘겨야 했다 — 의식이 아니라 노동이다.
       금메달을 앞에 두고 **최대 6개**만 치른다. 나머지는 결과표에 다 있다. */
    this.winners.sort((x,y)=>x.rank-y.rank || x.value-y.value);
    this.total = this.winners.length;
    this.winners = this.winners.slice(0, 6);
    this.idx=0;
    Sfx.finish(); if(typeof Track!=='undefined') Track.cheer(1);
  }
  static has(mg, meet){
    return (meet.events||[]).some(e=>e.rows.some(r=>r.rank===1 && mg.club.has(r.athlete)));
  }
  get rows(){ return []; }
  update(now){
    this.t += 16.7;
    if(Input.pressed('action')||Input.pressed('back')){
      Sfx.ui();
      if(this.idx < this.winners.length-1){ this.idx++; this.t=0; Track.cheer(0.8); }
      else this.mg.pop();
    }
  }
  draw(u){
    const w=this.winners[this.idx]; if(!w){ this.mg.pop(); return; }
    const cx=VW/2, base=VH-52;
    /* 밤 경기장을 배경으로 — 빈 검은 화면에 단상만 있으면 의식으로 안 보인다 */
    if(!BG.fill(BG.ctx(),'title-backdrop', 0, VH)){
      const g=u.createLinearGradient(0,0,0,VH);
      g.addColorStop(0,'#0d1730'); g.addColorStop(1,'#060910');
      u.fillStyle=g; u.fillRect(0,0,VW,VH);
    }
    u.fillStyle='rgba(5,8,16,.34)'; u.fillRect(0,0,VW,VH);
    UI.header(u, '시상식', `${this.meet.name} · ${w.ev.name}`);
    /* 단상 */
    if(!BG.obj(u, 'podium-hd', cx, base+8, 56)){
      const bw=34;
      u.fillStyle='#3a4258';
      u.fillRect(cx-bw/2, base-26, bw, 26);                 // 1위
      u.fillRect(cx-bw/2-bw-2, base-16, bw, 16);            // 2위
      u.fillRect(cx+bw/2+2, base-11, bw, 11);               // 3위
      u.fillStyle=PAL.gold; u.fillRect(cx-bw/2, base-26, bw, 2);
    }
    /* 선수 */
    const py = base - (w.rank===1?30:w.rank===2?20:15);
    const px = cx + (w.rank===1?0:w.rank===2?-38:38);
    if(!CharHD.draw(u, w.a.species, px, py, 0.05, { t:this.t, scale:1.05 }))
      { u.fillStyle=PAL.gold; u.fillRect(px-7, py-28, 14, 28); }
    /* 메달 */
    if(!BG.obj(u, 'medal-gold', px, py-24, 14)){
      u.fillStyle = w.rank===1?PAL.gold:w.rank===2?'#c9cede':'#c9884a';
      u.beginPath(); u.arc(px, py-30, 5, 0, 6.284); u.fill();
    }
    /* 카메라 플래시 · 색종이 — 1위에만, 그것도 처음 몇 초만 */
    if(w.rank===1){
      const k=(this.t%1200)/1200;
      /* ⚠ 플래시를 y=108 에 두었더니 선수 이름·기록 위에 얹혀 글자를 덮었다.
         관중석 높이(단상 위쪽)로 내린다 — 카메라는 관중석에서 터진다. */
      BG.fx(u, 'flash-bulbs', cx, base-58, 30, k, 4);
      if(this.t < 2600) BG.fx(u, 'confetti-burst', cx, base, 90, clamp(this.t/2600,0,0.999), 4);
    }
    /* 이름과 기록 */
    const medalName = ['금메달','은메달','동메달'][w.rank-1];
    txt(u, K(medalName), cx, 34, 13, w.rank===1?PAL.gold:w.rank===2?'#c9cede':'#c9884a','center',700);
    txt(u, `${w.a.speciesName} ${w.a.name}`, cx, 52, 17, PAL.white,'center',700);
    txt(u, fmtRec(w.ev, w.value) + (w.ev.unit==='s'&&needsSec(fmtRec(w.ev,w.value)) ? K('초'):''),
        cx, 72, 13, PAL.blue,'center');
    txt(u, `Lv.${w.a.lv||1}`, cx, 88, 10, PAL.gold,'center');
    /* 몇 번째인지 */
    if(this.winners.length>1)
      txt(u, `${this.idx+1} / ${this.winners.length}`
             + (this.total>this.winners.length ? `  (입상 ${this.total})` : ''),
          VW-10, 30, 9, PAL.dim,'right');
    UI.footer(u, this.idx < this.winners.length-1 ? '확인 다음 시상' : '확인 계속');
  }
}
