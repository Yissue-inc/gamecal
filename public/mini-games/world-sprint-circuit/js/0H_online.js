/* ══════════════════════════════════════════════════════════════════
   온라인 기록 — 사람들의 실제 기록이 결선 필드가 된다 (CK 결정 2026-09-12)

   흐름
     ① 부팅 때 · 10분마다: GET /api/minigames/score?dist=all → 종목별 { n, q:[5%..95% 분위] }
        → Field.players 에 넣는다. 인원이 FIELD.MIN_PLAYERS 를 넘은 종목부터 AI 진출자를 **그 분포에서** 뽑는다.
     ② 결선에 든 판(보통·어려움, 1인, 아케이드)을 끝내면: POST { track: 종목 id, value: 게임 단위 기록 }
        서버가 종목별 범위(tools/export_tracks.js 로 생성)를 넘는 기록은 거절한다.

   ⚠ 로그인한 사람만 저장된다(서버 규칙). 게스트는 401 → 결과 화면에 '로그인하면 결선에 들어간다' 한 줄.
   ⚠ gamerclock 밖(로컬 서버·파일)에서는 API 가 없다 → 조용히 꺼진다. **게임은 절대 막지 않는다.**
   ⚠ 쉬움(아이용)·2인·감독 '직접 뛰기' 기록은 올리지 않는다 — 필드는 결선 선수들의 기록이어야 한다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const ONLINE = {
  SLUG: 'world-sprint-circuit',
  API: '/api/minigames/score',
  REFRESH_MS: 10 * 60 * 1000,
  TIMEOUT_MS: 6000,
};

const Online = {
  /* 'unknown' 아직 모름 · 'off' API 없음/테이블 없음 · 'guest' 로그인 안 함 · 'on' 저장됨 */
  status: 'unknown',
  lastLoad: 0,
  loading: null,
  lastSubmit: null,

  available(){
    try{ return /^https?:$/.test(location.protocol) && typeof fetch === 'function'; }catch(e){ return false; }
  },

  _fetch(url, opt){
    const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), ONLINE.TIMEOUT_MS) : null;
    return fetch(url, Object.assign({ credentials: 'same-origin' }, opt || {}, ctl ? { signal: ctl.signal } : {}))
      .finally(() => { if(timer) clearTimeout(timer); });
  },

  /* 분포 받기 — 실패하면 추정 필드 그대로 */
  refresh(force){
    if(!this.available() || this.status === 'off') return null;
    if(this.loading) return this.loading;
    if(!force && Date.now() - this.lastLoad < ONLINE.REFRESH_MS) return null;
    this.lastLoad = Date.now();
    this.loading = this._fetch(`${ONLINE.API}?miniGameSlug=${ONLINE.SLUG}&dist=all`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if(!j){ this.status = 'off'; return; }
        if(j.ready === false){ this.status = 'off'; return; }
        const next = {};
        for(const [id, t] of Object.entries(j.tracks || {})){
          if(t && typeof t.n === 'number' && Array.isArray(t.q) && t.q.length >= 2 && t.q.every(isFinite)) next[id] = { n: t.n, q: t.q.slice() };
        }
        if(typeof Field !== 'undefined') Field.players = next;
      })
      .catch(() => { /* 네트워크 실패 — 다음 주기에 다시 */ })
      .finally(() => { this.loading = null; });
    return this.loading;
  },

  /* 결선 기록 올리기 */
  submit(def, value, level){
    if(!this.available() || this.status === 'off' || !def) return;
    if(!(typeof value === 'number' && isFinite(value))) return;
    this.lastSubmit = { id: def.id, state: 'sending' };
    const mine = this.lastSubmit;
    this._fetch(ONLINE.API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ miniGameSlug: ONLINE.SLUG, track: def.id, value, stats: { level: level || 'normal' } }),
    }).then(r => {
      if(r.status === 401){ this.status = 'guest'; mine.state = 'guest'; return; }
      /* 테이블 없음(503) · API 없음(404) · 정적 서버의 POST 거절(405/501 — 로컬 python http.server) */
      if([404, 405, 501, 503].includes(r.status)){ this.status = 'off'; mine.state = 'off'; return; }
      if(r.status === 422){ mine.state = 'rejected'; return; }
      if(r.ok){ this.status = 'on'; mine.state = 'saved'; }
      else mine.state = 'error';
    }).catch(() => { mine.state = 'error'; });
  },
};
