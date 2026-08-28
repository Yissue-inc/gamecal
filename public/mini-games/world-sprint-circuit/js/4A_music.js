/* ══════════════════════════════════════════════════════════════════
   음악 — Web Audio 합성. 오디오 파일 0개.

   ⚠ 왜 파일이 아니라 합성인가: 이 게임의 소리는 전부 합성이다(04_audio).
      음악만 mp3 를 쓰면 ①용량이 몇 배가 되고 ②로딩이 생기고 ③라이선스가 붙는다.
      대신 **곡을 데이터로** 적는다 — 음표 배열이라 몇 KB 다.

   세 곡:
     · menu   메뉴 — 느리고 넓게. 기다리는 자리다.
     · race   경기 — 맥박. 리듬 게임이니 **박자가 곧 조작**이다(238ms = 126BPM 의 8분음표).
     · win    시상 — 짧은 팡파르. 끝나면 조용해진다.

   ⛔ 기존 소리(Sfx)는 안 건드린다. 음악은 별도 게인으로 흐르고 설정에서 끈다.
   ⚠ 경기 곡의 템포는 **목표 스트라이드 간격과 같은 격자**에 둔다.
      이게 이 게임에서 음악이 할 수 있는 가장 큰 일이다 — 곡을 따라가면 잘 달린다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const Music = {
  on: true, vol: 0.5,
  ac:null, gain:null, timer:null,
  cur:null, step:0, nextAt:0,

  /* ── 곡 ──────────────────────────────────────────────────
     n: 반음 오프셋(0 = A3=220Hz), null = 쉼표
     각 곡은 [베이스, 멜로디] 두 줄 + 박자(ms) */
  SONGS: {
    menu: {
      ms: 260, wave:'triangle', bassWave:'sine', gain:0.16,
      /* 넓게 벌어진 화음 — 메뉴는 기다리는 자리라 급하지 않다 */
      bass: [ -12,null,null,null, -5,null,null,null, -10,null,null,null, -7,null,null,null ],
      lead: [ 7,null,12,null, 10,null,7,null, 5,null,10,null, 7,null,null,null,
              12,null,15,null, 14,null,12,null, 10,null,7,null, 5,null,null,null ],
    },
    race: {
      /* ⚠ 119ms = 목표 스트라이드 간격(238ms)의 절반. 곡의 8분음표가 곧 한 걸음이다.
         곡을 따라 손이 움직이면 그대로 PERFECT 가 나온다 — 음악이 조작을 가르친다. */
      ms: 119, wave:'square', bassWave:'sawtooth', gain:0.13,
      bass: [ -12,null,-12,null, -12,null,-5,null, -10,null,-10,null, -10,null,-3,null ],
      lead: [ 0,null,7,null, 12,null,7,null, 10,null,5,null, 3,null,null,null,
              0,null,7,null, 12,null,15,null, 14,null,12,null, 10,null,null,null ],
    },
    win: {
      ms: 150, wave:'square', bassWave:'triangle', gain:0.20, once:true,
      bass: [ 0,null,0,null, 5,null,5,null, 7,null,7,null, 12,null,null,null ],
      lead: [ 12,null,16,null, 19,null,24,null, 19,null,24,null, 28,null,null,null ],
    },
  },

  init(){
    /* Sfx 가 만든 AudioContext 를 같이 쓴다 — 두 개를 만들면 모바일에서 하나가 막힌다 */
    if(this.ac) return true;
    const ac = (typeof Sfx!=='undefined' && Sfx.ac) ? Sfx.ac : null;
    if(!ac) return false;
    this.ac = ac;
    this.gain = ac.createGain();
    this.gain.gain.value = this.on ? this.vol*0.5 : 0;
    this.gain.connect(ac.destination);
    return true;
  },
  loadPrefs(){
    try{
      const v=localStorage.getItem('wsc_music'); if(v!==null) this.vol=clamp(parseFloat(v),0,1);
      const o=localStorage.getItem('wsc_music_on'); if(o!==null) this.on = o==='1';
    }catch(e){}
  },
  savePrefs(){
    try{ localStorage.setItem('wsc_music', String(this.vol));
         localStorage.setItem('wsc_music_on', this.on?'1':'0'); }catch(e){}
  },
  applyVol(){ if(this.gain) this.gain.gain.value = this.on ? this.vol*0.5 : 0; },
  setVol(v){ this.vol=clamp(v,0,1); this.applyVol(); this.savePrefs(); },
  toggle(){ this.on=!this.on; this.applyVol(); this.savePrefs(); if(!this.on) this.stop(); },

  freq(n){ return 220 * Math.pow(2, n/12); },

  note(n, when, dur, wave, vol){
    if(n===null || n===undefined || !this.ac) return;
    const o=this.ac.createOscillator(), g=this.ac.createGain();
    o.type=wave; o.frequency.value=this.freq(n);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when+0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when+dur);
    o.connect(g); g.connect(this.gain);
    o.start(when); o.stop(when+dur+0.02);
  },

  play(name){
    if(!this.on) return;
    if(this.cur===name && this.timer) return;      // 같은 곡이면 이어서
    if(!this.init()) return;
    this.stop();
    const song=this.SONGS[name]; if(!song) return;
    this.cur=name; this.step=0;
    this.nextAt = this.ac.currentTime + 0.06;
    /* ⚠ setInterval 로 음을 '지금' 내면 브라우저 지터로 박자가 흔들린다.
       오디오 시계에 **미리 예약**하고, 타이머는 예약을 채우는 일만 한다. */
    this.timer = setInterval(()=>this.pump(), 60);
    this.pump();
  },
  pump(){
    const song=this.SONGS[this.cur]; if(!song||!this.ac) return;
    const dt = song.ms/1000;
    const horizon = this.ac.currentTime + 0.35;
    let guard=0;
    while(this.nextAt < horizon && guard++ < 64){
      const bl=song.bass.length, ll=song.lead.length;
      this.note(song.bass[this.step%bl], this.nextAt, dt*1.7, song.bassWave, song.gain*0.9);
      this.note(song.lead[this.step%ll], this.nextAt, dt*0.9, song.wave,     song.gain);
      this.step++;
      this.nextAt += dt;
      if(song.once && this.step >= Math.max(bl,ll)){ this.stop(); return; }
    }
  },
  stop(){
    if(this.timer){ clearInterval(this.timer); this.timer=null; }
    this.cur=null; this.step=0;
  },

  /* 화면이 바뀔 때 알맞은 곡으로 — 부르는 쪽이 한 줄이면 된다 */
  forState(state){
    if(!this.on){ this.stop(); return; }
    if(typeof ST==='undefined') return;
    if(state===ST.PLAY)        this.play('race');
    else if(state===ST.TITLE || state===ST.SELECT || state===ST.MANAGER ||
            state===ST.CAREER || state===ST.SETTINGS || state===ST.NATION) this.play('menu');
    else if(state===ST.RESULT) { /* 결과는 조용히 둔다 — 기록을 보는 자리다 */ this.stop(); }
  },
};
