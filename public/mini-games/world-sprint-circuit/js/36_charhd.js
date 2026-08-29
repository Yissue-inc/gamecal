/* ══════════════════════════════════════════════════════════════════
   고해상도 캐릭터 레이어
   ⚠ 왜 필요한가: 32×32 픽셀로는 만화 동물을 그릴 수 없다.
      실측 — 코끼리 시범 어셋의 불투명 픽셀 3,533개 중 검은 아웃라인이
      1,633개(46%)였고 몸 색은 300px(8%)에 불과했다. 해상도의 물리적 한계다.

   구조: 게임 캔버스(480×270 픽셀)는 그대로 두고, 캐릭터만 **UI 캔버스**에 그린다.
        UI 캔버스는 이미 고DPI 이고 게임과 같은 좌표계를 쓴다(Screen.fit 참고).
        그래서 배경은 픽셀, 캐릭터는 선명한 만화체가 한 화면에 공존할 수 있다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const CharHD = {
  enabled: true,
  cache:{}, missing:{},
  /* 어셋 규격: 프레임 128×128, 달리기 시트 1024×128 (8프레임) */
  FRAME: 128,
  /* 게임 좌표에서 캐릭터가 차지하는 높이(px). 32 이면 예전 픽셀과 같은 크기 */
  DRAW_H: 42,   // 레인 높이(42)에 꽉 차게 — 고해상도 어셋이라 키워도 안 뭉갠다

  /* 종족 이름을 손으로 적는 자리(종목별 등장 동물)를 **파일이 실릴 때** 검사한다.
     ⚠ 실측: 펜싱은 'fox'(진짜 이름은 greyfox), 스피드클라이밍은 'gecko'(아예 없는 종)를
        적어 두었다. 화면에는 폴백 사각형이 나오고 콘솔엔 404 만 조용히 쌓였다 —
        어셋 검사기도 '캐릭터 60/60 도착' 이라 통과시켰다(종족표만 봤으므로).
        이제 이름을 잘못 적으면 게임이 아예 안 뜬다. */
  verifyCasts(){
    if(typeof SPECIES==='undefined' || typeof SPRITE_CASTS==='undefined') return;
    const bad=[];
    for(const where in SPRITE_CASTS)
      for(const n of SPRITE_CASTS[where]) if(!SPECIES[n]) bad.push(`${where}:${n}`);
    if(bad.length) throw new Error('없는 종족 이름 — '+bad.join(', ')+
      ' (종족표 35_species.js 에 있는 이름만 쓴다)');
  },

  get(name){
    if(this.cache[name]) return this.cache[name];
    if(this.missing[name]) return null;
    const img=new Image();
    img.onload=()=>{ this.cache[name]=img; this.measure(name, img); };
    img.onerror=()=>{ this.missing[name]=true; };
    img.src = assetUrl(`assets/${name}.webp`);
    this.missing[name]=false;
    return null;
  },
  /* 발 위치 자동 정렬.
     ⚠ 어셋마다 바닥선이 1~2px 씩 흔들린다(달리기는 발이 번갈아 닿으니 자연스럽다).
        그림을 다시 그려 달라고 할 게 아니라, **불투명 픽셀의 최저점**을 재서
        그만큼 내려 그린다. 앞으로 어떤 어셋이 와도 땅에 붙는다. */
  bottom:{},
  measure(name, img){
    try{
      const c=document.createElement('canvas');
      c.width=img.width; c.height=img.height;
      const x=c.getContext('2d', {willReadFrequently:true});
      x.drawImage(img,0,0);
      const d=x.getImageData(0,0,c.width,c.height).data;
      let maxY=-1;
      for(let y=c.height-1;y>=0;y--){
        for(let px=0;px<c.width;px++){
          if(d[(y*c.width+px)*4+3]>16){ maxY=y; break; }
        }
        if(maxY>=0) break;
      }
      this.bottom[name] = maxY>=0 ? (img.height-1-maxY) : 0;   // 아래 여백(px)
    }catch(e){ this.bottom[name]=0; }
  },

  /* 캐릭터 한 명. x,y 는 게임 좌표의 '발 위치'.
     opt.rare (1~5) 를 주면 등급 연출이 함께 그려진다.
     ⚠ 등급을 어셋으로 받으면 5등급 x 50종 = 250장이 더 필요하다.
        같은 그림 위에 코드로 얹는다 — 발광·잔상·반짝임. */
  draw(u, species, x, y, phase, opt){
    opt=opt||{};
    if(!this.enabled) return false;
    const pose = opt.crouch?'crouch' : opt.throwing?'throw' : opt.airborne?'jump' : opt.lean?'lean' : null;
    const H = this.DRAW_H * (opt.scale||1);
    const rare = opt.rare|0;

    const blit=(img, sx, sw, sh, key)=>{
      const W = H*(sw/sh);
      /* 아래 여백만큼 내려 그려 발이 정확히 y 에 닿게 한다 */
      const pad = (this.bottom[key]||0) * (H/sh);
      const dx = x-W/2, dy = y-H+pad;
      /* 전설은 잔상이 따라붙는다 */
      if(rare>=5 && opt.moving && !opt.swim){
        u.save(); u.globalAlpha=0.22;
        for(let k=1;k<=3;k++){
          u.globalAlpha = 0.20/k;
          if(sx===undefined) u.drawImage(img, dx-k*4, dy, W, H);
          else u.drawImage(img, sx, 0, sw, sh, dx-k*4, dy, W, H);
        }
        u.restore();
      }
      /* 등급 발광 — 그림자 기능으로 실루엣 바깥에 색을 두른다 */
      if(rare>=2 && !opt.swim){
        const c = (typeof RARITY!=='undefined' && RARITY[rare]) ? RARITY[rare].color : '#5cff9c';
        u.save();
        u.shadowColor = c;
        u.shadowBlur = rare>=5 ? 14 : rare>=4 ? 9 : rare>=3 ? 6 : 4;
        // 여러 번 그려야 발광이 눈에 띈다
        for(let k=0;k<(rare>=4?2:1);k++){
          if(sx===undefined) u.drawImage(img, dx, dy, W, H);
          else u.drawImage(img, sx, 0, sw, sh, dx, dy, W, H);
        }
        u.restore();
      }
      if(opt.swim){
        /* 수영 — 몸을 눕힌다. 달리는 자세 그대로는 물 위를 뛰는 것처럼 보인다.
           ⚠ 어두운 종은 밝은 물 위에서 **덩어리로 읽힌다**(실측: 가마우지 #2a2a33,
              오리 #8a6a3a 가 검은 사각형처럼 보였다). 등급 발광은 수영에서 꺼 놨으니
              대신 옅은 흰 테두리를 둘러 어떤 종이든 물에서 형태가 보이게 한다. */
        u.save();
        u.translate(dx+W/2, dy+H*0.72);
        u.rotate(-Math.PI/2 * 0.86);
        u.save();
        u.shadowColor = 'rgba(255,255,255,.95)'; u.shadowBlur = 5;
        if(sx===undefined) u.drawImage(img, -W/2, -H*0.5, W, H);
        else u.drawImage(img, sx, 0, sw, sh, -W/2, -H*0.5, W, H);
        u.restore();
        if(sx===undefined) u.drawImage(img, -W/2, -H*0.5, W, H);
        else u.drawImage(img, sx, 0, sw, sh, -W/2, -H*0.5, W, H);
        u.restore();
      }
      else if(sx===undefined) u.drawImage(img, dx, dy, W, H);
      else u.drawImage(img, sx, 0, sw, sh, dx, dy, W, H);
      /* 전설은 반짝임이 몸을 타고 흐른다 */
      if(rare>=5){
        const t = (opt.t||0);
        for(let k=0;k<3;k++){
          const p = ((t*0.0012 + k/3) % 1);
          const px = dx + W*0.22 + W*0.56*p;
          const py = dy + H*0.85 - H*0.62*p;
          const r = 1.6 + Math.sin(p*Math.PI)*1.4;
          u.save(); u.globalAlpha = 0.75*Math.sin(p*Math.PI);
          u.fillStyle='#fff6c8'; u.beginPath(); u.arc(px,py,r,0,Math.PI*2); u.fill();
          u.restore();
        }
      }
    };

    if(pose){
      const img=this.get(`char-${species}-${pose}`);
      if(img){ blit(img, undefined, img.width, img.height, `char-${species}-${pose}`); return true; }
    }
    const sheet=this.get(`char-${species}-run`);
    if(sheet){
      const F=8, fw=sheet.width/F, fh=sheet.height;
      const f=Math.floor((phase||0)*F)%F;
      blit(sheet, f*fw, fw, fh, `char-${species}-run`);
      return true;
    }
    // 어셋이 없으면 코드로 그린 만화체로 대체한다
    const ok = this.procedural(u, species, x, y, phase, opt, H);
    if(ok && rare>=3) this.rareRing(u, x, y, H, rare, opt.t||0);
    return ok;
  },
  /* 코드 그림에는 발광 대신 발밑 고리로 등급을 표시한다 */
  rareRing(u, x, y, H, rare, t){
    const c = (typeof RARITY!=='undefined' && RARITY[rare]) ? RARITY[rare].color : '#5aaaff';
    const w = H*0.42, h = H*0.13;
    const pulse = 1 + Math.sin(t*0.004)*0.08;
    u.save();
    u.globalAlpha = rare>=5 ? 0.55 : 0.32;
    u.strokeStyle=c; u.lineWidth = rare>=4 ? 2 : 1.2;
    u.beginPath(); u.ellipse(x, y-1, w*pulse, h*pulse, 0, 0, Math.PI*2); u.stroke();
    u.restore();
  },

  /* ── 코드로 그리는 깨끗한 만화체 ──────────────────────────
     어셋이 오기 전에 '이 방향이 맞는지' 눈으로 확인하려고 둔다.
     곡선·부드러운 음영을 쓰므로 픽셀과 확연히 다르게 보인다. */
  procedural(u, species, x, y, phase, opt, H){
    const S = (typeof SPECIES!=='undefined' && SPECIES[species]) ? SPECIES[species] : null;
    const body = S ? S.color : '#b49ad6';
    const dark = this.shade(body, -0.28), light = this.shade(body, 0.22);
    const p = (phase||0)*Math.PI*2;
    const sw = Math.sin(p), cw = Math.cos(p);
    const s = H/34;                      // 34 기준 스케일
    const lean = opt.lean ? 10 : 7;      // 전방 기울기(도)

    u.save();
    u.translate(x, y);
    u.scale(s, s);
    /* 수영이면 몸을 눕힌다 — 어셋 없는 종도 물에서 뛰어다니면 안 된다 */
    if(opt.swim){ u.translate(0, -H*0.22); u.rotate(-Math.PI/2*0.86); }
    else u.rotate(-lean*Math.PI/180 * 0.35);

    const air = opt.airborne;
    const bob = air ? -3 : (Math.abs(sw)>0.7 ? 1 : (Math.abs(cw)>0.9 ? -1.5 : 0));
    u.translate(0, bob);

    const stroke = (w)=>{ u.lineWidth=w; u.strokeStyle='rgba(20,16,28,.85)'; u.stroke(); };
    const ell=(cx,cy,rx,ry,rot)=>{ u.beginPath(); u.ellipse(cx,cy,rx,ry,rot||0,0,Math.PI*2); };

    /* 뒷다리 */
    const legA = air ? -0.9 : sw*0.85, legB = air ? 0.6 : -sw*0.85;
    this.leg(u, -1, legB, dark, stroke);
    /* 몸통 */
    ell(0,-14, 9, 10.5, 0); u.fillStyle=body; u.fill(); stroke(1.6);
    ell(-2,-16, 5.5, 6, 0); u.fillStyle=light; u.fill();
    /* 유니폼 */
    u.beginPath(); u.moveTo(-8,-16); u.lineTo(8,-16); u.lineTo(7,-8); u.lineTo(-7,-8); u.closePath();
    u.fillStyle='#e8544e'; u.fill(); stroke(1.2);
    /* 앞다리 */
    this.leg(u, 1, legA, body, stroke);
    /* 팔 (앞뒤로) */
    this.arm(u, -sw*1.1, body, stroke);
    /* 머리 */
    ell(1,-26, 7.5, 7, 0); u.fillStyle=body; u.fill(); stroke(1.6);
    /* 귀 */
    ell(-4,-27, 5, 6, -0.3); u.fillStyle=dark; u.fill(); stroke(1.2);
    /* 코 — 코끼리라면 길게, 아니면 짧게 */
    if(species==='elephant'||species==='hippo'){
      u.beginPath(); u.moveTo(6,-25);
      u.quadraticCurveTo(12+sw*2, -22+cw*2, 10+sw*3, -14+cw*3);
      u.lineWidth=3.4; u.strokeStyle=body; u.lineCap='round'; u.stroke();
      u.lineWidth=4.4; u.strokeStyle='rgba(20,16,28,.30)'; u.stroke();
      u.lineWidth=2.6; u.strokeStyle=body; u.stroke();
    } else {
      ell(7,-25, 2.6, 2.2, 0); u.fillStyle=dark; u.fill();
    }
    /* 눈 */
    ell(4,-28, 2.4, 2.6, 0); u.fillStyle='#fff'; u.fill(); stroke(0.9);
    ell(4.8,-28, 1.1, 1.3, 0); u.fillStyle='#1a1420'; u.fill();
    u.restore();
    return true;
  },
  leg(u, front, ang, color, stroke){
    u.save(); u.translate(front*2.2, -7); u.rotate(ang*0.55);
    u.beginPath(); u.roundRect ? u.roundRect(-2.6,0,5.2,9,2.4) : u.rect(-2.6,0,5.2,9);
    u.fillStyle=color; u.fill(); stroke(1.4);
    u.beginPath(); u.ellipse(0,9.5,3.4,2.1,0,0,Math.PI*2); u.fillStyle='#ffd75e'; u.fill(); stroke(1.2);
    u.restore();
  },
  arm(u, ang, color, stroke){
    u.save(); u.translate(3,-19); u.rotate(ang*0.9);
    u.beginPath(); u.roundRect ? u.roundRect(-2.1,0,4.2,8,2) : u.rect(-2.1,0,4.2,8);
    u.fillStyle=color; u.fill(); stroke(1.3);
    u.restore();
  },
  shade(hex, amt){
    const n=parseInt(hex.slice(1),16);
    const f=(v)=> Math.max(0,Math.min(255, Math.round(v + (amt>0? (255-v)*amt : v*amt))));
    return '#'+[f(n>>16&255),f(n>>8&255),f(n&255)].map(v=>v.toString(16).padStart(2,'0')).join('');
  },
};

/* ══════════════════════════════════════════════════════════════════
   얼굴 초상 (face-<종족>)

   ⚠ 로스터가 인물로 안 읽히는 이유는 **얼굴이 없어서**다. 지금까지는 달리는
      스프라이트를 카드에 축소해 넣었는데, 작게 줄이면 그냥 실루엣이 된다.

   ⛔ 60종 중 11종만 도착했다. 그래서 **있으면 얼굴, 없으면 달리는 그림**으로
      물러난다 — 반쪽만 얼굴인 화면이 나오지 않게, 부르는 쪽은 결과를 안 봐도 된다.
   ══════════════════════════════════════════════════════════════════ */
const Face = {
  /* 있으면 얼굴을 그리고 true. 없으면 아무것도 안 그리고 false —
     부르는 쪽이 달리는 스프라이트로 물러날 수 있게. */
  draw(u, species, x, y, size){
    if(!species) return false;
    const img = (typeof BG!=='undefined') ? BG.get('face-'+species) : null;
    if(!img) return false;
    u.drawImage(img, x-size/2, y-size/2, size, size);
    return true;
  },
  has(species){
    return !!(species && typeof BG!=='undefined' && BG.get('face-'+species));
  },
  /* 얼굴이 있으면 얼굴, 없으면 달리는 그림. 카드·목록이 쓰는 한 줄. */
  portrait(u, a, x, y, size, opt){
    const sp = a && (a.species||a);
    if(this.draw(u, sp, x, y, size)) return 'face';
    if(typeof CharHD!=='undefined' &&
       CharHD.draw(u, sp, x, y+size*0.45, 0.05, Object.assign({ scale:size/34 }, opt||{})))
      return 'sprite';
    return null;
  },
};
