/* ══════════════════════════════════════════════════════════════════
   코어 — 화면·입력·저장
   천로역정에서 검증된 구조를 그대로 쓴다:
     · 저해상도 게임 캔버스(픽셀) + 고해상도 UI 캔버스(글자) 2장
     · 조작은 키보드/화면버튼을 플레이어가 고른다 (기기로 강제하지 않는다)
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const VW = 480, VH = 270;                 // 내부 해상도 (16:9)
const ASSET_VER = '1788044664';
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
    /* ⚠ 리사이즈 도중 한 번이라도 0 으로 재면 배율이 0 으로 굳고 **화면이 통째로 검게** 남는다.
       resize 이벤트는 다시 안 오므로 영구 고장이다(실측: 창 크기를 바꾸자 그대로 멈췄다).
       모바일에서 회전·주소창 숨김에 그대로 일어난다. 0 이면 적용하지 않고 다음에 다시 잰다. */
    if(!(w>0 && h>0)) return;
    this._lastW = w; this._lastH = h;
    /* 배율은 단계로만 키운다 — 아무 소수배나 쓰면 픽셀이 고르지 않게 뭉개진다.
       ⚠ 그런데 0.5 단위만 쓰면 **폰 가로에서 화면의 40%를 버린다**:
          812x375 는 1.39배가 들어가는데 1.0 으로 내려가 480x270 으로 그려졌다.
          큰 화면(2배 이상)은 0.5 단위 그대로 두고, 작은 화면만 0.25 단위로 쪼갠다. */
    let s = Math.min(w/VW, h/VH);
    s = s >= 2 ? Math.floor(s*2)/2 : (s >= 1 ? Math.floor(s*4)/4 : s);
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
  /* 매 프레임 아주 싸게 확인한다 — 배율이 0 이거나 창이 달라졌으면 다시 맞춘다.
     resize 이벤트만 믿으면 위 상황에서 복구할 길이 없다. */
  ensure(){
    const wrap = document.getElementById('wrap'); if(!wrap) return;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if(!(w>0 && h>0)) return;
    if(this.scale>0 && w===this._lastW && h===this._lastH) return;
    this.fit();
  },
  /* ── 화면 흔들림 ────────────────────────────────────────
     연타가 기믹인 종목(원반·해머·유도)에서 '점점 세지는 느낌'을 만드는 장치.
     ⚠ 캔버스 안에서 translate 로 흔들면 세 층의 변환을 각각 건드려야 하고
        가장자리에 빈틈이 생긴다. **캔버스 엘리먼트 자체**를 CSS 로 민다 —
        세 층이 통째로 같이 움직여서 어긋날 수가 없다. */
  shakeAmt: 0,
  shake(a){ this.shakeAmt = Math.max(this.shakeAmt, a); },
  stepShake(dt){
    if(this.shakeAmt <= 0.001){
      if(this._shook){ this._shook=false;
        for(const c of [this.cv,this.ui,this.bg]) if(c) c.style.transform=''; }
      return;
    }
    this.shakeAmt = Math.max(0, this.shakeAmt - dt*4.5);
    const a = this.shakeAmt * 4;                    // px
    const x = (Math.random()*2-1)*a, y = (Math.random()*2-1)*a*0.6;
    const tf = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    for(const c of [this.cv,this.ui,this.bg]) if(c) c.style.transform=tf;
    this._shook = true;
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
    /* ⚠ 첫 코드가 화면 버튼(▼)에 바인딩된다. KeyS 를 앞에 두면 그 코드가 예전 액션
       매핑과 겹쳐 모바일에서 ▼ 가 액션까지 눌렀다. 겹치지 않는 KeyX 를 앞에 둔다. */
    down  : ['KeyX','KeyS','ArrowDown'],
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
    this.initGamepad();
    // 전역 안전망 — 버튼 밖에서 손을 떼도 반드시 풀린다
    addEventListener('pointerup', ()=>{ if(!this.padEnabled) return;
      for(const el of document.querySelectorAll('.pbtn.on')) el.classList.remove('on'); });
  },

  /* ── 게임패드 ──────────────────────────────────────────────
     ⚠ 이 게임의 핵심 조작은 **좌·우를 238ms 간격으로 번갈아 치는 것**이다.
        패드로는 그게 훨씬 편하다(엄지 두 개). 그런데 지원이 아예 없었다 —
        `navigator.getGamepads()` 호출이 코드에 0회였다. 스팀에 낼 물건이라면
        빠질 수 없는 기본기다.
     구현은 키보드와 **같은 코드 경로**로 흘려보낸다: 패드 버튼이 눌리면
     키보드 코드를 대신 눌러 준다. 그래야 48종목이 한 줄도 안 바뀐다. */
  padMap: {
    12:'up', 13:'down', 14:'left', 15:'right',      // D-pad
    0:'action', 1:'back', 2:'action', 3:'up',        // A / B / X / Y
    9:'pause', 8:'back',                             // Start / Select
    4:'left', 5:'right',                             // L1 / R1 — 달리기에 이게 제일 편하다
    6:'left', 7:'right',                             // L2 / R2
  },
  _padPrev:{},
  pollGamepad(){
    if(!navigator.getGamepads) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const now = performance.now();
    const down = {};
    for(const gp of pads){
      if(!gp) continue;
      for(const idx in this.padMap){
        const b = gp.buttons[idx];
        if(b && (b.pressed || b.value>0.5)) down[this.padMap[idx]] = true;
      }
      /* 왼쪽 스틱도 방향으로 — 아날로그를 쓰는 사람이 있다 */
      const ax = gp.axes[0]||0, ay = gp.axes[1]||0;
      if(ax < -0.5) down.left = true;
      if(ax >  0.5) down.right = true;
      if(ay < -0.5) down.up = true;
      if(ay >  0.5) down.down = true;
    }
    for(const act in this.map){
      const code = this.map[act][0];
      const on = !!down[act], was = !!this._padPrev[act];
      if(on && !was){ if(!this.keys[code]) this.pressBuf[code]=true;
                      this.keys[code]=true; this.pressTime[code]=now; Sfx.unlock(); }
      else if(!on && was){ if(this.keys[code]) this.relBuf[code]=true; this.keys[code]=false; }
      this._padPrev[act]=on;
    }
  },
  initGamepad(){
    if(!navigator.getGamepads) return;
    addEventListener('gamepadconnected', ()=>{ this.padConnected=true; });
    addEventListener('gamepaddisconnected', ()=>{
      this.padConnected = (navigator.getGamepads()||[]).some(g=>g); });
    this.padConnected = (navigator.getGamepads()||[]).some(g=>g);
  },
};

/* ── 조작 방식 (키보드 / 화면버튼) ────────────────────────── */
const CTRL_KEY = 'wsc_control';
const Ctrl = {
  mode:'keyboard',
  load(){ let s=null; try{ s=localStorage.getItem(CTRL_KEY); }catch(_){}
    if(s==='keyboard'||s==='touch'){ this.mode=s; return true; } return false; },
  set(m){ this.mode=m; try{ localStorage.setItem(CTRL_KEY,m); }catch(_){} this.apply(); },
  /* 경기 중 패드 — 좌우를 크게, 안 쓰는 위아래는 숨긴다.
     ev 가 없으면(메뉴로 돌아가면) 원래 배치로 되돌린다. */
  playPad(ev){
    const pad=document.getElementById('pad'); if(!pad) return;
    const act=document.getElementById('p-act');
    if(!ev){ pad.classList.remove('play','noud'); if(act) act.textContent='확인'; return; }
    pad.classList.add('play');
    pad.classList.toggle('noud', !ev.onUp && !ev.onDown);
    if(act) act.textContent = (typeof K==='function') ? K('액션') : '액션';
  },
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
