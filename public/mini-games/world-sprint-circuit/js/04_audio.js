/* ══════════════════════════════════════════════════════════════════
   소리 — 전부 Web Audio 합성. 오디오 파일 0개.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const Sfx = {
  ac:null, master:null, crowdGain:null, crowdSrc:null, muted:false,
  /* ⚠ 예전엔 켜기/끄기 하나뿐이었고 그마저 UI 가 없었다.
     출시하려면 플레이어가 소리를 조절할 수 있어야 한다 — 기본기다.
     효과음과 관중 웅성거림을 따로 둔다(이 게임의 유일한 지속음이 관중이다). */
  vol: 0.9, ambVol: 1.0,
  loadPrefs(){
    try{
      const v=localStorage.getItem('wsc_vol');   if(v!==null) this.vol   = clamp(parseFloat(v),0,1);
      const a=localStorage.getItem('wsc_amb');   if(a!==null) this.ambVol= clamp(parseFloat(a),0,1);
      const m=localStorage.getItem('wsc_muted'); if(m!==null) this.muted = m==='1';
    }catch(_){}
  },
  savePrefs(){
    try{
      localStorage.setItem('wsc_vol', String(this.vol));
      localStorage.setItem('wsc_amb', String(this.ambVol));
      localStorage.setItem('wsc_muted', this.muted?'1':'0');
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
};
