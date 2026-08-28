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

/* ── 육성 — 선수 고르기 ─────────────────────────────────
   레퍼런스(영웅 로스터)를 따른다: **줄 목록이 아니라 카드 격자**.
   카드마다 등급 테두리 · Lv 뱃지 · 경험치 막대 · 포인트 표시.
   ⚠ 줄 목록은 정보는 담아도 '내 선수단'으로 안 읽힌다. 얼굴이 보여야 애착이 생긴다. */
class GrowPickScreen extends Screen0 {
  constructor(mg){ super(mg); this.t=0; }
  get list(){ return this.mg.club.squad; }
  get rows(){ return this.list; }
  update(now){
    this.t += 16.7;
    const n=this.list.length, COLS=5;
    if(Input.repeat('left',now))  { this.sel=(this.sel+n-1)%n; Sfx.ui(); }
    if(Input.repeat('right',now)) { this.sel=(this.sel+1)%n;   Sfx.ui(); }
    if(Input.repeat('up',now))    { this.sel=(this.sel-COLS+n*2)%n; Sfx.ui(); }
    if(Input.repeat('down',now))  { this.sel=(this.sel+COLS)%n; Sfx.ui(); }
    if(Input.pressed('action')) this.confirm();
    if(Input.pressed('back'))   this.cancel();
  }
  confirm(){
    const a=this.list[this.sel]; if(!a) return;
    this.mg.push(new GrowScreen(this.mg, a));
  }
  draw(u){
    const C=this.mg.club;
    const tp=C.squad.reduce((s,a)=>s+(a.tp||0),0);
    const inv=(C.inventory||[]).length;
    /* 상단 자원 막대 — 레퍼런스가 늘 갖고 있는 것 */
    UIK.resourceBar(u, 0, [
      { value:Math.round(C.budget), color:'#ffcf4a', icon:'icon-coin' },
      { value:tp,  color:PAL.gold,  icon:'icon-tp' },
      { value:inv, color:PAL.green, icon:'icon-gear' },
    ]);
    txt(u, K('육성'), VW-8, 3, 11, PAL.gold, 'right', 700);

    /* ⚠ 5열 고정으로 그렸더니 10명일 때 화면 아래 60%가 비었다(스쿼드는 8~18명).
       인원에 맞춰 열 수와 카드 높이를 정한다 — 적으면 크게, 많으면 촘촘하게. */
    const n=this.list.length;
    const COLS = n<=6 ? 3 : n<=12 ? 5 : 6;
    const gx=8, gy=22, botY=VH-34;
    const rowsN = Math.ceil(n/COLS);
    const cw = Math.floor((VW-16-(COLS-1)*6)/COLS);
    const ch = clamp(Math.floor((botY-gy-(rowsN-1)*6)/rowsN), 44, 78);
    const gapX = COLS>1 ? (VW-16-COLS*cw)/(COLS-1) : 0;
    /* 남는 높이는 위아래로 나눠 갖는다 — 위로 몰리면 아래가 빈 화면으로 보인다 */
    const usedH = rowsN*ch + (rowsN-1)*6;
    const gyC = gy + Math.max(0, Math.floor((botY-gy-usedH)/2));
    this.list.forEach((a,i)=>{
      RPG.ensure(a);
      const c=i%COLS, r=(i/COLS)|0;
      const x=gx+c*(cw+gapX), y=gyC+r*(ch+6);
      if(y+ch>botY+2) return;
      const on=i===this.sel;
      const col = (typeof UI!=='undefined' && UI.rareColor) ? UI.rareColor(a) : PAL.white;
      UIK.card(u, x, y, cw, ch, col, {on});
      /* 얼굴 — 종족 스프라이트를 카드 안에 */
      const face = Math.min(26, ch*0.42);
      if(!CharHD.draw(u, a.species, x+face*0.72, y+ch-6, 0.05,
                      { t:this.t+i*300, scale:face/42 })){
        u.fillStyle=col; u.fillRect(x+8, y+ch-30, 12, 24);
      }
      UIK.lvBadge(u, x+3, y+3, a.lv, col);
      const tx = x + face*1.35;
      /* ⚠ 영어 이름(PIOTR ANDERSEN)이 카드를 넘어 옆 카드까지 침범했다.
         카드 안에서만 그리도록 자른다 — 잘린 건 상세 화면에 다 있다. */
      u.save(); u.beginPath(); u.rect(x+2, y+2, cw-4, ch-4); u.clip();
      txt(u, a.name, tx, y+15, 10, on?PAL.gold:PAL.white, 'left', on?700:400);
      u.restore();
      txt(u, `OVR ${a.overall}`, tx, y+27, 8, PAL.dim, 'left');
      UIK.xpBar(u, tx, y+ch-17, cw-(tx-x)-6, a.lv, a.xp, RPG.xpToNext(a.lv), {showText:false});
      /* 포인트 있으면 눈에 띄게 — 할 일이 있는 카드 */
      if(a.tp>0){
        u.fillStyle=PAL.gold; u.fillRect(x+cw-15, y+ch-13, 12, 10);
        txt(u, String(a.tp), x+cw-9, y+ch-12, 8, '#1a1408', 'center', 700);
      }
      if(a.injury) txt(u, K('부상'), x+cw-4, y+15, 8, PAL.red, 'right', 700);
      /* 장비 3칸 표시 */
      RPG.SLOTS.forEach((sl,k)=>{
        const it=a.equip && a.equip[sl];
        u.fillStyle = it ? RPG.rarityOf(it.r).color : 'rgba(255,255,255,.12)';
        u.fillRect(tx+k*6, y+ch-8, 4, 4);
      });
    });
    txt(u, tp>0 ? K('훈련 포인트 %1점을 쓸 수 있습니다').replace('%1', tp)
                : K('대회와 훈련으로 포인트가 쌓입니다'),
        VW/2, VH-28, 9, tp>0?PAL.gold:PAL.dim, 'center');
    UI.footer(u, '◀▶▲▼ 고르기 · 확인 선택 · 취소 돌아가기');
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
      rows.push({ label:'  '+RPG.itemName(it), sub:RPG.itemLine(it),
        right:'착용 · ▼팔기 '+RPG.sellPrice(it),
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
    /* ▲ — 스카우트 리포트(잠재치를 범위로 본다) */
    if(Input.pressed('up') && this.tab===0){
      if(typeof ScoutReportScreen!=='undefined'){ Sfx.ui(); this.mg.push(new ScoutReportScreen(this.mg, this.a)); return; }
    }
    /* 창고의 장비는 ▼ 로 판다 — 창고가 쌓이기만 하면 의미가 없다 */
    if(this.tab===1 && Input.pressed('down')){
      const r=this.rows[this.sel];
      if(r && r._inv!==undefined){
        const inv=this.mg.club.inventory, it=inv[r._inv];
        if(it){
          const p=RPG.sellPrice(it);
          inv.splice(r._inv,1);
          this.mg.club.budget = +(this.mg.club.budget + p).toFixed(1);
          Sfx.record(); this.mg.toast(RPG.itemName(it)+' 판매 · 코인 +'+p);
          this.sel=Math.min(this.sel, this.rows.length-1);
          return;
        }
      }
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
    this.t = (this.t||0) + 16.7;
    const col = (typeof UI!=='undefined' && UI.rareColor) ? UI.rareColor(a) : PAL.white;
    /* ── 왼쪽: 선수 카드 (레퍼런스의 캐릭터 패널) ── */
    UIK.frame(u, 6, 6, 148, VH-14, { glow:col });
    txt(u, a.name, 80, 12, 13, PAL.gold, 'center', 700);
    txt(u, `${a.speciesName} · ${a.age}세`, 80, 27, 9, PAL.dim, 'center');
    if(!CharHD.draw(u, a.species, 80, 108, 0.05, { t:this.t, scale:1.5 })){
      u.fillStyle=col; u.fillRect(70, 60, 20, 48);
    }
    UIK.lvBadge(u, 12, 12, a.lv, col);
    /* 경험치 */
    UIK.xpBar(u, 14, 120, 132, a.lv, a.xp, RPG.xpToNext(a.lv));
    /* 종합 */
    txt(u, 'OVR', 16, 143, 8, PAL.dim, 'left');
    txt(u, String(a.overall), 16, 152, 19, PAL.gold, 'left', 700);
    txt(u, K('잠재'), 88, 143, 8, PAL.dim, 'left');
    txt(u, String(a.potOverall), 88, 152, 19, PAL.dim, 'left', 700);
    /* 장비 3칸 — 늘 보이게 */
    txt(u, K('장비'), 16, 176, 8, PAL.dim, 'left');
    RPG.SLOTS.forEach((sl,k)=>{
      const it=a.equip && a.equip[sl];
      UIK.itemBox(u, 14+k*45, 186, 38, {
        color: it ? RPG.rarityOf(it.r).color : '#39415a',
        icon: it ? RPG.itemIcon(it) : RPG.SLOT_ICON[sl],
        qty: it ? RPG.rarityOf(it.r).name : K('빈칸'),
        label: RPG.SLOT_NAME[sl] });
    });
    /* 상태 */
    const cond=Math.round(a.condition), fat=Math.round(a.fatigue);
    txt(u, K('컨디션 %1  ·  피로 %2').replace('%1',cond).replace('%2',fat),
        80, VH-26, 9, fat>65?PAL.red:PAL.dim, 'center');

    /* ── 오른쪽: 탭 + 목록 ── */
    UIK.frame(u, 160, 6, VW-166, VH-14);
    txt(u, K('훈련 포인트'), VW-12, 12, 9, PAL.dim, 'right');
    txt(u, String(a.tp||0), VW-12, 21, 20, (a.tp>0?PAL.gold:PAL.dim), 'right', 700);
    ['스탯 올리기','장비'].forEach((nm,i)=>{
      const on=i===this.tab, x=168+i*74;
      u.fillStyle = on?'rgba(255,215,94,.20)':'rgba(20,26,40,.8)';
      u.fillRect(x, 14, 70, 15);
      u.strokeStyle = on?PAL.gold:'#3a4258'; u.lineWidth=1; u.strokeRect(x+.5,14.5,69,14);
      txt(u, K(nm), x+35, 17, 9, on?PAL.gold:PAL.dim, 'center', on?700:400);
    });
    UI.list(u, this.rows, this.sel, 166, 36, VW-178, 22, 8);
    UI.footer(u, this.tab===1 ? '확인 착용/벗기 · ▼ 팔기 · ◀▶ 탭 · 취소 뒤로'
                              : '확인 +1 · ▲ 스카우트 리포트 · ◀▶ 탭 · 취소 뒤로');
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

/* ── 돌아왔을 때 (오프라인 보상) ────────────────────────────
   레퍼런스(방치형 RPG들)의 오프라인 보상 화면을 그대로 따른다:
     · 큰 제목 + 부제
     · 자리를 비운 시간을 **시계로 크게** (08:00:00)
     · **분당 획득률**과 보너스를 같이 (760(+126)/분)
     · 얻은 것을 **아이템 상자 행**으로
     · 화면에서 제일 큰 것이 **받기 버튼**
     · 상한을 분명히 ("최대 12시간")

   ⚠ 예전 화면은 글자만 있었다. 방치형에서 이 화면은 '다시 켤 이유'다 —
      여기가 초라하면 다음에 안 켠다. */
class IdleReturnScreen extends Screen0 {
  constructor(mg, rep){ super(mg); this.rep=rep; this.t=0; this.claimed=false; }
  get rows(){ return []; }
  update(now){
    this.t += 16.7;
    if(Input.pressed('action')||Input.pressed('back')){
      if(!this.claimed){
        this.claimed=true; this.claimAt=this.t;
        Sfx.record(); Screen.shake(0.5); Track.cheer(0.9);
        if(typeof Music!=='undefined'){ Music._last=null; Music.play('win'); }
      } else this.mg.pop();
    }
  }
  draw(u){
    const R=this.rep;
    /* 배경 — 밤 경기장을 어둡게 깔아 '돌아온 자리'를 만든다 */
    if(!BG.fill(BG.ctx(),'title-backdrop', 0, VH)){
      const g=u.createLinearGradient(0,0,0,VH);
      g.addColorStop(0,'#141c36'); g.addColorStop(1,'#070a12');
      u.fillStyle=g; u.fillRect(0,0,VW,VH);
    }
    u.fillStyle='rgba(6,9,18,.62)'; u.fillRect(0,0,VW,VH);

    /* 제목 */
    txt(u, K('자동 훈련 보상'), VW/2, 12, 20, PAL.gold, 'center', 700);
    txt(u, K('자리를 비운 동안 선수들이 훈련했습니다'), VW/2, 34, 9, PAL.dim, 'center');

    /* 시간 — 이 화면의 주인공 */
    UIK.frame(u, VW/2-92, 46, 184, 44, { glow:PAL.gold });
    txt(u, K('비운 시간'), VW/2, 50, 8, PAL.dim, 'center');
    UIK.clock(u, VW/2, 60, R.sec, 24);
    const capH = RPG.IDLE.capHours;
    const capped = R.sec >= capH*3600 - 1;
    txt(u, K('최대 %1시간').replace('%1', capH), VW/2, 82, 8,
        capped?PAL.red:PAL.dim, 'center', capped?700:400);

    /* 분당 획득률 — 레퍼런스가 예외 없이 보여 주는 것 */
    /* ⚠ '경험치 18/분'만 적었더니 총 획득(8.9만) 옆에서 무슨 수인지 알 수 없었다.
       **누구 기준인지**를 같이 적는다 — 방치형에서 이 비율이 곧 다음에 켤 이유다. */
    const perMin = Math.round(RPG.IDLE.xpPerSec*60);
    const gearAvg = this.gearBonusAvg();
    UIK.rate(u, 14, 98, K('1명당'), perMin, Math.round(perMin*gearAvg), PAL.blue);
    UIK.rate(u, 150, 98, K('코인'), Math.round(RPG.IDLE.coinPerSec*60*10)/10, 0, '#ffcf4a');
    txt(u, K('훈련 중 %1명').replace('%1', R.rows.length), VW-14, 98, 9, PAL.dim, 'right');

    /* 얻은 것 — 아이템 상자 행 */
    const boxes = this.boxes();
    const bs=34, gap=8, tw=boxes.length*bs + (boxes.length-1)*gap;
    let bx=VW/2-tw/2;
    for(const b of boxes){
      UIK.itemBox(u, bx, 112, bs, { color:b.color, qty:b.qty, label:b.label, icon:b.icon,
                                    on:this.claimed });
      bx += bs+gap;
    }

    /* 레벨 오른 선수 */
    const ups=R.rows.filter(r=>r.lv);
    if(ups.length){
      let y=164;
      txt(u, K('레벨 업'), 14, y, 9, PAL.dim, 'left', 700); y+=11;
      for(const r of ups.slice(0,3)){
        UIK.lvBadge(u, 14, y, r.lv);
        txt(u, r.name, 46, y, 10, PAL.gold, 'left', 700);
        txt(u, K('훈련 포인트 +%1').replace('%1', r.tp), VW-14, y, 9, PAL.gold, 'right');
        y+=12;
      }
      if(ups.length>3) txt(u, K('외 %1명').replace('%1', ups.length-3), 46, y, 8, PAL.dim);
    } else {
      txt(u, K('레벨은 아직 오르지 않았습니다'), VW/2, 172, 9, PAL.dim, 'center');
    }

    /* 받기 버튼 — 화면에서 제일 크다 */
    if(!this.claimed){
      UIK.bigButton(u, VW/2-58, VH-40, 116, 22, K('받기'), this.t);
    } else {
      const age=this.t-this.claimAt;
      txt(u, K('받았습니다'), VW/2, VH-36, 15, PAL.green, 'center', 700);
      if(age<900) BG.fx(u, 'confetti-burst', VW/2, VH-24, 70, clamp(age/900,0,0.999), 4);
      txt(u, K('아무 키나 눌러 계속'), VW/2, VH-18, 9, PAL.dim, 'center');
    }
  }
  /* 장비의 경험치 보너스 평균 — 보너스가 있으면 (+n) 으로 보여 주려고 */
  gearBonusAvg(){
    const sq=this.mg.club.squad||[];
    if(!sq.length) return 0;
    let s=0; for(const a of sq) s += RPG.bonus(a).xp;
    return s/sq.length;
  }
  boxes(){
    const R=this.rep;
    const totXp = R.rows.reduce((s,r)=>s+(r.xp||0),0);
    const tp = R.rows.reduce((s,r)=>s+(r.tp||0),0);
    const ups = R.rows.filter(r=>r.lv).length;
    const out=[
      { color:PAL.blue,  qty:totXp, label:K('경험치'), icon:'icon-xp' },
      { color:PAL.gold,  qty:tp,    label:K('포인트'), icon:'icon-tp' },
    ];
    /* 코인 — 선수를 사고 장비를 사는 돈. 방치가 게임과 이어지는 고리다. */
    if(R.coin) out.push({ color:'#ffcf4a', qty:R.coin, label:K('코인'), icon:'icon-coin' });
    if(ups) out.push({ color:PAL.green, qty:ups, label:K('레벨 업'), icon:'icon-levelup' });
    return out;
  }
}

/* ── 코치 (49_depth) ────────────────────────────────────────
   FM 의 스태프 화면. 감독 혼자 다 못 한다.
   ⚠ 코치는 **주급을 먹는다** — 뽑는 것이 곧 결정이 되게. */
class CoachScreen extends Screen0 {
  get rows(){
    const C=this.mg.club;
    return DEPTH.COACHES.map(c=>{
      const on = DEPTH.isHired(C, c.id);
      const eff = c.stat ? K('%1 성장 +%2%').replace('%1', STAT_NAME[c.stat]).replace('%2', Math.round(c.grow*100))
                         : K('부상 %1% · 피로 회복 +%2').replace('%1', Math.round(c.hurt*100)).replace('%2', c.rest.toFixed(1));
      return { label:(on?'● ':'○ ')+c.name, sub:eff,
        right: on ? K('주급 %1').replace('%1', c.wage) : K('계약금 %1').replace('%1', c.wage*4),
        rightColor: on?PAL.green:PAL.gold,
        color: on?PAL.green:PAL.white, _c:c, _on:on };
    });
  }
  confirm(){
    const r=this.rows[this.sel], C=this.mg.club;
    if(!r) return;
    const err = r._on ? DEPTH.fire(C, r._c.id) : DEPTH.hire(C, r._c.id);
    if(err){ Sfx.fail(); this.mg.toast(err); return; }
    Sfx.record(); Screen.shake(0.25);
    this.mg.toast(r._on ? `${r._c.name} 해고` : `${r._c.name} 영입`);
  }
  draw(u){
    const C=this.mg.club;
    UIK.resourceBar(u, 0, [
      { value:Math.round(C.budget), color:'#ffcf4a', icon:'icon-coin' },
    ]);
    txt(u, K('코치진'), VW-8, 3, 11, PAL.gold, 'right', 700);
    const n=DEPTH.hired(C).length, bill=DEPTH.wageBill(C);
    txt(u, K('%1 / 3 명 · 주급 합계 %2').replace('%1',n).replace('%2',bill),
        8, 20, 9, bill>0?PAL.gold:PAL.dim);
    UI.list(u, this.rows, this.sel, 8, 32, VW-16, 24, 7);
    UI.footer(u, '확인 영입/해고   취소 돌아가기');
  }
}

/* ── 스카우트 리포트 (49_depth) ─────────────────────────────
   ⚠ 잠재치를 정확한 숫자로 보여 주면 판단할 게 없다. FM 의 재미는
      '정말 클까?'를 **모르는 채로** 거는 데 있다. 범위와 확신도로 준다.
      함께한 주차가 쌓일수록 범위가 좁아진다 — 지켜보는 것이 정보가 된다. */
class ScoutReportScreen extends Screen0 {
  constructor(mg, a){ super(mg); this.a=a; this.t=0; }
  get rows(){ return []; }
  update(now){ this.t+=16.7; if(Input.pressed('back')||Input.pressed('action')) this.mg.pop(); }
  draw(u){
    const a=this.a, conf=DEPTH.confidence(a);
    const col=(typeof UI!=='undefined'&&UI.rareColor)?UI.rareColor(a):PAL.white;
    UIK.frame(u, 6, 6, VW-12, VH-12, { glow:col });
    txt(u, K('스카우트 리포트'), VW/2, 12, 13, PAL.gold, 'center', 700);
    txt(u, `${a.speciesName} ${a.name} · ${a.age}세 · Lv.${a.lv||1}`, VW/2, 28, 10, PAL.white, 'center');
    /* 확신도 */
    txt(u, K('확신도'), 16, 44, 8, PAL.dim, 'left');
    const bw=120;
    u.fillStyle='rgba(255,255,255,.12)'; u.fillRect(52, 45, bw, 6);
    u.fillStyle = conf>=0.7?PAL.green:conf>=0.45?PAL.gold:PAL.red;
    u.fillRect(52, 45, Math.round(bw*conf), 6);
    txt(u, K(DEPTH.confName(conf)), 52+bw+6, 43, 9, PAL.white, 'left', 700);
    txt(u, K('%1주 함께함').replace('%1', a.trainingWeeks||0), VW-16, 43, 9, PAL.dim, 'right');

    /* 스탯별 범위 — 현재값 위에 '여기까지 갈 수도' 를 띠로 */
    let y=64;
    for(const k of STAT_KEYS){
      const r=DEPTH.potentialRange(a, k), cur=a.stats[k];
      txt(u, STAT_NAME[k], 16, y, 9, PAL.white, 'left');
      const x0=76, w=VW-76-70;
      const px=(v)=>x0 + (clamp(v,20,99)-20)/79*w;
      u.fillStyle='rgba(255,255,255,.08)'; u.fillRect(x0, y+2, w, 7);
      /* 예상 범위 */
      u.fillStyle='rgba(90,170,255,.30)';
      u.fillRect(px(r.lo), y+2, Math.max(2, px(r.hi)-px(r.lo)), 7);
      /* 지금 */
      u.fillStyle=PAL.gold; u.fillRect(px(cur)-1, y, 2, 11);
      txt(u, `${Math.round(cur)} → ${r.lo}~${r.hi}`, VW-16, y+1, 9, PAL.dim, 'right');
      y += 15;
    }
    /* 총평 */
    txt(u, K(DEPTH.verdict(a)), VW/2, y+8, 12,
        conf<0.4?PAL.dim:PAL.gold, 'center', 700);
    /* 성장 이력 꺾은선 */
    const log=a.ovrLog||[];
    if(log.length>2){
      const gx=16, gy=y+26, gw=VW-32, gh=28;
      const lo=Math.min(...log), hi=Math.max(...log), sp=Math.max(1,hi-lo);
      u.strokeStyle='rgba(255,255,255,.10)'; u.lineWidth=1;
      u.strokeRect(gx+.5, gy+.5, gw-1, gh-1);
      u.strokeStyle=PAL.green; u.lineWidth=1; u.beginPath();
      log.forEach((v,i)=>{
        const X=gx+ i/(log.length-1)*gw, Y=gy+gh - (v-lo)/sp*gh;
        i? u.lineTo(X,Y) : u.moveTo(X,Y);
      });
      u.stroke();
      txt(u, K('성장 이력 (OVR %1 → %2)').replace('%1',lo).replace('%2',hi),
          gx, gy-9, 8, PAL.dim, 'left');
    }
    UI.footer(u, '확인/취소 돌아가기');
  }
}

/* ── 시상식 ─────────────────────────────────────────────────
   대회에서 금메달을 땄으면 단상에 세운다.

   ⚠ 왜 만들었나: 이 게임에는 **의식(ceremony)이 없었다.** 1위를 해도 표에 숫자
      한 줄이 늘 뿐이었다. Summer Games 같은 고전이 지금도 기억되는 이유의 절반이
      개·폐회식과 시상식이다 — 이긴 것을 '치르는' 자리가 있어야 이긴 기분이 난다.
   ⚠ 기존 흐름은 안 바꾼다. 금메달이 없으면 이 화면은 아예 안 뜬다.
   ⚠⚠ 한 번 통째로 사라진 적이 있다 — 파일 앞부분을 재작성하면서 뒤를 잘랐고,
      부르는 쪽이 `typeof PodiumScreen!=='undefined'` 로 감싸고 있어서
      **아무 오류 없이 시상식만 조용히 없어졌다.** 어셋 검사기가 잡아 줬다
      (podium-hd·medal-gold·flash-bulbs 가 '안 붙은 파일'로 떴다). */
class PodiumScreen extends Screen0 {
  constructor(mg, meet){
    super(mg);
    this.meet=meet; this.t=0;
    this.winners=[];
    for(const e of (meet.events||[])){
      for(const r of e.rows){
        if(r.rank<=3 && mg.club.has(r.athlete))
          this.winners.push({ rank:r.rank, a:r.athlete, ev:e.ev, value:r.value });
      }
    }
    /* 올림픽에서 22명이 입상하면 22번을 넘겨야 했다 — 의식이 아니라 노동이다.
       금메달을 앞에 두고 최대 6개만 치른다. */
    this.winners.sort((x,y)=>x.rank-y.rank || x.value-y.value);
    this.total = this.winners.length;
    this.winners = this.winners.slice(0, 6);
    this.idx=0;
    Sfx.finish(); if(typeof Track!=='undefined') Track.cheer(1);
    if(typeof Music!=='undefined'){ Music._last=null; Music.play('win'); }
  }
  static has(mg, meet){
    return (meet.events||[]).some(e=>e.rows.some(r=>r.rank===1 && mg.club.has(r.athlete)));
  }
  get rows(){ return []; }
  update(now){
    this.t += 16.7;
    if(Input.pressed('action')||Input.pressed('back')){
      Sfx.ui();
      if(this.idx < this.winners.length-1){
        this.idx++; this.t=0; Track.cheer(0.8);
        if(typeof Music!=='undefined'){ Music._last=null; Music.play('win'); }
      } else this.mg.pop();
    }
  }
  draw(u){
    const w=this.winners[this.idx]; if(!w){ this.mg.pop(); return; }
    const cx=VW/2, base=VH-52;
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
      u.fillRect(cx-bw/2, base-26, bw, 26);
      u.fillRect(cx-bw/2-bw-2, base-16, bw, 16);
      u.fillRect(cx+bw/2+2, base-11, bw, 11);
      u.fillStyle=PAL.gold; u.fillRect(cx-bw/2, base-26, bw, 2);
    }
    const py = base - (w.rank===1?30:w.rank===2?20:15);
    const px = cx + (w.rank===1?0:w.rank===2?-38:38);
    if(!CharHD.draw(u, w.a.species, px, py, 0.05, { t:this.t, scale:1.05 }))
      { u.fillStyle=PAL.gold; u.fillRect(px-7, py-28, 14, 28); }
    if(!BG.obj(u, 'medal-gold', px, py-24, 14)){
      u.fillStyle = w.rank===1?PAL.gold:w.rank===2?'#c9cede':'#c9884a';
      u.beginPath(); u.arc(px, py-30, 5, 0, 6.284); u.fill();
    }
    if(w.rank===1){
      const k=(this.t%1200)/1200;
      BG.fx(u, 'flash-bulbs', cx, base-58, 30, k, 4);
      if(this.t < 2600) BG.fx(u, 'confetti-burst', cx, base, 90, clamp(this.t/2600,0,0.999), 4);
    }
    const medalName = ['금메달','은메달','동메달'][w.rank-1];
    txt(u, K(medalName), cx, 34, 13, w.rank===1?PAL.gold:w.rank===2?'#c9cede':'#c9884a','center',700);
    txt(u, `${w.a.speciesName} ${w.a.name}`, cx, 52, 17, PAL.white,'center',700);
    txt(u, fmtRec(w.ev, w.value) + (w.ev.unit==='s'&&needsSec(fmtRec(w.ev,w.value)) ? K('초'):''),
        cx, 72, 13, PAL.blue,'center');
    UIK.lvBadge(u, cx-14, 88, w.a.lv||1);
    if(this.winners.length>1)
      txt(u, `${this.idx+1} / ${this.winners.length}`
             + (this.total>this.winners.length ? `  (입상 ${this.total})` : ''),
          VW-10, 30, 9, PAL.dim,'right');
    UI.footer(u, this.idx < this.winners.length-1 ? '확인 다음 시상' : '확인 계속');
  }
}
