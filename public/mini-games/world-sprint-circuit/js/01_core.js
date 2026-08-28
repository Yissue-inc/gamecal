/* ══════════════════════════════════════════════════════════════════
   코어 — 화면·입력·저장
   천로역정에서 검증된 구조를 그대로 쓴다:
     · 저해상도 게임 캔버스(픽셀) + 고해상도 UI 캔버스(글자) 2장
     · 조작은 키보드/화면버튼을 플레이어가 고른다 (기기로 강제하지 않는다)
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const VW = 480, VH = 270;                 // 내부 해상도 (16:9)
const ASSET_VER = '1787882395';
function assetUrl(p){ return `${p}?v=${ASSET_VER}`; }

/* ── 화면 ────────────────────────────────────────────────── */
const Screen = {
  cv:null, ctx:null, ui:null, uctx:null, bg:null, bctx:null, scale:1, dpr:1,
  init(){
    this.cv = document.getElementById('game');
    this.cv.width = VW; this.cv.height = VH;
    this.ctx = this.cv.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;   // 픽셀은 뭉개지 않는다
    this.ui = document.getElementById('ui');
    this.uctx = this.ui.getContext('2d');
    /* 배경 층 — 게임 캔버스 '아래'. 고해상도 배경 어셋 전용.
       ⚠ UI 층(위)에 그리면 픽셀 요소(레인선·허들·결승선)를 통째로 덮는다.
       어셋이 없는 부분은 이 층을 비워 두고, 게임 캔버스가 지금처럼 코드로 그린다. */
    this.bg = document.getElementById('bg');
    this.bctx = this.bg ? this.bg.getContext('2d') : null;
    addEventListener('resize', ()=>this.fit());
    this.fit();
  },
  fit(){
    const wrap = document.getElementById('wrap');
    const w = wrap.clientWidth, h = wrap.clientHeight;
    // 정수배로만 키운다 — 소수배는 픽셀이 고르지 않게 뭉개진다
    let s = Math.min(w/VW, h/VH);
    s = s >= 1 ? Math.floor(s*2)/2 : s;
    this.scale = s;
    const cw = Math.round(VW*s), ch = Math.round(VH*s);
    for(const c of [this.cv, this.ui, this.bg]){ if(c){ c.style.width = cw+'px'; c.style.height = ch+'px'; } }
    this.dpr = Math.min(devicePixelRatio||1, 2);
    this.ui.width = Math.round(cw*this.dpr); this.ui.height = Math.round(ch*this.dpr);
    this.uctx.setTransform(this.dpr*s, 0, 0, this.dpr*s, 0, 0);   // UI 도 게임 좌표로 그린다
    this.uctx.imageSmoothingEnabled = true;
    if(this.bg){
      this.bg.width = Math.round(cw*this.dpr); this.bg.height = Math.round(ch*this.dpr);
      this.bctx.setTransform(this.dpr*s, 0, 0, this.dpr*s, 0, 0);
      this.bctx.imageSmoothingEnabled = true;
    }
  },
  clearUI(){ this.uctx.save(); this.uctx.setTransform(1,0,0,1,0,0);
    this.uctx.clearRect(0,0,this.ui.width,this.ui.height); this.uctx.restore();
    if(this.bctx){ this.bctx.save(); this.bctx.setTransform(1,0,0,1,0,0);
      this.bctx.clearRect(0,0,this.bg.width,this.bg.height); this.bctx.restore(); } },
};

/* ── 입력 ────────────────────────────────────────────────── */
const Input = {
  keys:{}, pressBuf:{}, relBuf:{}, padEnabled:false,
  map:{
    left  : ['KeyA','ArrowLeft'],
    right : ['KeyD','ArrowRight'],
    up    : ['KeyW','ArrowUp'],
    down  : ['KeyS','ArrowDown'],
    action: ['Space','KeyK','Enter'],
    back  : ['Escape','KeyQ','Backspace'],
    pause : ['KeyP'],
  },
  /* 이번 프레임에 눌리기 시작했나 (타이밍 게임이라 이게 핵심) */
  pressed(act){ return this.map[act].some(c=>this.pressBuf[c]); },
  released(act){ return this.map[act].some(c=>this.relBuf[c]); },
  down(act){ return this.map[act].some(c=>this.keys[c]); },
  /* 눌린 시각(ms) — 판정은 프레임이 아니라 실제 시각으로 한다 */
  pressTime:{},
  init(){
    addEventListener('keydown', e=>{
      if(e.repeat) return;                       // 키 꾹 누름의 자동반복은 스트라이드가 아니다
      if(!this.keys[e.code]) this.pressBuf[e.code]=true;
      this.keys[e.code]=true; this.pressTime[e.code]=performance.now();
      if(this.owns(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e=>{
      if(this.keys[e.code]) this.relBuf[e.code]=true;
      this.keys[e.code]=false;
      if(this.owns(e.code)) e.preventDefault();
    });
    addEventListener('blur', ()=>{ for(const k in this.keys){ if(this.keys[k]) this.relBuf[k]=true; this.keys[k]=false; } });
    this.initPad();
  },
  owns(code){ for(const a in this.map) if(this.map[a].includes(code)) return true; return false; },
  /* 프레임 끝에서 비운다 */
  flush(){ this.pressBuf={}; this.relBuf={}; },
  /* 꾹 누르면 반복 — 목록에서 한 칸씩만 가면 답답하다 */
  _rep:{},
  repeat(act, now){
    if(this.pressed(act)){ this._rep[act]=now+340; return true; }
    if(this.down(act)){
      if(now >= (this._rep[act]||1e18)){ this._rep[act]=now+90; return true; }
    } else delete this._rep[act];
    return false;
  },

  /* 화면 버튼 — 천로역정에서 잡은 결함 셋을 처음부터 반영:
       ① 짧은 탭 유실 → pressBuf 사용 (keys[] 직접 조작 금지)
       ② 미끄러지면 키가 굳음 → 포인터 캡처 + 전역 해제
       ③ 마우스로 못 누름 → pointer 이벤트 */
  initPad(){
    const bind=(id, act)=>{
      const el=document.getElementById(id); if(!el) return;
      const code=this.map[act][0];
      el.style.touchAction='none';
      el.addEventListener('pointerdown', e=>{
        if(!this.padEnabled) return;
        e.preventDefault();
        try{ el.setPointerCapture(e.pointerId); }catch(_){}
        if(!this.keys[code]) this.pressBuf[code]=true;
        this.keys[code]=true; this.pressTime[code]=performance.now();
        el.classList.add('on'); Sfx.unlock();
      });
      const up=e=>{
        if(!this.keys[code]) return;
        this.relBuf[code]=true; this.keys[code]=false;
        el.classList.remove('on');
        try{ el.releasePointerCapture(e.pointerId); }catch(_){}
      };
      el.addEventListener('pointerup',up);
      el.addEventListener('pointercancel',up);
      el.addEventListener('lostpointercapture',up);
    };
    bind('p-left','left'); bind('p-right','right');
    bind('p-up','up');     bind('p-down','down');
    bind('p-act','action'); bind('p-back','back'); bind('p-pause','pause');
    // 전역 안전망 — 버튼 밖에서 손을 떼도 반드시 풀린다
    addEventListener('pointerup', ()=>{ if(!this.padEnabled) return;
      for(const el of document.querySelectorAll('.pbtn.on')) el.classList.remove('on'); });
  },
};

/* ── 조작 방식 (키보드 / 화면버튼) ────────────────────────── */
const CTRL_KEY = 'wsc_control';
const Ctrl = {
  mode:'keyboard',
  load(){ let s=null; try{ s=localStorage.getItem(CTRL_KEY); }catch(_){}
    if(s==='keyboard'||s==='touch'){ this.mode=s; return true; } return false; },
  set(m){ this.mode=m; try{ localStorage.setItem(CTRL_KEY,m); }catch(_){} this.apply(); },
  suggested(){ return (('ontouchstart' in window) || (navigator.maxTouchPoints||0)>0 ||
    (matchMedia && matchMedia('(pointer:coarse)').matches)) ? 'touch' : 'keyboard'; },
  apply(){
    const pad=document.getElementById('pad');
    const on = this.mode==='touch';
    if(pad) pad.style.display = on ? 'grid' : 'none';
    Input.padEnabled = on;
  },
};

/* ── 저장 ────────────────────────────────────────────────── */
const SAVE_KEY = 'wsc_save';
const Save = {
  data:{ best:{}, unlocked:['sprint100'], lastEvent:'sprint100' },
  load(){ try{ const s=localStorage.getItem(SAVE_KEY); if(s) Object.assign(this.data, JSON.parse(s)); }catch(_){} },
  write(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); }catch(_){} },
  /* 기록 갱신됐으면 true */
  record(eventId, value, higherIsBetter){
    const cur = this.data.best[eventId];
    const better = cur===undefined || (higherIsBetter ? value>cur : value<cur);
    if(better){ this.data.best[eventId]=value; this.write(); }
    return better;
  },
};
