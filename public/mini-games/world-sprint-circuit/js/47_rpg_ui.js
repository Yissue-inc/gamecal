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
  /* 이 선수에게 **지금** 할 일이 있나 — 포인트가 있거나, 배워 놓고 안 켠 스킬이 있거나.
     ⚠ 부상은 여기서 할 일이 아니다(치료는 훈련 지시에서 한다) — 뒤로 물려도 된다. */
  static hasTodo(a){
    if((a.tp|0) > 0) return true;
    if(typeof SKILL==='undefined') return false;
    SKILL.ensure(a);
    const free = SKILL.slots(a) - SKILL.equipped(a).length;
    return free > 0 && (a.skills||[]).some(id => (a.skillEq||[]).indexOf(id) < 0);
  }
  get hdBg(){ return 'bg-training'; }  get hdBgDim(){ return 0.80; }
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
    txt(u, K('육성'), VW-30, 3, 11, PAL.gold, 'right', 700);

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
      /* ⛔ 챕터 8 — 열 장이 **전부 같은 무게**로 보였다. 이 화면의 결정은
         "누구를 키울까"가 아니라 그 앞 단계, **"지금 할 일이 있는 카드가 어느 거냐"** 다.
         포인트도 없고 놀리는 스킬도 없으면 지금 당장 할 게 없다 — 뒤로 물린다.
         ⚠ 지우는 게 아니다. 고른 카드는 언제나 또렷하고, 눌러 들어가면 다 있다
            (장비 갈아 끼우기·스킬 켜기는 포인트가 없어도 된다). */
      const todo = GrowPickScreen.hasTodo(a);
      u.save();
      if(!on && !todo) u.globalAlpha = 0.55;
      const col = (typeof UI!=='undefined' && UI.rareColor) ? UI.rareColor(a) : PAL.white;
      /* 등급을 색뿐 아니라 **테두리 모양**으로도 — 전설은 왕관이 달린 틀을 쓴다 */
      UIK.card(u, x, y, cw, ch, col, {on, tier:(typeof rarityOf==='function')?rarityOf(a):1});
      /* 얼굴 — face-<종족> 이 있으면 초상, 없으면 달리는 스프라이트로 물러난다.
         ⚠ 60종 중 11종만 도착했다. 섞여도 어색하지 않도록 같은 자리·같은 크기로. */
      const face = Math.min(26, ch*0.42);
      if(!Face.draw(u, a.species, x+face*0.72, y+ch-face*0.62, face*1.5) &&
         !CharHD.draw(u, a.species, x+face*0.72, y+ch-6, 0.05,
                      { t:this.t+i*300, scale:face/42 })){
        u.fillStyle=col; u.fillRect(x+8, y+ch-30, 12, 24);
      }
      UIK.lvBadge(u, x+3, y+3, a.lv, col);
      const tx = x + face*1.35;
      /* ⚠ 영어 이름(PIOTR ANDERSEN)이 카드를 넘어 옆 카드까지 침범했다.
         카드 안에서만 그리도록 자른다 — 잘린 건 상세 화면에 다 있다. */
      /* ⛔ 긴 영어 이름이 카드에서 **툭 잘렸다**('LIAM WALK…'). 자르면 누구인지 모른다.
         칸에 맞춰 **글자를 줄인다** — 8px 까지는 읽힌다. 그보다 길면 그때 자른다. */
      { const room = cw - (tx - x) - 4;
        let fs = 10, nm = a.name;
        const fits = () => { u.font = `${on?700:400} ${fs}px "Galmuri11","Nanum Gothic Coding",monospace`;
                             return u.measureText(nm).width <= room; };
        while(fs > 7 && !fits()) fs -= 1;
        /* ⛔ 7px 바닥까지 줄여도 안 들어가면 **그냥 잘려 나갔다** — 'FREYA KOWALS'.
           자른 티도 안 나서 그게 이름인 줄 안다. 성을 머릿글자로 줄이고,
           그래도 안 되면 말줄임표를 붙인다 — **잘렸다는 사실이 보여야 한다.** */
        if(!fits() && nm.indexOf(' ') > 0){
          const p2 = nm.split(' ');
          nm = p2[0] + ' ' + p2[p2.length-1].charAt(0) + '.';
        }
        while(!fits() && nm.length > 3) nm = nm.slice(0, -2) + '…';
        u.save(); u.beginPath(); u.rect(x+2, y+2, cw-4, ch-4); u.clip();
        txt(u, nm, tx, y+15+(10-fs)*0.5, fs, on?PAL.gold:PAL.white, 'left', on?700:400);
        u.restore(); }
      /* ⛔ 챕터 8 — 이 화면은 **누구를 키울까**를 고르는 곳이다. 그렇다면 필요한 건
         '지금 얼마나 세냐(OVR)'가 아니라 **얼마나 더 클 수 있나** 다.
         라벨 'OVR' 도 뺀다 — 카드 한 장에 신호가 아홉 개다(이름·레벨·얼굴·경험치
         막대·포인트·스킬 점·장비 점·적성 둘). 글자는 숫자만 남긴다. */
      /* ⚠ 처음엔 `35 / 95` 로 썼다 — 바로 아래 경험치 막대 때문에 **'경험치 35/95'**
         로 읽힐 수 있다. 상세 화면은 같은 뜻을 이미 `44.0 → 잠재 99` 로 쓴다.
         같은 뜻이면 같은 기호를 쓴다 — 화살표는 '지금 → 될 수 있는 것'이다. */
      txt(u, `${a.overall} → ${a.potOverall}`, tx, y+27, 8, PAL.dim, 'left');
      /* 스킬을 켜 놨으면 카드에 점으로 — 목록에서 '누가 준비됐나'가 보인다 */
      if(typeof SKILL!=='undefined'){
        const eqn=SKILL.equipped(a).length, cap=SKILL.slots(a);
        for(let k=0;k<cap;k++){
          u.fillStyle = k<eqn ? PAL.green : 'rgba(255,255,255,.18)';
          u.fillRect(x+cw-8-k*6, y+5, 4, 4);
        }
      }
      /* 잘 자라는 스탯 둘 — '이 선수는 뭐지'에 카드가 답한다 */
      const tops=DEPTH.topApt(a,2);
      /* ⛔ 챕터 8 — 'SpA' 는 암호였다. 스탯 이름 두 글자 + 등급 한 글자를 붙인 것인데,
         읽으려면 규칙을 먼저 배워야 한다. 스탯 아이콘 6종이 이미 있으니 그 두 글자를
         아이콘이 대신한다 → 카드마다 4자가 빠지고 한눈에 읽힌다.
         ⚠ 어셋이 없으면 예전 약어로 물러난다(여섯이 한 벌이라 있으면 다 있다).
            자르기 **전에** 번역해야 영어판이 안 깨진다 — '스피A' 는 번역표에 없다. */
      const aptIcon = tops.length && UI.STAT_ICON && UI.STAT_ICON[tops[0].k]
                   && typeof BG!=='undefined' && !!BG.get(UI.STAT_ICON[tops[0].k]);
      tops.forEach((t2,ti)=>{
        const ap=DEPTH.aptOf(a,t2.k);
        const ix = tx + ti*(aptIcon ? 22 : 26);
        /* ⚠ y+30 에 그렸더니 바로 위 '41 / 87'(y+27, 8px → 27~35)을 덮었다.
           아이콘 높이 9px 를 글자 줄(y+37)에 맞춰 내린다. */
        if(aptIcon) UIK.iconTint(u, UI.STAT_ICON[t2.k], ix, y+36, 9, ap.color);
        txt(u, aptIcon ? ap.key : K(STAT_NAME[t2.k]||t2.k).slice(0,2)+ap.key,
            ix + (aptIcon?11:0), y+37, 8, ap.color, 'left', 700);
      });
      /* ⚠ 1년차엔 경험치가 전부 0이라 **빈 막대 열 개**가 같은 그림이었다.
         아직 아무도 안 뛰었으면 막대 대신 '잠재치까지 얼마나 남았나'를 그린다 —
         그건 첫 시즌에 실제로 다른 값이고, 누구를 키울지 고르는 데 쓸모가 있다. */
      { const bw2 = cw-(tx-x)-6, by2 = y+ch-17;
        const anyXp = (a.xp|0) > 0 || (a.lv|0) > 1;
        if(anyXp) UIK.xpBar(u, tx, by2, bw2, a.lv, a.xp, RPG.xpToNext(a.lv), {showText:false});
        else {
          const room = clamp((a.potOverall - a.overall) / 60, 0, 1);
          u.fillStyle='rgba(6,9,16,.85)'; u.fillRect(tx, by2, bw2, 7);
          u.fillStyle='rgba(90,170,255,.55)';
          u.fillRect(tx+1, by2+1, Math.round((bw2-2)*room), 5);
        } }
      /* 포인트 있으면 눈에 띄게 — 할 일이 있는 카드 */
      if(a.tp>0){
        u.fillStyle=PAL.gold; u.fillRect(x+cw-15, y+ch-13, 12, 10);
        txt(u, String(a.tp), x+cw-9, y+ch-12, 8, '#1a1408', 'center', 700);
      }
      /* 부상도 아이콘으로 — 글자 두 자가 카드 오른쪽 위에서 이름과 다퉜다 */
      if(a.injury && !(typeof UIK!=='undefined' &&
                       UIK.iconTint(u, 'ic-injury', x+cw-13, y+13, 10, PAL.red)))
        txt(u, K('부상'), x+cw-4, y+15, 8, PAL.red, 'right', 700);
      /* 장비 3칸 표시 */
      RPG.SLOTS.forEach((sl,k)=>{
        const it=a.equip && a.equip[sl];
        u.fillStyle = it ? RPG.rarityOf(it.r).color : 'rgba(255,255,255,.12)';
        u.fillRect(tx+k*6, y+ch-8, 4, 4);
      });
      u.restore();
    });
    txt(u, tp>0 ? K('훈련 포인트 %1점을 쓸 수 있습니다').replace('%1', tp)
                : K('대회와 훈련으로 포인트가 쌓입니다'),
        VW/2, VH-28, 9, tp>0?PAL.gold:PAL.dim, 'center');
    UI.footer(u, '◀▶▲▼ 고르기 · 확인 선택 · 취소 돌아가기');
  }
}

/* ── 육성 — 한 선수 ─────────────────────────────────────── */
class GrowScreen extends Screen0 {
  get hdBg(){ return 'bg-training'; }  get hdBgDim(){ return 0.82; }
  /* 0=스탯 1=장비 2=스킬.
     ⚠ 예전엔 `this.tab = this.tab?0:1` 이라 **탭이 늘면 조용히 안 열린다.**
        탭 이름 목록과 순환을 한 곳에서 뽑아 쓴다 — 어긋날 자리를 없앤다. */
  static TABS = ['스탯 올리기','장비','스킬'];
  constructor(mg, a){ super(mg); this.a=RPG.ensure(a);
    if(typeof SKILL!=='undefined') SKILL.ensure(a);
    this.tab=0; }
  get rows(){
    const a=this.a;
    if(this.tab===0){
      /* ⚠ 예전엔 잠재치에 닿으면 줄이 '최대'로 죽어 버렸다 — 그리고 포인트는 계속 쌓였다
         (실측 634). 이제 닿은 줄은 **돌파**로 바뀐다. 확인 하나로 둘 다 된다. */
      const bCap=RPG.breakCap(a), bUsed=RPG.brokeTotal(a);
      /* ⚠ 이 선수에게 **얼마나 중요한 스탯인지**를 줄에 못 박는다.
         안 그러면 단거리 선수의 파워를 돌파해 놓고 OVR 이 왜 그대로인지 모른다. */
      /* ⚠ 흐린 회색 마름모 셋은 안 읽힌다 — 중요한 스탯일수록 밝게.
         "이 선수에게 중요한 칸"이 목록에서 **먼저** 눈에 들어와야 한다. */
      const starN = k => (typeof specStars==='function') ? specStars(a.spec,k) : 2;
      const star  = k => '◆'.repeat(starN(k)) + '◇'.repeat(3-starN(k));
      const starC = k => [PAL.dim,'#8a94ad',PAL.white,PAL.gold][starN(k)];
      return STAT_KEYS.map(k=>{
        const cap=a.potential[k], cur=a.stats[k];
        const full = cur>=cap-0.01;
        /* 스탯 표도 **데이터**다 — 어느 칸에 여유가 있는지 훑을 수 있어야 한다
           (챕터 1 규칙: 설명은 숨기고 데이터는 남긴다). */
        if(!full) return { label:STAT_NAME[k]||k, icon:UI.STAT_ICON&&UI.STAT_ICON[k],
          subAlways:true,
          /* ⛔ 챕터 9 — '잠재' 가 이 화면에 일곱 번 있었다(여섯 줄 + 왼쪽 패널).
             화살표가 이미 '지금 → 될 수 있는 것' 을 말한다 — 줄에서는 낱말을 뺀다. */
          sub:`${cur.toFixed(1)} → ${Math.round(cap)}`,
          right:'+1', rightColor:(a.tp>0?PAL.green:PAL.dim), color:PAL.white,
          right2:star(k), right2Color:starC(k), _k:k, _full:false };
        const why=RPG.whyBreak(a,k), br=RPG.broke(a,k);
        return { label:STAT_NAME[k]||k, icon:UI.STAT_ICON&&UI.STAT_ICON[k],
          subAlways:true,
          sub: why===null
             ? `잠재 ${Math.round(cap)} 돌파 — 남은 한도 ${bCap-bUsed}` + (br?` · 이미 +${br}`:'')
             : K('잠재치에 닿았다') + ' · ' + why,   /* why 는 whyBreak 이 이미 번역해 준다 */
          right: why===null ? `돌파 −${RPG.BREAK_COST}` : '최대',
          rightColor: why===null?PAL.gold:PAL.dim,
          color: why===null?PAL.gold:PAL.dim,
          right2:star(k), right2Color:starC(k), _k:k, _full:true, _break: why===null };
      });
    }
    if(this.tab===2){
      /* 스킬 탭 — 배운 것 · 배울 수 있는 것 · 조건 미달 순(SKILL.pool 이 정렬한다).
         ⚠ '배웠다'와 '켰다'는 다르다 — 슬롯이 모자라면 배워도 안 켜진다.
            그래서 오른쪽에 ON/OFF 를 못 박아 둔다. */
      const slots=SKILL.slots(a), on=SKILL.equipped(a).length;
      return SKILL.pool(a).map(p=>{
        const d=p.def, race=d.branch==='race';
        const rr=(typeof RARITY!=='undefined'&&RARITY[d.tier])?RARITY[d.tier]:null;
        return {
          label: d.name, icon: d.icon, subAlways:true,
          sub: p.known ? d.desc
             : (p.why===null ? `${d.desc} · 포인트 ${d.cost}` : `${d.desc} · ${p.why}`),
          right: p.known ? (p.on?'ON':'OFF') : (p.why===null ? `−${d.cost}` : '잠김'),
          rightColor: p.known ? (p.on?PAL.green:PAL.dim)
                    : (p.why===null ? PAL.gold : PAL.dim),
          right2: race ? K('경기') : K('육성'),
          color: p.known ? (p.on?PAL.white:PAL.dim)
               : (p.why===null ? PAL.white : PAL.dim),
          _skill:p.id, _known:p.known, _on:p.on, _why:p.why,
          _tierColor: rr?rr.color:null };
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
      const fuseOk = RPG.canFuse(inv, it);
      rows.push({ label:'  '+RPG.itemName(it),
        sub: RPG.itemLine(it) + (fuseOk ? '  · ▲합성 가능' : ''),
        right:'착용 · ▼팔기 '+RPG.sellPrice(it),
        rightColor:RPG.rarityOf(it.r).color, color:RPG.rarityOf(it.r).color, _inv:i });
    });
    if(!inv.length) rows.push({ label:'  창고가 비었다', sub:'대회에서 장비가 나옵니다', color:PAL.dim });
    return rows;
  }
  update(now){
    /* ◀▶ 로 탭 전환 — 스탯과 장비를 오간다 */
    const NT = GrowScreen.TABS.length;
    if(Input.pressed('right')){ this.tab=(this.tab+1)%NT; this.sel=0; Sfx.ui(); return; }
    if(Input.pressed('left')) { this.tab=(this.tab+NT-1)%NT; this.sel=0; Sfx.ui(); return; }
    /* ▲ — 스카우트 리포트(잠재치를 범위로 본다) */
    if(Input.pressed('up') && this.tab===0){
      if(typeof ScoutReportScreen!=='undefined'){ Sfx.ui(); this.mg.push(new ScoutReportScreen(this.mg, this.a)); return; }
    }
    /* ▼(스탯 탭) — 계승. 아직 안 받은 선수만 전당으로 보낸다 */
    if(Input.pressed('down') && this.tab===0){
      if(this.a.inherited){ Sfx.fail(); this.mg.toast('이미 %1의 자질을 물려받았습니다'.replace('%1', this.a.inherited.from)); return; }
      if(typeof HallScreen==='undefined' || !DEPTH.hall(this.mg.club).length){
        Sfx.fail(); this.mg.toast('전당이 비어 있습니다'); return;
      }
      Sfx.ui(); this.mg.push(new HallScreen(this.mg, this.a)); return;
    }
    /* ▲(장비 탭) — 합성. 같은 것 3개를 한 등급 위로 */
    if(this.tab===1 && Input.pressed('up')){
      const r=this.rows[this.sel];
      if(r && r._inv!==undefined){
        const inv=this.mg.club.inventory, it=inv[r._inv];
        if(it && RPG.canFuse(inv, it)){
          const made=RPG.fuse(inv, it);
          Sfx.record(); Screen.shake(0.35);
          this.getFxAt = this.t||0;                 // 아이템이 생긴 순간
          this.mg.toast('합성 → %1'.replace('%1', RPG.itemName(made)));
          this.sel=Math.min(this.sel, this.rows.length-1);
        } else { Sfx.fail(); this.mg.toast('같은 등급 3개가 필요합니다'); }
        return;
      }
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
  /* 행동 앞뒤로 종합력을 재서 +N 을 띄운다 — 뭘 해도 숫자가 움직이는 게 보여야 한다 */
  act(fn){
    const club = this.mg && this.mg.club;
    if(typeof Power!=='undefined') Power.mark(this.a, club);
    fn();
    if(typeof Power!=='undefined'){
      const d = Power.delta(this.a, club);
      if(d.p || d.g || d.r){ this.pwD=d; this.pwAt=this.t||0; }
    }
  }
  confirm(){
    const a=this.a, r=this.rows[this.sel]; if(!r) return;
    return this.act(()=>this._confirm(a, r));
  }
  _confirm(a, r){
    if(this.tab===2){
      if(!r._known){
        if(r._why){ Sfx.fail(); this.mg.toast(K(r._why)); return; }
        if(SKILL.learn(a, r._skill)){
          Sfx.record(); Screen.shake(0.3); this.fxAt=this.t||0;
          this.learnAt = this.t||0;        // 봉인이 열리는 연출(fx-skill-learn)
          this.mg.toast('%1 습득  (남은 포인트 %2)'
            .replace('%1', SKILL.def(r._skill).name).replace('%2', a.tp));
        } else Sfx.fail();
        return;
      }
      /* 배운 것 — 켜고 끈다. 슬롯이 꽉 찼으면 못 켠다 */
      if(SKILL.toggle(a, r._skill)){
        Sfx.ui();
        this.mg.toast(SKILL.has(a, r._skill)
          ? K('%1 장착').replace('%1', SKILL.def(r._skill).name)
          : K('%1 해제').replace('%1', SKILL.def(r._skill).name));
      } else {
        Sfx.fail();
        this.mg.toast('슬롯이 %1칸뿐입니다 — 하나를 빼세요'.replace('%1', SKILL.slots(a)));
      }
      return;
    }
    if(this.tab===0){
      if(r._full){
        /* 닿은 스탯은 **돌파**한다 — 포인트가 갈 곳이 없어 쌓이던 자리 */
        if(!r._break){ Sfx.fail(); this.mg.toast(K(RPG.whyBreak(a, r._k)||'잠재치에 닿았습니다')); return; }
        RPG.breakPot(a, r._k);
        Sfx.record(); Screen.shake(0.35); this.fxAt=this.t||0;
        this.breakAt = this.t||0;          // 천장이 깨지는 연출(fx-breakthrough)
        this.mg.toast('%1 잠재치 돌파 → %2  (남은 포인트 %3)'
          .replace('%1', STAT_NAME[r._k]||r._k)
          .replace('%2', Math.round(a.potential[r._k])).replace('%3', a.tp));
        return;
      }
      const err=RPG.spendTp(a, r._k, 1);
      if(err){ Sfx.fail(); this.mg.toast(err); return; }
      Sfx.record(); Screen.shake(0.3);
      this.fxAt = this.t||0;                       // 스탯이 오른 순간 — 연출을 띄운다
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
      this.getFxAt = this.t||0;
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
    /* 상태 — 카드 아래는 장비·스킬이 다 채웠다(219~249). 이름 밑 빈 줄로 올린다.
       ⚠ 250 에 두면 푸터 판(VH-16=254)에 씹힌다. */
    { const cond=Math.round(a.condition), fat=Math.round(a.fatigue);
      txt(u, K('컨디션 %1  ·  피로 %2').replace('%1',cond).replace('%2',fat),
          80, 39, 9, fat>65?PAL.red:PAL.dim, 'center'); }
    if(!Face.draw(u, a.species, 80, 86, 58) &&
       !CharHD.draw(u, a.species, 80, 108, 0.05, { t:this.t, scale:1.5 })){
      u.fillStyle=col; u.fillRect(70, 60, 20, 48);
    }
    /* 스탯이 오른 순간 발밑에서 금빛 고리 — 숫자만 바뀌면 오른 줄 모른다 */
    if(this.fxAt!==undefined && this.t-this.fxAt < 800)
      BG.fx(u, 'fx-levelup', 80, 112, 40, clamp((this.t-this.fxAt)/800,0,0.999), 4);
    /* 잠재치 돌파 — **천장이 깨진다.** 숫자가 81→82 로 조용히 바뀌던 자리다.
       ⚠ 10포인트를 쓰는 행동인데 스탯 +1(1포인트)과 연출이 같으면 안 된다. */
    if(this.breakAt!==undefined && this.t-this.breakAt < 1100)
      BG.fx(u, 'fx-breakthrough', 80, 96, 62, clamp((this.t-this.breakAt)/1100,0,0.999), 5);
    /* 스킬 습득 — 봉인이 열린다. 배우는 건 판마다 몇 번 없는 일이다 */
    if(this.learnAt!==undefined && this.t-this.learnAt < 1100)
      BG.fx(u, 'fx-skill-learn', 80, 100, 56, clamp((this.t-this.learnAt)/1100,0,0.999), 5);
    /* 장비를 얻거나 합성한 순간 — 빛기둥 */
    if(this.getFxAt!==undefined && this.t-this.getFxAt < 800)
      BG.fx(u, 'fx-item-get', 80, 200, 34, clamp((this.t-this.getFxAt)/800,0,0.999), 4);
    UIK.lvBadge(u, 12, 12, a.lv, col);
    /* 종족 등급 — 뱃지 어셋이 왔으면 그림으로. 없으면 별표가 카드 위에 남는다 */
    if(!UI.rareBadge(u, a, 128, 10, 20))
      txt(u, UI.rareStars(a), 146, 13, 8, col, 'right');
    /* 경험치 */
    /* ⚠ 막대 옆 '0 / 1.6만' 은 껐다 — 바로 아래 '성장력' 라벨과 겹쳤고(실측),
       레벨은 이미 왼쪽 위 뱃지에 있다. 카드의 주인공은 종합력이다. */
    UIK.xpBar(u, 14, 116, 132, a.lv, a.xp, RPG.xpToNext(a.lv), { showText:false });
    /* ── 종합력 — 이 카드의 주인공 ────────────────────────
       ⚠ 예전엔 OVR 만 컸다. 그런데 OVR 은 **스탯만 본다** — Lv30 에 전설 장비를
          셋 끼워도 신인과 같은 36 이 떴다(실측). 플레이어의 투자가 화면에서 사라졌다.
          그래서 큰 자리는 종합력이 갖고, OVR·잠재는 그 밑 한 줄로 내린다. */
    if(typeof Power!=='undefined'){
      const pw = Power.of(a), gw = Power.growthOf(a, this.mg && this.mg.club);
      txt(u, K('경기력'), 16, 128, 8, PAL.dim, 'left');
      txt(u, UIK.n(pw), 16, 136, 21, PAL.gold, 'left', 700);
      /* 성장력은 옆에 작게 — "지금 세다"와 "앞으로 큰다"는 다른 말이다 */
      txt(u, K('성장력'), 88, 128, 8, PAL.dim, 'left');
      txt(u, UIK.n(gw), 88, 139, 13, '#5aaaff', 'left', 700);
      txt(u, `OVR ${a.overall} · ${K('잠재')} ${a.potOverall}`, 16, 159, 9, PAL.dim, 'left');
      /* 방금 뭘 해서 오른 만큼 — 조용히 바뀌면 아무도 못 느낀다 */
      /* 각자 자기 숫자 위로 떠오른다 — 어느 쪽이 올랐는지가 바로 보인다 */
      if(this.pwD && this.t-this.pwAt < 1400){
        const k = 1 - (this.t-this.pwAt)/1400;
        u.globalAlpha = Math.min(1, k*2);
        /* 크게 오른 순간에만 기둥이 솟는다 — 매번 터지면 아무 의미가 없다 */
        if(this.pwD.p >= 150)
          BG.fx(u, 'fx-power-up', 40, 132, 46, clamp((this.t-this.pwAt)/1100,0,0.999), 5);
        const pop=(v,x)=>{ if(!v) return;
          txt(u, (v>0?'+':'')+UIK.n(v), x, 120-(1-k)*10, 13,
              v>0?PAL.green:PAL.red, 'left', 700); };
        pop(this.pwD.p, 16); pop(this.pwD.g, 88);
        /* 잠재치 돌파는 경기력을 안 올린다 — 천장을 민다. 그 자리에 따로 띄운다 */
        if(this.pwD.r) txt(u, '잠재 +'+UIK.n(this.pwD.r), 100, 159, 9, PAL.blue, 'left', 700);
        u.globalAlpha = 1;
      }
    } else {
      txt(u, 'OVR', 16, 143, 8, PAL.dim, 'left');
      txt(u, String(a.overall), 16, 152, 19, PAL.gold, 'left', 700);
      txt(u, K('잠재'), 88, 143, 8, PAL.dim, 'left');
      txt(u, String(a.potOverall), 88, 152, 19, PAL.dim, 'left', 700);
    }
    /* 장비 3칸 — 늘 보이게.
       ⚠ 아래에 스킬 두 줄이 새로 붙었다. 예전 자리(186)면 상자 라벨과 스킬 줄이,
          그리고 컨디션 줄이 푸터와 겹친다(실측). 블록을 통째로 6px 올린다. */
    txt(u, K('장비'), 16, 171, 8, PAL.dim, 'left');
    RPG.SLOTS.forEach((sl,k)=>{
      const it=a.equip && a.equip[sl];
      UIK.itemBox(u, 14+k*45, 180, 36, {
        color: it ? RPG.rarityOf(it.r).color : '#39415a',
        icon: it ? RPG.itemIcon(it) : RPG.SLOT_ICON[sl],
        /* 비어 있으면 글자를 안 쓴다 — 상자가 비어 보이고, 슬롯 아이콘이 무슨 칸인지
           말하고, 아래 라벨(신발·유니폼·장비)이 이름을 댄다. '빈칸' 은 네 번째다. */
        qty: it ? RPG.rarityOf(it.r).name : '',
        label: RPG.SLOT_NAME[sl] });
    });
    /* 장착한 스킬 — 어느 탭에 있든 '이 선수가 뭘 켜고 있나'가 보여야 한다.
       ⚠ 슬롯 점을 함께 찍는다. 이름만 있으면 '몇 칸을 놀리고 있나'가 안 보인다. */
    if(typeof SKILL!=='undefined'){
      const eq=SKILL.equipped(a), cap=SKILL.slots(a);
      /* ⚠ 자리는 계산해서 잡는다. UIK.itemBox 의 라벨은 y+size+2 = 181+36+2 = 219 에
         size 8 로 그려진다(219~229). 222 에 뒀더니 '스파이크' 위에 '스킬'이 얹혀
         '스킬발'로 읽혔다. 푸터는 VH-16(=254)부터다 — 231~249 만 쓸 수 있다. */
      /* ⛔ 슬롯 점을 x=40 에 박아 뒀다 — 한국어 '스킬'(20px)은 넘었지만
         영어 'Skills'(29px)의 마지막 s 위에 첫 점이 앉았다('Skillṣ').
         라벨 폭을 재서 그 뒤에 놓는다 — 자리를 박으면 번역이 들어오는 날 깨진다. */
      txt(u, K('스킬'), 16, 230, 8, PAL.dim, 'left');
      let dotX = 40;
      try{ u.font = '400 8px "Galmuri11","Nanum Gothic Coding",monospace';
           dotX = 16 + Math.ceil(u.measureText(K('스킬')).width) + 6; }catch(e){}
      for(let k=0;k<cap;k++){
        u.fillStyle = k<eq.length ? PAL.green : 'rgba(255,255,255,.18)';
        u.fillRect(dotX+k*7, 231, 5, 5);
      }
      u.save(); u.beginPath(); u.rect(14, 239, 132, 11); u.clip();
      txt(u, eq.length ? eq.map(id=>SKILL.def(id).name).join(' · ') : K('아직 없음'),
          16, 240, 9, eq.length?PAL.green:PAL.dim, 'left');
      u.restore();
    }


    /* ── 오른쪽: 탭 + 목록 ── */
    UIK.frame(u, 160, 6, VW-166, VH-14);
    txt(u, K('훈련 포인트'), VW-12, 12, 9, PAL.dim, 'right');
    txt(u, String(a.tp||0), VW-12, 21, 20, (a.tp>0?PAL.gold:PAL.dim), 'right', 700);
    GrowScreen.TABS.forEach((nm,i)=>{
      UIK.tab(u, 168+i*60, 14, 56, 16, K(nm), i===this.tab);
    });
    /* 스킬 탭이면 슬롯 사용량을 못 박는다 — 이게 이 탭의 유일한 제약이다 */
    if(this.tab===2){
      const used=SKILL.equipped(a).length, cap=SKILL.slots(a), nx=SKILL.nextSlotAt(a);
      /* ⚠ VW-12 에 우측정렬했더니 바로 위 훈련 포인트 숫자(size 20)와 겹쳤다.
         탭 줄 바로 아래 왼쪽은 비어 있다 — 거기로. */
      txt(u, K('슬롯 %1 / %2').replace('%1',used).replace('%2',cap)
            + (nx? ` · ${K('다음 칸 Lv.%1').replace('%1',nx)}` : ''),
          168, 31, 8, used>=cap?PAL.gold:PAL.dim, 'left');
    }
    UI.list(u, this.rows, this.sel, 166, this.tab===2?42:36, VW-178, 22, this.tab===2?7:8);
    /* ⛔ 챕터 9 — 푸터가 이 화면에서 **제일 긴 한 조각**이었다(43자 · 전체 254자의 17%).
       그런데 '+1 / 잠재치 돌파' 는 고른 줄의 오른쪽이 이미 말하고 있다
       ('+1' 또는 '돌파 −N'). 키 힌트는 **줄이 못 하는 말만** 한다. */
    UI.footer(u, this.tab===2 ? '확인 배우기 / 켜고 끄기 · ◀▶ 탭 · 취소 뒤로'
                : this.tab===1 ? '확인 착용 · ▲ 합성 · ▼ 팔기 · ◀▶ 탭 · 취소 뒤로'
                               : '확인 · ▲ 리포트 · ▼ 계승 · ◀▶ 탭 · 취소');
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
  get hdBg(){ return 'bg-reward'; }  get hdBgDim(){ return 0.50; }
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
    /* 배경 — 밤 경기장(bg-reward). 가운데가 비어 있어 패널이 올라간다.
       hdBg 로 선언해 두었으므로 여기서 다시 그리지 않는다. */
    u.fillStyle='rgba(6,9,18,.62)'; u.fillRect(0,0,VW,VH);

    /* 제목 */
    txt(u, K('자동 훈련 보상'), VW/2, 12, 20, PAL.gold, 'center', 700);
    txt(u, K('자리를 비운 동안 선수들이 훈련했습니다'), VW/2, 34, 9, PAL.dim, 'center');

    /* 시간 — 이 화면의 주인공 */
    /* ⚠ 액자를 44 높이로 두고 상한 문구를 82 에 찍었더니 **아래 테두리에 가렸다**.
       9-slice 액자는 테두리가 두껍다 — 안쪽 여백을 넉넉히 잡는다. */
    UIK.frame(u, VW/2-92, 44, 184, 50, { glow:PAL.gold });
    txt(u, K('비운 시간'), VW/2, 50, 8, PAL.dim, 'center');
    UIK.clock(u, VW/2, 59, R.sec, 23);
    const capH = RPG.IDLE.capHours;
    const capped = R.sec >= capH*3600 - 1;
    txt(u, K('최대 %1시간').replace('%1', capH), VW/2, 80, 8,
        capped?PAL.red:PAL.dim, 'center', capped?700:400);

    /* 분당 획득률 — 레퍼런스가 예외 없이 보여 주는 것 */
    /* ⚠ '경험치 18/분'만 적었더니 총 획득(8.9만) 옆에서 무슨 수인지 알 수 없었다.
       **누구 기준인지**를 같이 적는다 — 방치형에서 이 비율이 곧 다음에 켤 이유다. */
    const perMin = Math.round(RPG.IDLE.xpPerSec*60);
    const gearAvg = this.gearBonusAvg();
    UIK.rate(u, 14, 98, K('1명당'), perMin, Math.round(perMin*gearAvg), PAL.blue);
    /* ⚠ 코인은 분당 0.18 이라 반올림하면 0 으로 보였다 — 시간당으로 말한다 */
    txt(u, K('코인'), 150, 98, 9, PAL.dim, 'left', 700);
    txt(u, UIK.n(Math.round(RPG.IDLE.coinPerSec*3600)), 184, 97, 11, '#ffcf4a', 'left', 700);
    txt(u, K('/시간'), 204, 98, 8, PAL.dim, 'left');
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
      if(age<900){
        BG.fx(u, 'confetti-burst', VW/2, VH-24, 70, clamp(age/900,0,0.999), 4);
        /* 상자마다 코인이 튀어 오른다 — '받았다'가 눈에 보여야 한다 */
        const boxes=this.boxes(), bs=34, gap=8, tw=boxes.length*bs+(boxes.length-1)*gap;
        boxes.forEach((b,i)=>BG.fx(u, 'fx-coin-pop', VW/2-tw/2+i*(bs+gap)+bs/2, 140,
                                   22, clamp(age/900,0,0.999), 4));
      }
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
      /* ⚠ COACHES 에 icon 이 있는데 줄로 안 넘기고 있었다 — 초상 6종이 도착해도
         화면엔 안 나왔다. '사람을 뽑는 화면인데 얼굴이 없다'가 그대로였다. */
      return { label:(on?'● ':'○ ')+c.name, sub:eff, icon:c.icon, subAlways:true,
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
    txt(u, K('코치진'), VW-30, 3, 11, PAL.gold, 'right', 700);
    const n=DEPTH.hired(C).length, bill=DEPTH.wageBill(C);
    txt(u, K('%1 / 3 명 · 주급 합계 %2').replace('%1',n).replace('%2',bill),
        8, 20, 9, bill>0?PAL.gold:PAL.dim);
    /* ⚠ 24px 7줄로 못 박아 뒀더니 코치는 6명뿐이라 화면 아래 40% 가 비었다.
       줄 수에 맞춰 높이를 잡는다 — 초상(96×96)도 그만큼 크게 나온다. */
    const n2 = this.rows.length, top = 32, bot = VH - 22;
    const rowH = Math.max(20, Math.min(34, Math.floor((bot-top)/n2)));
    UI.list(u, this.rows, this.sel, 8, top, VW-16, rowH, n2);
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
  /* ⚠ 이 화면은 원래 '읽기 전용'이었다(확인/취소 둘 다 나가기).
     특성을 다시 뽑는 자리는 여기가 맞다 — 선수의 타고난 것을 보는 화면이다.
     ◀▶ 로 특성을 고르고 ▲ 로 다시 뽑는다. 나가기는 그대로. */
  update(now){
    this.t+=16.7;
    const tr = this.a.traits || [];
    if(tr.length>1){
      if(Input.pressed('left'))  { this.tsel=((this.tsel||0)+tr.length-1)%tr.length; Sfx.ui(); }
      if(Input.pressed('right')) { this.tsel=((this.tsel||0)+1)%tr.length; Sfx.ui(); }
    }
    if(tr.length && Input.pressed('up')){
      const i=this.tsel||0, why=RPG.whyReroll(this.a, i);
      if(why){ Sfx.fail(); this.mg.toast(K(why)); }
      else {
        const r=RPG.reroll(this.a, i);
        if(r){ Sfx.record(); Screen.shake(0.3); this.rerollAt=this.t;
               this.mg.toast('%1 → %2'.replace('%1', TRAITS[r.from].name)
                                          .replace('%2', TRAITS[r.to].name)); }
        else Sfx.fail();
      }
      return;
    }
    if(Input.pressed('back')||Input.pressed('action')) this.mg.pop();
  }
  draw(u){
    const a=this.a, conf=DEPTH.confidence(a, this.mg && this.mg.club);
    const col=(typeof UI!=='undefined'&&UI.rareColor)?UI.rareColor(a):PAL.white;
    UIK.frame(u, 6, 6, VW-12, VH-12, { glow:col });
    txt(u, K('스카우트 리포트'), VW/2, 12, 13, PAL.gold, 'center', 700);
    txt(u, `${a.speciesName} ${a.name} · ${a.age}세 · Lv.${a.lv||1}`, VW/2, 28, 10, PAL.white, 'center');
    /* 확신도 */
    /* ⚠ 막대를 52 에서 시작하면 영어 'Confidence'(16~64) 를 덮는다 —
       글자끼리가 아니라 **글자와 그림**이 겹치는 경우다(겹침 감시는 이걸 못 본다). */
    txt(u, K('확신도'), 16, 44, 8, PAL.dim, 'left');
    const bw=120, cbx=72;
    u.fillStyle='rgba(255,255,255,.12)'; u.fillRect(cbx, 45, bw, 6);
    u.fillStyle = conf>=0.7?PAL.green:conf>=0.45?PAL.gold:PAL.red;
    u.fillRect(cbx, 45, Math.round(bw*conf), 6);
    txt(u, K(DEPTH.confName(conf)), cbx+bw+6, 43, 9, PAL.white, 'left', 700);
    txt(u, K('%1주 함께함').replace('%1', a.trainingWeeks||0), VW-16, 43, 9, PAL.dim, 'right');

    /* 스탯별 범위 — 현재값 위에 '여기까지 갈 수도' 를 띠로 */
    let y=64;
    for(const k of STAT_KEYS){
      const r=DEPTH.potentialRange(a, k, this.mg && this.mg.club), cur=a.stats[k];
      txt(u, STAT_NAME[k], 16, y, 9, PAL.white, 'left');
      /* 적성 — 이 종이 그 스탯을 얼마나 빨리 올리나. 데이터는 처음부터 있었다. */
      /* 적성 등급 — 글자만 떠 있으면 눈에 안 걸린다. 배지가 오면 그 안에. */
      /* ⛔ 배지 자리(66)와 막대 시작(76)이 **영어 스탯 이름 위**였다 —
         'Acceleration' 은 9px 로 65px 이라 16~81 을 쓴다(한국어 '가속'은 20px 였다).
         ⚠ 글자만 옮기고 배지를 안 옮기면 소용없다 — badge() 가 성공하면 아래 txt 는
            **아예 안 불린다.** 두 갈래를 같이 옮긴다. */
      const ap=DEPTH.aptOf(a, k);
      if(!UIK.badge(u, 84, y+5, 14, ap.key, ap.color))
        txt(u, ap.key, 84, y, 10, ap.color, 'left', 700);
      const x0=102, w=VW-102-90;
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
    /* 총평 + 특기 종목 */
    txt(u, K(DEPTH.verdict(a, this.mg && this.mg.club)), VW/2, y+8, 12,
        conf<0.4?PAL.dim:PAL.gold, 'center', 700);
    const be=DEPTH.bestEvents(a);
    if(be.length){
      const names=be.map(id=>(EVENT_BY_ID[id]?K(EVENT_BY_ID[id].name):id)).join(' · ');
      txt(u, K('특기 %1').replace('%1', names), VW/2, y+22, 9, PAL.green, 'center');
    }
    /* 성장 이력 꺾은선 */
    const log=a.ovrLog||[];
    if(log.length>2){
      /* ⚠ 특기 한 줄이 들어오면서 그래프 제목과 겹쳤다 — 그만큼 내린다 */
      const gx=16, gy=y+36, gw=VW-32, gh=26;
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
    /* ── 특성과 재추첨 ─────────────────────────────────────
       ⚠ 특성은 이 선수가 타고난 것인데 **바꿀 방법이 하나도 없었다.**
          실측: 1/5 가 나쁜 특성을 갖고 태어나고, 유리몸은 선수단 가용시간의 5%를
          뺏는다(연인원 결장 16 → 29). 다시 뽑을 수 있어야 한다. */
    const tr=a.traits||[], ry=VH-40;
    txt(u, K('특성'), 16, ry, 8, PAL.dim, 'left');
    if(!tr.length) txt(u, K('없음'), 56, ry-1, 9, PAL.dim, 'left');
    tr.forEach((t,i)=>{
      const on = i===(this.tsel||0) && tr.length>0;
      const bad = (t==='glass'||t==='nervous');
      /* ⚠ 44 면 강조 상자(x-4=40)가 영어 'Traits'(16~45) 를 문다 */
      const x = 56 + i*96;
      /* ⚠ 높이 14 면 상자가 ry+11 까지 간다 — 설명 글이 ry+9 에서 시작하니 윗선 2px 를
         파고들어 글자가 뭉개진다. 이름 줄에서 딱 끊는다(ry-3 ~ ry+9). */
      if(on){ u.fillStyle='rgba(255,215,94,.18)'; u.fillRect(x-4, ry-3, 92, 12); }
      txt(u, K(TRAITS[t].name), x, ry-1, 10, bad?PAL.red:PAL.green, 'left', on?700:400);
      txt(u, K(TRAITS[t].desc), x, ry+9, 8, PAL.dim, 'left');
    });
    if(tr.length){
      const cost=RPG.rerollCost(a), can=RPG.whyReroll(a, this.tsel||0)===null;
      txt(u, K('▲ 다시 뽑기 −%1').replace('%1', cost), VW-16, ry-1, 9,
          can?PAL.gold:PAL.dim, 'right', 700);
      txt(u, K('훈련 포인트 %1').replace('%1', a.tp||0), VW-16, ry+9, 8, PAL.dim, 'right');
      if(this.rerollAt!==undefined && this.t-this.rerollAt<900)
        BG.fx(u, 'fx-item-get', 90, ry+4, 30, clamp((this.t-this.rerollAt)/900,0,0.999), 4);
    }
    /* ⚠ '▲ 다시 뽑기' 는 바로 위 줄이 **값까지 붙여서** 이미 말하고 있다(−20 · 남은 포인트).
       푸터는 줄이 못 하는 말만 한다 — 여기선 특성 고르기와 나가기뿐이다. */
    UI.footer(u, tr.length>1 ? '◀▶ 특성 · 취소 돌아가기' : '취소 돌아가기');
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
    /* ⚠ 대회 이름·종목 이름은 각각 표에 있다 — 붙인 통짜는 없다(관전 화면과 같은 사고) */
    UI.header(u, '시상식', K(this.meet.name) + ' · ' + K(w.ev.name));
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
    const medalArt = w.rank===1 ? 'medal-gold' : 'icon-medal';
    if(!BG.obj(u, medalArt, px, py-24, 14)){
      u.fillStyle = w.rank===1?PAL.gold:w.rank===2?'#c9cede':'#c9884a';
      u.beginPath(); u.arc(px, py-30, 5, 0, 6.284); u.fill();
    }
    if(w.rank===1){
      const k=(this.t%1200)/1200;
      BG.fx(u, 'flash-bulbs', cx, base-58, 30, k, 4);
      /* 시상대 1위는 이 게임에서 제일 큰 순간이다 — 더 큰 폭죽(fx-confetti 768×192)을
         화면 전폭으로 두 번 터뜨린다. 없으면 예전 confetti-burst 로 물러난다. */
      if(this.t < 2600){
        const pr = clamp(this.t/2600, 0, 0.999);
        if(!BG.fx(u, 'fx-confetti', VW/2, base+10, 150, pr, 4))
          BG.fx(u, 'confetti-burst', cx, base, 90, pr, 4);
        else BG.fx(u, 'fx-confetti', VW*0.22, base-6, 110, clamp(pr+0.18,0,0.999), 4);
      }
    }
    const medalName = ['금메달','은메달','동메달'][w.rank-1];
    txt(u, K(medalName), cx, 34, 13, w.rank===1?PAL.gold:w.rank===2?'#c9cede':'#c9884a','center',700);
    txt(u, `${w.a.speciesName} ${w.a.name}`, cx, 52, 17, PAL.white,'center',700);
    txt(u, fmtRec(w.ev, w.value) + (w.ev.unit==='s'&&needsSec(fmtRec(w.ev,w.value)) ? K('초'):''),
        cx, 72, 13, PAL.blue,'center');
    UIK.lvBadge(u, cx-14, 88, w.a.lv||1);
    if(this.winners.length>1)
      txt(u, `${this.idx+1} / ${this.winners.length}`
             + (this.total>this.winners.length ? '  ' + K('(입상 %1)').replace('%1', this.total) : ''),
          VW-10, 30, 9, PAL.dim,'right');
    UI.footer(u, this.idx < this.winners.length-1 ? '확인 다음 시상' : '확인 계속');
  }
}

/* ── 일일 도전 (4B_daily) ───────────────────────────────────
   레퍼런스의 '오늘의 보상' 자리. 오늘의 종목 3개를 한 번씩 뛰고 합산 점수로 보상.
   ⚠ 아케이드를 그대로 빌려 쓴다 — 판정도 기록도 종목이 하던 그대로다. */
class DailyScreen extends Screen0 {
  constructor(mg){ super(mg); this.t=0; this.evs=Daily.events(); }
  get rows(){
    const d=Daily.load();
    const r=this.evs.map(e=>{
      const v=d.marks[e.id];
      const done=v!==undefined;
      /* ⛔ 표시를 이름 **앞에 붙인 채로** K() 에 넘겼다 — '✓ 조정 500m' 은 표에 없다
         (표에 있는 건 '조정 %1m'). 그래서 다른 종목은 번역되는데 이것만 한국어로 떴다.
         조각마다 번역하고 붙인다 — 이 레포의 규칙 그대로. */
      return { label:(done?'✓ ':'▶ ')+K(e.name),
        sub: done ? (v===null ? K('기록 없음')
                              : `${fmtRec(e,v)} · ${UIK.n(Daily.scoreOf(e,v))}점`)
                  : K('아직 안 뛰었다'),
        right: done ? (v===null?'0':UIK.n(Daily.scoreOf(e,v))) : K('도전'),
        rightColor: done ? (v===null?PAL.red:PAL.green) : PAL.gold,
        color: done ? PAL.dim : PAL.white, _e:e, _done:done };
    });
    if(d.done && !d.claimed) r.push({ label:'★ '+K('보상 받기'), sub:K('코인과 경험치를 받는다'),
                                      color:PAL.gold, right:'!', _claim:true });
    return r;
  }
  update(now){ this.t+=16.7; super.update(now); }
  confirm(){
    const r=this.rows[this.sel]; if(!r) return;
    if(r._claim){
      const got=Daily.claim(this.mg && this.mg.club);
      if(got){
        Sfx.record(); Sfx.roar(); Screen.shake(0.5);
        if(typeof Music!=='undefined'){ Music._last=null; Music.play('win'); }
        Daily.bumpStreak();
        const m = this.mg && this.mg.toast;
        if(m) this.mg.toast('코인 +%1 · 경험치 +%2'.replace('%1',got.coin).replace('%2',UIK.n(got.xp)));
      }
      return;
    }
    if(r._done){ Sfx.fail(); if(this.mg&&this.mg.toast) this.mg.toast('오늘은 이미 뛰었습니다'); return; }
    /* 아케이드로 — 끝나면 기록을 담고 돌아온다 */
    Sfx.ui();
    const back = this.mg ? ST.MANAGER : ST.SELECT;
    G.playForManager(r._e, (res)=>{
      if(res) Daily.record(r._e.id, res.value, res.status);
      G.state = back;
    });
  }
  cancel(){ if(this.mg) this.mg.pop(); else G.state=ST.SELECT; }
  draw(u){
    const d=Daily.load(), tot=Daily.total(d), rw=Daily.reward(d), st=Daily.streak();
    if(this.mg) UIK.resourceBar(u, 0, [{ value:Math.round(this.mg.club.budget), color:'#ffcf4a', icon:'icon-coin' }]);
    txt(u, K('일일 도전'), VW-30, 3, 11, PAL.gold, 'right', 700);
    /* 오늘 · 연속 */
    const dd=String(d.day);
    txt(u, `${dd.slice(4,6)}/${dd.slice(6,8)}`, 8, 20, 9, PAL.dim, 'left');
    if(st.n>0) txt(u, K('%1일 연속').replace('%1', st.n), 44, 20, 9, PAL.gold, 'left', 700);
    txt(u, K('오늘의 종목 3개 — 한 번씩만'), VW-8, 20, 9, PAL.dim, 'right');
    UI.list(u, this.rows, this.sel, 8, 32, VW-16, 22, 4);
    /* 합계와 보상 */
    const y=VH-58;
    UIK.frame(u, 8, y, VW-16, 30, { glow: d.done?PAL.gold:null });
    txt(u, K('합계'), 16, y+4, 8, PAL.dim, 'left');
    txt(u, UIK.n(tot), 16, y+12, 17, PAL.gold, 'left', 700);
    const bs=22;
    UIK.itemBox(u, VW-118, y+4, bs, { color:'#ffcf4a', qty:rw.coin, icon:'icon-coin' });
    UIK.itemBox(u, VW-88,  y+4, bs, { color:PAL.blue,  qty:rw.xp,   icon:'icon-xp' });
    txt(u, d.claimed ? K('받았습니다') : d.done ? K('받을 수 있습니다') : K('세 종목을 마치면 받습니다'),
        VW-92, y+30, 8, d.claimed?PAL.dim:d.done?PAL.gold:PAL.dim, 'center');  /* ⚠ VW-56 은 영어에서 4px 넘친다(364~484) */
    UI.footer(u, '확인 도전/받기   취소 돌아가기');
  }
}

/* ── 명예의 전당 (49_depth) ─────────────────────────────────
   은퇴한 선수가 남는 자리. 그리고 **신인이 물려받는 자리**.
   ⚠ 전당이 '읽기만 하는 목록'이면 한 번 보고 안 온다. 계승을 여기 붙여
      전당이 곧 다음 세대의 자원이 되게 한다. */
class HallScreen extends Screen0 {
  constructor(mg, rookie){ super(mg); this.rookie=rookie||null; this.t=0; }
  get list(){ return DEPTH.hall(this.mg.club).slice().sort((a,b)=>b.legacy-a.legacy); }
  get rows(){
    const R=this.rookie;
    return this.list.map(r=>{
      const cost=DEPTH.inheritCost(r);
      return { label:`${r.speciesName||''} ${r.name}`,
        sub:`${r.year}년차 은퇴 · ${r.age}세 · Lv.${r.lv} · OVR ${r.ovr} · 금 ${r.gold}`,
        right: R ? K('계승 %1').replace('%1', cost) : String(r.legacy),
        rightColor: R ? ((this.mg.club.budget>=cost)?PAL.gold:PAL.red) : PAL.blue,
        nation:r.nation, _rec:r };
    });
  }
  confirm(){
    const r=this.rows[this.sel]; if(!r || !this.rookie) return;
    const err=DEPTH.inherit(this.mg.club, this.rookie, r._rec);
    if(err){ Sfx.fail(); this.mg.toast(err); return; }
    Sfx.record(); Sfx.roar(); Screen.shake(0.4);
    this.mg.toast('%1의 자질을 물려받았습니다'.replace('%1', r._rec.name));
    this.mg.pop();
  }
  draw(u){
    const C=this.mg.club, hall=this.list;
    const tot=DEPTH.legacyTotal(C), lb=DEPTH.legacyBonus(C);
    UIK.resourceBar(u, 0, [{ value:Math.round(C.budget), color:'#ffcf4a', icon:'icon-coin' }]);
    txt(u, K('명예의 전당'), VW-30, 3, 11, PAL.gold, 'right', 700);
    /* 유산 — 이 클럽이 쌓아 온 역사가 숫자 하나로 */
    UIK.frame(u, 8, 20, VW-16, 26, { glow: tot>0?PAL.gold:null });
    txt(u, K('유산'), 16, 24, 8, PAL.dim, 'left');
    txt(u, UIK.n(tot), 16, 32, 15, PAL.gold, 'left', 700);
    txt(u, K('클럽 전체 성장 +%1%').replace('%1', Math.round(lb.grow*100)),
        VW-16, 24, 9, lb.grow>0?PAL.green:PAL.dim, 'right');
    txt(u, K('전당 %1명').replace('%1', hall.length), VW-16, 35, 9, PAL.dim, 'right');
    if(!hall.length){
      txt(u, K('아직 은퇴한 선수가 없습니다'), VW/2, 96, 12, PAL.dim, 'center');
      txt(u, K('선수가 은퇴하면 이곳에 남고, 신인이 그 자질을 물려받습니다'),
          VW/2, 114, 9, PAL.dim, 'center');
      UI.footer(u, '취소 돌아가기'); return;
    }
    if(this.rookie)
      txt(u, K('%1 이(가) 물려받을 선배를 고르세요').replace('%1', this.rookie.name),
          VW/2, 50, 10, PAL.gold, 'center', 700);
    UI.list(u, this.rows, this.sel, 8, this.rookie?62:50, VW-16, 22, this.rookie?7:8);
    UI.footer(u, this.rookie ? '확인 계승   취소 돌아가기' : '취소 돌아가기');
  }
}

/* ── 감독 (4C_master) ───────────────────────────────────────
   '나'의 화면. 포켓몬의 트레이너 카드, AFK아레나의 플레이어 프로필에 해당한다.

   ⚠ 이 화면의 목적은 자랑이 아니라 **연결**이다. 감독 레벨이 선수 레벨의 상한이고
      코치 자리와 스카우트 지역을 연다 — 그걸 여기서 한눈에 보여 줘야
      "나를 왜 키우나"에 답이 된다. */
class MasterScreen extends Screen0 {
  get hdBg(){ return 'bg-office'; }
  constructor(mg){ super(mg); this.t=0; this.editing=false; }
  get rows(){ return []; }
  update(now){
    this.t+=16.7;
    if(this.editing) return;                       // 이름 입력 중엔 목록을 안 움직인다
    if(Input.pressed('action')){ this.rename(); return; }
    if(Input.pressed('left')||Input.pressed('right')){
      Master.setFace((Master.d.face + (Input.pressed('left')?-1:1) + 8) % 8); Sfx.ui(); return;
    }
    if(Input.pressed('back')){ this.cancel(); }
  }
  rename(){
    /* ⚠ 캔버스 게임이라 글자 입력 UI 가 없다. 브라우저 prompt 를 쓴다 —
       이름을 짓는 건 게임에서 한 번뿐인 일이라 이 정도가 맞다. */
    this.editing = true;
    try{
      const n = window.prompt(K('감독 이름'), Master.d.name || '');
      if(n!==null && n.trim()) { Master.setName(n.trim()); Sfx.record(); }
    }catch(e){}
    this.editing = false;
  }
  cancel(){ if(this.mg) this.mg.pop(); else G.state=ST.TITLE; }
  draw(u){
    const lv=Master.lv(), cp=Master.cp(), nx=Master.nextUnlock();
    /* 배경은 hdBg 로 선언만 한다 — MG.bg 가 게임 레이어를 안 덮고 어둠막만 얹는다.
       ⚠ 여기서 직접 BG.fill 을 부르면 그 뒤에 MG.bg 의 불투명 칠이 덮어 버린다(실측). */

    /* 왼쪽 — 감독 카드 */
    UIK.frame(u, 8, 8, 150, VH-16, { glow:PAL.gold });
    txt(u, K('감독'), 83, 14, 9, PAL.dim, 'center');
    txt(u, Master.name, 83, 26, 15, PAL.gold, 'center', 700);
    /* 얼굴 — 아직 초상 어셋이 없으니 종족 스프라이트를 빌려 쓴다(◀▶ 로 고른다) */
    const faces=['cheetah','greyfox','lynx','bear','horse','hare','monkey','eagle'];
    const sp=faces[(Master.d.face|0)%faces.length];
    if(!Face.draw(u, sp, 83, 86, 58) &&
       !CharHD.draw(u, sp, 83, 108, 0.05, { t:this.t, scale:1.5 })){
      u.fillStyle=PAL.gold; u.fillRect(74, 62, 18, 46);
    }
    txt(u, '◀ ▶', 83, 114, 9, PAL.dim, 'center');
    UIK.lvBadge(u, 14, 14, lv, PAL.gold);
    /* 레벨 진행 */
    UIK.xpBar(u, 16, 130, 134, lv, cp-Master.cpFor(lv), Master.cpFor(lv+1)-Master.cpFor(lv));
    txt(u, K('커리어 점수 %1').replace('%1', UIK.n(cp)), 83, 146, 8, PAL.dim, 'center');
    /* 이력 */
    const c=(typeof Career!=='undefined')?Career.d:{};
    let y=164;
    /* ⛔ 네 줄의 **분모가 서로 달랐다.**
       races/pbs 는 `finishRace` — 내가 **직접 뛴** 판이다(아케이드 + 대회의 '직접' 종목.
       playForManager 가 같은 아케이드 경로를 탄다). golds 는 `finishMeet` — 클럽이
       대회에서 딴 금메달이고 대부분 자동 시뮬레이션이다.
       그걸 라벨 없이 한 칸에 세워 놓으니 '12경기에 금 35개' 로 읽혔다.
       라벨이 스스로 분모를 말하게 한다 — 데이터 무결성 플레이북의 첫 질문이다. */
    for(const [k,v] of [[K('직접 뛴 경기'), c.races||0], [K('개인 최고'), c.pbs||0],
                        [K('대회 금메달'), c.golds||0], [K('마친 시즌'), c.seasons||0]]){
      txt(u, k, 18, y, 8, PAL.dim, 'left');
      txt(u, UIK.n(v), 148, y-1, 10, PAL.white, 'right', 700);
      y+=13;
    }
    /* ⚠ VH-20 은 9-slice 액자의 아래 테두리에 걸린다 — 안쪽으로 들인다 */
    txt(u, K('확인 이름 바꾸기'), 83, VH-26, 8, PAL.dim, 'center');

    /* 오른쪽 — 감독 레벨이 여는 것 */
    UIK.frame(u, 164, 8, VW-172, VH-16);
    txt(u, K('감독 레벨이 여는 것'), VW/2+82, 14, 10, PAL.gold, 'center', 700);
    const rows=[
      { k:K('선수 레벨 상한'), v:'Lv.'+Master.athleteCap(), hot:true },
      { k:K('코치 자리'),      v:Master.coachSlots()+K('명') },
      { k:K('선수단 정원'),    v:Master.squadCap()+K('명') },
      { k:K('스카우트 지역'),  v:Master.scoutRegions()+K('곳') },
    ];
    let ry=34;
    for(const r of rows){
      u.fillStyle='rgba(255,255,255,.05)'; u.fillRect(172, ry, VW-188, 20);
      txt(u, r.k, 180, ry+5, 10, PAL.white, 'left');
      txt(u, r.v, VW-20, ry+4, 12, r.hot?PAL.gold:PAL.blue, 'right', 700);
      ry+=24;
    }
    /* 왜 키워야 하나 — 다음에 열리는 것 */
    if(nx){
      UIK.frame(u, 172, ry+6, VW-188, 40, { glow:PAL.blue });
      txt(u, K('다음 Lv.%1 에서').replace('%1', nx.lv), VW/2+82, ry+12, 9, PAL.dim, 'center');
      txt(u, K(nx.text), VW/2+82, ry+23, 12, PAL.blue, 'center', 700);
      const need=Master.toNext();
      if(need>0) txt(u, K('커리어 점수 %1 더').replace('%1', UIK.n(need)),
                     VW/2+82, ry+52, 9, PAL.dim, 'center');
    }
    txt(u, K('경기를 하면 커리어 점수가 쌓입니다 — 아케이드도, 감독 모드도'),
        VW/2+82, VH-26, 8, PAL.dim, 'center');
    UI.footer(u, '확인 이름 · ◀▶ 얼굴 · 취소 돌아가기');
  }
}

/* ── 종족 도감 (4D_codex) ───────────────────────────────────
   등급 5단계에 '모을 이유'를 준다. 60종족을 격자로 늘어놓고
   본 것 · 데리고 있던 것 · 전당에 올린 것을 구분해 보여 준다.
   ⚠ 안 본 종족은 **실루엣**으로 남긴다 — 비어 있는 칸이 곧 다음 목표다. */
class CodexScreen extends Screen0 {
  get hdBg(){ return 'bg-reward'; }  get hdBgDim(){ return 0.72; }
  constructor(mg){ super(mg); this.t=0; this.tier=5; }   // 전설부터 — 제일 궁금한 칸
  get list(){ return Codex.byTier(this.tier); }
  get rows(){ return this.list; }
  update(now){
    this.t+=16.7;
    const n=this.list.length, COLS=8;
    if(Input.repeat('left',now))  { this.sel=(this.sel+n-1)%n; Sfx.ui(); }
    if(Input.repeat('right',now)) { this.sel=(this.sel+1)%n;   Sfx.ui(); }
    if(Input.pressed('up'))   { this.tier=this.tier>=5?1:this.tier+1; this.sel=0; Sfx.ui(); }
    if(Input.pressed('down')) { this.tier=this.tier<=1?5:this.tier-1; this.sel=0; Sfx.ui(); }
    if(Input.pressed('action')){
      const r = Codex.hasClaim() ? Codex.claimAll(this.mg && this.mg.club) : null;
      if(r){ Sfx.record(); Sfx.roar(); Screen.shake(0.5); this.fxAt=this.t;
             if(this.mg) this.mg.toast('코인 +%1 · 전원 훈련 포인트 +%2'
               .replace('%1', r.coin).replace('%2', r.tp)); }
      else Sfx.fail();
    }
    if(Input.pressed('back')) this.cancel();
  }
  cancel(){ if(this.mg) this.mg.pop(); else G.state=ST.TITLE; }
  draw(u){
    const T=Codex.totals(), R=(typeof RARITY!=='undefined')?RARITY[this.tier]:{name:'',color:PAL.white};
    if(this.mg) UIK.resourceBar(u, 0, [{ value:Math.round(this.mg.club.budget), color:'#ffcf4a', icon:'icon-coin' }]);
    /* ⚠ VW-8 에 오른쪽 정렬하면 일시정지 아이콘과 겹친다(실측). 아이콘 폭만큼 비운다 */
    txt(u, K('종족 도감'), VW-26, 3, 11, PAL.gold, 'right', 700);
    /* 전체 진행
       ⛔ 자리를 8·32·92·140 으로 **박아 뒀다.** 한국어('등록' 2글자)로는 맞았지만
          영어('Collected')는 43px 라 값 위로 올라타 'Colle30d / 60' 이 됐다
          (2026-08-31 감독모드 캡처). 낱말 길이는 언어마다 다르다 —
          **재서 이어 놓는다.** 박은 자리는 번역이 들어오는 순간 반드시 깨진다. */
    const adv = (s2, size, weight) => {
      try{ u.font = `${weight||400} ${size}px "Galmuri11","Nanum Gothic Coding",monospace`;
           return u.measureText(K(s2)).width; }catch(e){ return String(s2).length*size*0.55; }
    };
    let cx = 8;
    txt(u, K('등록'), cx, 20, 8, PAL.dim, 'left');        cx += adv('등록', 8) + 5;
    const ownedS = `${T.owned} / ${T.total}`;
    txt(u, ownedS, cx, 18, 12, PAL.gold, 'left', 700);    cx += adv(ownedS, 12, 700) + 10;
    const seenS = K('본 것 %1').replace('%1', T.seen);
    /* ⛔ 넷을 한 줄에 이어 놓으면 **오른쪽 등급 탭 위로 밀고 들어간다**(실측: 'Hall 0' 이
       'Common' 탭을 25px 물었다). 벽을 세워 자르면 이번엔 **말없이 사라진다** —
       잘라서 없애는 건 겹침을 고친 게 아니라 정보를 버린 것이다.
       셋만 첫 줄에 두고 '전당'은 아래 줄로 내린다(격자는 y50 부터라 비어 있다). */
    const WALL = VW - 8 - 4*62 - 58;
    if(cx + adv(seenS, 9) <= WALL - 4) txt(u, seenS, cx, 20, 9, PAL.dim, 'left');
    txt(u, K('전당 %1').replace('%1', T.hall), 8, 32, 9, PAL.blue, 'left');
    /* 등급 탭 — ▲▼ 로 옮긴다.
       ⚠ 이름을 칸 가운데, 개수를 칸 오른쪽 끝에 두면 **영어 이름이 길어질 때 서로 문다**
         ('Elite' 와 '12/18' 이 3px 겹쳤다). 이름은 왼쪽, 개수는 오른쪽 — 층을 나눈다. */
    for(let t2=1;t2<=5;t2++){
      const on=t2===this.tier, c=Codex.countTier(t2);
      const rr=(typeof RARITY!=='undefined')?RARITY[t2]:{name:'',color:PAL.white};
      const x=VW-8-(5-t2)*62;
      UIK.tab(u, x-58, 16, 58, 15, '', on);
      txt(u, K(rr.name), x-54, 19, 8, on?rr.color:PAL.dim, 'left', on?700:400);
      txt(u, `${c.owned}/${c.total}`, x-5, 21, 7,
          (c.owned>=c.total&&c.total)?PAL.green:PAL.dim, 'right');
    }
    /* ── 격자 ─────────────────────────────────────────────
       ⚠ 전설은 5종뿐이라 한 줄로 끝난다. 위에 붙여 그리면 아래가 통째로 빈다 —
          줄 수에 맞춰 세로 가운데로 내린다. */
    /* ⛔ 챕터 3 — **격자가 내용에 맞춰 큰다.**
       8칸 고정이라 전설(5종)·흔함(7종) 을 볼 때 카드 다섯 개가 가운데 띠에만 있고
       화면의 위아래 3분의 2가 비었다. 60종 스프라이트가 아까운 자리다.
       종 수가 적으면 칸을 줄이고 카드를 키운다 — 같은 공간에 그림이 크게 들어간다. */
    const list=this.list;
    const COLS = list.length<=6 ? Math.max(3, list.length)
               : list.length<=12 ? 6 : 8;
    const top=36, bot=VH-46;
    const gapX0=6, gapY=6;
    const cw = Math.floor((VW-16-(COLS-1)*gapX0)/COLS);
    const rows=Math.ceil(list.length/COLS);
    /* 높이는 남는 공간을 나눠 갖되 카드 비율(가로:세로 ≈ 54:46)을 넘지 않게 */
    const ch = Math.min(Math.floor(cw*0.85),
                        Math.floor((bot-top-(rows-1)*gapY)/rows));
    const gapX=gapX0, gh=rows*ch+(rows-1)*gapY;
    const gy=top + Math.max(0, (bot-top-gh)/2), gx=8;
    list.forEach((sp,i)=>{
      const c=i%COLS, r=(i/COLS)|0;
      const x=gx+c*(cw+gapX), y=gy+r*(ch+gapY);
      if(y+ch > bot+4) return;
      const owned=!!Codex.d.owned[sp], seen=!!Codex.d.seen[sp], hall=!!Codex.d.hall[sp];
      UIK.card(u, x, y, cw, ch, owned?R.color:'#39415a',
                { on:i===this.sel, tier: owned ? this.tier : 0 });
      if(owned){
        /* 등급 발광을 그대로 쓴다 — 전설은 카드 안에서도 빛난다 */
        if(!CharHD.draw(u, sp, x+cw/2, y+ch-9, 0.05, { t:this.t+i*220, scale:0.74, rare:this.tier })){
          u.fillStyle=R.color; u.fillRect(x+cw/2-6, y+12, 12, 22);
        }
        txt(u, K(SPECIES[sp].name), x+cw/2, y+ch-9, 8, PAL.white, 'center');
        if(hall) txt(u, '★', x+cw-7, y+2, 9, PAL.gold, 'center', 700);
      } else if(seen){
        /* 본 적은 있다 — **까만 실루엣**으로.
           ⚠ 처음엔 globalAlpha 0.3 만 걸었다. CharHD 가 발광 때문에 같은 그림을
              두세 번 겹쳐 그려서 실제로는 0.66 이 됐고, 화면에서 보유와 구분이 안 갔다.
              filter 로 아예 색을 죽인다. rare:0 을 함께 넘겨 겹쳐 그리기도 막는다. */
        u.save();
        u.filter='grayscale(1) brightness(0.28)'; u.globalAlpha=0.85;
        if(!CharHD.draw(u, sp, x+cw/2, y+ch-9, 0.05, { t:0, scale:0.74, rare:0 })){
          u.fillStyle='#2b3245'; u.fillRect(x+cw/2-6, y+12, 12, 22);
        }
        u.restore();
        txt(u, K(SPECIES[sp].name), x+cw/2, y+ch-9, 8, PAL.dim, 'center');
      } else {
        txt(u, '?', x+cw/2, y+ch/2-9, 18, '#333c52', 'center', 700);
      }
    });
    /* ── 아래 띠 ───────────────────────────────────────────
       이 화면의 값은 '등급 완성'이 아니라 **등록 수**다.
       ⚠ 실측(tools/codex_fill.js): 40시즌을 굴려도 등급 완성은 흔함 27% · 전설 3%.
          완성만 보상하면 죽은 콘텐츠가 된다. 그래서 마릿수 이정표를 앞에 세운다. */
    const nx=Codex.nextMilestone(), can=Codex.hasClaim();
    UIK.frame(u, 8, VH-42, VW-16, 34, { glow: can?PAL.gold:null });
    /* ⚠ 띠 안은 **두 줄뿐**이다(VH-39 라벨 · VH-29 값). 세 줄째를 쓰면 액자 밖으로
       나가 잘린다 — 실측으로 '종족당 +0.3%' 와 '30 / 36' 두 줄을 잃었다.
       그래서 셋째 줄에 있던 것은 전부 첫째 줄 라벨 안으로 접어 넣는다. */
    /* ① 등록 수가 곧 영구 성장 보너스 */
    /* ⚠ 이 라벨은 mx(=100) 에서 시작하는 '다음 이정표' 와 같은 줄이다 —
       영어로 133px 이 되어 두 줄이 겹쳐 '+0N3xtpmelaspecies' 로 보였다. 짧게 옮긴다. */
    txt(u, K('영구 성장 +0.3%/종'), 16, VH-37, 7, PAL.dim, 'left');
    txt(u, '+' + (Codex.growBonus().grow*100).toFixed(1) + '%', 16, VH-30, 13, PAL.green, 'left', 700);
    /* ② 다음 이정표 */
    const mx=118, bw=100;   /* ⚠ 100 은 영어 'Growth +0.3% / species'(16~102) 와 겹친다 */
    if(nx){
      const prev=(Codex.MILESTONES.filter(m=>m.n<=T.owned).pop()||{n:0}).n;
      const p=clamp((T.owned-prev)/Math.max(1,nx.n-prev), 0, 1);
      txt(u, K('다음 이정표') + `  ${T.owned} / ${nx.n}`, mx, VH-37, 7, PAL.dim, 'left');
      u.fillStyle='rgba(255,255,255,.12)'; u.fillRect(mx, VH-27, bw, 8);
      u.fillStyle=PAL.gold; u.fillRect(mx, VH-27, Math.round(bw*p), 8);
      u.strokeStyle='rgba(255,255,255,.20)'; u.lineWidth=1; u.strokeRect(mx+.5, VH-26.5, bw-1, 7);
      UIK.itemBox(u, mx+bw+7,  VH-39, 18, { color:'#ffcf4a', qty:nx.coin, icon:'icon-coin' });
      UIK.itemBox(u, mx+bw+29, VH-39, 18, { color:PAL.gold,  qty:nx.tp,   icon:'icon-tp' });
      /* ⚠ 훈련 포인트는 **한 명당**이다. 그냥 ×4 라고만 쓰면 총합으로 읽힌다
         (실측: 선수 10명 화면에서 ×4 를 받았더니 합계가 120 늘었다) */
      txt(u, K('1인당'), mx+bw+38, VH-19, 6, PAL.dim, 'center');
    } else txt(u, K('전 종족 등록 완료'), mx, VH-32, 11, PAL.gold, 'left', 700);
    /* ③ 받기 */
    if(can){
      const pend=Codex.pendingMilestones().length + Codex.pendingTiers().length;
      txt(u, K('받을 보상 %1건').replace('%1', pend), VW-16, VH-37, 7, PAL.dim, 'right');
      txt(u, K('확인 — 받기'), VW-16, VH-29, 11, PAL.gold, 'right', 700);
    } else txt(u, K('모으면 자동으로 쌓입니다'), VW-16, VH-29, 8, PAL.dim, 'right');
    if(this.fxAt!==undefined && this.t-this.fxAt<900)
      BG.fx(u, 'fx-item-get', VW/2, VH-22, 40, clamp((this.t-this.fxAt)/900,0,0.999), 4);
    UI.footer(u, '◀▶ 고르기 · ▲▼ 등급 · 확인 보상 · 취소 뒤로');
  }
}

/* ── 시설 (4F_facility) ─────────────────────────────────────
   쌓인 코인을 영구 성장으로 바꾸는 자리.
   ⚠ 실측(tools/economy.js): 20시즌 뒤 자금이 1,529 까지 **놀고 있었다.**
      코인을 쓸 곳이 모자랐다. 그리고 클럽은 9년차부터 쇠퇴한다 —
      유소년 아카데미가 그 자리를 민다. */
class FacilityScreen extends Screen0 {
  get hdBg(){ return 'bg-office'; }  get hdBgDim(){ return 0.78; }
  constructor(mg){ super(mg); this.t=0; FACIL.ensure(mg.club); }
  get rows(){
    const C=this.mg.club;
    return FACIL.ids().map(id=>{
      /* ⛔ 여기 지역변수 이름이 `K` 라 **전역 번역함수 K() 가 가려져** 있었다.
         그래서 이 안에서는 아무것도 번역할 수 없었고, 대신 레벨별 라벨
         ('훈련장  ○○○○○')을 손으로 번역표에 넣어 뒀다 — 1단계부터 안 맞는다.
         이름만 번역하고 동그라미는 코드가 붙인다. 손으로 맞추는 목록을 없앤다. */
      const KD=FACIL.KINDS[id], l=FACIL.lv(C,id), cost=FACIL.nextCost(C,id);
      const max = l>=FACIL.MAX;
      /* ⛔ 챕터 10 — 한 목록이 **두 언어**로 말하고 있었다.
         지은 시설은 숫자로(`성장 +7.0% → +10.5%`), 안 지은 시설은 문장으로
         (`컨디션이 잘 오른다`). 80코인을 어디에 쓸지 고르려면 비교가 돼야 하는데
         문장과 숫자는 비교가 안 된다. **전부 숫자로 말하게 한다** —
         안 지은 줄은 1단계가 주는 것을 그대로 보여 준다.
         문장(desc)은 버리지 않는다. 머리말 자리에서 **고른 줄에 대해서만** 말한다. */
      return { label:`${K(KD.name)}  ${'●'.repeat(l)}${'○'.repeat(FACIL.MAX-l)}`, icon:KD.icon, subAlways:true,
        sub: l ? `${KD.line(l)}${max?'':`  →  ${KD.nums ? KD.nums(l+1) : KD.line(l+1)}`}` : KD.line(1),
        right: max ? '최대' : `−${cost}`,
        rightColor: max ? PAL.green : ((C.budget>=cost) ? PAL.gold : PAL.dim),
        color: max ? PAL.green : ((C.budget>=cost) ? PAL.white : PAL.dim),
        _id:id, _lv:l, _max:max };
    });
  }
  confirm(){
    const r=this.rows[this.sel]; if(!r) return;
    const why = FACIL.canBuild(this.mg.club, r._id);
    if(why){ Sfx.fail(); this.mg.toast(K(why)); return; }
    const K2=FACIL.KINDS[r._id];
    FACIL.build(this.mg.club, r._id);
    Sfx.record(); Screen.shake(0.35); this.fxAt=this.t;
    this.mg.toast('%1 %2단계'.replace('%1',K2.name).replace('%2',FACIL.lv(this.mg.club,r._id)));
  }
  draw(u){
    this.t+=16.7;
    const C=this.mg.club;
    UIK.resourceBar(u, 0, [{ value:Math.round(C.budget), color:'#ffcf4a', icon:'icon-coin' }]);
    txt(u, K('시설'), VW-26, 3, 11, PAL.gold, 'right', 700);
    /* 머리말은 늘 같은 안내문이었다(36자). 화면 이름·코인 막대·줄의 `−80`이
       이미 '코인을 쓴다'를 말한다 — 그 자리를 **지금 고른 시설이 뭐 하는 것인지**에 준다. */
    { const r0 = this.rows[this.sel], kd = r0 && FACIL.KINDS[r0._id];
      /* txt() 가 알아서 K() 를 태운다 — 여기서 또 감싸면 이중 번역이 된다 */
      if(kd) txt(u, kd.desc, 8, 20, 9, PAL.dim, 'left'); }
    /* ⚠ 26 줄높이로 5줄이면 화면 아래 40% 가 빈다(시설은 딱 5종이라 늘 5줄이다).
       줄을 키워 화면을 채운다 — 육성 카드 격자에서 배운 것과 같다. */
    UI.list(u, this.rows, this.sel, 8, 34, VW-16, 36, 5);
    /* 아래 — 지금 클럽이 받고 있는 총합. 시설이 '뭘 해 주고 있나'를 한 곳에 */
    const B=FACIL.bonus(C);
    UIK.frame(u, 8, VH-42, VW-16, 34, {});
    /* '영구·전원 적용'은 머리말에서 빠졌으니 여기서 못 박는다 — 이 상자가 총합이다 */
    txt(u, K('지금 받는 것 · 클럽에 영구'), 16, VH-37, 8, PAL.dim, 'left');
    const bits=[];
    if(B.grow)   bits.push(K('성장 +%1%').replace('%1',(B.grow*100).toFixed(1)));
    /* ⚠ 줄은 `부상 −9%`(U+2212), 여기는 `부상 -9%`(ASCII) 였다 — 같은 값이 두 글리프로
       나왔다. 부호를 직접 쓰고 크기만 넘긴다. */
    if(B.hurt)   bits.push(K('부상률 −%1%').replace('%1',Math.abs(B.hurt*100).toFixed(0)));
    if(B.rest)   bits.push(K('회복 +%1').replace('%1',B.rest.toFixed(1)));
    if(B.cond)   bits.push(K('컨디션 +%1').replace('%1',B.cond.toFixed(1)));
    if(B.conf)   bits.push(K('스카우트 +%1%').replace('%1',(B.conf*100).toFixed(0)));
    if(B.rookie) bits.push(K('신인 자질 +%1%').replace('%1',(B.rookie*100).toFixed(1)));
    txt(u, bits.length? bits.join('  ·  ') : K('아직 아무것도 짓지 않았습니다'),
        16, VH-26, 10, bits.length?PAL.green:PAL.dim, 'left');
    if(this.fxAt!==undefined && this.t-this.fxAt<900)
      BG.fx(u, 'fx-levelup', VW/2, VH-20, 40, clamp((this.t-this.fxAt)/900,0,0.999), 4);
    UI.footer(u, '확인 짓기 · 취소 뒤로');
  }
}
