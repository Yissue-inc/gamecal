/* ══════════════════════════════════════════════════════════════════
   이사회 — 감독에게 **자리**를 준다 (FM 12기둥 ⑥, CK 지시 2026-08-31)

   ⚠ 왜 필요한가 (실사표로 확인한 것)
     시즌 목표도 있고 등급(S/B/D)도 있고 명성도 움직인다. 그런데 **잃을 게 없었다.**
     D 를 받아도 다음 시즌이 똑같이 시작된다. 매니저 게임에서 그건
     성적표를 받고 아무 일도 안 일어나는 학교와 같다 — 성적표가 장식이 된다.

   ⛔ 규칙 다섯
     ① **신뢰는 천천히, 눈에 보이게 움직인다.** 한 판에 잘리면 그건 압박이 아니라 사고다.
     ② **경고가 먼저 온다.** 잘리기 전에 두 번 말해 준다(FM 도 그렇게 한다).
     ③ **회복 경로가 항상 있다.** 신뢰가 바닥이어도 이번 시즌을 잘하면 산다.
     ④ **경질은 게임 오버가 아니다.** 클럽을 잃을 뿐, 커리어 기록·명예의 전당은 남는다.
        (아이도 하는 게임이다 — 세이브가 통째로 죽으면 다시 안 켠다)
     ⑤ **기존 시스템을 안 바꾼다.** 신뢰는 이미 있는 등급·목표·명성만 읽는다.

   ⚠ 신뢰가 하는 일은 셋이다 — 예산 배정 · 이적 승인 · 경질.
      성장률이나 경기력에는 **손대지 않는다**(그건 훈련·사기의 몫이다).
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const BOARD = {
  START: 62,               // 새 감독은 기대를 받고 시작한다
  FIRE_AT: 12,             // 이 아래로 시즌을 마치면 경질
  WARN_AT: 30,             // 이 아래면 경고

  ensure(club){
    if(!club) return;
    if(club.trust === undefined) club.trust = this.START;
    if(club.warnings === undefined) club.warnings = 0;
    if(!club.boardLog) club.boardLog = [];
    if(club.tenure === undefined) club.tenure = 1;      // 이 클럽에서 몇 번째 시즌인가
  },

  /* ⛔ 라벨 경계를 판정 경계와 **다르게** 뒀더니 화면이 스스로 모순됐다(실측 캡처):
     신뢰 36 에서 라벨은 '불안하다' 인데 판정문은 '지켜보고 있습니다' 였다.
     경계는 하나만 있어야 한다 — WARN_AT(30)·FIRE_AT(12)에 맞춘다. */
  label(v){
    return v >= 80 ? '든든하다' : v >= 58 ? '믿는다' : v >= this.WARN_AT ? '지켜본다'
         : v >= this.FIRE_AT ? '불안하다' : '한계다';
  },
  color(v){ return v >= 58 ? PAL.green : v >= this.WARN_AT ? PAL.gold : PAL.red; },

  /* ── 시즌 중 중간 평가 ──────────────────────────────────
     ⚠ 시즌 끝에만 움직이면 24주 동안 신뢰가 얼어 있다 — 대회 주마다 조금씩 반응한다.
     ⛔ 목표는 **연간** 값이라, 지금까지의 진도로 견준다(안 그러면 1주차에 늘 미달이다). */
  afterMeet(club, season){
    this.ensure(club);
    const g = season.goal; if(!g) return null;
    const prog = clamp(season.week / SEASON_WEEKS, 0.05, 1);
    const wantP = g.points * prog;
    const ratio = wantP > 0 ? (season.points / wantP) : 1;
    /* −2 ~ +2 — 한 대회가 판을 뒤집지는 않는다 */
    const d = clamp((ratio - 1) * 3.2, -2, 2);
    club.trust = clamp(club.trust + d, 0, 100);
    return { d:+d.toFixed(1), ratio:+ratio.toFixed(2) };
  },

  /* ── 시즌 마감 ──────────────────────────────────────────
     grade: 'good' | 'ok' | 'bad' (32_season.gradeSeason)
     반환: { trust, delta, verdict:'safe'|'warned'|'fired', msg } */
  endSeason(club, grade){
    this.ensure(club);
    const d = grade === 'good' ? +22 : grade === 'ok' ? +4 : -26;
    const before = club.trust;
    club.trust = clamp(club.trust + d, 0, 100);
    club.tenure = (club.tenure || 1) + 1;

    let verdict = 'safe', msg = '';
    if(club.trust < this.FIRE_AT){
      /* ⛔ 경고 없이 자르지 않는다. 두 번 경고한 뒤에야 경질이다. */
      if(club.warnings >= 2){ verdict = 'fired'; msg = '이사회가 감독을 교체하기로 했습니다.'; }
      else { club.warnings++; verdict = 'warned';
             club.trust = Math.max(this.FIRE_AT, club.trust);   // 경고면 벼랑 끝에서 멈춘다
             msg = `마지막 경고입니다 (${club.warnings} / 2). 다음 시즌이 중요합니다.`; }
    } else if(club.trust < this.WARN_AT){
      verdict = 'warned'; club.warnings++;
      msg = `이사회가 불안해합니다 (경고 ${club.warnings} / 2).`;
    } else {
      if(grade === 'good' && club.warnings > 0){ club.warnings--; msg = '이사회가 다시 믿기 시작했습니다.'; }
      else if(grade === 'good') msg = '이사회가 만족합니다.';
      else msg = '이사회가 지켜보고 있습니다.';
    }
    /* 적자로 시즌을 끝내면 신뢰를 깎는다 — 성적과 별개로 값을 치른다 */
    if((club.budget || 0) < 0){
      club.trust = clamp(club.trust - this.DEBT_TRUST, 0, 100);
      msg = (msg ? msg + ' ' : '') + '적자로 시즌을 마쳤습니다.';
    }
    club.boardLog.unshift({ year:club.year, grade, trust:Math.round(club.trust), verdict, msg });
    if(club.boardLog.length > 20) club.boardLog.length = 20;
    return { trust:Math.round(club.trust), delta:Math.round(club.trust - before), verdict, msg };
  },

  /* ⛔ `seasonBudget`(신뢰→예산 배수)을 썼다가 **지웠다.** 곱할 예산 지급이 애초에 없어서
     아무 데도 못 붙였다 — 쓰지 않는 코드는 거짓말이다. 붙이거나 지운다. */

  /* 이적에 한 번에 쓸 수 있는 상한 — 신뢰가 낮으면 이사회가 지갑을 잠근다.
     신뢰 0 → 잔고의 35% · 62 → 69% · 100 → 90%
     ⚠ 이게 신뢰가 **실제로 무언가를 잠그는** 자리다. 없으면 신뢰는 장식이다. */
  transferCap(club){
    this.ensure(club);
    return Math.round((club.budget || 0) * clamp(0.35 + club.trust / 100 * 0.55, 0.35, 0.9));
  },

  /* 적자 — ⛔ 예전엔 메시지 한 줄이 전부였다(34_market 의 'debt').
     빚에 결과가 없으면 예산은 그냥 숫자다. 시즌 마감에 신뢰로 값을 치른다. */
  DEBT_TRUST: 10,
};

/* ── 경질 화면 ─────────────────────────────────────────────
   ⛔ 게임 오버가 아니다. 커리어·기록·명예의 전당은 남고, 새 클럽을 맡는다. */
class SackedScreen extends Screen0 {
  constructor(mg, info){ super(mg); this.info = info; this.t = 0; }
  get hdBg(){ return 'bg-office'; } get hdBgDim(){ return 0.9; }
  get rows(){ return [{ label:'새 클럽을 맡는다' }]; }
  update(now){
    this.t += 16.7;
    if(Input.pressed('action')) this.confirm();
  }
  confirm(){
    const C = this.mg.club;
    /* 기록은 남긴다 — 클럽만 바뀐다 */
    const keep = { careerYears:(C.careerYears || 0) + (C.year || 1), sacked:(C.sacked || 0) + 1 };
    const seed = (C.year * 7919 + 13) >>> 0;
    this.mg.newGame(null, seed, C.nation);
    Object.assign(this.mg.club, keep);
    BOARD.ensure(this.mg.club);
    this.mg.club.trust = 48;                 // 새 클럽은 반신반의로 시작한다
    this.mg.club.warnings = 0;
    this.mg.stack = [new OfficeScreen(this.mg)];
    if(this.mg.save) this.mg.save();
  }
  cancel(){}
  draw(u){
    UI.header(u, K('이사회'), '');
    txt(u, K('경질'), VW / 2, 44, 26, PAL.red, 'center', 700);
    txt(u, K(this.info.msg || ''), VW / 2, 78, 11, PAL.white, 'center');
    plate(u, 30, 100, VW - 60, 52, 0.72);
    txt(u, K('남는 것'), VW / 2, 105, 9, PAL.dim, 'center');
    txt(u, K('커리어 기록 · 명예의 전당 · 종족 도감'), VW / 2, 120, 10, PAL.gold, 'center', 700);
    txt(u, K('클럽만 바뀝니다'), VW / 2, 136, 9, PAL.dim, 'center');
    txt(u, K('확인 계속'), VW / 2, VH - 24, 11, PAL.gold, 'center', 700);
  }
}
