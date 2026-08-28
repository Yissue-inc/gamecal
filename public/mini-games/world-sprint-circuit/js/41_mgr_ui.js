/* ══════════════════════════════════════════════════════════════════
   감독 모드 화면 — 목록 + 커서. 조작은 ▲▼◀▶·확인·취소 여섯 개뿐이다.
   (그래야 키보드와 화면버튼이 같은 코드로 돈다)
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 공용 그리기 조각 ------------------------------------------------ */
const UI = {
  header(u, title, right){
    plate(u, 0, 0, VW, 22, 0.86);
    txt(u, title, 8, 5, 13, PAL.gold, 'left', 700);
    if(right) txt(u, right, VW-8, 6, 11, PAL.dim, 'right');
    u.fillStyle='rgba(255,215,94,.35)'; u.fillRect(0,22,VW,1);
  },
  footer(u, hint){
    plate(u, 0, VH-16, VW, 16, 0.86);
    txt(u, hint, VW/2, VH-13, 9, PAL.dim, 'center');
  },
  /* 커서가 달린 세로 목록. rows = [{label, sub, right, color, dim}] */
  list(u, rows, sel, x, y, w, rowH, maxRows){
    const n = Math.min(rows.length, maxRows);
    const first = clamp(sel - (maxRows>>1), 0, Math.max(0, rows.length-maxRows));
    for(let i=0;i<n;i++){
      const idx = first+i, r = rows[idx]; if(!r) break;
      const ry = y + i*rowH, on = idx===sel;
      u.fillStyle = on ? 'rgba(255,215,94,.20)' : (i%2 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.22)');
      u.fillRect(x, ry, w, rowH-1);
      u.fillStyle='rgba(255,255,255,.07)'; u.fillRect(x, ry+rowH-1, w, 1);
      if(on){ u.fillStyle=PAL.gold; u.fillRect(x, ry, 2, rowH-1); }
      /* 국기 — 목록에서 소속이 바로 보여야 한다 */
      let lx = x+8;
      if(r.nation && typeof drawFlag==='function'){
        drawFlag(u, x+7, ry+5, 13, 9, r.nation); lx = x+25;
      }
      txt(u, r.label, lx, ry+2, 11, r.dim?PAL.dim:(r.color||PAL.white), 'left', on?700:400);
      if(r.sub)   txt(u, r.sub,   lx, ry+13, 8, PAL.dim);
      if(r.right) txt(u, r.right, x+w-8, ry+4, 10, r.rightColor||PAL.white, 'right');
      if(r.right2)txt(u, r.right2,x+w-8, ry+15, 8, PAL.dim, 'right');
    }
    if(rows.length > maxRows){
      const th = Math.max(8, (maxRows/rows.length)*(rowH*maxRows));
      const tp = (first/Math.max(1,rows.length-maxRows))*(rowH*maxRows - th);
      u.fillStyle='rgba(255,255,255,.10)'; u.fillRect(x+w-2, y, 2, rowH*maxRows);
      u.fillStyle='rgba(255,215,94,.6)';  u.fillRect(x+w-2, y+tp, 2, th);
    }
    return first;
  },
  /* 가로 막대 게이지 */
  bar(u, x, y, w, h, v, max, color, bg){
    u.fillStyle = bg||'rgba(255,255,255,.12)'; u.fillRect(x,y,w,h);
    u.fillStyle = color; u.fillRect(x,y,Math.round(w*clamp(v/max,0,1)),h);
  },
  /* 라벨 칸 폭 — 언어마다 글자 길이가 다르다.
     ⚠ 42px 로 못 박아 뒀더니 영어판에서 'Acceleration' 이 막대를 파고들었다(실측).
        지금 언어의 가장 긴 라벨을 재서 칸을 잡는다. */
  /* ⚠ 캐시를 하나만 두면 스탯 칸과 상태 칸이 같은 폭을 쓴다. 목록별로 따로 잰다. */
  _lw: {}, _lwLang: null,
  labelW(u, names, size, min){
    if(this._lwLang !== LANG){ this._lw = {}; this._lwLang = LANG; }
    const ck = (size||9)+'|'+names.join('\u0001');
    if(this._lw[ck] !== undefined) return this._lw[ck];
    let m = min||42;
    u.save(); u.font = `${size||9}px Galmuri11, monospace`;
    for(const n of names){
      const t = (typeof K==='function') ? K(n) : n;
      m = Math.max(m, Math.ceil(u.measureText(t).width) + 6);
    }
    u.restore();
    this._lw[ck] = m;
    return m;
  },
  /* 스탯 한 줄: 이름 · 현재/잠재 막대 */
  statRow(u, x, y, w, key, cur, pot){
    txt(u, STAT_NAME[key], x, y, 9, PAL.dim);
    const LW = this.labelW(u, STAT_KEYS.map(k=>STAT_NAME[k]), 9, 42);
    const bx = x+LW, bw = w-LW-30;
    u.fillStyle='rgba(255,255,255,.10)'; u.fillRect(bx,y+2,bw,7);
    u.fillStyle='rgba(90,170,255,.30)';  u.fillRect(bx,y+2,Math.round(bw*pot/100),7);  // 잠재
    const c = cur>=pot-0.5 ? PAL.green : PAL.gold;
    u.fillStyle=c; u.fillRect(bx,y+2,Math.round(bw*cur/100),7);
    txt(u, Math.round(cur)+'', x+w, y, 9, c, 'right');
  },
  cond(v){ return v>=80?PAL.green : v>=60?PAL.gold : v>=40?'#ffa04c' : PAL.red; },
  /* 등급 — 색과 별로 표시한다. 숫자보다 눈에 먼저 들어와야 한다. */
  rareColor(a){ const r=(typeof rarityOf==='function')?rarityOf(a):1;
    return (typeof RARITY!=='undefined' && RARITY[r]) ? RARITY[r].color : PAL.dim; },
  rareName(a){ const r=(typeof rarityOf==='function')?rarityOf(a):1;
    return (typeof RARITY!=='undefined' && RARITY[r]) ? RARITY[r].name : ''; },
  rareStars(a){ const r=(typeof rarityOf==='function')?rarityOf(a):1;
    return '★'.repeat(r)+'☆'.repeat(5-r); },
  condName(v){ return v>=85?'최상' : v>=70?'좋음' : v>=55?'보통' : v>=40?'나쁨' : '최악'; },
};

/* 화면 기반 클래스 ------------------------------------------------ */
class Screen0 {
  constructor(mg){ this.mg=mg; this.sel=0; }
  get rows(){ return []; }
  move(d){ const n=this.rows.length; if(!n) return; this.sel=(this.sel+d+n)%n; Sfx.ui(); }
  update(now){
    if(Input.repeat('up',now))   this.move(-1);
    if(Input.repeat('down',now)) this.move(1);
    if(Input.pressed('action'))  this.confirm();
    if(Input.pressed('back'))    this.cancel();
  }
  confirm(){} cancel(){ this.mg.pop(); }
}

/* ── 사무실(허브) ────────────────────────────────────────── */
class OfficeScreen extends Screen0 {
  get rows(){
    const S=this.mg.season, meetW=S.nextMeetWeek;
    const r=[
      { label:'훈련 지시', sub:`이번 주 직접 지도 ${Object.keys(this.mg.focus).length} / 3`, right:'▶' },
      { label:'선수단',   sub:`${this.mg.club.squad.length}명 · 부상 ${this.mg.club.squad.filter(a=>a.injury).length}명`, right:'▶' },
      /* 육성(46_rpg) — 포인트가 남아 있으면 눈에 띄게 */
      (()=>{ const tp=this.mg.club.squad.reduce((s,a)=>s+(a.tp||0),0);
             const inv=(this.mg.club.inventory||[]).length;
             return { label:'육성', sub:`훈련 포인트 ${tp} · 창고 ${inv}개`,
                      right: tp>0?'●'+tp:'▶', rightColor: tp>0?PAL.gold:PAL.dim,
                      color: tp>0?PAL.gold:undefined }; })(),
      { label:'팀 프로그램', sub:PROGRAMS[this.mg.club.program].name+' — '+PROGRAMS[this.mg.club.program].desc, right:'▶' },
      /* 코치진(49_depth) — 뽑으면 그 분야가 잘 자란다. 주급을 먹는다. */
      (()=>{ const n=(typeof DEPTH!=='undefined')?DEPTH.hired(this.mg.club).length:0;
             const w=(typeof DEPTH!=='undefined')?DEPTH.wageBill(this.mg.club):0;
             return { label:'코치진', sub:n? `${n}명 · 주급 ${w}` : '아직 없음 — 분야별로 3명까지', right:'▶' }; })(),
      { label:'선수 사무소', sub:`자금 ${Math.round(this.mg.club.budget)} · 스카우트·영입·이적`, right:'▶' },
      { label:'기록실',   sub:'클럽 기록과 대회 이력', right:'▶' },
      { label:'리그 순위표', sub:leagueSub(S), right:'▶' },
    ];
    if(S.isMeetWeek) r.push({ label:`▶ ${MEET_INFO[S.meetKind].name} 출전`, sub:'출전표를 짜고 경기를 본다',
                              color:PAL.green, right:'!' });
    else r.push({ label:'다음 주로', sub: meetW? `${meetW}주차 대회까지 ${meetW-S.week}주` : '시즌 마무리', right:'▶' });
    return r;
  }
  confirm(){
    const S=this.mg.season;
    switch(this.sel){
      case 0: this.mg.push(new TrainScreen(this.mg)); break;
      case 1: this.mg.push(new SquadScreen(this.mg)); break;
      case 2: this.mg.push(new GrowPickScreen(this.mg)); break;
      case 3: this.mg.push(new ProgramScreen(this.mg)); break;
      case 4: this.mg.push(new CoachScreen(this.mg)); break;
      case 5: this.mg.push(new MarketScreen(this.mg)); break;
      case 6: this.mg.push(new RecordScreen(this.mg)); break;
      case 7: this.mg.push(new LeagueScreen(this.mg)); break;
      case 8: S.isMeetWeek ? this.mg.push(new EntryScreen(this.mg)) : this.mg.nextWeek(); break;
    }
  }
  cancel(){}
  draw(u){
    const S=this.mg.season, C=this.mg.club;
    /* 국기 + 클럽 이름 — 우리가 어느 나라인지 매 화면에 있어야 한다 */
    UI.header(u, `${C.name}`, `${C.year}년차 · ${S.week} / 24주`);
    if(C.nation && typeof drawFlag==='function') drawFlag(u, VW/2-11, 4, 22, 15, C.nation);
    /* 올림픽 카운트다운 — 감독의 4년은 '다음 올림픽까지 남은 시간'이다 */
    if(S.isOlympicYear){
      txt(u, `${olympicName(C.year)} — 올해다`, VW/2, 40, 10, PAL.gold, 'center', 700);
    } else {
      /* ⚠ 대회 이름을 문장 안에 넣으면 번역 자리표(%1)가 숫자만 접기 때문에 매칭이 깨진다.
         이름은 이름대로, 문장은 문장대로 넘긴다. */
      txt(u, olympicName(C.year + S.yearsToOlympics) + ' · ' + K('%1년 뒤').replace('%1', S.yearsToOlympics),
          VW/2, 40, 9, PAL.dim, 'center');
    }
    // 주차 스트립 — 대회가 언제인지 한눈에
    const sx=8, sw=VW-16, cw=sw/24;
    for(let w=1;w<=24;w++){
      const x=sx+(w-1)*cw;
      const isMeet=!!MEET_WEEKS[w], past=w<S.week, cur=w===S.week;
      u.fillStyle = cur ? PAL.gold : isMeet ? (past?'rgba(92,255,156,.4)':PAL.green) : (past?'rgba(255,255,255,.22)':'rgba(255,255,255,.09)');
      u.fillRect(x+1, 28, cw-2, isMeet?9:6);
    }
    txt(u,'■ 대회 주',VW-8,39,8,PAL.green,'right');
    /* 시즌 목표 — 감독이 무엇으로 평가받는지 늘 보여야 한다 */
    if(S.goal){
      const okP=S.points>=S.goal.points, okG=S.medals.gold>=S.goal.gold;
      txt(u, `목표 승점 ${S.goal.points} · 금 ${S.goal.gold}`, 8, 40, 9,
          (okP&&okG)?PAL.green:PAL.dim, 'left');
      txt(u, `${S.points} / ${S.medals.gold}`, 108, 40, 9,
          (okP&&okG)?PAL.green:(okP||okG)?PAL.gold:PAL.red, 'left', 700);
    }

    // 요약 카드
    const avgC = C.squad.reduce((s,a)=>s+a.condition,0)/C.squad.length;
    const avgF = C.squad.reduce((s,a)=>s+a.fatigue,0)/C.squad.length;
    plate(u, 8, 50, VW-16, 28, .78);
    const inj=C.squad.filter(a=>a.injury);
    const cells=[
      ['자금', String(Math.round(C.budget)), C.budget<20?PAL.red:PAL.gold],
      ['승점', String(S.points), PAL.white],
      ['메달', `${S.medals.gold}·${S.medals.silver}·${S.medals.bronze}`, PAL.white],
      ['컨디션', UI.condName(avgC), UI.cond(avgC)],
      ['피로', Math.round(avgF)+'', avgF>65?PAL.red:avgF>45?PAL.gold:PAL.green],
      ['부상', inj.length?`${inj.length}명`:'없음', inj.length?PAL.red:PAL.green],
    ];
    cells.forEach((c,i)=>{
      const cx=16+i*Math.floor((VW-32)/cells.length);
      txt(u,c[0],cx,54,8,PAL.dim);
      txt(u,c[1],cx,64,12,c[2],'left',700);
    });

    UI.list(u, this.rows, this.sel, 8, 82, VW-16, 22, 6);
    // 지난주 일지 — 비어 있으면 안내를 띄운다(빈 화면은 고장처럼 보인다)
    const log=this.mg.lastLog;
    plate(u, 8, VH-58, VW-16, 40, .55);
    if(log && log.length){
      txt(u,'지난주',14,VH-56,8,PAL.dim);
      log.slice(0,3).forEach((e,i)=>
        txt(u, e.msg, 14, VH-46+i*11, 9,
          e.t==='injury'?PAL.red : e.t==='break'?PAL.green : e.t==='slump'?'#ffa04c' : PAL.white));
    } else {
      txt(u,'감독 노트',14,VH-56,8,PAL.dim);
      txt(u,'매주 3명까지 직접 지도할 수 있습니다. 나머지는 팀 프로그램대로 훈련합니다.',14,VH-46,9,PAL.white);
      txt(u,'피로가 쌓이면 성장이 멈추고 부상이 급증합니다 — 대회 직전엔 쉬게 하세요.',14,VH-35,9,PAL.dim);
    }
    UI.footer(u, '▲▼ 이동   확인 선택');
  }
}

/* ── 훈련 지시 ───────────────────────────────────────────── */
class TrainScreen extends Screen0 {
  constructor(mg){ super(mg); this.pick=null; }
  get squad(){ return this.mg.club.squad; }
  get rows(){
    return this.squad.map(a=>{
      const f=this.mg.focus[a.id];
      return {
        label: (a.national?'★ ':'') + `${a.speciesName} ${a.name}` + (a.injury?' (부상)':''), nation:a.nation,
        sub: `${a.spec==='sprint'?'단거리':a.spec==='hurdles'?'허들':a.spec==='jump'?'도약':'투척'} · OVR ${a.overall} · 피로 ${Math.round(a.fatigue)}`,
        right: f ? FOCUS[f].name : '—',
        rightColor: f ? PAL.gold : PAL.dim,
        right2: `컨디션 ${UI.condName(a.condition)}`,
        color: a.injury ? PAL.red : PAL.white,
      };
    });
  }
  confirm(){
    const a=this.squad[this.sel];
    this.mg.push(new FocusPickScreen(this.mg, a));
  }
  draw(u){
    const used=Object.keys(this.mg.focus).length;
    UI.header(u, '훈련 지시', `직접 지도 ${used} / 3`);
    txt(u, '지도하지 않은 선수는 팀 프로그램대로 훈련합니다', 8, 27, 9, PAL.dim);
    txt(u, `팀 프로그램: ${PROGRAMS[this.mg.club.program].name}`, 8, 38, 9, PAL.blue);
    UI.list(u, this.rows, this.sel, 8, 52, VW-16, 26, 6);
    UI.footer(u, '확인 지도 지정   취소 돌아가기');
  }
}
class FocusPickScreen extends Screen0 {
  constructor(mg, a){ super(mg); this.a=a; this.keys=Object.keys(FOCUS); }
  get rows(){
    return this.keys.map(k=>{
      const F=FOCUS[k];
      const cur = F.stat ? this.a.stats[F.stat] : null;
      const pot = F.stat ? this.a.potential[F.stat] : null;
      return { label:F.name,
        sub: F.stat ? `${Math.round(cur)} / ${pot}${cur>=pot-0.5?' (한계)':''}` :
             (k==='rest'?'피로를 크게 회복한다':'부상 회복이 2배 빨라진다'),
        right: F.load>0 ? `부하 +${F.load.toFixed(1)}` : `회복 ${F.load.toFixed(1)}`,
        rightColor: F.load>0 ? (F.load>1.4?PAL.red:PAL.gold) : PAL.green,
        dim: F.stat && cur>=pot-0.5 };
    }).concat([{ label:'지도 안 함', sub:'팀 프로그램대로', right:'—', rightColor:PAL.dim }]);
  }
  confirm(){
    const used=Object.keys(this.mg.focus);
    if(this.sel >= this.keys.length){ delete this.mg.focus[this.a.id]; Sfx.ui(); this.mg.pop(); return; }
    if(!this.mg.focus[this.a.id] && used.length>=3){ this.mg.toast('직접 지도는 주당 3명까지'); Sfx.fail(); return; }
    this.mg.focus[this.a.id]=this.keys[this.sel]; Sfx.ui(); this.mg.pop();
  }
  draw(u){
    const a=this.a;
    UI.header(u, a.name, `OVR ${a.overall} / 잠재 ${a.potOverall}`);
    txt(u, `컨디션 ${UI.condName(a.condition)}`, 8, 27, 9, UI.cond(a.condition));
    txt(u, `피로 ${Math.round(a.fatigue)}`, 96, 27, 9, a.fatigue>65?PAL.red:PAL.dim);
    if(a.injury) txt(u, `부상: ${a.injury.name} (${a.injury.weeks}주)`, 160, 27, 9, PAL.red);
    UI.list(u, this.rows, this.sel, 8, 40, VW-16, 22, 8);
    UI.footer(u, '확인 지정   취소 돌아가기');
  }
}

/* ── 팀 프로그램 ─────────────────────────────────────────── */
class ProgramScreen extends Screen0 {
  constructor(mg){ super(mg); this.keys=Object.keys(PROGRAMS);
    this.sel=Math.max(0,this.keys.indexOf(mg.club.program)); }
  get rows(){ return this.keys.map(k=>{
    const P=PROGRAMS[k];
    const top=Object.entries(P.w).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>STAT_NAME[e[0]]).join('·');
    return { label:P.name, sub:P.desc, right:`부하 ${P.load.toFixed(2)}`,
      rightColor:P.load>1.1?PAL.red:P.load<0.9?PAL.green:PAL.gold, right2:top,
      color: k===this.mg.club.program?PAL.gold:PAL.white };
  }); }
  confirm(){ this.mg.club.program=this.keys[this.sel]; Sfx.ui(); this.mg.pop(); }
  draw(u){
    UI.header(u,'팀 프로그램', '시즌 내내 적용');
    txt(u,'부하가 높으면 빨리 크지만 피로·부상이 늘어납니다',8,27,9,PAL.dim);
    UI.list(u,this.rows,this.sel,8,42,VW-16,26,5);
    UI.footer(u,'확인 선택   취소 돌아가기');
  }
}

/* ── 선수단 · 선수 상세 ──────────────────────────────────── */
/* 피로가 높은 선수에 땀방울 — 목록을 훑을 때 '쉬게 해야 할 사람'이 눈에 띈다 */
function drawSweat(u, a, x, y){
  if(!a || (a.fatigue||0) < 65) return;
  BG.obj(u, 'sweat-drop', x, y, 9);
}

class SquadScreen extends Screen0 {
  get rows(){ return this.mg.club.squad.map(a=>({
    label:(a.national?'★ ':'')+`${UI.rareStars(a)} ${a.speciesName} ${a.name}`, nation:a.nation,
    sub:`${a.age}세 · ${UI.rareName(a)} · ${GROWTH[a.growth].name} · ${a.traits.map(t=>TRAITS[t].name).join(', ')||'특성 없음'}`,
    right:`${a.overall} / ${a.potOverall}`, rightColor: a.overall>=a.potOverall-2?PAL.green:PAL.gold,
    right2: a.injury?`부상 ${a.injury.weeks}주`:UI.condName(a.condition),
    color: a.injury?PAL.red:UI.rareColor(a) })); }
  confirm(){ this.mg.push(new AthleteScreen(this.mg, this.mg.club.squad[this.sel])); }
  draw(u){
    UI.header(u,'선수단',`${this.mg.club.squad.length}명`);
    UI.list(u,this.rows,this.sel,8,28,VW-16,26,8);
    /* 피로한 선수는 땀방울로 — 목록에서 '쉬게 해야 할 사람'이 바로 보인다.
       ⚠ 목록은 8줄씩 스크롤되므로 화면에 실제로 그려진 줄만 표시한다. */
    const first = Math.max(0, Math.min(this.sel-3, this.mg.club.squad.length-8));
    this.mg.club.squad.slice(first, first+8).forEach((a,i)=>{
      drawSweat(u, a, VW-16, 28+i*26+9);
    });
    UI.footer(u,'확인 상세   취소 돌아가기');
  }
}
class AthleteScreen extends Screen0 {
  constructor(mg,a){ super(mg); this.a=a; }
  update(now){ if(Input.pressed('back')||Input.pressed('action')) this.mg.pop(); }
  draw(u){
    const a=this.a;
    /* ⚠ 예전엔 헤더의 오른쪽 문구와 등급 줄을 둘 다 VW-8, y≈5 에 우측정렬로 그려
       서로 겹쳤다(한국어에서도 겹쳤고 영어에서 확연해졌다). 한 줄로 합친다. */
    UI.header(u, `${a.speciesName} ${a.name}`, null);
    /* 국기 + 국가명 — 누구를 위해 뛰는지 */
    if(a.nation && typeof drawFlag==='function'){
      drawFlag(u, 8, 26, 20, 14, a.nation);
      txt(u, nationName(a.nation), 32, 28, 9, PAL.dim, 'left');
    }
    txt(u, `${UI.rareStars(a)} ${UI.rareName(a)} · ${a.age}세 · ${GROWTH[a.growth].name}`,
        VW-8, 6, 9, UI.rareColor(a), 'right', 700);
    txt(u,`OVR ${a.overall}`,8,28,15,PAL.gold,'left',700);
    txt(u,`/ 잠재 ${a.potOverall}`,62,32,10,PAL.dim);
    const SP = (typeof SPECIES!=='undefined') ? SPECIES[a.species] : null;
    txt(u,{sprint:'단거리',hurdles:'허들',jump:'도약',throw:'투척'}[a.spec],VW-8,28,11,PAL.blue,'right');
    if(SP){
      txt(u, '주 종목 ' + SP.best.map(id=>EVENT_BY_ID[id].short).join(' · '), VW-8, 40, 9, PAL.green, 'right');
      txt(u, SP.note, VW-8, 51, 8, PAL.dim, 'right');
    }

    // 상태
    const SW = UI.labelW(u, ['컨디션','피로','사기'], 8, 36);
    const sbx = 8+SW, sbw = 128-SW, snx = 8+SW+sbw+6;
    txt(u,'컨디션',8,48,8,PAL.dim); UI.bar(u,sbx,50,sbw,6,a.condition,100,UI.cond(a.condition));
    txt(u,UI.condName(a.condition),snx,46,9,UI.cond(a.condition));
    txt(u,'피로',8,60,8,PAL.dim);   UI.bar(u,sbx,62,sbw,6,a.fatigue,100, a.fatigue>65?PAL.red:a.fatigue>45?PAL.gold:PAL.green);
    txt(u,Math.round(a.fatigue)+'',snx,58,9,PAL.dim);
    txt(u,'사기',8,72,8,PAL.dim);   UI.bar(u,sbx,74,sbw,6,a.morale,100, a.morale>65?PAL.green:a.morale>40?PAL.gold:PAL.red);
    txt(u,Math.round(a.morale)+'',snx,70,9,PAL.dim);
    if(a.injury) txt(u,`부상: ${a.injury.name} — ${a.injury.weeks}주 남음`,8,84,10,PAL.red,'left',700);

    // 스탯
    let y=98;
    for(const k of STAT_KEYS){
      UI.statRow(u,8,y,168,k,a.stats[k],a.potential[k]);
      // 종 성장 배율 — 어디를 키우면 잘 크는지 한눈에
      const b = (typeof speciesBias==='function') ? speciesBias(a,k) : 1;
      if(b>=1.3)      txt(u,'▲▲',180,y,8,PAL.green);
      else if(b>=1.1) txt(u,'▲', 180,y,8,PAL.green);
      else if(b<=0.85)txt(u,'▽', 180,y,8,PAL.dim);
      y+=13;
    }

    // 특성
    txt(u,'특성',192,48,8,PAL.dim);
    if(!a.traits.length) txt(u,'없음',192,58,9,PAL.dim);
    a.traits.forEach((t,i)=>{
      txt(u,TRAITS[t].name,192,58+i*20,10, t==='glass'||t==='nervous'?PAL.red:PAL.green,'left',700);
      txt(u,TRAITS[t].desc,192,69+i*20,8,PAL.dim);
    });
    // 개인 기록
    txt(u,'개인 최고',192,110,8,PAL.dim);
    const bs=Object.entries(a.best);
    if(!bs.length) txt(u,'아직 없음',192,120,9,PAL.dim);
    bs.slice(0,4).forEach(([k,v],i)=>{
      const ev=EVENT_BY_ID[k];
      txt(u,ev.short,192,120+i*11,9,PAL.white);
      txt(u,fmtRec(ev, v),VW-8,120+i*11,9,PAL.gold,'right');
    });
    UI.footer(u,'확인/취소 돌아가기');
  }
}

/* ── 기록실 ──────────────────────────────────────────────── */
class RecordScreen extends Screen0 {
  get rows(){
    return EVENTS.map(ev=>{
      const r=this.mg.club.records[ev.id];
      return { label:ev.name, sub: r?`${r.name} · ${r.year}년차`:'기록 없음',
        right: r? fmtRec(ev, r.value) : '—', rightColor: r?PAL.gold:PAL.dim };
    });
  }
  update(now){
    if(Input.repeat('up',now)) this.move(-1);
    if(Input.repeat('down',now)) this.move(1);
    if(Input.pressed('back')||Input.pressed('action')) this.mg.pop();
  }
  draw(u){
    UI.header(u,'클럽 기록',`${this.mg.season.year}년차`);
    UI.list(u,this.rows,this.sel,8,28,VW-16,24,6);
    const rs=this.mg.season.results;
    txt(u,'대회 이력',8,VH-56,8,PAL.dim);
    rs.slice(-3).forEach((m,i)=>
      txt(u,`${m.week}주 ${m.name} — ${m.points}점`,8,VH-46+i*10,9,PAL.white));
    UI.footer(u,'취소 돌아가기');
  }
}


/* ── 리그 순위표 ──────────────────────────────────────────
   ⚠ 예전엔 상대가 대회마다 새로 생기고 사라져서 **이겨도 누구를 이겼는지 몰랐다.**
      여섯 클럽을 고정으로 두고 여기서 순위를 보여 준다 —
      "올해는 고원 육상부를 잡아야 한다" 가 목표가 되도록. */
function leagueSub(S){
  if(typeof RivalLeague==='undefined' || !S.leagueTable) return '리그 6개 클럽';
  const t=RivalLeague.table(S), me=t.find(r=>r.mine), top=t[0];
  /* 클럽 이름은 번역표를 따로 타므로 문장 밖에 둔다 */
  return me.rank===1 ? K('우리가 1위 · %1점').replace('%1', me.pts)
       : K('%1위 · 선두 %2점 차').replace('%1', me.rank).replace('%2', top.pts-me.pts)
         + ' — ' + K(top.name);
}
class LeagueScreen extends Screen0 {
  get rows(){ return []; }
  update(now){ if(Input.pressed('back')||Input.pressed('action')) this.mg.pop(); }
  draw(u){
    const S=this.mg.season;
    /* ⚠ club.year 를 보고 있었다. 시즌 마감이 club.year 를 먼저 올리므로 종료 화면
       근처에서 **리그표만 1년 앞선 해**를 보여 준다. 시즌의 해는 시즌이 안다. */
    UI.header(u, '리그 순위표', `${S.year}년차 · ${S.week} / ${SEASON_WEEKS}주`);
    if(typeof RivalLeague==='undefined' || !S.leagueTable){
      txt(u,'리그 정보가 없습니다', VW/2, VH/2, 12, PAL.dim,'center'); return;
    }
    const t=RivalLeague.table(S);
    const y0=40, rh=19;
    txt(u,'클럽', 44, y0-11, 8, PAL.dim,'left');
    txt(u,'금', VW-92, y0-11, 8, PAL.dim,'right');
    txt(u,'승점', VW-16, y0-11, 8, PAL.dim,'right');
    t.forEach((r,i)=>{
      const y=y0+i*rh;
      u.fillStyle = r.mine ? 'rgba(255,215,94,.16)' : (i%2?'rgba(255,255,255,.04)':'transparent');
      u.fillRect(8, y-2, VW-16, rh-3);
      if(r.mine){ u.strokeStyle=PAL.gold; u.lineWidth=1; u.strokeRect(8.5, y-1.5, VW-17, rh-4); }
      txt(u, String(r.rank), 18, y+2, 12, r.rank<=3?PAL.gold:PAL.dim,'center',700);
      if(typeof drawFlag==='function') drawFlag(u, 28, y+1, 14, 10, r.nation);
      txt(u, r.name, 48, y+2, 11, r.mine?PAL.gold:PAL.white,'left', r.mine?700:400);
      txt(u, String(r.g), VW-92, y+2, 11, PAL.white,'right');
      txt(u, String(r.pts), VW-16, y+2, 12, r.mine?PAL.gold:PAL.white,'right',700);
    });
    const me=t.find(r=>r.mine);
    const msg = me.rank===1 ? '선두다 — 지키는 것도 일이다'
              : K('선두까지 %1점').replace('%1', t[0].pts-me.pts);
    txt(u, msg, VW/2, VH-26, 11, me.rank===1?PAL.green:PAL.white,'center',700);
    txt(u,'취소 돌아가기', VW/2, VH-13, 9, PAL.dim,'center');
  }
}
