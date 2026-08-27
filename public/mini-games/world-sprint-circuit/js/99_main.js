/* ══════════════════════════════════════════════════════════════════
   진입점 — 루프와 시작 게이트
   ══════════════════════════════════════════════════════════════════ */
'use strict';

let lastT = 0;
function frame(now){
  frameStep(now);
  requestAnimationFrame(frame);
}

/* 워치독 — 임베드(iframe)나 배경 탭에서 rAF 가 통째로 멎는 경우가 있다.
   실측: 천로역정이 같은 이유로 25fps 로 떨어지고 5초 후 얼었다.
   rAF 가 24ms 넘게 안 오면 여기서 대신 한 프레임 돌린다. */
function installWatchdog(){
  let guard=0;
  setInterval(()=>{
    const now = performance.now();
    if(now - lastT > 24 && guard < 10){ guard++; frameStep(now); guard--; }
  }, 8);
}
function frameStep(now){
  const dt = Math.min(0.05, (now - lastT)/1000 || 0);
  lastT = now;
  G.update(dt);
  Screen.clearUI();
  G.draw(Screen.ctx, Screen.uctx);
}

function boot(){
  Screen.init(); Input.init(); Save.load();
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
