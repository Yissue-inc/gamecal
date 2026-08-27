/* ══════════════════════════════════════════════════════════════════
   러너 — 교대 스트라이드 물리 (Godot SprintRunner.gd 이식)
   핵심: 좌/우를 "일정한 간격으로 번갈아" 눌러야 빨라진다.
        연타(SPAM)·같은쪽 반복(REPEAT)은 오히려 느려진다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

class Runner {
  constructor(lane, stats, isPlayer, trackM){
    this.lane = lane;
    this.stats = Object.assign({ speed:50, acceleration:50, stamina:50, technique:50, rhythm:50, power:50 }, stats||{});
    this.isPlayer = !!isPlayer;
    this.trackM = trackM;
    this.reset(0);
  }
  reset(gunMs){
    this.gunMs = gunMs;
    this.distM = 0; this.speed = 0;
    this.fatigue = 0; this.form = 1.0;
    this.lastSide = 0; this.lastInputMs = -1e9;
    this.reactionMs = -1;
    this.finished = false; this.finishTimeS = 0;
    this.falseStart = false;
    this.leanDone = false; this.leanBonusS = 0;
    this.started = false;
    this.splits = {};
    this.judge = { PERFECT:0, GOOD:0, EARLY:0, LATE:0, REPEAT:0, SPAM:0 };
    this.lastJudge = ''; this.lastJudgeMs = -1e9;
    this.recoverUntilMs = 0;
    this.stridePhase = 0;                 // 다리 애니메이션용 0..1
    this.hurdlesClean = 0; this.hurdlesClip = 0; this.hurdlesCrash = 0;
  }

  /* 이 선수가 노리는 교대 간격(ms). 리듬 스탯이 좋을수록 빠른 케이던스를 감당한다 */
  targetIntervalMs(){
    const cad = RULES.targetCadenceHz * lerp(0.92, 1.08, this.stats.rhythm/100);
    return 1000 / Math.max(cad, 0.1);
  }
  baseSpeed(){
    const mix = (this.stats.speed*0.65 + this.stats.acceleration*0.35)/100;
    return RULES.baseSpeed * lerp(0.85, 1.15, mix) * RULES.balanceScale;
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

    if(dt < RULES.spamWindowMs){
      j='SPAM'; this.fatigue = Math.min(1, this.fatigue + RULES.fatiguePerSpam);
    } else if(dt < RULES.minInputIntervalMs){
      j='SPAM'; this.fatigue = Math.min(1, this.fatigue + RULES.fatiguePerSpam*0.5);
    } else if(this.lastSide === side){
      j='REPEAT'; this.form = Math.max(RULES.formFloor, this.form - RULES.formLossRepeat);
    } else if(first){
      j='GOOD';                                   // 첫 스트라이드는 비교 대상이 없다
    } else {
      const target = this.targetIntervalMs();
      const widen = RULES.assistWidenPct[assist||'off'] || 0;
      const err = Math.abs(dt - target) / target;
      if(err <= RULES.perfectWindowPct + widen){ j='PERFECT'; this.form = Math.min(RULES.formCeil, this.form + RULES.formGainPerfect); }
      else if(err <= RULES.goodWindowPct + widen){ j='GOOD'; this.form = Math.min(RULES.formCeil, this.form + RULES.formGainGood); }
      else if(dt < target){ j='EARLY'; this.form = Math.max(RULES.formFloor, this.form - RULES.formLossMiss); }
      else { j='LATE'; this.form = Math.max(RULES.formFloor, this.form - RULES.formLossMiss); }
    }

    this.judge[j]++;
    this.lastJudge = j; this.lastJudgeMs = tMs;
    this.lastSide = side; this.lastInputMs = tMs;
    this.impulse(j);   // SPAM 도 0.25 만큼은 굴러간다 — 멈춰버리면 화면이 죽은 걸로 보인다
    this.stridePhase = (this.stridePhase + 0.5) % 1;
    return j;
  }

  impulse(j){
    const mult = RULES.impulse[j] ?? 0.5;
    const altQ = (j === 'REPEAT') ? 0.7 : 1.0;
    const fatigueFactor = (1 - this.fatigue * lerp(0.35, 0.15, this.stats.stamina/100))
                        * (this.recoverUntilMs > this.lastInputMs ? 0.7 : 1);
    const target = this.baseSpeed() * phaseAt(this.distM, this.trackM).mult
                 * altQ * this.form * fatigueFactor * mult;
    this.speed = clamp(lerp(this.speed, target, RULES.strideLerp), 0, RULES.maxSpeedCap * RULES.balanceScale);
  }

  /* 피니시 린 */
  lean(){
    if(this.finished || this.falseStart) return '';
    const d = this.distM;
    if(d >= RULES.leanWindowStartM && d <= RULES.leanWindowEndM && !this.leanDone){
      this.leanDone = true;
      const mid = (RULES.leanWindowStartM + RULES.leanWindowEndM)/2;
      const half = (RULES.leanWindowEndM - RULES.leanWindowStartM)/2;
      const q = 1 - clamp(Math.abs(d-mid)/half, 0, 1);
      this.leanBonusS = lerp(RULES.leanGainMinS, RULES.leanGainMaxS, q);
      return 'LEAN';
    }
    if(d > 70 && d < RULES.leanWindowStartM){
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
      const k = lerp(RULES.decayActive, RULES.decayIdle, idle);
      this.speed *= Math.exp(-k*dt);
      this.speed = Math.min(this.speed, RULES.maxSpeedCap * (0.9 + this.stats.technique/500));
      this.distM += this.speed * dt;
      this.fatigue = Math.min(1, this.fatigue + dt*0.01);
      this.stridePhase = (this.stridePhase + dt * this.speed * 0.35) % 1;
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
