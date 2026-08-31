/* ══════════════════════════════════════════════════════════════════
   러너 — 교대 스트라이드 물리 (Godot SprintRunner.gd 이식)
   핵심: 좌/우를 "일정한 간격으로 번갈아" 눌러야 빨라진다.
        연타(SPAM)·같은쪽 반복(REPEAT)은 오히려 느려진다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* ── 직접 뛰는 판에 '내 선수'를 실어 나른다 ─────────────────
   감독 모드가 경기 앞뒤로 begin()/end() 를 부른다. 아케이드는 안 부르므로 늘 비어 있다.

   ⚠ **리듬만은 안 싣는다.** 실측(같은 손놀림으로 100m):
        지금(스탯 50)        9.375초 · 요구 박자 238ms
        스탯 90 선수         8.883초 · 요구 박자 **224ms**  ← 잘 키울수록 더 어려워진다
        스탯 90, 리듬 중립    8.933초 · 요구 박자 238ms
      리듬은 targetIntervalMs 를 바꾼다 — 좋은 선수일수록 빨리 두드리라고 요구하게 되고,
      그러면 **잘 키운 선수가 더 못 쳐지는** 뒤집힌 게임이 된다.
      쳐야 할 박자는 누구든 같게 두고, 실력은 '같은 손놀림에 더 빨리 간다'로만 나타낸다. */
const MANUAL = {
  stats: null,          // 이번 판에 뛰는 내 선수의 스탯(리듬 제외)
  widen: 0,             // 스킬이 넓혀 주는 판정 창
  begin(a){
    if(!a || !a.stats){ this.end(); return; }
    const { speed, acceleration, stamina, technique, power } = a.stats;
    this.stats = { speed, acceleration, stamina, technique, power };   // 리듬은 일부러 뺀다
    this.widen = (typeof SKILL!=='undefined' && SKILL.widenFor) ? SKILL.widenFor(a) : 0;
  },
  end(){ this.stats = null; this.widen = 0; },
};

class Runner {
  constructor(lane, stats, isPlayer, trackM){
    this.lane = lane;
    /* ⚠ 감독 모드에서 **직접 뛸 때 내 선수가 화면에 없었다.**
       48개 종목 화면이 전부 `new Runner(p, {}, true, …)` 로 만들기 때문에
       누가 뛰든 스탯 50 짜리 일반 주자였다 — Lv30 전설 치타를 키워 놓고
       직접 뛰면 신인과 똑같이 달렸다. 육성 게임에서 제일 아픈 구멍이다.
       화면 48개를 고치는 대신 MANUAL 이 들고 있는 것을 여기서 섞는다.
       ⛔ 아케이드는 MANUAL.stats 가 늘 null 이라 예전과 완전히 같다. */
    const mine = (isPlayer && typeof MANUAL!=='undefined') ? MANUAL.stats : null;
    this.stats = Object.assign({ speed:50, acceleration:50, stamina:50, technique:50, rhythm:50, power:50 },
                               mine||{}, stats||{});
    this.isPlayer = !!isPlayer;
    this.trackM = trackM;
    this.reset(0);
  }
  reset(gunMs){
    this.gunMs = gunMs;
    this.distM = 0; this.speed = 0;
    this.fatigue = 0; this.form = 1.0;
    /* ── 콤보 단계 ──────────────────────────────────────────
       ⚠ form 은 이미 '리셋이 아니라 감쇠'다(0.82~1.10). 문제는 **눈에 보이는
          이정표가 없다**는 것 — 잘하고 있어도 계단을 밟는 느낌이 안 난다.
       ROAR(월드컵 응원 게임)의 콤보 계단을 가져온다: 6/10/20/40/60 에서
       단계가 오르고, 실수해도 통째로 리셋하지 않고 한 칸만 떨어진다.
       ⚠ 배수를 곱하지는 않는다 — 이 게임은 기록 경기라 배수를 곱하면 세계기록이
          무너진다. 대신 **판정 창을 넓혀** 잘하는 사람이 더 잘하게 만든다. */
    this.combo = 0; this.tier = 0; this.tierUpAt = -9999;
    this.lastSide = 0; this.lastInputMs = -1e9;
    this.reactionMs = -1;
    this.finished = false; this.finishTimeS = 0;
    this.falseStart = false;
    this.leanDone = false; this.leanBonusS = 0;
    this.started = false;
    this.splits = {};
    this.judge = { PERFECT:0, GOOD:0, EARLY:0, LATE:0, REPEAT:0, SPAM:0 };
    this.lastJudge = ''; this.lastJudgeMs = -1e9;
    /* 타격 순간 — 발밑 고리·미세 펀치가 읽는다.
       ⚠ reset 에서 안 지우면 재도전할 때 **출발선에서 고리가 한 번 터진다**. */
    this.hitAt = undefined; this.hitJ = '';
    this._tapPhase = false;         // 재도전하면 다시 시간 구동부터
    this.strideRate = 0;
    this.recoverUntilMs = 0;
    this.stridePhase = 0;                 // 다리 애니메이션용 0..1
    this.hurdlesClean = 0; this.hurdlesClip = 0; this.hurdlesCrash = 0;
    /* 탄력 — 계주 인계처럼 '이미 달리던 상태'를 잠시 이어 주는 배율.
       ⚠ 시작 속도만 올려서는 러닝스타트가 안 된다. strideLerp(0.75) 때문에
          스트라이드 두 번이면 초기 속도가 지워진다(실측: 인계 품질이 기록에
          거의 영향이 없었다). 목표 속도 자체를 잠시 올린다. */
    this.momentum = 1; this.momentumT = 0;
    /* 이미 달리고 있는 상태로 시작하는가 (계주 2~4번 주자).
       ⚠ 이게 없으면 인계받은 주자도 가속 구간(0.85배)부터 시작한다 —
          정지 출발 취급이라 러닝스타트가 통째로 사라진다(실측: 계주가 개인 4회 합보다 느렸다). */
    this.flying = false;
    /* 거리별 순항 속도 배율. 중·장거리는 스프린트보다 느리게 달린다.
       ⚠ 예전엔 케이던스(paceMult)로 속도를 조절했는데, 그러면 판정 정확도까지
          같이 바뀌어 단조롭지 않았다(5000m 페이스를 낮췄더니 오히려 빨라졌다). */
    this.speedMul = 1;
  }

  /* 이 선수가 노리는 교대 간격(ms). 리듬 스탯이 좋을수록 빠른 케이던스를 감당한다 */
  targetIntervalMs(){
    const cad = RULES.targetCadenceHz * lerp(0.92, 1.08, this.stats.rhythm/100);
    return 1000 / Math.max(cad, 0.1);
  }
  /* 단계가 오르는 지점 — ROAR 과 같은 간격 */
  get tierAt(){ return [6,10,20,40,60]; }
  addCombo(){
    this.combo++;
    const t = this.tierAt.filter(n=>this.combo>=n).length;
    if(t > this.tier){ this.tier = t; this.tierUpAt = this.combo; this.onTierUp && this.onTierUp(t); }
  }
  breakCombo(){
    /* ⚠ 통째로 0으로 되돌리지 않는다 — 한 번 실수했다고 여태 쌓은 걸 다 잃으면
       초보는 다시 안 잡는다. 한 단계만 내려간다(ROAR 의 tier decay). */
    if(this.tier > 0){
      this.tier--; this.combo = this.tierAt[Math.max(0,this.tier-1)] || 0;
    } else this.combo = 0;
  }
  /* 단계가 높을수록 판정 창이 넓어진다 — 배수 대신 '쉬워진다'로 보상한다 */
  get tierWiden(){ return this.tier * 0.010; }
  baseSpeed(){
    const mix = (this.stats.speed*0.65 + this.stats.acceleration*0.35)/100;
    return RULES.baseSpeed * lerp(0.85, 1.15, mix) * RULES.balanceScale * this.speedMul;
  }

  /* 좌(-1) / 우(+1) 스트라이드. 판정 문자열을 돌려준다. */
  stride(side, tMs, assist){
    if(this.falseStart || this.finished) return '';
    if(this.reactionMs < 0 && tMs >= this.gunMs){
      this.reactionMs = tMs - this.gunMs;
      this.started = true;
    }
    const dt = tMs - this.lastInputMs;
    const first = this.lastInputMs < -1e8;
    let j = 'GOOD';

    /* ⛔ 연타 모드에서는 **빠른 게 잘하는 것**이다 — 타이밍으로 벌하지 않는다.
       규칙은 하나만 남는다: **좌·우를 번갈아 칠 것.** 같은 쪽만 치면 덜 나간다.
       (예전엔 60ms 로 치면 SPAM 319회로 완주조차 못 했다 — 사람의 첫 본능이 곧 처벌이었다) */
    if(RULES.mashMode){
      if(this.lastSide === side){
        j='REPEAT'; this.form = Math.max(RULES.formFloor, this.form - RULES.formLossRepeat*0.5);
        this.breakCombo();
      } else {
        j='PERFECT';                                   // 교대만 하면 좋은 디딤이다
        this.form = Math.min(RULES.formCeil, this.form + RULES.formGainPerfect);
        this.addCombo();
      }
    }
    else if(dt < RULES.spamWindowMs){
      j='SPAM'; this.fatigue = Math.min(1, this.fatigue + RULES.fatiguePerSpam);
    } else if(dt < RULES.minInputIntervalMs){
      j='SPAM'; this.fatigue = Math.min(1, this.fatigue + RULES.fatiguePerSpam*0.5);
    } else if(this.lastSide === side){
      j='REPEAT'; this.form = Math.max(RULES.formFloor, this.form - RULES.formLossRepeat);
      this.breakCombo();
    } else if(first){
      j='GOOD';                                   // 첫 스트라이드는 비교 대상이 없다
    } else {
      const target = this.targetIntervalMs();
      /* ⚠ 수동은 선수 스탯을 안 쓴다(new Runner(p,{},true,…)). 그래서 경기형 스킬은
         **판정 창 확대**로만 나타난다 — 자동의 sigma 감소와 같은 말이다.
         ⛔ 감독 모드가 경기 전에 MANUAL.begin() 을 부르고 끝나면 MANUAL.end() 로 비운다.
            아케이드는 늘 0 이다 — 스킬 없는 판은 예전과 완전히 같다. */
      const skillWiden = (this.isPlayer && typeof MANUAL!=='undefined') ? (MANUAL.widen||0) : 0;
      const widen = (RULES.assistWidenPct[assist||'off'] || 0) + this.tierWiden + skillWiden;
      const err = Math.abs(dt - target) / target;
      if(err <= RULES.perfectWindowPct + widen){ j='PERFECT'; this.form = Math.min(RULES.formCeil, this.form + RULES.formGainPerfect); this.addCombo(); }
      else if(err <= RULES.goodWindowPct + widen){ j='GOOD'; this.form = Math.min(RULES.formCeil, this.form + RULES.formGainGood); this.addCombo(); }
      else if(dt < target){ j='EARLY'; this.form = Math.max(RULES.formFloor, this.form - RULES.formLossMiss); this.breakCombo(); }
      else { j='LATE'; this.form = Math.max(RULES.formFloor, this.form - RULES.formLossMiss); this.breakCombo(); }
    }

    this.judge[j]++;
    this.lastJudge = j; this.lastJudgeMs = tMs;
    this.lastSide = side; this.lastInputMs = tMs;
    this.impulse(j);   // SPAM 도 0.25 만큼은 굴러간다 — 멈춰버리면 화면이 죽은 걸로 보인다
    /* ⛔ 디딤이 위상의 **주인**이지만, 위상을 **여기서 밀지는 않는다.**
       예전엔 여기서 +0.5 를 했다 — 그러면 타 사이에는 위상이 굳어서
       8프레임 중 **2개(0과 4)만** 쓰였다(실측). 238ms 씩 멈춘 2프레임 애니메이션이다.
       대신 ① 발이 닿는 순간을 **반 박자 경계로 스냅**하고
            ② 다음 구간의 **속도**를 실제 간격에서 뽑아 simulate 가 매끄럽게 민다.
       박자가 고르면 스냅은 아무 일도 안 하고, 흔들리면 그때만 발을 맞춘다. */
    this.stridePhase = (Math.round(this.stridePhase*2)/2) % 1;
    if(!first && dt > 60 && dt < 1500) this.strideRate = 0.5 / (dt/1000);   // 바퀴/초
    this._tapPhase = true;          // 이제부터 위상은 디딤이 정한다(위 simulate 참고)
    return j;
  }

  impulse(j){
    if(RULES.mashMode) return this.mashImpulse(j);
    const mult = RULES.impulse[j] ?? 0.5;
    const altQ = (j === 'REPEAT') ? 0.7 : 1.0;
    const fatigueFactor = (1 - this.fatigue * lerp(0.35, 0.15, this.stats.stamina/100))
                        * (this.recoverUntilMs > this.lastInputMs ? 0.7 : 1);
    const ph = this.flying ? RULES.phase[2] : phaseAt(this.distM, this.trackM);
    const target = this.baseSpeed() * ph.mult
                 * altQ * this.form * fatigueFactor * mult * this.momentum;
    this.speed = clamp(lerp(this.speed, target, RULES.strideLerp), 0, RULES.maxSpeedCap * RULES.balanceScale);
  }

  /* ⛔ 연타 추진 — 판정이 아니라 **타수**가 속도를 만든다 (RULES.mash 주석 참고).
     남은 여유에 비례해 더하므로 아무리 빨리 쳐도 vmax 를 못 넘고,
     멈추면 감속(mash.decayActive)이 이긴다. */
  mashImpulse(j){
    const M = RULES.mash;
    const ph = this.flying ? RULES.phase[2] : phaseAt(this.distM, this.trackM);
    const fatigueFactor = (1 - this.fatigue * lerp(0.35, 0.15, this.stats.stamina/100))
                        * (this.recoverUntilMs > this.lastInputMs ? 0.7 : 1);
    const vmax = Math.max(0.1, this.baseSpeed() * ph.mult * this.form * fatigueFactor * this.momentum);
    /* 디딤마다 지친다 — 체력이 좋을수록 덜 */
    this.fatigue = Math.min(1, this.fatigue +
      M.fatiguePerStride * lerp(1.30, 0.70, (this.stats.stamina||50)/100));
    const kick = M.kick * vmax * ((j === 'REPEAT') ? M.sameSideMul : 1);
    const room = Math.max(0, 1 - this.speed/vmax);
    this.speed = clamp(this.speed + kick*room, 0, RULES.maxSpeedCap * RULES.balanceScale);
  }

  /* 피니시 린 — 구간은 트랙 길이에 비례한다(400m 에서 92m 는 초반이다) */
  lean(){
    if(this.finished || this.falseStart) return '';
    const k = this.trackM/100;
    const lo = RULES.leanWindowStartM*k, hi = RULES.leanWindowEndM*k;
    const d = this.distM;
    if(d >= lo && d <= hi && !this.leanDone){
      this.leanDone = true;
      const mid=(lo+hi)/2, half=(hi-lo)/2;
      const q = 1 - clamp(Math.abs(d-mid)/half, 0, 1);
      this.leanBonusS = lerp(RULES.leanGainMinS, RULES.leanGainMaxS, q);
      return 'LEAN';
    }
    if(d > 70*k && d < lo){
      this.speed *= (1 - RULES.leanEarlyPenalty);
      return 'LEAN_EARLY';
    }
    return '';
  }

  speedLoss(pct, recoverMs, nowMs){
    this.speed *= (1-pct);
    this.recoverUntilMs = nowMs + recoverMs;
    this.form = Math.max(0.5, this.form - pct);
  }

  simulate(dt, nowMs){
    if(this.falseStart || this.finished) return;
    if(this.started || this.distM > 0){
      /* 입력이 끊기면 자연 감속 — 계속 눌러야 속도가 유지된다.
         ⚠ 원본은 프레임마다 speed*0.985 였다. 그러면 30fps 기기는 감속이 절반만 걸려
            같은 실력으로도 기록이 달라진다. dt 기반 지수감쇠로 바꿔 프레임률과 끊는다. */
      const since = nowMs - this.lastInputMs;
      const idle = clamp(since / (this.targetIntervalMs()*2.2), 0, 1);
      /* ⛔ 연타 모드에서는 '연타 중 감속'이 있어야 타수가 속도를 만든다.
         예전 decayActive(0.08)는 사실상 감속이 없어, 어떤 타수로도 결국 상한에 붙었다. */
      const act = RULES.mashMode ? RULES.mash.decayActive : RULES.decayActive;
      const k = lerp(act, RULES.decayIdle, idle);
      this.speed *= Math.exp(-k*dt);
      this.speed = Math.min(this.speed, RULES.maxSpeedCap * (0.9 + this.stats.technique/500) * Math.max(1, this.momentum));
      /* 탄력은 서서히 사라진다 */
      if(this.momentum !== 1){
        this.momentumT += dt;
        /* ⚠ 감쇠를 실시간 2.4초로 두면, 거리를 압축하는 종목(4x400)에서는 그 사이에
           트랙이 훨씬 많이 지나가 **인계 품질이 기록에 안 남는다**(실측: 엉성 198.8 vs
           능숙 197.8 — 거의 동률). 감쇠 시간을 압축비만큼 늘려 '몇 미터 동안 유효한가'를
           보존한다. */
        const k = Math.exp(-this.momentumT/(2.4*(this.momentumScale||1)));
        this.momentum = 1 + (this._mom0-1)*k;
        if(Math.abs(this.momentum-1) < 0.004) this.momentum = 1;
      }
      /* ⚠ strideRate 는 디딜 때만 갱신된다 — 멈춰도 막대가 그대로면 화면이 거짓말을 한다.
         손을 떼면 같이 내려가게 한다(CK: "조작과 화면 불일치"). */
      if(since > 260) this.strideRate = (this.strideRate||0) * Math.exp(-3.2*dt);
      this.distM += this.speed * dt;
      this.fatigue = Math.min(1, this.fatigue + dt*0.01);
      /* ⚠ 다리 위상을 **두 곳에서** 밀고 있었다 — stride() 가 한 타에 +0.5,
         여기서 매 프레임 속도에 비례해 또. 실측: **타당 1.016 바퀴**가 돌았다.
         한 번 디디면 반 바퀴(0.5)가 맞다 — 다리가 정확히 두 배 빨랐다(재봉틀).
         ⛔ 디딤이 있는 주자는 **디딤이 위상의 주인**이다. 발이 닿는 순간과 그림이
            어긋나면 조작감이 통째로 죽는다. 시간 구동은 디딤이 없는 주자(관전용
            더미 등)에게만 남긴다. */
      this.stridePhase = (this.stridePhase +
        dt * (this._tapPhase ? (this.strideRate || 2.1) : this.speed * 0.35)) % 1;
      for(const m of [30,60,90,this.trackM]){
        const k = String(Math.round(m));
        if(this.splits[k]===undefined && this.distM >= m) this.splits[k] = (nowMs-this.gunMs)/1000;
      }
      if(this.distM >= this.trackM){
        this.distM = this.trackM;
        this.finished = true;
        this.finishTimeS = Math.max(0.01, (nowMs-this.gunMs)/1000 - this.leanBonusS);
      }
    }
  }
}

/* 유틸 */
function lerp(a,b,t){ return a + (b-a)*t; }
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
