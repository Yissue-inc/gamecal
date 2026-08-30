/* ══════════════════════════════════════════════════════════════════
   음악 — Web Audio 합성. 오디오 파일 0개.

   ⚠ 왜 파일이 아니라 합성인가: 이 게임의 소리는 전부 합성이다(04_audio).
      음악만 mp3 를 쓰면 ①용량이 몇 배가 되고 ②로딩이 생기고 ③라이선스가 붙는다.
      대신 **곡을 데이터로** 적는다 — 음표 배열이라 몇 KB 다.

   여덟 곡 — 처음엔 셋이었다(menu·race·win).
     · menu   메뉴 — 느리고 넓게. 기다리는 자리다.
     · race   달리기 — 맥박. 리듬 게임이니 **박자가 곧 조작**이다(238ms = 126BPM 의 8분음표).
     · field  도약·투척 — 달리지 않고 **한 번을 기다리는** 종목. 느리고 넓다.
     · water  수영·조정·카누·다이빙 — 밀고 미끄러지는 결.
     · hall   실내(체조·격투·라켓·역도·사격) — 좁고 또렷하다.
     · office 감독 사무실 — 고르는 곳이 아니라 **결정하는 곳**이다. 낮고 조용하다.
     · meet   대회 주 — 사무실과 **같은 조성**인데 박자만 빨라진다(다른 곡이 아니라 같은 세계).
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

    /* ⛔ 여기까지가 세 곡이었다. 그런데 **48종목이 전부 race 한 곡**을 쓰고
       메뉴·선수단·육성·도감·대회가 전부 menu 한 곡을 썼다 —
       한 판에 열 번을 넘나드는 화면들이 다 같은 소리라 오래 하면 귀에 남는다.
       ⚠ 곡을 늘리되 **기준은 그대로**다: 달리기 계열은 여전히 119ms 격자에 둔다
          (곡의 8분음표가 한 걸음이라는 규약을 깨면 음악이 조작을 가르치지 못한다). */

    /* 필드 — 도약·투척. 달리지 않고 **한 번을 기다리는** 종목이라 느리고 넓다. */
    field: {
      ms: 176, wave:'triangle', bassWave:'sine', gain:0.14,
      bass: [ -12,null,null,null, -7,null,null,null, -10,null,null,null, -5,null,null,null ],
      lead: [ 0,null,null,4, 7,null,null,null, 5,null,null,2, 0,null,null,null,
              7,null,null,11, 12,null,null,null, 10,null,null,7, 5,null,null,null ],
    },
    /* 물 — 수영·조정·카누. 밀고 미끄러지는 결. 베이스가 길게 눕는다. */
    water: {
      ms: 134, wave:'sine', bassWave:'sine', gain:0.15,
      bass: [ -10,null,null,null, -10,null,null,null, -8,null,null,null, -5,null,null,null ],
      lead: [ 3,null,7,null, 10,null,7,null, 5,null,3,null, 2,null,null,null,
              3,null,10,null, 14,null,10,null, 7,null,5,null, 3,null,null,null ],
    },
    /* 실내 — 철봉·링·유도·탁구·트램폴린·펜싱. 좁고 또렷하다. */
    hall: {
      ms: 128, wave:'square', bassWave:'triangle', gain:0.13,
      bass: [ -12,null,-12,null, -8,null,-8,null, -10,null,-10,null, -7,null,-7,null ],
      lead: [ 5,null,8,null, 12,null,8,null, 7,null,3,null, 5,null,null,null,
              10,null,12,null, 15,null,12,null, 8,null,7,null, 5,null,null,null ],
    },
    /* 감독 사무실 — 결정을 내리는 자리. 메뉴보다 낮고 조용하다. */
    office: {
      ms: 300, wave:'sine', bassWave:'sine', gain:0.13,
      bass: [ -17,null,null,null, -12,null,null,null, -15,null,null,null, -10,null,null,null ],
      lead: [ 0,null,null,null, 3,null,null,null, 7,null,null,null, 3,null,null,null,
              5,null,null,null, 2,null,null,null, 0,null,null,null, null,null,null,null ],
    },
    /* 대회 주 — 감독 모드의 긴장. 사무실과 같은 조성인데 박자가 빨라진다. */
    meet: {
      ms: 190, wave:'triangle', bassWave:'sawtooth', gain:0.15,
      bass: [ -12,null,-12,null, -12,null,-10,null, -8,null,-8,null, -7,null,-5,null ],
      lead: [ 0,null,3,null, 7,null,10,null, 7,null,3,null, 0,null,null,null,
              5,null,8,null, 12,null,8,null, 5,null,3,null, 0,null,null,null ],
    },
  },

  /* 종목 갈래 → 곡. 달리기 계열은 race 그대로(119ms 격자 규약을 지킨다). */
  /* ⚠ 이름을 짐작해 적으면 조용히 안 걸린다(실측: canoe·paddle 이라 적었는데 실제 kind 는
     slalom 이었다 — 카누가 계속 달리기 음악을 썼을 것이다). 종목표의 값을 그대로 쓴다.
     여기 없는 kind 는 race 로 떨어진다(달리기 계열이 기본). */
  KIND_SONG: {
    jump:'field', throw:'field',
    swim:'water', row:'water', slalom:'water', dive:'water',
    gym:'hall', rally:'hall', grap:'hall', fence:'hall', lift:'hall',
    aim:'hall', shoot:'hall', tramp:'hall', golf:'field', climb:'hall',
    /* 달리기 계열은 race 그대로: sprint·middle·hurdles·walk·relay·cycle·ride·combined·tri */
  },
  /* 종목표에 있는 kind 가 여기 없으면 조용히 달리기 음악이 된다 — 부팅 때 알려 준다.
     ⚠ 틀린 게 아니라 **의도한 기본값**일 수 있으니 게임을 막지는 않는다. */
  verifyKinds(){
    if(typeof EVENTS==='undefined') return [];
    const RUN = ['sprint','middle','hurdles','walk','relay','cycle','ride','combined','tri'];
    const miss = [...new Set(EVENTS.map(e=>e.kind))]
      .filter(k => k && !this.KIND_SONG[k] && RUN.indexOf(k)<0);
    if(miss.length) console.warn('Music: 곡이 안 정해진 종목 갈래 —', miss.join(' '), '(달리기 음악으로 나갑니다)');
    return miss;
  },
  songForEvent(def){
    if(!def) return 'race';
    return this.KIND_SONG[def.kind] || 'race';
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
    /* 경기는 **종목 갈래**에 맞춘 곡으로 — 수영에서 트랙 음악이 나오면 무대가 어긋난다 */
    if(state===ST.PLAY){
      const def = (typeof G!=='undefined') ? G.def : null;
      this.play(this.songForEvent(def));
    }
    /* 감독 모드는 메뉴와 다른 자리다 — 고르는 곳이 아니라 **결정하는 곳**이다.
       대회 주에는 같은 조성에서 박자만 빨라진다(다른 곡이 아니라 같은 세계다). */
    else if(state===ST.MANAGER){
      const S = (typeof MG!=='undefined') ? MG.season : null;
      this.play(S && S.isMeetWeek ? 'meet' : 'office');
    }
    else if(state===ST.TITLE || state===ST.SELECT ||
            state===ST.CAREER || state===ST.SETTINGS || state===ST.NATION) this.play('menu');
    else if(state===ST.RESULT) { /* 결과는 조용히 둔다 — 기록을 보는 자리다 */ this.stop(); }
  },
};
