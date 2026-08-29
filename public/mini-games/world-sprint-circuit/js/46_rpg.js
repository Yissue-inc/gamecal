/* ══════════════════════════════════════════════════════════════════
   육성 층 (RPG) — 레벨 · 경험치 · 훈련 포인트 · 장비

   ⛔ 설계 원칙 — 이 층은 **기존 시스템을 바꾸지 않는다.**
      · 경주 시뮬레이션(33_racesim)·판정·기준기록에 손대지 않는다.
      · 레벨과 장비는 **성장에만** 작용한다 — 스탯이 오르는 속도, 피로 회복,
        부상 확률, 컨디션 유지. 경기 결과 공식에는 들어가지 않는다.
      · 따라서 **장비 없는 Lv1 선수는 이 층이 없던 때와 완전히 같게 동작한다.**
        (tools/verify 의 rpg 무영향 검사가 이걸 못 박는다)

   왜 이렇게 나눴나: 경기 계산에 장비를 얹으면 48종목의 밸런스를 전부 다시
   재야 한다. 성장에만 얹으면 밸런스는 그대로 두고 '키우는 재미'만 더한다.
   프린세스 메이커·FM 의 재미도 실은 거기서 나온다 — 숫자가 오르는 것을 보는 것.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const RPG = {
  /* ── 레벨 ────────────────────────────────────────────────
     Lv1→2 는 100, Lv10→11 은 약 2,200, Lv30→31 은 약 9,900.
     한 시즌(24주)에 성실히 굴리면 Lv 8~12 쯤 된다 — 매주 뭔가 오르는 감각. */
  MAX_LV: 60,
  /* ⚠ 숫자는 **크게** 잡는다. 방치형·육성물의 재미 절반은 '큰 수가 오르는 것'이다.
     한 주에 22 오르는 것과 450 오르는 것은 같은 비율이어도 체감이 다르다.
     한 시즌(24주 + 대회 4회)에 Lv 7~9 가 되도록 맞췄다(tools/rpg_neutral 로 실측). */
  /* ⚠ 1.25 지수는 **상한을 못 닿게** 만들었다 — 실측: 자동 플레이 10시즌(240주 +
     대회 40회)에 평균 Lv21, 최고 Lv25. Lv60 누적이 262만 XP 라 70시즌쯤 걸린다.
     닿을 수 없는 상한은 상한이 아니라 벽이다.
     지수를 낮춰 **12~15시즌에 Lv60** 이 되게 한다(한 선수의 선수 생명과 얼추 같다). */
  xpToNext(lv){ return Math.round(520 * Math.pow(Math.max(1,lv), 1.06)); },

  /* 누적 경험치로 레벨을 되돌린다 — 세이브에는 lv·xp 만 둔다 */
  lvOf(a){ return a.lv || 1; },
  xpOf(a){ return a.xp || 0; },

  /* 경험치를 준다. 레벨이 오르면 오른 만큼 훈련 포인트를 준다.
     반환: {gained, levels, tp} — 화면이 이걸로 연출한다. */
  award(a, amount, why){
    if(!(amount>0)) return null;
    a.lv = a.lv || 1; a.xp = a.xp || 0; a.tp = a.tp || 0;
    const before = a.lv;
    a.xp += Math.round(amount);
    let tp = 0;
    while(a.lv < this.MAX_LV && a.xp >= this.xpToNext(a.lv)){
      a.xp -= this.xpToNext(a.lv);
      a.lv++;
      tp += this.tpPerLevel(a.lv);
    }
    if(a.lv >= this.MAX_LV) a.xp = Math.min(a.xp, this.xpToNext(this.MAX_LV)-1);
    a.tp += tp;
    const out = { gained:Math.round(amount), levels:a.lv-before, tp, why:why||'' };
    if(out.levels>0){ (a.rpgLog ||= []).push({ lv:a.lv, tp }); }
    return out;
  },
  /* 레벨당 훈련 포인트 — 5레벨마다 한 번 더 준다(작은 봉우리) */
  tpPerLevel(lv){ return 2 + (lv%5===0 ? 3 : 0); },

  /* ── 경험치 표 ──────────────────────────────────────────
     ⚠ 여기 숫자를 바꾸면 성장 속도가 바뀐다. 경기 결과에는 영향이 없다. */
  XP: {
    trainWeek: 380,        // 한 주 훈련
    trainPerLoad: 9,       // 부하 1당 추가(×10 되어 더해진다)
    meetEntry: 700,        // 대회 출전
    podium: [1800, 1100, 700], // 1·2·3위
    personalBest: 1200,    // 개인 최고 경신
    clubRecord: 2200,      // 클럽 기록 경신
    /* 직접 뛰면 더 준다 — 두 가지 재미를 잇는 다리다.
       자동은 편하고, 수동은 이득이다. 어느 쪽도 정답이 아니게. */
    manualMult: 1.6,
  },

  /* ── 훈련 포인트 사용 ────────────────────────────────────
     한 점당 스탯 +1. 잠재치를 넘지 못한다(잠재치는 기존 규칙 그대로). */
  spendTp(a, key, n){
    n = n|0; if(n<=0) return '포인트를 정하세요';
    if((a.tp||0) < n) return '훈련 포인트가 모자랍니다';
    const cap = (a.potential && a.potential[key]) || 99;
    if(a.stats[key] >= cap) return '잠재치에 닿았습니다';
    const room = Math.floor(cap - a.stats[key]);
    const use = Math.min(n, room);
    a.stats[key] = Math.min(cap, a.stats[key] + use);
    a.tp -= use;
    return null;
  },

  /* ── 장비 ────────────────────────────────────────────────
     ⛔ 장비는 **성장·컨디션에만** 작용한다. 경기 계산에 곱해지지 않는다.
        grow  : 훈련으로 오르는 양 배수
        rest  : 주당 피로 회복 추가
        hurt  : 부상 확률 배수(낮을수록 좋다)
        cond  : 주당 컨디션 유지 추가
        xp    : 경험치 배수 */
  SLOTS: ['shoe','wear','gear'],
  SLOT_NAME: { shoe:'신발', wear:'유니폼', gear:'장비' },
  SLOT_ICON: { shoe:'slot-shoe', wear:'slot-wear', gear:'slot-gear' },
  RARITY: [
    { key:'common', name:'일반',  color:'#9aa4b8', mult:1.0 },
    { key:'fine',   name:'고급',  color:'#5cff9c', mult:1.5 },
    { key:'rare',   name:'희귀',  color:'#5aaaff', mult:2.1 },
    { key:'epic',   name:'영웅',  color:'#c08aff', mult:2.9 },
    { key:'legend', name:'전설',  color:'#ffd75e', mult:4.0 },
  ],
  /* 기본 아이템 — 등급이 오르면 효과가 mult 만큼 커진다 */
  BASE: [
    /* icon 은 발주서(docs/ASSET_ORDER_UI_2026-08-28.md)와 **같은 이름**이다.
       파일이 없으면 UIK.itemBox 가 등급 색 마름모로 대신 그린다 — 화면은 안 깨진다. */
    { id:'spike',  slot:'shoe', name:'스파이크',   icon:'item-spike',  eff:{ grow:0.05 } },
    { id:'sole',   slot:'shoe', name:'쿠션 밑창',  icon:'item-sole',   eff:{ hurt:-0.06 } },
    { id:'suit',   slot:'wear', name:'경기복',     icon:'item-suit',   eff:{ cond:0.8 } },
    { id:'tights', slot:'wear', name:'압박 타이츠',icon:'item-tights', eff:{ rest:1.2 } },
    { id:'watch',  slot:'gear', name:'페이스 시계',icon:'item-watch',  eff:{ xp:0.08 } },
    { id:'tape',   slot:'gear', name:'테이핑',     icon:'item-tape',   eff:{ hurt:-0.09 } },
    { id:'band',   slot:'gear', name:'저항 밴드',  icon:'item-band',   eff:{ grow:0.07 } },
  ],
  baseOf(id){ return this.BASE.find(b=>b.id===id) || null; },
  rarityOf(key){ return this.RARITY.find(r=>r.key===key) || this.RARITY[0]; },

  /* 아이템 하나 만들기 — {id, r} 만 저장한다(효과는 표에서 계산) */
  make(id, rarityKey){ return { id, r: rarityKey || 'common' }; },
  itemName(it){
    const b=this.baseOf(it.id); if(!b) return '?';
    const r=this.rarityOf(it.r);
    return r.key==='common' ? b.name : `${r.name} ${b.name}`;
  },
  itemIcon(it){ const b=this.baseOf(it&&it.id); return b? b.icon : null; },
  itemEff(it){
    const b=this.baseOf(it.id); if(!b) return {};
    const m=this.rarityOf(it.r).mult, out={};
    for(const k in b.eff) out[k] = +(b.eff[k]*m).toFixed(3);
    return out;
  },
  itemLine(it){
    const e=this.itemEff(it), parts=[];
    if(e.grow) parts.push(`성장 +${Math.round(e.grow*100)}%`);
    if(e.rest) parts.push(`피로 회복 +${e.rest.toFixed(1)}`);
    if(e.hurt) parts.push(`부상 ${Math.round(e.hurt*100)}%`);
    if(e.cond) parts.push(`컨디션 +${e.cond.toFixed(1)}`);
    if(e.xp)   parts.push(`경험치 +${Math.round(e.xp*100)}%`);
    return parts.join(' · ');
  },

  /* 선수가 낀 장비의 효과 합 — **이 함수만이 장비를 게임에 연결한다.**
     ⚠ 부르는 곳이 훈련·주간 정비뿐이라는 게 이 층의 안전장치다. */
  bonus(a){
    const out = { grow:0, rest:0, hurt:0, cond:0, xp:0 };
    const eq = a && a.equip; if(!eq) return out;
    for(const s of this.SLOTS){
      const it = eq[s]; if(!it) continue;
      const e = this.itemEff(it);
      for(const k in out) if(e[k]) out[k] += e[k];
    }
    return out;
  },

  /* 장비 팔기 — 창고가 쌓이기만 하면 의미가 없다. 등급이 값이다.
     ⚠ 판 값으로 선수를 산다 — 이게 창고와 이적시장을 잇는 다리다. */
  sellPrice(it){
    const m=this.rarityOf(it.r).mult;
    return Math.round(8 * m * m);      // 일반 8 · 고급 18 · 희귀 35 · 영웅 67 · 전설 128
  },

  /* ── 합성 ────────────────────────────────────────────────
     ⚠ 창고가 **쌓이기만 했다** — 10시즌에 278개, 낄 수 있는 건 3칸.
        파는 것 말고는 배출구가 없었다. 방치형·수집형은 예외 없이
        '같은 것 여럿 → 더 좋은 것 하나' 를 갖고 있다.
     같은 아이템 · 같은 등급 3개 → 한 등급 위 1개. 전설은 더 올릴 곳이 없다. */
  FUSE_N: 3,
  canFuse(inv, it){
    if(!inv || !it) return false;
    const i = this.RARITY.findIndex(r=>r.key===it.r);
    if(i<0 || i>=this.RARITY.length-1) return false;      // 전설은 끝
    return inv.filter(x=>x.id===it.id && x.r===it.r).length >= this.FUSE_N;
  },
  fuse(inv, it){
    if(!this.canFuse(inv, it)) return null;
    let n=this.FUSE_N;
    for(let i=inv.length-1; i>=0 && n>0; i--){
      if(inv[i].id===it.id && inv[i].r===it.r){ inv.splice(i,1); n--; }
    }
    const up = this.RARITY[this.RARITY.findIndex(r=>r.key===it.r)+1].key;
    const made = this.make(it.id, up);
    inv.push(made);
    return made;
  },

  equip(a, it){
    const b=this.baseOf(it.id); if(!b) return '알 수 없는 장비';
    a.equip = a.equip || {};
    const old = a.equip[b.slot] || null;
    a.equip[b.slot] = it;
    return { removed: old };
  },
  unequip(a, slot){
    if(!a.equip || !a.equip[slot]) return null;
    const it=a.equip[slot]; a.equip[slot]=null; return it;
  },

  /* ── 보상 굴리기 ────────────────────────────────────────
     대회 성적으로 장비가 나온다. 등급은 성적과 대회 등급을 같이 본다. */
  rollDrop(rng, rank, meetKind){
    const tier = { regional:0, invitational:1, championship:2, olympics:3 }[meetKind] ?? 0;
    const place = rank<=1 ? 3 : rank<=3 ? 2 : rank<=6 ? 1 : 0;
    const score = tier + place;                 // 0~6
    const p = rng();
    if(p > 0.18 + score*0.08) return null;      // 안 나올 수도 있다
    const q = rng();
    let rk = 'common';
    if(score>=5 && q>0.88) rk='legend';
    else if(score>=4 && q>0.78) rk='epic';
    else if(score>=2 && q>0.62) rk='rare';
    else if(q>0.42) rk='fine';
    const b = this.BASE[(rng()*this.BASE.length)|0];
    return this.make(b.id, rk);
  },

  /* ── 방치 진행 ───────────────────────────────────────────
     ⚠ '자리를 비운 동안 주차가 흐른다'로 만들면 **대회를 건너뛴다** — 시즌 구조가
        무너진다. 그래서 시간이 주는 것은 주차가 아니라 **경험치**다.
        선수들은 자기들끼리 훈련하고 있었고, 돌아오면 그만큼 자라 있다.
        경기·대회는 여전히 사람이 와야 열린다 — 방치가 플레이를 대신하지 않는다.

     크기 감각: 12시간 자리를 비우면 선수 1명당 약 13,000 XP.
     한 시즌 훈련(24주)이 약 10,800 이니 '하룻밤 = 한 시즌 훈련' 쯤이다.
     반면 올림픽 한 번이 선수단 전체에 99,200 을 준다 — **직접 하는 게 훨씬 낫다.** */
  /* 코인(자금)도 같이 쌓인다 — 방치의 보상이 경험치 하나뿐이면 '쓸 데'가 없다.
     선수를 사고 장비를 파는 순환에 코인이 들어가야 방치가 게임과 이어진다.
     크기: 12시간에 약 130코인(신규 클럽 자금이 260) — 하룻밤에 반년치 스폰서쯤. */
  IDLE: { xpPerSec: 0.30, capHours: 12, coinPerSec: 0.003 },
  idleGain(sinceMs){
    if(!(sinceMs>0)) return 0;
    const sec = Math.min(sinceMs/1000, this.IDLE.capHours*3600);
    return Math.floor(sec * this.IDLE.xpPerSec);
  },
  /* 돌아왔을 때 한 번 정산한다. 반환: {sec, per, rows} — 화면이 이걸로 알린다. */
  settleIdle(club, lastSeenMs, nowMs){
    if(!club || !club.squad || !lastSeenMs) return null;
    const gap = nowMs - lastSeenMs;
    if(gap < 60*1000) return null;                 // 1분 미만은 없던 일로
    const per = this.idleGain(gap);
    if(per <= 0) return null;
    const sec = Math.min(gap/1000, this.IDLE.capHours*3600);
    const coin = Math.round(sec * this.IDLE.coinPerSec * Math.max(1, (club.squad||[]).length)/10*10)/10;
    const rows=[];
    for(const a of club.squad){
      this.ensure(a);
      if(a.injury) continue;                       // 다친 선수는 쉰다
      const up = this.award(a, per * (1 + this.bonus(a).xp), '자동 훈련');
      if(up) rows.push({ name:a.name, xp:up.gained, lv:up.levels?a.lv:0, tp:up.tp });
    }
    club.budget = +(((club.budget||0) + coin)).toFixed(1);
    return { sec, per, rows, coin };
  },

  /* ── 세이브 ─────────────────────────────────────────────
     선수에 붙는 값(lv·xp·tp·equip)은 선수와 함께 저장된다.
     클럽 창고(inventory)만 따로 담는다. */
  packAthlete(a){ return { lv:a.lv||1, xp:a.xp||0, tp:a.tp||0, equip:a.equip||null }; },
  unpackAthlete(a, d){
    if(!d) return;
    a.lv=d.lv||1; a.xp=d.xp||0; a.tp=d.tp||0; a.equip=d.equip||null;
  },
  /* 아직 이 층을 모르는 옛 선수를 만나면 조용히 기본값을 채운다 */
  ensure(a){
    if(a.lv===undefined) a.lv=1;
    if(a.xp===undefined) a.xp=0;
    if(a.tp===undefined) a.tp=0;
    if(a.equip===undefined) a.equip=null;
    return a;
  },
};
