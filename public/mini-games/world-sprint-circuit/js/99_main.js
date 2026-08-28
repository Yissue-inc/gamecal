/* ══════════════════════════════════════════════════════════════════
   진입점 — 루프와 시작 게이트
   ══════════════════════════════════════════════════════════════════ */
'use strict';

let lastT = 0;
function frame(now){
  try{ frameStep(now); }
  catch(e){ if(!frame._warned){ frame._warned=true; console.error('frame error', e); } }
  requestAnimationFrame(frame);      // 한 프레임이 죽어도 루프는 계속 돈다
}

/* 워치독 — 임베드(iframe)나 배경 탭에서 rAF 가 통째로 멎는 경우가 있다.
   실측: 천로역정이 같은 이유로 25fps 로 떨어지고 5초 후 얼었다.
   rAF 가 24ms 넘게 안 오면 여기서 대신 한 프레임 돌린다. */
function installWatchdog(){
  let guard=0;
  setInterval(()=>{
    const now = performance.now();
    if(now - lastT > 24 && guard < 10){
      guard++;
      /* ⚠ try/finally 가 없으면 프레임에서 예외가 한 번 날 때마다 guard 가 새고,
         10번 쌓이면 워치독이 **영구히** 멎는다(실측: 383초 뒤 게임이 통째로 얼었다).
         한 프레임 실패가 게임 전체를 죽이면 안 된다. */
      try{ frameStep(now); }
      catch(e){ if(!installWatchdog._warned){ installWatchdog._warned=true; console.error('frame error', e); } }
      finally{ guard--; }
    }
  }, 8);
}
function frameStep(now){
  if(Screen.ensure) Screen.ensure();
  /* ⚠ 위쪽만 막고 아래쪽을 안 막았다. 시계가 뒤로 가면(탭 복귀·시계 보정·워치독과
     겹칠 때) dt 가 음수가 되고 경기 시간이 거꾸로 흐른다 — 총성이 영영 안 울린다.
     실측으로 잡았다: 경기 시각이 -22329ms 까지 갔다. */
  const dt = clamp((now - lastT)/1000 || 0, 0, 0.05);
  lastT = now;
  G.update(dt);
  Screen.clearUI();
  G.draw(Screen.ctx, Screen.uctx);
}

/* READY(선택 화면에서 '준비됨'으로 보이는 목록)와 classFor(실제 클래스 표)는
   **둘 다 손으로 관리하는 목록**이다. 서로 어긋나면 조용히 갈라진다:
     · READY 에만 있으면 → 골랐을 때 '아직 준비 중입니다' 토스트만 뜨고 안 시작한다
     · classFor 에만 있으면 → 만들어 놓고 아무도 못 고른다
   ⚠ 마라톤을 넣으면서 실제로 전자를 겪었다. 부팅 때 대조해 바로 터뜨린다. */
function verifyReady(){
  const bad=[];
  for(const id of READY) if(!G.classFor(EVENT_BY_ID[id])) bad.push('READY 에만: '+id);
  for(const e of EVENTS) if(G.classFor(e) && !READY.includes(e.id)) bad.push('classFor 에만: '+e.id);
  if(bad.length) throw new Error('종목 목록이 어긋났다 — '+bad.join(' · '));
}

/* HTML 안의 글자는 캔버스 txt() 를 안 거친다 → K() 가 닿지 않는다.
   ⚠ 그 결과 **영어판의 첫 화면(조작 선택)이 통째로 한국어**였다. 캔버스만 번역해
      놓고 다 됐다고 본 것이다. 부팅 때 한 번 DOM 을 훑어 같은 표로 바꾼다. */
function translateDom(){
  if(LANG==='ko') return;
  document.querySelectorAll('#gate .sub, #gate .cbtn b, #gate .cbtn i, .pbtn')
    .forEach(el=>{ const t=el.textContent.trim(); if(t) el.textContent = K(t); });
}

function boot(){
  Screen.init(); Input.init(); Save.load(); Sfx.loadPrefs();
  CharHD.verifyCasts();
  verifyReady();
  translateDom();
  const gate=document.getElementById('gate');
  const bKey=document.getElementById('g-key'), bTouch=document.getElementById('g-touch');
  if(!Ctrl.load()) Ctrl.mode = Ctrl.suggested();
  const paint=()=>{ bKey.classList.toggle('sel', Ctrl.mode==='keyboard');
                    bTouch.classList.toggle('sel', Ctrl.mode==='touch'); };
  paint(); Ctrl.apply();
  const go=(m)=>{ Ctrl.set(m); Sfx.unlock(); gate.remove(); };
  bKey.addEventListener('click', e=>{ e.stopPropagation(); go('keyboard'); });
  bTouch.addEventListener('click', e=>{ e.stopPropagation(); go('touch'); });
  installWatchdog();
  requestAnimationFrame(t=>{ lastT=t; frame(t); });
  if(location.search.includes('qa=1')) window.__g = { G, Input, Ctrl, Save, RULES, Sfx, Screen };
}
if(document.readyState==='loading') addEventListener('DOMContentLoaded', boot); else boot();
