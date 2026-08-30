/* ══════════════════════════════════════════════════════════════════
   110m 허들 — 달리기와 같지만 허들 앞에서 액션으로 뛰어넘어야 한다.
   너무 멀리서 뛰면 걸리고(Clip), 아예 못 뛰면 넘어진다(Crash).
   ══════════════════════════════════════════════════════════════════ */
'use strict';

class HurdlesEvent extends SprintEvent {
  reset(){
    super.reset();
    /* ⚠ 이름을 marks 로 두면 필드 종목의 '시기별 기록'과 충돌해
       결과 화면이 허들 위치를 기록으로 찍는다(실측). */
    /* ⚠ 예전엔 110m 허들 상수로 못 박혀 있었다. 종목 정의에서 읽어
       400m 허들·3000m 장애물이 같은 코드로 돌게 한다. */
    const H = this.def.hurdle || {};
    this.hCount   = H.count   ?? RULES.hurdleCount;
    this.hFirst   = H.first   ?? RULES.hurdleFirstM;
    this.hSpacing = H.spacing ?? RULES.hurdleSpacingM;
    this.waterAt  = H.waterEvery || 0;          // 3000m 장애물 물웅덩이 간격(번째)
    this.hurdleMarks = [];
    for(let i=0;i<this.hCount;i++) this.hurdleMarks.push(this.hFirst + i*this.hSpacing);
    this.cleared = new Map();               // runner → Set(index)
    for(const r of this.all){ this.cleared.set(r, new Set()); r.airUntil = 0; }
  }

  onAction(tMs){
    if(this.phase!=='RUN') return;
    this.tryHurdle(this.player, tMs);
  }

  tryHurdle(r, nowMs){
    const done = this.cleared.get(r);
    let bi=-1, bd=1e9;
    for(let i=0;i<this.hurdleMarks.length;i++){
      if(done.has(i)) continue;
      const d = Math.abs(r.distM - (this.hurdleMarks[i]-0.2));
      if(d<bd){ bd=d; bi=i; }
    }
    if(bi<0) return;
    let q;
    if(bd <= RULES.hurdleCleanWindowM){
      /* 깨끗이 넘어도 약간은 잃는다. 0 이면 허들이 평지보다 빨라지는 역전이 난다
         (실측: 그 상태에서 110mH 10.41초 < 100m 9.51초 의 페이스). */
      q='CLEAN'; r.hurdlesClean++; done.add(bi); r.speedLoss(0.105, 150, nowMs); r.airUntil = nowMs+280;
      if(r.isPlayer){ Sfx.beep(1320,0.10,'square',0.13); this.hurdleMsg='CLEAN!'; }
    } else if(bd <= RULES.hurdleSafeWindowM){
      q='SAFE'; done.add(bi); r.speedLoss(0.06,200,nowMs); r.airUntil = nowMs+280;
      if(r.isPlayer){ Sfx.beep(880,0.08,'square',0.10); this.hurdleMsg='SAFE'; }
    } else if(bd <= RULES.hurdleSafeWindowM*1.6){
      q='CLIP'; r.hurdlesClip++; done.add(bi); r.speedLoss(RULES.hurdleClipLoss,400,nowMs);
      if(r.isPlayer){ Sfx.beep(220,0.16,'sawtooth',0.14); this.hurdleMsg='걸렸다!'; }
    } else {
      q='EARLY_JUMP';                        // 허들과 상관없는 곳에서 뛴 것 — 속도만 조금 잃는다
      r.speedLoss(0.05,180,nowMs);
      if(r.isPlayer){ Sfx.beep(180,0.10,'sawtooth',0.10); this.hurdleMsg='너무 멀어'; }
    }
    if(r.isPlayer){ this.hurdleMsgAt = nowMs; }
    return q;
  }

  update(dt){
    const before = this.phase;
    super.update(dt);
    if(this.phase!=='RUN') return;
    const now=this.t;
    // 안 넘고 지나친 허들은 넘어진 것으로 친다
    for(const r of this.all){
      const done=this.cleared.get(r);
      for(let i=0;i<this.hurdleMarks.length;i++){
        if(done.has(i)) continue;
        if(r.distM > this.hurdleMarks[i] + RULES.hurdleSafeWindowM*1.6){
          done.add(i); r.hurdlesCrash++; r.speedLoss(RULES.hurdleCrashLoss, 800, now);
          if(r.isPlayer){ Sfx.beep(140,0.3,'sawtooth',0.16); this.hurdleMsg='넘어졌다!'; this.hurdleMsgAt=now; }
        }
      }
    }
  }

  aiStep(now){
    super.aiStep(now);
    for(const r of this.rivals){
      const done=this.cleared.get(r);
      for(let i=0;i<this.hurdleMarks.length;i++){
        if(done.has(i)) continue;
        // AI 는 실력에 비례해 정확한 지점에서 뛴다
        const err = (Math.random()*2-1) * (r.aiJitter/90) * 0.7;
        if(r.distM >= this.hurdleMarks[i]-0.2+err){ this.tryHurdle(r, now); break; }
      }
    }
  }

  draw(ctx){
    Track.drawBack(ctx, this.camM, this.trackM);
    Track.drawLanes(ctx, this.camM, this.mPerPx);
    Track.drawMarks(ctx, this.camM, this.mPerPx);
    // 허들
    for(const m of this.hurdleMarks){
      const x = Math.round((m - this.camM)/this.mPerPx);
      if(x < -8 || x > VW+8) continue;
      for(let i=0;i<3;i++){
        const y = Track.laneFoot(i);
        /* 허들도 원근을 탄다 — 선수만 작아지고 허들이 그대로면 어긋나 보인다 */
        const k = Track.laneScale(i);
        /* 3000m 장애물 — 정해진 번째마다 물웅덩이 */
        const hi = this.hurdleMarks.indexOf(m);
        if(this.waterAt && hi>=0 && (hi+1)%this.waterAt===0){
          if(BG.obj(BG.ctx(),'waterjump-hd',x,y,Math.round(32*k))){ continue; }
          ctx.fillStyle='#12507a'; ctx.fillRect(x-2, y-3, Math.round(26*k), 3);
          ctx.fillStyle='#e8e2d6'; ctx.fillRect(x-Math.round(4*k), y-Math.round(13*k), Math.round(9*k), 2);
          continue;
        }
        if(BG.obj(BG.ctx(),'steeple-barrier-hd',x,y,Math.round(32*k))) continue;
        if(BG.obj(BG.ctx(),'hurdle-hd',x,y,Math.round(32*k))) continue;
        if(Art.blit(ctx,'hurdle',x,y)) continue;
        const bw=Math.round(9*k), bh=Math.round(13*k), lh=Math.round(11*k);
        ctx.fillStyle='#e8e2d6'; ctx.fillRect(x-Math.round(4*k), y-bh, bw, 2);
        ctx.fillStyle='#c9cede'; ctx.fillRect(x-Math.round(3*k), y-lh, 1, lh); ctx.fillRect(x+Math.round(3*k), y-lh, 1, lh);
      }
    }
    Track.drawFinish(ctx, this.camM, this.mPerPx, this.trackM);
    const laneColor=['#5aaaff','#ffd75e','#ff6b8a'];
    for(let i=0;i<3;i++){
      const r=this.all.find(a=>a.lane===i); if(!r) continue;
      let y = Track.laneFoot(i);
      // 도약 중이면 위로 띄운다
      if(r.airUntil > this.t){
        const p = 1 - (r.airUntil - this.t)/280;
        y -= Math.sin(p*Math.PI)*14;
      }
      const x = Math.round((r.distM - this.camM)/this.mPerPx);
      if(x<-20||x>VW+20) continue;
      /* ⚠ 이 종목만 옛 픽셀 스프라이트를 쓰고 있었다 — 달리기는 고해상도인데
         허들만 각진 인형이라 같은 게임으로 안 보였다. */
      if(CharHD.enabled){
        const sp=['impala','springbok','serval'][i];
        (this._hd=this._hd||[]).push({ sp, x, y, ph:r.stridePhase,
          o:{ lean:r.leanDone && r.distM>RULES.leanWindowStartM, crouch:this.phase==='SET',
              airborne:r.airUntil>this.t, scale:Track.laneScale(i),
              rare:(SPECIES[sp]&&SPECIES[sp].rare)||1, moving:this.phase==='RUN', t:this.t } });
      }
      else drawRunner(ctx, x, y, r.stridePhase, laneColor[i],
        { lean:r.leanDone && r.distM>RULES.leanWindowStartM, crouch:this.phase==='SET' });
    }
    if(this.flash>0){ ctx.fillStyle=`rgba(255,255,255,${this.flash*0.5})`; ctx.fillRect(0,0,VW,VH); }
  }

  drawUI(uctx){
    super.drawUI(uctx);
    if(this.phase!=='RUN') return;
    // 다음 허들까지 남은 거리 — 이게 없으면 언제 뛸지 알 수 없다
    const done=this.cleared.get(this.player);
    let next=null;
    for(let i=0;i<this.hurdleMarks.length;i++) if(!done.has(i)){ next=this.hurdleMarks[i]; break; }
    if(next!==null){
      const left = next - 0.2 - this.player.distM;
      if(left < 6 && left > -1.2){
        /* ⛔ 예전엔 '허들 3.2m' → '지금 뛰어!' 라는 **글자**였다. 그런데 CLEAN 창은
           ±0.35m = 9m/s 에서 **±39ms** 다. 글자를 읽고 누르면 이미 늦는다 —
           실측: 도약이 60ms 늦으면 clean 10 → 0, 기록 11.50 → 12.89.
           박자는 게이지로 가르치면서 도약은 글자로 알려 주고 있었다.
           **리듬 게이지와 같은 눈금**을 준다 — 다가오는 표시를 보고 미리 준비한다.
           띠의 폭이 곧 판정이다(Clean 초록 · Safe 연초록). 보이는 게 곧 규칙이다. */
        const RANGE=4.0;                       // 4m 앞부터 보여 준다
        const bw=132, bx=VW/2-bw/2, by=52, bh=9;
        const toX = m => bx + bw*clamp(0.5 + (m/RANGE)*0.5, 0, 1);   // 0m = 가운데
        plate(uctx, bx-6, by-9, bw+12, bh+16, 0.72);
        uctx.fillStyle='rgba(242,245,250,.14)'; uctx.fillRect(bx, by, bw, bh);
        /* 판정 띠 — 코드가 쓰는 값을 그대로 그린다(어긋날 자리를 안 만든다) */
        const safe=RULES.hurdleSafeWindowM, clean=RULES.hurdleCleanWindowM;
        uctx.fillStyle='rgba(92,255,156,.20)';
        uctx.fillRect(toX(-safe), by, toX(safe)-toX(-safe), bh);
        uctx.fillStyle='rgba(92,255,156,.55)';
        uctx.fillRect(toX(-clean), by, toX(clean)-toX(-clean), bh);
        uctx.fillStyle='rgba(92,255,156,.95)'; uctx.fillRect(bx+bw/2, by-2, 1, bh+4);
        /* 다가오는 표시 — 오른쪽에서 가운데로 온다. 가운데에 닿는 순간이 도약이다. */
        const px = toX(left);
        uctx.fillStyle = Math.abs(left)<=clean ? PAL.green : PAL.white;
        uctx.fillRect(Math.round(px)-1, by-3, 2, bh+6);
        txt(uctx, left>0 ? `${left.toFixed(1)}m` : K('지금'),
            VW/2, by-8, 8, Math.abs(left)<=clean?PAL.green:PAL.dim, 'center', 700);
      }
    }
    if(this.hurdleMsg && this.t - this.hurdleMsgAt < 700){
      const a=1-(this.t-this.hurdleMsgAt)/700;
      uctx.save(); uctx.globalAlpha=a;
      const bad = /걸|넘어|멀/.test(this.hurdleMsg);
      txt(uctx, this.hurdleMsg, VW/2, 76, 13, bad?PAL.red:PAL.green, 'center', 700);
      uctx.restore();
    }
    const p=this.player;
    txt(uctx, `허들 ${p.hurdlesClean}/${this.hCount} 성공`, 8, Track.GAUGE_Y-12, 9, PAL.dim);
  }
}
