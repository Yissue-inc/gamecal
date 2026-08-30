/* ══════════════════════════════════════════════════════════════════
   어셋 선로드 — ⛔ 생성물이다. 손으로 고치지 말 것.
   만드는 자: tools/gen_preload.py  ·  어셋이 늘면 다시 돌린다.

   ⚠ 왜 (2026-08-29 실측)
     BG.get() 은 **첫 요청에 null 을 돌려주고** 그때부터 로드한다.
     처음 보는 화면·처음 뛰는 종목은 어셋 없이 몇 프레임을 그린 뒤 그림이
     **뒤늦게 튀어나온다.** 코드 그림으로 물러나므로 에러도 콘솔도 조용하다.

   두 물결
     ① WAVE1 140장 ·    759 KB — UI 틀·아이콘. 첫 메뉴에 바로 필요하다.
     ② WAVE2 138장 ·   2246 KB — 무대·소품·효과. 경기 전까지만 오면 된다.
   ⛔ 캐릭터 스프라이트·초상 360장(3.9 MB)은 **안 데운다** —
      종족별이라 그 종족이 나올 때 받는 게 맞다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const PRELOAD = {
  /* 첫 메뉴에 바로 필요한 것 */
  WAVE1: [
  'badge-slot', 'bar-fill', 'bar-track', 'brand-emblem', 'brand-logo', 'btn-primary',
  'btn-primary-on', 'button-focus', 'button-idle', 'card-1', 'card-2', 'card-3', 'card-4',
  'card-5', 'chip-bg', 'co-endure', 'co-medic', 'co-power', 'co-rhythm', 'co-sprint', 'co-tech',
  'cursor-arrow', 'divider-line', 'fc-dorm', 'fc-lab', 'fc-med', 'fc-train', 'fc-youth',
  'frame-card', 'frame-gold', 'frame-panel', 'gauge-ring', 'gr-early', 'gr-late', 'gr-normal',
  'hud-frame', 'ic-accel', 'ic-age', 'ic-career', 'ic-codex', 'ic-coin', 'ic-condition',
  'ic-develop', 'ic-distance', 'ic-facility', 'ic-fatigue', 'ic-filter', 'ic-hall', 'ic-injury',
  'ic-league', 'ic-market', 'ic-medal', 'ic-meet', 'ic-morale', 'ic-offer', 'ic-points',
  'ic-potential', 'ic-power', 'ic-record', 'ic-release', 'ic-rest', 'ic-rhythm', 'ic-scout',
  'ic-settings', 'ic-sort', 'ic-speed', 'ic-speed-hud', 'ic-squad', 'ic-stamina',
  'ic-stopwatch', 'ic-technique', 'ic-timer', 'ic-train', 'ic-xp-gain', 'icon-coin',
  'icon-combo', 'icon-duel', 'icon-field', 'icon-gear', 'icon-levelup', 'icon-medal',
  'icon-other', 'icon-swim', 'icon-tp', 'icon-track', 'icon-xp', 'item-band', 'item-sole',
  'item-spike', 'item-suit', 'item-tape', 'item-tights', 'item-watch', 'panel-fill',
  'panel-frame', 'panel-reward', 'rank-1', 'rank-2', 'rank-3', 'rank-4', 'rank-5', 'rarity-1',
  'rarity-2', 'rarity-3', 'rarity-4', 'rarity-5', 'row-selected', 'sk-appetite', 'sk-beat',
  'sk-beat-x', 'sk-burst', 'sk-burst-x', 'sk-clutch', 'sk-clutch-x', 'sk-eager', 'sk-eager-x',
  'sk-grit', 'sk-grit-x', 'sk-knee', 'sk-pro', 'sk-skim', 'sk-spring', 'sk-sunny', 'sk-whip',
  'slot-gear', 'slot-shoe', 'slot-wear', 'tab-active', 'tab-idle', 'title-backdrop',
  'tooltip-tail', 'tr-cannon', 'tr-closer', 'tr-glass', 'tr-hurdler', 'tr-ironman',
  'tr-metronome', 'tr-nervous', 'tr-springy', 'tr-starter',
  ],
  /* 경기 시작 전까지만 오면 되는 것 */
  WAVE2: [
  'arrow-hd', 'barbell-hd', 'barbell-plates', 'baton-hd', 'bg-office', 'bg-reward',
  'bg-training', 'bicycle-hd', 'block-start', 'board-takeoff', 'bow-hd', 'bullseye-flash',
  'buoy-line', 'canoe-boat', 'chalk-puff', 'climb-hold', 'climb-wall', 'club-crest-birds',
  'club-crest-black-panther', 'club-crest-granite', 'club-crest-highland', 'club-crest-iron',
  'club-crest-skyway', 'confetti-burst', 'crossbar-hd', 'crowd-far', 'crowd-near', 'crowd-tile',
  'discus-hd', 'dust-kick', 'dust-puff', 'epee-blade', 'fence-mask', 'finish-tape',
  'finish-tape-hd', 'flare-light', 'flash-bulbs', 'floodlight', 'floodlight-tower',
  'fx-breakthrough', 'fx-coin-pop', 'fx-confetti', 'fx-focus', 'fx-item-get', 'fx-levelup',
  'fx-photofinish', 'fx-power-up', 'fx-rank-up', 'fx-record', 'fx-skill-learn', 'fx-startsmoke',
  'fx-sweat', 'fx-tap-ring', 'fx-tierup', 'fx-week-done', 'golf-bunker', 'golf-flag',
  'golf-green', 'hall-judo', 'hall-tabletennis', 'hall-truss', 'hall-wall', 'hammer',
  'highbar-mat', 'highbar-stand', 'hurdle', 'hurdle-hd', 'javelin', 'javelin-hd', 'judo-tatami',
  'medal-bronze', 'medal-gold', 'medal-silver', 'night-sky', 'piste-strip', 'plate-rack-hd',
  'platform-lift', 'podium-hd', 'pole-hd', 'pool-lane-rope', 'pool-water', 'pose-crouch',
  'pose-jump', 'pose-lean', 'pose-throw', 'range-archery', 'range-backstop', 'range-shooting',
  'rapids-water', 'record-banner', 'record-sparkle', 'ribbon-title', 'rifle-hd', 'rings-frame',
  'rings-hd', 'ripple-ring', 'river-bank', 'road-marathon', 'rowing-lane', 'runner-5aaaff',
  'runner-ff6b8a', 'runner-ffd75e', 'runway-strip', 'sand-pit', 'sandpit-tile', 'scull-hd',
  'shot-hd', 'showjump-fence', 'sky-day', 'sky-dusk', 'sky-night', 'sky-stars', 'slalom-gate',
  'speed-lines', 'splash-big', 'splash-mark', 'springboard-hd', 'stadium-roof', 'stadium-wall',
  'starting-block-hd', 'steeple-barrier-hd', 'strain-mark', 'sweat-drop', 'takeoff-board-hd',
  'target-air-hd', 'target-hd', 'throw-sector', 'track-surface', 'trampoline-hd', 'tt-table',
  'vault-mat', 'vault-table-hd', 'velodrome-bank', 'velodrome-track', 'wall-tile',
  'water-splash', 'water-splash-big', 'waterjump-hd',
  ],

  /* BG.get() 은 부르기만 해도 로드를 시작한다 — 반환값은 안 쓴다.
     ⚠ 한 번에 다 던지면 브라우저 연결 수를 다 먹어 **정작 지금 보이는 화면이
        늦어진다.** 조금씩 나눠 던진다. */
  run(list, chunk, gapMs){
    if(typeof BG === 'undefined') return;
    let i = 0;
    const step = () => {
      const end = Math.min(i + chunk, list.length);
      for(; i < end; i++) BG.get(list[i]);
      if(i < list.length) setTimeout(step, gapMs);
    };
    step();
  },

  start(){
    this.run(this.WAVE1, 12, 40);
    /* 둘째 물결은 **첫 화면이 뜬 뒤** — 부팅을 늦추지 않는다 */
    const later = () => this.run(this.WAVE2, 8, 60);
    if(typeof requestIdleCallback === 'function') requestIdleCallback(later, { timeout: 2500 });
    else setTimeout(later, 1200);
  },
};
