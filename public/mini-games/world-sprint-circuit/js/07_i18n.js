/* ══════════════════════════════════════════════════════════════════
   다국어 — 한국어 원문을 키로 쓴다.

   ⚠ 이 게임은 한글 문자열 699개가 20개 파일에 하드코딩돼 있었다(고유 557개).
     호출부를 전부 고치면 그만큼 깨질 자리가 생긴다. 대신 **글자를 그리는
     단 한 곳**(05_hud.js 의 txt())에서 번역한다 — 279개 호출이 전부 거기로
     모이고, fillText 직접 호출은 하나뿐이다.

   규칙
     · 표에 없으면 원문 그대로 나간다 — 번역이 없다고 화면이 깨지지 않는다.
     · 숫자가 섞인 문장은 숫자를 자리표(%1,%2…)로 바꿔 한 번 더 찾는다.
       "12번 만에 모두 맞췄다" → "%1번 만에 모두 맞췄다" 로 조회한 뒤 되돌린다.
     · 언어는 ?lang=ko|en → localStorage → 브라우저 설정 순으로 정한다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const I18N_KEY = 'wsc_lang';
let LANG = (function(){
  const m = /[?&]lang=(ko|en)/.exec(location.search);
  if(m){ try{ localStorage.setItem(I18N_KEY, m[1]); }catch(e){} return m[1]; }
  try{ const v=localStorage.getItem(I18N_KEY); if(v==='ko'||v==='en') return v; }catch(e){}
  return /^ko/i.test(navigator.language||'') ? 'ko' : 'en';
})();

function setLang(l){
  if(l!=='ko' && l!=='en') return;
  LANG = l;
  try{ localStorage.setItem(I18N_KEY, l); }catch(e){}
}

/* 숫자 → 자리표. "3 / 6 문제" → "%1 / %2 문제" */
const _numRe = /-?\d+(?:\.\d+)?/g;
function _tmpl(s){
  const nums=[];
  const key = s.replace(_numRe, m=>{ nums.push(m); return '%'+nums.length; });
  return {key, nums};
}
function _fill(t, nums){
  return t.replace(/%(\d+)/g, (m,i)=> nums[+i-1]!==undefined ? nums[+i-1] : m);
}

const _missing = Object.create(null);      // 번역 빠진 것 수집 — 검사용

/* 화면에 나갈 문자열 하나를 지금 언어로 바꾼다. */
function K(s){
  if(LANG==='ko' || typeof s!=='string' || !s) return s;
  const T = (typeof I18N_EN!=='undefined') ? I18N_EN : null;
  if(!T) return s;
  const hit = T[s];
  if(hit!==undefined) return hit;
  const {key, nums} = _tmpl(s);
  if(key!==s){
    const h2 = T[key];
    if(h2!==undefined) return _fill(h2, nums);
  }
  /* 접두사 규칙 — "출전: SOFIA, LEILA" 처럼 뒤가 데이터인 문장.
     앞머리만 바꾸고 나머지는 그대로 둔다. 사람 이름을 번역표에 넣지 않으려는 것이다. */
  const P = (typeof I18N_PREFIX!=='undefined') ? I18N_PREFIX : null;
  if(P){
    for(const pre in P){
      if(s.indexOf(pre)===0) return P[pre] + s.slice(pre.length);
      // 숫자 자리표 형태로도 본다 ("3위 " → "%1위 ")
      if(key.indexOf(pre)===0){
        const head = _fill(P[pre], nums);
        return head + _fill(key.slice(pre.length), nums.slice((pre.match(/%\d+/g)||[]).length));
      }
    }
  }
  /* 조각 치환 — "★★☆☆☆ 여우 JAMAL ROSSI" 처럼 데이터가 이어 붙어 만들어진 문장.
     ⚠ 이런 건 통째 키로 잡을 수 없다(선수 이름·등급·종족의 조합이라 경우의 수가 폭발한다).
        표에 있는 한국어 조각만 골라 바꾸고 나머지는 그대로 둔다.
        결과는 캐시한다 — 한 프레임에 글자를 1000번 넘게 그리므로 매번 훑으면 느리다. */
  const sub = _subst(s);
  /* ⚠ 조각만 바뀌고 한글이 남으면 "Hurdles을 잘 넘는다" 같은 혼종이 나온다.
     이건 미번역보다 나쁘다 — 고장난 것처럼 보인다. 그런 경우도 미번역으로 세어
     전수 조사에서 잡히게 한다. */
  if(sub !== s && !/[가-힣]/.test(sub)) return sub;
  if(/[가-힣]/.test(s)) _missing[key] = (_missing[key]||0)+1;
  return s;
}

let _subRe = null;
const _subCache = new Map();
function _subst(s){
  if(_subCache.has(s)) return _subCache.get(s);
  const T = (typeof I18N_EN!=='undefined') ? I18N_EN : null;
  let out = s;
  if(T){
    if(!_subRe){
      const keys = Object.keys(T)
        .filter(k=>/[가-힣]/.test(k))
        .sort((a,b)=>b.length-a.length)            // 긴 것부터 — 부분 일치로 잘리지 않게
        .map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
      _subRe = keys.length ? new RegExp(keys.join('|'), 'g') : /$^/;
    }
    out = s.replace(_subRe, m => (T[m]!==undefined ? T[m] : m));
  }
  if(_subCache.size > 4000) _subCache.clear();
  _subCache.set(s, out);
  return out;
}
/* 검사용 — 콘솔에서 K.missing() 으로 번역 빠진 문자열을 본다 */
K.missing = ()=> Object.keys(_missing).sort((a,b)=>_missing[b]-_missing[a]);
K.missingCount = ()=> Object.keys(_missing).length;
