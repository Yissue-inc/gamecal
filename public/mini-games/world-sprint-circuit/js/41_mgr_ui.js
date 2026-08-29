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
      /* 커서 화살표(cursor-arrow) — 금색 세로줄만으로는 '어디를 보고 있나'가 약했다.
         ⛔ 자리는 **모든 줄에 미리 비운다.** 선택된 줄에서만 밀면 위아래로 옮길 때마다
            글자가 좌우로 튄다. 어셋이 없으면 폭 0 이라 예전 자리 그대로다. */
      const cs = (typeof BG!=='undefined' && BG.get('cursor-arrow')) ? Math.min(11, rowH-6) : 0;
      const gut = cs ? cs+3 : 0;
      if(on && cs) u.drawImage(BG.get('cursor-arrow'), x+2, ry+Math.round((rowH-1-cs)/2), cs, cs);
      let lx = x+8+gut;
      /* 줄 아이콘 — 사무실 메뉴처럼 줄마다 성격이 다른 목록에서 글을 읽기 전에 구분된다.
         ⚠ 국기와 같은 자리를 쓴다(둘 다 있는 목록은 없다). 어셋이 없으면 폭 0. */
      if(r.icon && typeof BG!=='undefined'){
        const im = BG.get(r.icon);
        /* ⚠ 13px 고정이라 시설처럼 **줄이 큰 목록에서도 아이콘만 작았다** —
           128×128 아이소메트릭을 13px 로 줄이면 뭘 그렸는지 안 보인다.
           줄 높이에 비례하되 24 에서 멈춘다(그 이상은 글자를 밀어낸다). */
        if(im){ const is=Math.max(11, Math.min(24, rowH-10));
                u.drawImage(im, x+7+gut, ry+Math.round((rowH-1-is)/2), is, is);
                lx = x+9+gut+is; }
      }
      /* 국기 — 목록에서 소속이 바로 보여야 한다 */
      if(r.nation && typeof drawFlag==='function'){
        drawFlag(u, x+7+gut, ry+5, 13, 9, r.nation); lx = x+25+gut;
      }
      /* ⚠ 위쪽에 붙여 그리면 줄 높이가 커질 때(시설 화면 36) 아래가 텅 빈다.
         두 줄 묶음을 줄 한가운데에 놓는다 — 26 일 때는 예전과 같은 자리다. */
      const pad = Math.max(2, Math.round((rowH-1-19)/2));
      txt(u, r.label, lx, ry+pad, 11, r.dim?PAL.dim:(r.color||PAL.white), 'left', on?700:400);
      if(r.sub)   txt(u, r.sub,   lx, ry+pad+11, 8, PAL.dim);
      if(r.right) txt(u, r.right, x+w-8, ry+pad+2,  10, r.rightColor||PAL.white, 'right');
      if(r.right2)txt(u, r.right2,x+w-8, ry+pad+13, 8, r.right2Color||PAL.dim, 'right');
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
  /* 스탯마다 아이콘 하나 — 이름을 읽지 않아도 어느 줄인지 안다.
     ⚠ 어셋이 없으면 폭 0 이라 예전 자리 그대로다(아이콘은 8종 다 와야 켜진다). */
  STAT_ICON: { speed:'ic-speed', acceleration:'ic-accel', stamina:'ic-stamina',
               technique:'ic-technique', rhythm:'ic-rhythm', power:'ic-power' },
  statRow(u, x, y, w, key, cur, pot){
    const ic = (typeof BG!=='undefined') ? BG.get(this.STAT_ICON[key]) : null;
    const iw = ic ? 11 : 0;
    if(ic) u.drawImage(ic, x, y-1, 10, 10);
    txt(u, STAT_NAME[key], x+iw, y, 9, PAL.dim);
    const LW = this.labelW(u, STAT_KEYS.map(k=>STAT_NAME[k]), 9, 42) + iw;
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
  /* 뱃지 어셋이 그 등급만큼 왔으면 그림으로, 아니면 별표로 — 오는 대로 붙는다 */
  rareBadge(u, a, x, y, size){
    const r=(typeof rarityOf==='function')?rarityOf(a):1;
    return (typeof UIK!=='undefined') ? UIK.rarityBadge(u, x, y, size, r) : false;
  },
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

/* 배웠는데 안 켠 스킬이 몇 개인가 — 슬롯이 비어 있는데 놀리는 건 순손해다 */
function C_squadIdleSkills(club){
  let n=0;
  for(const a of (club.squad||[])){
    SKILL.ensure(a);
    const free = SKILL.slots(a) - SKILL.equipped(a).length;
    if(free<=0) continue;
    n += Math.min(free, a.skills.filter(id=>a.skillEq.indexOf(id)<0).length);
  }
  return n;
}

/* ── 지금 할 것 ──────────────────────────────────────────
   ⚠ 사무실 메뉴가 **14줄**이다. 층을 아홉 개 쌓는 동안 "지금 뭘 해야 하나"에
      답하는 자리가 없었다. 우마무스메는 매 턴 다섯 개만 묻는다.

   그래서 맨 위에 **한 줄**을 둔다. 상태를 보고 제일 값진 것 하나를 골라
   사람 말로 말하고, 확인 한 번에 그 화면으로 간다.
   ⛔ 새 시스템이 아니다 — 이미 있는 것들을 가리키는 손가락일 뿐이다.

   순서는 **놓치면 손해인 것**부터다: 공짜 보상 → 잠긴 자원 → 대회 → 관리. */
function officeTodo(mg){
  const C = mg.club, S = mg.season;
  const put = (text, why, go, icon) => ({ text, why, go, icon });

  /* ① 그냥 받으면 되는 것 — 안 받으면 순손해다 */
  if(typeof Daily!=='undefined'){
    const d=Daily.load();
    if(d && !d.claimed && Daily.events().every(e=>d.marks[e.id]!==undefined))
      return put('일일 도전 보상을 받으세요', '세 종목을 다 마쳤습니다',
                 ()=>new DailyScreen(mg), 'icon-medal');
  }
  if(typeof Codex!=='undefined' && Codex.hasClaim())
    return put('도감 보상을 받으세요', '이정표에 닿았습니다',
               ()=>new CodexScreen(mg), 'icon-xp');

  /* ② 놀고 있는 자원 — 쌓아 두면 아무 일도 안 한다 */
  if(typeof SKILL!=='undefined'){
    const idle = C_squadIdleSkills(C);
    if(idle) return put(`안 켠 스킬 ${idle}개가 있습니다`, '배웠는데 장착을 안 했습니다',
                        ()=>new GrowPickScreen(mg), 'icon-levelup');
  }
  const tp = C.squad.reduce((n,a)=>n+(a.tp||0),0);
  if(tp >= 10) return put(`훈련 포인트 ${tp}점이 놀고 있습니다`, '스탯을 올리거나 잠재치를 돌파하세요',
                          ()=>new GrowPickScreen(mg), 'icon-tp');
  if(typeof FACIL!=='undefined' && FACIL.ids().some(id=>FACIL.canBuild(C,id)===null))
    return put('시설을 지을 수 있습니다', '코인을 영구 성장으로 바꿉니다',
               ()=>new FacilityScreen(mg), 'icon-gear');

  /* ③ 이번 주에 반드시 할 것 */
  if(S.isMeetWeek) return put(`${MEET_INFO[S.meetKind].name} 출전`, '출전표를 짜세요',
                              ()=>new EntryScreen(mg), 'ic-meet');
  /* 팀 미팅 — 실측상 사기가 80 아래일 때 부르면 시즌 승점이 +19.9(+7%) 다.
     매주 부르면 오히려 −3.9 이므로 **문턱을 넘을 때만** 권한다. */
  const mAvg = C.squad.length
    ? C.squad.reduce((s2,a)=>s2+a.morale,0)/C.squad.length : 100;
  if(mAvg < 78 && !Object.values(mg.focus).includes('talk'))
    return put(`팀 사기가 ${Math.round(mAvg)}까지 내려갔습니다`,
               '팀 미팅으로 올리세요 — 컨디션이 따라 오릅니다',
               ()=>new TrainScreen(mg), 'ic-morale');
  const hurt = C.squad.filter(a=>a.injury).length;
  if(hurt) return put(`부상 ${hurt}명 — 치료를 지정하세요`, '치료 지도는 회복이 2배 빠릅니다',
                      ()=>new TrainScreen(mg), 'ic-injury');
  if(Object.keys(mg.focus).length < 3)
    return put(`직접 지도 ${Object.keys(mg.focus).length} / 3`, '남은 자리를 쓰지 않으면 그냥 사라집니다',
               ()=>new TrainScreen(mg), 'ic-train');
  return null;                                  // 할 일이 없으면 줄을 안 만든다
}

/* ── 사무실(허브) ────────────────────────────────────────── */
class OfficeScreen extends Screen0 {
  get hdBg(){ return 'bg-office'; }  get hdBgDim(){ return 0.76; }
  get rows(){
    const S=this.mg.season, meetW=S.nextMeetWeek;
    const todo = officeTodo(this.mg);
    const r=[];
    /* 맨 위 한 줄 — 지금 할 것. 없으면 아예 안 뜬다(빈 줄로 자리를 먹지 않는다) */
    if(todo) r.push({ label:'▶ '+todo.text, sub:todo.why, icon:todo.icon,
                      right:'!', rightColor:PAL.green, color:PAL.green,
                      go:todo.go });
    r.push(...[
      /* 감독(4C_master) — '나'. 레벨이 선수 레벨 상한·코치 자리·정원을 연다 */
      (()=>{ const lv=(typeof Master!=='undefined')?Master.lv():1;
             const nx=(typeof Master!=='undefined')?Master.nextUnlock():null;
             return { icon:'ic-career', label:`감독  ${(typeof Master!=='undefined')?Master.name:''}`,
                      sub:`Lv.${lv} · 선수 레벨 상한 ${(typeof Master!=='undefined')?Master.athleteCap():60}`
                          + (nx? ` · 다음 Lv.${nx.lv}: ${nx.text}` : ''),
                      right:'Lv.'+lv, rightColor:PAL.gold,
                      go:()=>new MasterScreen(this.mg) }; })(),
      { label:'훈련 지시', icon:'ic-train', sub:`이번 주 직접 지도 ${Object.keys(this.mg.focus).length} / 3`, right:'▶',
        go:()=>new TrainScreen(this.mg) },
      { label:'선수단',   icon:'ic-squad',
        sub:`${this.mg.club.squad.length}명 · 부상 ${this.mg.club.squad.filter(a=>a.injury).length}명`,
        right: (typeof Power!=='undefined') ? UIK.n(Power.clubOf(this.mg.club)) : '▶',
        rightColor: PAL.gold, right2: (typeof Power!=='undefined') ? '클럽 경기력' : undefined,
        go:()=>new SquadScreen(this.mg) },
      /* 육성(46_rpg) — 포인트가 남아 있으면 눈에 띄게 */
      (()=>{ const tp=this.mg.club.squad.reduce((s,a)=>s+(a.tp||0),0);
             const inv=(this.mg.club.inventory||[]).length;
             /* 켤 수 있는데 안 켠 스킬이 있으면 알려 준다 — 배우고 안 켜는 게 함정이다 */
             const idle = (typeof SKILL==='undefined') ? 0 : C_squadIdleSkills(this.mg.club);
             return { label:'육성', icon:'icon-levelup',
                      sub:`훈련 포인트 ${tp} · 창고 ${inv}개`
                          + (idle? ` · 안 켠 스킬 ${idle}개` : ''),
                      right: (tp>0||idle)?'●'+(tp||idle):'▶',
                      rightColor: (tp>0||idle)?PAL.gold:PAL.dim,
                      color: (tp>0||idle)?PAL.gold:undefined,
                      go:()=>new GrowPickScreen(this.mg) }; })(),
      { label:'팀 프로그램', icon:'ic-rest', sub:PROGRAMS[this.mg.club.program].name+' — '+PROGRAMS[this.mg.club.program].desc, right:'▶',
        go:()=>new ProgramScreen(this.mg) },
      /* 코치진(49_depth) — 뽑으면 그 분야가 잘 자란다. 주급을 먹는다. */
      (()=>{ const n=(typeof DEPTH!=='undefined')?DEPTH.hired(this.mg.club).length:0;
             const w=(typeof DEPTH!=='undefined')?DEPTH.wageBill(this.mg.club):0;
             return { label:'코치진', icon:'ic-injury', sub:n? `${n}명 · 주급 ${w}` : '아직 없음 — 분야별로 3명까지', right:'▶',
                      go:()=>new CoachScreen(this.mg) }; })(),
      { label:'선수 사무소', icon:'ic-market', sub:`자금 ${Math.round(this.mg.club.budget)} · 스카우트·영입·이적`, right:'▶',
        go:()=>new MarketScreen(this.mg) },
      /* 시설(4F_facility) — 코인을 영구 성장으로. 지을 수 있으면 눈에 띄게 */
      (()=>{ const C=this.mg.club;
             const can=(typeof FACIL!=='undefined') &&
               FACIL.ids().some(id=>FACIL.canBuild(C,id)===null);
             return { label:'시설', icon:'icon-gear',
                      sub:(typeof FACIL!=='undefined')?FACIL.summary(C):'—',
                      right: can?'!':'▶', rightColor: can?PAL.gold:PAL.dim,
                      color: can?PAL.gold:undefined,
                      go:()=>new FacilityScreen(this.mg) }; })(),
      /* 일일 도전(4B_daily) — 매일 열 이유. 안 한 종목이 있으면 눈에 띄게 */
      (()=>{ const d=(typeof Daily!=='undefined')?Daily.load():null;
             if(!d) return { label:'기록실', sub:'클럽 기록과 대회 이력', right:'▶' };
             const evs=Daily.events(), left=evs.filter(e=>d.marks[e.id]===undefined).length;
             const st=Daily.streak();
             return { label:'일일 도전',
               sub: d.claimed ? '오늘은 끝났습니다' + (st.n>1?` · ${st.n}일 연속`:'')
                  : left ? `남은 종목 ${left} / ${evs.length}`
                  : '보상을 받을 수 있습니다',
               right: d.claimed ? '✓' : left ? String(left) : '!',
               rightColor: d.claimed?PAL.dim:PAL.gold,
               color: d.claimed?undefined:PAL.gold,
               icon:'ic-stopwatch', go:()=>new DailyScreen(this.mg) }; })(),
      /* 명예의 전당(49_depth) — 은퇴 선수가 남는 자리이자 신인이 물려받는 자리 */
      (()=>{ const h=(typeof DEPTH!=='undefined')?DEPTH.hall(this.mg.club):[];
             const t=(typeof DEPTH!=='undefined')?DEPTH.legacyTotal(this.mg.club):0;
             return { label:'명예의 전당',
                      sub: h.length? `${h.length}명 · 유산 ${t}` : '아직 비어 있습니다',
                      right:'▶', icon:'icon-xp', go:()=>new HallScreen(this.mg) }; })(),
      /* 종족 도감(4D_codex) — 5단계 등급에 '모을 것'을 준다 */
      (()=>{ const T=(typeof Codex!=='undefined')?Codex.totals():{owned:0,total:0};
             const claim=(typeof Codex!=='undefined') && Codex.hasClaim();
             const gb=(typeof Codex!=='undefined') ? (Codex.growBonus().grow*100).toFixed(1) : '0';
             return { label:'종족 도감',
                      sub:`등록 ${T.owned} / ${T.total} · 성장 +${gb}%` + (claim?' · 받을 보상이 있습니다':''),
                      right: claim?'!':`${T.owned}/${T.total}`,
                      rightColor: claim?PAL.gold:PAL.dim,
                      color: claim?PAL.gold:undefined,
                      go:()=>new CodexScreen(this.mg) }; })(),
      { label:'기록실',   icon:'ic-record', sub:'클럽 기록과 대회 이력', right:'▶',
        go:()=>new RecordScreen(this.mg) },
      { label:'리그 순위표', icon:'ic-medal', sub:leagueSub(S), right:'▶',
        go:()=>new LeagueScreen(this.mg) },
    ]);
    if(S.isMeetWeek) r.push({ label:`▶ ${MEET_INFO[S.meetKind].name} 출전`, icon:'ic-meet',
                              sub:'출전표를 짜고 경기를 본다',
                              color:PAL.green, right:'!', go:()=>new EntryScreen(this.mg) });
    else r.push({ label:'다음 주로', sub: meetW? `${meetW}주차 대회까지 ${meetW-S.week}주` : '시즌 마무리', right:'▶',
                  next:true });
    return r;
  }
  /* ⚠ 예전엔 줄 목록과 switch(this.sel) 두 벌을 손으로 맞췄다. 줄을 하나 더할 때마다
     인덱스가 밀려 **다른 화면이 열린다**(이 코드베이스가 같은 이유로 여러 번 물렸다).
     줄이 자기가 열 화면을 들고 있으면 어긋날 자리가 없다. */
  confirm(){
    const r=this.rows[this.sel]; if(!r) return;
    if(r.next){ this.mg.nextWeek(); return; }
    if(r.go){ this.mg.push(r.go()); return; }
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
    /* ⚠ 예전엔 배열 세 칸([라벨, 값, 색])이었다. 아이콘을 네 번째 칸으로 붙였더니
       어셋 검사기가 못 읽었다(이름 붙은 icon: 만 읽는다). 객체로 바꾼다 —
       칸이 늘어도 자리로 세지 않아도 되고 검사기도 읽는다. */
    const cells=[
      { k:'자금', v:String(Math.round(C.budget)), c:C.budget<20?PAL.red:PAL.gold, icon:'ic-coin' },
      { k:'승점', v:String(S.points), c:PAL.white },
      { k:'메달', v:`${S.medals.gold}·${S.medals.silver}·${S.medals.bronze}`, c:PAL.white },
      { k:'컨디션', v:UI.condName(avgC), c:UI.cond(avgC) },
      { k:'피로', v:Math.round(avgF)+'', c:avgF>65?PAL.red:avgF>45?PAL.gold:PAL.green },
      { k:'부상', v:inj.length?`${inj.length}명`:'없음', c:inj.length?PAL.red:PAL.green },
    ];
    cells.forEach((c,i)=>{
      const cx=16+i*Math.floor((VW-32)/cells.length);
      /* 아이콘이 있는 칸은 라벨 앞에 — 어셋이 없으면 폭 0 이라 예전 자리 그대로다 */
      let lx=cx;
      if(c.icon){ const im=BG.get(c.icon);
                  if(im){ u.drawImage(im, cx, 53, 8, 8); lx=cx+10; } }
      txt(u,c.k,lx,54,8,PAL.dim);
      txt(u,c.v,cx,64,12,c.c,'left',700);
    });

    UI.list(u, this.rows, this.sel, 8, 82, VW-16, 22, 6);
    // 지난주 일지 — 비어 있으면 안내를 띄운다(빈 화면은 고장처럼 보인다)
    const log=this.mg.lastLog, WS=this.mg.weekSummary;
    plate(u, 8, VH-58, VW-16, 40, .55);
    if(log && log.length){
      txt(u,'지난주',14,VH-56,8,PAL.dim);
      /* ⚠ 한 주치 성장이 로그 세 줄로만 흘러갔다. 그 주에 클럽이 얼마나 세졌는지를
         **제일 먼저** 말한다 — 큰 것이 작은 것보다 잘 보여야 한다. */
      if(WS && WS.grow){
        const c = WS.grow>0?PAL.green:PAL.red;
        /* 달력 한 장이 넘어간다 — 사무실에 처음 들어온 1.2초 동안만.
           ⚠ 시간은 화면이 이미 갖고 있는 것을 쓴다(this.mg.t). */
        { const age = (this.mg.t||0) - (this._wsAt ??= (this.mg.t||0));
          if(age < 1200)
            BG.fx(u, 'fx-week-done', 78, VH-40, 30, clamp(age/1200,0,0.999), 5); }
        txt(u, '이번 주 성장', 52, VH-56, 8, PAL.dim, 'left');
        txt(u, (WS.grow>0?'+':'')+UIK.n(WS.grow), 108, VH-57, 11, c, 'left', 700);
        if(WS.top && WS.top.length)
          txt(u, WS.top.map(r=>`${r.name} ${r.d>0?'+':''}${UIK.n(r.d)}`).join('  ·  '),
              146, VH-56, 8, PAL.dim, 'left');
      }
      /* 로그 줄 수를 결산 유무와 무관하게 세 줄로 유지한다(상자 높이가 고정이다) */
      log.slice(0,3).forEach((e,i)=>
        txt(u, e.msg, 14, VH-46+i*11, 9,
          e.t==='injury'?PAL.red : e.t==='break'?PAL.green : e.t==='slump'?'#ffa04c' : PAL.white));
    } else {
      /* 이 상자가 '무엇에 대한 말인지' 잇는다 — 목록에서 고른 줄을 꼬리로 가리킨다 */
      UIK.tail(u, 30, VH-62, 10);
      UIK.divider(u, 14, VH-60, VW-28);
      txt(u,'감독 노트',14,VH-56,8,PAL.dim);
      txt(u,'매주 3명까지 직접 지도할 수 있습니다. 나머지는 팀 프로그램대로 훈련합니다.',14,VH-46,9,PAL.white);
      txt(u,'피로가 쌓이면 성장이 멈추고 부상이 급증합니다 — 대회 직전엔 쉬게 하세요.',14,VH-35,9,PAL.dim);
    }
    UI.footer(u, '▲▼ 이동   확인 선택');
  }
}

/* ── 훈련 지시 ───────────────────────────────────────────── */
class TrainScreen extends Screen0 {
  /* ⚠ 0.68 로는 '단거리 · OVR 38' 같은 회색 보조글이 밝은 훈련장에 묻혔다(실측) */
  get hdBg(){ return 'bg-training'; }  get hdBgDim(){ return 0.82; }
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
      /* 팀 미팅은 선수단 전체가 얼마나 오르는지를 미리 보여 준다 —
         "지금 부를 때인가"를 목록에서 바로 판단할 수 있어야 한다 */
      const gain = F.talk
        ? Math.round(this.mg.club.squad.reduce((s2,x)=>
            s2 + Math.min(100-x.morale, 5 + (100-x.morale)*0.22 + (x.injury?4:0)), 0))
        : 0;
      return { label:F.name,
        /* ⚠ 예전엔 여기서 k==='rest' 삼항으로 설명을 갈랐다 — 항목을 하나 더하면
           **엉뚱한 설명이 붙는다**(면담을 넣자 '부상 회복이 2배'로 떴다).
           설명은 FOCUS 가 들고 있다. */
        sub: F.stat ? `${Math.round(cur)} / ${pot}${cur>=pot-0.5?' (한계)':''}` : (F.desc||''),
        right: F.talk ? `팀 사기 +${gain}`
              : F.load>0 ? `부하 +${F.load.toFixed(1)}` : `회복 ${F.load.toFixed(1)}`,
        rightColor: F.talk ? (gain>=45?PAL.green:PAL.gold)
                  : F.load>0 ? (F.load>1.4?PAL.red:PAL.gold) : PAL.green,
        right2: F.talk ? `평균 ${Math.round(this.mg.club.squad.reduce((s2,x)=>s2+x.morale,0)/this.mg.club.squad.length)}` : undefined,
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
    /* ⚠ 8줄 고정이었다. 항목이 10개(스탯 6 + 휴식·치료·팀 미팅 + 지도 안 함)로 늘자
       **새로 넣은 팀 미팅이 화면 밖으로 잘렸다** — 목록이 스크롤되긴 하지만
       기본 위치에서 안 보이면 없는 것과 같다. 줄 수에 맞춰 높이를 계산한다. */
    const n = this.rows.length;
    const top = 40, bot = VH - 20;
    const rowH = Math.max(16, Math.min(22, Math.floor((bot-top)/n)));
    UI.list(u, this.rows, this.sel, 8, top, VW-16, rowH, n);
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
    /* ⚠ 목록의 큰 글씨도 경기력으로 바꾼다. OVR 만 보이면 Lv30 에 전설 장비를
       끼운 선수와 신인이 같은 숫자로 나란히 선다 — 누굴 내보낼지 알 수가 없다. */
    right: (typeof Power!=='undefined') ? UIK.n(Power.of(a)) : `${a.overall} / ${a.potOverall}`,
    rightColor: a.injury?PAL.red:PAL.gold,
    right2: a.injury?`부상 ${a.injury.weeks}주` : `OVR ${a.overall} · ${UI.condName(a.condition)}`,
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
    /* 국기 + 국가명 — 누구를 위해 뛰는지.
       ⚠ x=8,y=26 에 그렸더니 바로 아래 OVR(8,28) 과 **글자가 겹쳤다**
          ('대한민 OVR 34' 로 읽혔다). OVR 블록 오른쪽으로 옮긴다. */
    if(a.nation && typeof drawFlag==='function'){
      drawFlag(u, 120, 28, 20, 14, a.nation);
      txt(u, nationName(a.nation), 144, 30, 9, PAL.dim, 'left');
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
    /* 상태 세 줄에도 아이콘 — 스탯 줄과 같은 어휘로 읽히게.
       ⚠ 어셋이 없으면 폭 0 이라 예전 자리 그대로다.
       ⛔ 아이콘을 **먼저** 잡는다. SW 가 이 값을 쓰는데 아래에 두면
          선언 전 참조(TDZ)로 화면이 통째로 터진다. */
    const has = (typeof BG!=='undefined');
    const imC = has ? BG.get('ic-condition') : null;
    const imF = has ? BG.get('ic-fatigue')   : null;
    const imM = has ? BG.get('ic-morale')    : null;
    const sIc = (im)=> im ? (yy)=>{ u.drawImage(im, 8, yy-1, 9, 9); return 10; } : ()=>0;
    const icC=sIc(imC), icF=sIc(imF), icM=sIc(imM);
    /* ⚠ 아이콘이 라벨 앞에 붙으면 라벨 칸도 그만큼 넓어져야 한다 —
       안 그러면 긴 언어에서 '컨디션'이 막대를 파고든다(예전에 영어판에서 겪은 것). */
    const SW = UI.labelW(u, ['컨디션','피로','사기'], 8, 36) + (imC?10:0);
    const sbx = 8+SW, sbw = 128-SW, snx = 8+SW+sbw+6;
    txt(u,'컨디션',8+icC(48),48,8,PAL.dim); UI.bar(u,sbx,50,sbw,6,a.condition,100,UI.cond(a.condition));
    txt(u,UI.condName(a.condition),snx,46,9,UI.cond(a.condition));
    txt(u,'피로',8+icF(60),60,8,PAL.dim);   UI.bar(u,sbx,62,sbw,6,a.fatigue,100, a.fatigue>65?PAL.red:a.fatigue>45?PAL.gold:PAL.green);
    txt(u,Math.round(a.fatigue)+'',snx,58,9,PAL.dim);
    txt(u,'사기',8+icM(72),72,8,PAL.dim);   UI.bar(u,sbx,74,sbw,6,a.morale,100, a.morale>65?PAL.green:a.morale>40?PAL.gold:PAL.red);
    /* ⚠ 사기는 한 시즌에 23~100 으로 흔들리며 **성장을 27.6% 좌우한다**(실측).
       그런데 화면에는 0~100 숫자만 있어서 그게 뭘 하는 값인지 알 길이 없었다.
       훈련이 실제로 곱하는 배수를 그대로 적는다(31_training 의 moraleF). */
    const mf = 0.82 + a.morale/100*0.32;
    txt(u,Math.round(a.morale)+'',snx,70,9,PAL.dim);
    txt(u, `성장 ×${mf.toFixed(2)}`, snx+22, 71, 8,
        mf>=1.05?PAL.green:mf<=0.95?PAL.red:PAL.dim);
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
    /* 초상 — 스탯 줄이 y=176 에서 끝나고 푸터까지 비어 있던 자리.
       ⚠ 로스터가 인물로 안 읽히던 이유가 얼굴이 없어서였다. 얼굴이 없는 종족은
          달리는 그림으로 물러나므로 어느 선수를 열어도 빈칸은 안 나온다. */
    const pw=68, pxx=8, pyy=182;
    if(typeof UIK!=='undefined')
      UIK.card(u, pxx, pyy, pw, pw, UI.rareColor(a),
               { tier:(typeof rarityOf==='function')?rarityOf(a):1 });
    if(typeof Face!=='undefined' &&
       !Face.draw(u, a.species, pxx+pw/2, pyy+pw/2, pw-10))
      CharHD.draw(u, a.species, pxx+pw/2, pyy+pw-8, 0.05, { t:performance.now(), scale:1.4 });
    txt(u, a.speciesName, pxx+pw/2, pyy+pw-11, 8, PAL.white, 'center');
    /* ── 종합력과 그 내역 ──────────────────────────────────
       ⚠ 종합력은 목록·카드에 큰 숫자로 뜨는데 **어디서 왔는지는 아무 데도 없었다.**
          숫자만 있고 근거가 없으면 "왜 올랐지"를 못 배운다 — 그러면 무엇을 해야
          오르는지도 모른 채 숫자만 쳐다보게 된다. 여기가 그걸 배우는 자리다.
       ⚠ 새 화면을 만들지 않는다. 선수를 들여다보는 화면이 이미 여기다. */
    if(typeof Power!=='undefined'){
      const bx=84, bw=VW-92;
      const pw2=Power.of(a), gw=Power.growthOf(a, this.mg && this.mg.club);
      txt(u, K('경기력'), bx, pyy, 8, PAL.dim, 'left');
      txt(u, UIK.n(pw2), bx+40, pyy-2, 15, PAL.gold, 'left', 700);
      txt(u, K('성장력'), bx+108, pyy, 8, PAL.dim, 'left');
      txt(u, UIK.n(gw), bx+148, pyy-1, 12, '#5aaaff', 'left', 700);
      /* 내역 — 무엇이 얼마를 보태고 깎았나 */
      const rows = Power.breakdown(a);
      rows.forEach((r,i)=>{
        const y = pyy+14+i*11;
        if(y > VH-20) return;
        txt(u, K(r.k), bx, y, 9, PAL.white, 'left');
        txt(u, r.note||'', bx+44, y+1, 8, PAL.dim, 'left');
        txt(u, (r.v>0?'+':'')+UIK.n(r.v), bx+bw, y, 9,
            r.v>0?PAL.green:(r.v<0?PAL.red:PAL.dim), 'right');
      });
    }
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
      txt(u, String(r.rank), 16, y+2, 12, r.rank<=3?PAL.gold:PAL.dim,'center',700);
      /* 클럽 문장 — 라이벌이 이름만 있으면 '표의 한 줄'이지 클럽이 아니다 */
      const hasCrest = r.crest && BG.obj(u, r.crest, 32, y+rh-4, rh-5);
      if(typeof drawFlag==='function') drawFlag(u, hasCrest?42:26, y+1, 14, 10, r.nation);
      txt(u, r.name, hasCrest?60:46, y+2, 11, r.mine?PAL.gold:PAL.white,'left', r.mine?700:400);
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
