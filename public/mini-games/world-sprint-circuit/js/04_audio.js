/* ══════════════════════════════════════════════════════════════════
   소리 — 전부 Web Audio 합성. 오디오 파일 0개.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const Sfx = {
  ac:null, master:null, crowdGain:null, crowdSrc:null, muted:false,
  /* ⚠ 예전엔 켜기/끄기 하나뿐이었고 그마저 UI 가 없었다.
     출시하려면 플레이어가 소리를 조절할 수 있어야 한다 — 기본기다.
     효과음과 관중 웅성거림을 따로 둔다(이 게임의 유일한 지속음이 관중이다). */
  vol: 0.9, ambVol: 1.0, metroOn: true,
  loadPrefs(){
    try{
      const v=localStorage.getItem('wsc_vol');   if(v!==null) this.vol   = clamp(parseFloat(v),0,1);
      const a=localStorage.getItem('wsc_amb');   if(a!==null) this.ambVol= clamp(parseFloat(a),0,1);
      const m=localStorage.getItem('wsc_muted'); if(m!==null) this.muted = m==='1';
      const mt=localStorage.getItem('wsc_metro'); if(mt!==null) this.metroOn = mt==='1';
    }catch(_){}
  },
  savePrefs(){
    try{
      localStorage.setItem('wsc_vol', String(this.vol));
      localStorage.setItem('wsc_amb', String(this.ambVol));
      localStorage.setItem('wsc_muted', this.muted?'1':'0');
      localStorage.setItem('wsc_metro', this.metroOn?'1':'0');
    }catch(_){}
  },
  applyVol(){
    if(this.master) this.master.gain.value = this.muted ? 0 : this.vol;
    this._lastLevel = this._lastLevel||0;
    if(this.crowdGain && this.ac)
      this.crowdGain.gain.setTargetAtTime((0.03+this._lastLevel*0.16)*this.ambVol, this.ac.currentTime, 0.1);
  },
  setVol(v){ this.vol = Math.round(clamp(v,0,1)*20)/20; if(this.vol>0) this.muted=false; this.applyVol(); this.savePrefs(); },
  setAmb(v){ this.ambVol = Math.round(clamp(v,0,1)*20)/20; this.applyVol(); this.savePrefs(); },
  unlock(){
    if(this.ac){ if(this.ac.state==='suspended') this.ac.resume(); return; }
    const AC = window.AudioContext||window.webkitAudioContext; if(!AC) return;
    this.ac = new AC();
    this.master = this.ac.createGain(); this.master.gain.value = this.muted?0:this.vol;
    this.master.connect(this.ac.destination);
    this.startCrowd();
    this.applyVol();
  },
  setMuted(m){ this.muted=m; this.applyVol(); this.savePrefs(); },
  toggleMute(){ this.setMuted(!this.muted); return this.muted; },

  /* 관중 웅성거림 — 필터링한 노이즈. 흥분도로 음량이 오른다 */
  startCrowd(){
    const ac=this.ac, len=ac.sampleRate*2;
    const buf=ac.createBuffer(1,len,ac.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*0.5;
    const src=ac.createBufferSource(); src.buffer=buf; src.loop=true;
    const bp=ac.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=760; bp.Q.value=0.6;
    const g=ac.createGain(); g.gain.value=0.05;
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start();
    this.crowdGain=g; this.crowdSrc=src;
  },
  /* ⚠ 관중 '소리'만 있고 그림은 정지해 있었다. 17개 종목이 전부 이 함수를
     부르므로, 여기 한 곳에서 그림 쪽 열기도 같이 올린다. */
  crowd(level){
    if(typeof Track!=='undefined' && Track.setHeat) Track.setHeat(level);
    this._lastLevel = level;
    if(this.crowdGain && this.ac)
      this.crowdGain.gain.setTargetAtTime((0.03+level*0.16)*this.ambVol, this.ac.currentTime, 0.25);
  },

  beep(freq, dur, type, vol, slideTo){
    if(!this.ac||this.muted) return;
    const t=this.ac.currentTime;
    const o=this.ac.createOscillator(), g=this.ac.createGain();
    o.type=type||'square'; o.frequency.setValueAtTime(freq,t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), t+dur);
    g.gain.setValueAtTime(0,t);
    g.gain.linearRampToValueAtTime(vol??0.16, t+0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+dur+0.02);
  },
  noise(dur, vol, freq){
    if(!this.ac||this.muted) return;
    const t=this.ac.currentTime, len=Math.ceil(this.ac.sampleRate*dur);
    const buf=this.ac.createBuffer(1,len,this.ac.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    const s=this.ac.createBufferSource(); s.buffer=buf;
    const f=this.ac.createBiquadFilter(); f.type='lowpass'; f.frequency.value=freq||2400;
    const g=this.ac.createGain(); g.gain.value=vol??0.3;
    s.connect(f); f.connect(g); g.connect(this.master); s.start();
  },

  /* 종목 소리 */
  gun(){ this.noise(0.28, 0.55, 5200); this.beep(180, 0.12, 'square', 0.2, 60); },
  set(){ this.beep(660, 0.10, 'square', 0.12); },
  step(j){
    if(j==='PERFECT'){ this.noise(0.05,0.16,3000); this.beep(1320,0.05,'square',0.07); }
    else if(j==='GOOD'){ this.noise(0.05,0.12,2000); }
    else if(j==='SPAM'||j==='REPEAT'){ this.beep(110,0.06,'sawtooth',0.09); }
    else this.noise(0.05,0.08,1200);
  },
  finish(){ [880,1108,1318].forEach((f,i)=>setTimeout(()=>this.beep(f,0.22,'square',0.14),i*90)); },
  fail(){ [330,262,196].forEach((f,i)=>setTimeout(()=>this.beep(f,0.24,'sawtooth',0.13),i*130)); },
  ui(){ this.beep(880,0.05,'square',0.09); },
  record(){ [1046,1318,1568,2093].forEach((f,i)=>setTimeout(()=>this.beep(f,0.3,'square',0.15),i*100)); },

  /* 박자 — 이 게임의 핵심은 '얼마나 빨리'가 아니라 '얼마나 고르게'다(목표 238ms).
     ⚠ 그런데 그 박자를 **눈으로만** 알려 주고 있었다: 화면 맨 아래 게이지 하나.
        경기 중에 사람은 선수를 본다. 실측 — 처음 하는 사람이 최대 속도로 연타하면
        100m 를 완주조차 못 한다(EARLY 136 · PERFECT 0). 리듬 게임은 소리로 가르친다.
     아주 작고 짧게 — 듣고 따라가되 거슬리지 않게. */
  metro(){
    if(!this.ac || this.muted) return;
    const t=this.ac.currentTime;
    const o=this.ac.createOscillator(), g=this.ac.createGain();
    o.type='square'; o.frequency.value=1600;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06*this.vol, t+0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t+0.045);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t+0.05);
  },

  /* ══ 종목의 소리 ══════════════════════════════════════════
     ⚠ 지금까지 48종목이 **전부 같은 소리**로 돌았다 — 두드리면 삑, 끝나면 팡파르.
        수영도 삑, 양궁도 삑, 탁구도 삑이었다. 종목이 48개인데 귀로는 하나다.
        스포츠 게임의 기억은 소리에 붙는다(하이퍼 올림픽의 총성처럼).
     ⛔ 규칙은 안 건드린다. 같은 자리에서 **다른 소리**를 낼 뿐이다.

     합성으로 만드는 법:
       · 물   → 낮은 잡음 + 빠르게 닫히는 필터
       · 타격 → 아주 짧은 잡음 + 높은 사인 한 점
       · 줄   → 톱니 짧게 + 급격한 하강
       · 금속 → 두 사인의 불협(살짝 어긋난 주파수) */

  /* 물에 들어가는 소리 — 수영 턴·다이빙 입수 */
  water(big){
    if(!this.ac||this.muted) return;
    const t=this.ac.currentTime, dur=big?0.42:0.18;
    const n=this.ac.createBufferSource();
    const len=Math.floor(this.ac.sampleRate*dur);
    const buf=this.ac.createBuffer(1,len,this.ac.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
    n.buffer=buf;
    const f=this.ac.createBiquadFilter(); f.type='lowpass';
    f.frequency.setValueAtTime(big?2600:1800, t);
    f.frequency.exponentialRampToValueAtTime(180, t+dur);
    const g=this.ac.createGain();
    g.gain.setValueAtTime((big?0.26:0.14)*this.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    n.connect(f); f.connect(g); g.connect(this.master); n.start(t); n.stop(t+dur);
  },

  /* 딱 하고 맞는 소리 — 탁구공·야구식 타격 */
  hit(pitch){
    this.noise(0.03, 0.06, 6000);
    this.beep(pitch||1900, 0.035, 'sine', 0.10, (pitch||1900)*0.6);
  },

  /* 줄이 튕기는 소리 — 활시위 */
  bow(){
    this.beep(420, 0.10, 'sawtooth', 0.11, 90);
    this.noise(0.04, 0.10, 3400);
  },

  /* 총·소총 — 시작 총성보다 짧고 건조하게 */
  shot(){ this.noise(0.16, 0.32, 4200); this.beep(140, 0.08, 'square', 0.14, 50); },

  /* 금속이 부딪는 소리 — 펜싱 검, 역도 바 */
  clang(){
    if(!this.ac||this.muted) return;
    const t=this.ac.currentTime;
    for(const f of [1180, 1243]){          // 살짝 어긋난 두 음 = 금속의 불협
      const o=this.ac.createOscillator(), g=this.ac.createGain();
      o.type='triangle'; o.frequency.value=f;
      g.gain.setValueAtTime(0.09*this.vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t+0.30);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t+0.32);
    }
    this.noise(0.05, 0.10, 5000);
  },

  /* 무거운 것이 놓이는 소리 — 역도 바를 내릴 때 */
  thud(){
    this.beep(70, 0.22, 'sine', 0.20, 38);
    this.noise(0.10, 0.16, 700);
  },

  /* 바람 가르기 — 원반·해머 회전, 창던지기 */
  whoosh(level){
    if(!this.ac||this.muted) return;
    const t=this.ac.currentTime, dur=0.22;
    const n=this.ac.createBufferSource();
    const len=Math.floor(this.ac.sampleRate*dur);
    const buf=this.ac.createBuffer(1,len,this.ac.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<len;i++){ const k=i/len; d[i]=(Math.random()*2-1)*Math.sin(k*Math.PI); }
    n.buffer=buf;
    const f=this.ac.createBiquadFilter(); f.type='bandpass';
    f.frequency.setValueAtTime(500, t);
    f.frequency.exponentialRampToValueAtTime(1400+1600*(level||0.5), t+dur);
    f.Q.value=2.4;
    const g=this.ac.createGain();
    g.gain.setValueAtTime(0.10*this.vol*(0.5+(level||0.5)), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    n.connect(f); f.connect(g); g.connect(this.master); n.start(t); n.stop(t+dur);
  },

  /* 자전거 체인·기어 */
  chain(){ this.noise(0.03, 0.05, 7000); this.beep(2400, 0.02, 'square', 0.05); },

  /* 노가 물을 젓는 소리 — 조정·카누 */
  paddle(){ this.water(false); this.beep(240, 0.07, 'sine', 0.06, 140); },

  /* 발이 매트를 치는 소리 — 트램폴린·도마 */
  bounce(){ this.beep(120, 0.13, 'sine', 0.16, 70); this.noise(0.05, 0.09, 900); },

  /* 관중 — 한 겹이 아니라 상황에 따라 다르게 낸다.
     ⚠ 지금까지 관중은 '레벨 하나'였다(0~1). 실제 경기장은 기다릴 때·터질 때·
        탄식할 때가 다 다르다. 소리 정체성의 절반이 관중이다. */
  gasp(){                                  // 탄식 — 실패했을 때
    this.noise(0.30, 0.5, 900);
    this.beep(300, 0.35, 'sine', 0.05, 180);
  },
  roar(){                                  // 함성 — 1위·신기록
    this.noise(0.55, 0.9, 2200);
    [520,660,784].forEach((f,i)=>setTimeout(()=>this.beep(f,0.5,'sine',0.05),i*60));
  },
};
