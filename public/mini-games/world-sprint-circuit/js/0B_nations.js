/* ══════════════════════════════════════════════════════════════════
   국가 — LA 2028 을 겨냥한 소속감.

   ⚠ 국기를 그림 파일로 받으면 40개국 x 여러 해상도가 된다. 대부분의 국기는
     띠·십자·원 몇 개라서 **코드로 그린다** — 어셋 0장, 어떤 크기에서도 선명하다.
     복잡한 문양(태극·단풍잎 등)은 알아볼 수 있게 단순화한다. 실제 국기의
     정밀 재현이 아니라 **한눈에 어느 나라인지**가 목적이다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

/* 국기 표기법
   h:[색…]  가로 띠      v:[색…]  세로 띠
   disc:{c, r}          가운데 원 (r 은 높이 대비 비율)
   cross:{c, w}         북유럽 십자
   canton:{c}           왼쪽 위 사각
   bar:{c, h}           가운데 가로 굵은 띠
   tri:{c}              왼쪽 삼각 */
const NATIONS = [
  { code:'KOR', ko:'대한민국',   en:'Korea',        reg:'asia',
    flag:{ h:['#ffffff'], disc:{c:'#cd2e3a', r:0.30}, disc2:{c:'#0047a0', r:0.30} } },
  { code:'JPN', ko:'일본',       en:'Japan',        reg:'asia',
    flag:{ h:['#ffffff'], disc:{c:'#bc002d', r:0.32} } },
  { code:'CHN', ko:'중국',       en:'China',        reg:'asia',
    flag:{ h:['#de2910'], star:{c:'#ffde00'} } },
  { code:'USA', ko:'미국',       en:'USA',          reg:'america',
    flag:{ stripes:{a:'#b22234', b:'#ffffff', n:7}, canton:{c:'#3c3b6e'} } },
  { code:'CAN', ko:'캐나다',     en:'Canada',       reg:'america',
    flag:{ v:['#d52b1e','#ffffff','#d52b1e'], leaf:{c:'#d52b1e', r:0.40} } },
  { code:'BRA', ko:'브라질',     en:'Brazil',       reg:'america',
    flag:{ h:['#009c3b'], diamond:{c:'#ffdf00'}, disc:{c:'#002776', r:0.20} } },
  { code:'MEX', ko:'멕시코',     en:'Mexico',       reg:'america',
    flag:{ v:['#006847','#ffffff','#ce1126'] } },
  { code:'ARG', ko:'아르헨티나', en:'Argentina',    reg:'america',
    flag:{ h:['#74acdf','#ffffff','#74acdf'], disc:{c:'#f6b40e', r:0.16} } },
  { code:'JAM', ko:'자메이카',   en:'Jamaica',      reg:'america',
    flag:{ h:['#009b3a'], saltire:{c:'#fed100', side:'#000000'} } },
  { code:'GBR', ko:'영국',       en:'Britain',      reg:'europe',
    flag:{ h:['#012169'], saltire:{c:'#c8102e', side:'#ffffff'},
           cross:{c:'#ffffff', w:0.34}, cross2:{c:'#c8102e', w:0.18} } },
  { code:'FRA', ko:'프랑스',     en:'France',       reg:'europe',
    flag:{ v:['#0055a4','#ffffff','#ef4135'] } },
  { code:'GER', ko:'독일',       en:'Germany',      reg:'europe',
    flag:{ h:['#000000','#dd0000','#ffce00'] } },
  { code:'ITA', ko:'이탈리아',   en:'Italy',        reg:'europe',
    flag:{ v:['#008c45','#ffffff','#cd212a'] } },
  { code:'ESP', ko:'스페인',     en:'Spain',        reg:'europe',
    flag:{ h:['#aa151b','#f1bf00','#aa151b'], bar:{c:'#f1bf00', h:0.5} } },
  { code:'NED', ko:'네덜란드',   en:'Netherlands',  reg:'europe',
    flag:{ h:['#ae1c28','#ffffff','#21468b'] } },
  { code:'SWE', ko:'스웨덴',     en:'Sweden',       reg:'europe',
    flag:{ h:['#006aa7'], cross:{c:'#fecc00', w:0.20, nordic:true} } },
  { code:'NOR', ko:'노르웨이',   en:'Norway',       reg:'europe',
    flag:{ h:['#ba0c2f'], cross:{c:'#ffffff', w:0.30, nordic:true}, cross2:{c:'#00205b', w:0.14, nordic:true} } },
  { code:'POL', ko:'폴란드',     en:'Poland',       reg:'europe',
    flag:{ h:['#ffffff','#dc143c'] } },
  { code:'UKR', ko:'우크라이나', en:'Ukraine',      reg:'europe',
    flag:{ h:['#0057b7','#ffd700'] } },
  { code:'SUI', ko:'스위스',     en:'Switzerland',  reg:'europe',
    flag:{ h:['#d52b1e'], plus:{c:'#ffffff'} } },
  { code:'GRE', ko:'그리스',     en:'Greece',       reg:'europe',
    flag:{ stripes:{a:'#0d5eaf', b:'#ffffff', n:5}, canton:{c:'#0d5eaf'} } },
  { code:'POR', ko:'포르투갈',   en:'Portugal',     reg:'europe',
    flag:{ v:['#046a38','#046a38','#da291c','#da291c','#da291c'], disc:{c:'#ffe900', r:0.22, x:0.38} } },
  { code:'KEN', ko:'케냐',       en:'Kenya',        reg:'africa',
    flag:{ h:['#000000','#ffffff','#bb0000','#ffffff','#006600'] } },
  { code:'ETH', ko:'에티오피아', en:'Ethiopia',     reg:'africa',
    flag:{ h:['#078930','#fcdd09','#da121a'], disc:{c:'#0f47af', r:0.24} } },
  { code:'NGR', ko:'나이지리아', en:'Nigeria',      reg:'africa',
    flag:{ v:['#008751','#ffffff','#008751'] } },
  { code:'RSA', ko:'남아공',     en:'South Africa', reg:'africa',
    flag:{ h:['#e03c31','#ffffff','#007749','#ffffff','#001489'], tri:{c:'#ffb81c'} } },
  { code:'MAR', ko:'모로코',     en:'Morocco',      reg:'africa',
    flag:{ h:['#c1272d'], star:{c:'#006233'} } },
  { code:'EGY', ko:'이집트',     en:'Egypt',        reg:'africa',
    flag:{ h:['#ce1126','#ffffff','#000000'] } },
  { code:'AUS', ko:'호주',       en:'Australia',    reg:'oceania',
    flag:{ h:['#00008b'], jack:true, stars:{c:'#ffffff'} } },
  { code:'NZL', ko:'뉴질랜드',   en:'New Zealand',  reg:'oceania',
    flag:{ h:['#00247d'], jack:true, stars:{c:'#cc142b'} } },
  { code:'IND', ko:'인도',       en:'India',        reg:'asia',
    flag:{ h:['#ff9933','#ffffff','#138808'], disc:{c:'#000088', r:0.18} } },
  { code:'THA', ko:'태국',       en:'Thailand',     reg:'asia',
    flag:{ h:['#a51931','#f4f5f8','#2d2a4a','#f4f5f8','#a51931'] } },
  { code:'VIE', ko:'베트남',     en:'Vietnam',      reg:'asia',
    flag:{ h:['#da251d'], star:{c:'#ffff00'} } },
  { code:'INA', ko:'인도네시아', en:'Indonesia',    reg:'asia',
    flag:{ h:['#ce1126','#ffffff'] } },
  { code:'PHI', ko:'필리핀',     en:'Philippines',  reg:'asia',
    flag:{ h:['#0038a8','#ce1126'], tri:{c:'#ffffff'} } },
  { code:'TUR', ko:'튀르키예',   en:'Türkiye',      reg:'europe',
    flag:{ h:['#e30a17'], crescent:{c:'#ffffff'} } },
  { code:'QAT', ko:'카타르',     en:'Qatar',        reg:'asia',
    flag:{ v:['#ffffff','#8a1538','#8a1538','#8a1538','#8a1538'] } },
  { code:'CUB', ko:'쿠바',       en:'Cuba',         reg:'america',
    flag:{ stripes:{a:'#002a8f', b:'#ffffff', n:5}, tri:{c:'#cf142b'} } },
  { code:'COL', ko:'콜롬비아',   en:'Colombia',     reg:'america',
    flag:{ h:['#fcd116','#fcd116','#003893','#ce1126'] } },
  { code:'CZE', ko:'체코',       en:'Czechia',      reg:'europe',
    flag:{ h:['#ffffff','#d7141a'], tri:{c:'#11457e'} } },
];
const NATION_BY_CODE = {}; NATIONS.forEach(n=>NATION_BY_CODE[n.code]=n);
function nationName(code){
  const n=NATION_BY_CODE[code]; if(!n) return code||'';
  return (typeof LANG!=='undefined' && LANG==='en') ? n.en : n.ko;
}

/* ── 국기 그리기 ──────────────────────────────────────────
   x,y 는 왼쪽 위. 어떤 크기에서도 그린다. */
function drawFlag(x2d, x, y, w, h, code){
  const n = NATION_BY_CODE[code];
  x2d.save();
  x2d.beginPath(); x2d.rect(x, y, w, h); x2d.clip();
  if(!n){ x2d.fillStyle='#3a4258'; x2d.fillRect(x,y,w,h); x2d.restore(); return; }
  const f = n.flag;
  /* 바탕 */
  if(f.h){ const bh=h/f.h.length;
    f.h.forEach((c,i)=>{ x2d.fillStyle=c; x2d.fillRect(x, y+i*bh, w, bh+0.6); }); }
  else if(f.v){ const bw=w/f.v.length;
    f.v.forEach((c,i)=>{ x2d.fillStyle=c; x2d.fillRect(x+i*bw, y, bw+0.6, h); }); }
  else if(f.stripes){ const bh=h/f.stripes.n;
    for(let i=0;i<f.stripes.n;i++){ x2d.fillStyle = i%2? f.stripes.b : f.stripes.a;
      x2d.fillRect(x, y+i*bh, w, bh+0.6); } }
  else { x2d.fillStyle='#3a4258'; x2d.fillRect(x,y,w,h); }
  if(f.stripes && !f.h && !f.v){ /* 이미 그림 */ }
  /* 왼쪽 삼각 */
  if(f.tri){ x2d.fillStyle=f.tri.c;
    x2d.beginPath(); x2d.moveTo(x,y); x2d.lineTo(x+w*0.42,y+h/2); x2d.lineTo(x,y+h); x2d.fill(); }
  /* 캔턴 */
  if(f.canton){ x2d.fillStyle=f.canton.c; x2d.fillRect(x, y, w*0.42, h*0.54); }
  /* 왼쪽 위 유니언기 — 호주·뉴질랜드용.
     ⚠ 예전엔 캔턴 색이 바탕과 같아 아무것도 안 보였고 둘을 구분할 수 없었다. */
  if(f.jack){
    const jw=w*0.44, jh=h*0.52;
    x2d.save(); x2d.beginPath(); x2d.rect(x,y,jw,jh); x2d.clip();
    x2d.fillStyle='#012169'; x2d.fillRect(x,y,jw,jh);
    x2d.strokeStyle='#ffffff'; x2d.lineWidth=jh*0.30;
    x2d.beginPath(); x2d.moveTo(x,y); x2d.lineTo(x+jw,y+jh); x2d.moveTo(x+jw,y); x2d.lineTo(x,y+jh); x2d.stroke();
    x2d.strokeStyle='#c8102e'; x2d.lineWidth=jh*0.13;
    x2d.beginPath(); x2d.moveTo(x,y); x2d.lineTo(x+jw,y+jh); x2d.moveTo(x+jw,y); x2d.lineTo(x,y+jh); x2d.stroke();
    x2d.fillStyle='#ffffff';
    x2d.fillRect(x, y+jh/2-jh*0.17, jw, jh*0.34);
    x2d.fillRect(x+jw/2-jh*0.17, y, jh*0.34, jh);
    x2d.fillStyle='#c8102e';
    x2d.fillRect(x, y+jh/2-jh*0.09, jw, jh*0.18);
    x2d.fillRect(x+jw/2-jh*0.09, y, jh*0.18, jh);
    x2d.restore();
  }
  /* 십자 */
  const drawCross=(c,wr,nordic)=>{
    x2d.fillStyle=c;
    const cw=h*wr, cx = nordic ? x+w*0.34 : x+w/2;
    x2d.fillRect(x, y+h/2-cw/2, w, cw);
    x2d.fillRect(cx-cw/2, y, cw, h);
  };
  if(f.cross) drawCross(f.cross.c, f.cross.w, f.cross.nordic);
  if(f.cross2) drawCross(f.cross2.c, f.cross2.w, f.cross2.nordic);
  /* 대각 십자 */
  if(f.saltire){
    x2d.strokeStyle=f.saltire.side; x2d.lineWidth=h*0.42;
    x2d.beginPath(); x2d.moveTo(x,y); x2d.lineTo(x+w,y+h); x2d.moveTo(x+w,y); x2d.lineTo(x,y+h); x2d.stroke();
    x2d.strokeStyle=f.saltire.c; x2d.lineWidth=h*0.20;
    x2d.beginPath(); x2d.moveTo(x,y); x2d.lineTo(x+w,y+h); x2d.moveTo(x+w,y); x2d.lineTo(x,y+h); x2d.stroke();
  }
  /* 스위스 십자 */
  if(f.plus){ x2d.fillStyle=f.plus.c; const t=h*0.18, L=h*0.56;
    x2d.fillRect(x+w/2-t/2, y+h/2-L/2, t, L);
    x2d.fillRect(x+w/2-L/2, y+h/2-t/2, L, t); }
  /* 마름모 */
  if(f.diamond){ x2d.fillStyle=f.diamond.c;
    x2d.beginPath(); x2d.moveTo(x+w/2,y+h*0.12); x2d.lineTo(x+w*0.86,y+h/2);
    x2d.lineTo(x+w/2,y+h*0.88); x2d.lineTo(x+w*0.14,y+h/2); x2d.fill(); }
  /* 단풍잎 — 캐나다.
     ⛔ 원(disc)으로 대신 그리고 있었다. 빨강·하양·빨강 세로띠 가운데 **빨간 원**은
        어떤 나라도 아니다 — 40개 중 형태가 틀린 유일한 국기였다(다른 원들은
        태극·해·차크라·천구의처럼 이 크기에서 원이 그럴듯한 근사다).
     ⚠ 46×28 에 잎맥까지 넣으면 뭉갠다. **뾰족한 실루엣**만 남긴다 — 세 갈래 위쪽
        돌기와 아래 줄기. 그 윤곽만으로 이 크기에서는 충분히 캐나다로 읽힌다. */
  if(f.leaf){
    const cx=x+w/2, cy=y+h/2, R=h*(f.leaf.r||0.40);
    x2d.fillStyle=f.leaf.c;
    x2d.beginPath();
    const P=[[0,-1.00],[0.22,-0.52],[0.52,-0.62],[0.42,-0.24],[0.86,-0.10],
             [0.62,0.14],[0.72,0.34],[0.30,0.28],[0.34,0.72],[0.10,0.56],
             [0.10,1.00],[-0.10,1.00],[-0.10,0.56],[-0.34,0.72],[-0.30,0.28],
             [-0.72,0.34],[-0.62,0.14],[-0.86,-0.10],[-0.42,-0.24],[-0.52,-0.62],
             [-0.22,-0.52]];
    P.forEach(([px,py],i)=>{ const X=cx+px*R*0.92, Y=cy+py*R;
      i ? x2d.lineTo(X,Y) : x2d.moveTo(X,Y); });
    x2d.closePath(); x2d.fill();
  }
  /* 원 */
  const disc=(d)=>{ if(!d) return; x2d.fillStyle=d.c;
    x2d.beginPath(); x2d.arc(x+w*(d.x||0.5), y+h/2, h*d.r, 0, Math.PI*2); x2d.fill(); };
  disc(f.disc);
  /* 태극 — 위 빨강 아래 파랑 (단순화) */
  if(f.disc2){ x2d.save();
    x2d.beginPath(); x2d.arc(x+w/2, y+h/2, h*f.disc2.r, 0, Math.PI); x2d.closePath(); x2d.clip();
    x2d.fillStyle=f.disc2.c; x2d.fillRect(x,y,w,h); x2d.restore(); }
  /* 별 */
  const star=(cx,cy,r,c)=>{ x2d.fillStyle=c; x2d.beginPath();
    for(let i=0;i<5;i++){ const a=-Math.PI/2+i*Math.PI*2/5;
      x2d.lineTo(cx+Math.cos(a)*r, cy+Math.sin(a)*r);
      x2d.lineTo(cx+Math.cos(a+Math.PI/5)*r*0.44, cy+Math.sin(a+Math.PI/5)*r*0.44); }
    x2d.closePath(); x2d.fill(); };
  if(f.star) star(x+w*0.5, y+h*0.5, h*0.30, f.star.c);
  if(f.stars){ star(x+w*0.72, y+h*0.36, h*0.16, f.stars.c);
               star(x+w*0.84, y+h*0.62, h*0.12, f.stars.c); }
  /* 초승달 */
  if(f.crescent){ x2d.fillStyle=f.crescent.c;
    x2d.beginPath(); x2d.arc(x+w*0.40, y+h/2, h*0.30, 0, Math.PI*2); x2d.fill();
    x2d.globalCompositeOperation='destination-out';
    x2d.beginPath(); x2d.arc(x+w*0.48, y+h/2, h*0.24, 0, Math.PI*2); x2d.fill();
    x2d.globalCompositeOperation='source-over';
    star(x+w*0.62, y+h/2, h*0.16, f.crescent.c); }
  /* 테두리 — 흰 바탕 국기가 배경에 묻히지 않게 */
  x2d.strokeStyle='rgba(0,0,0,.45)'; x2d.lineWidth=1;
  x2d.strokeRect(x+0.5, y+0.5, w-1, h-1);
  x2d.restore();
}

/* ── 지역별 이름 풀 ────────────────────────────────────────
   ⚠ 국적만 붙이고 이름을 안 맞추면 "자메이카 소속 TARO HADDAD" 가 나온다 —
     소속감이 되레 깨진다. 40개국을 6개 이름권으로 묶어 준다.
   ⚠ 실존 인물을 쓰지 않는다. 그 지역에서 흔한 이름 요소를 조합한다. */
const NAME_REGION = {
  KOR:'kor', JPN:'jpn', CHN:'chn',
  USA:'anglo', CAN:'anglo', AUS:'anglo', NZL:'anglo', GBR:'anglo',
  JAM:'carib', CUB:'latin', BRA:'latin', MEX:'latin', ARG:'latin', COL:'latin',
  ESP:'latin', POR:'latin', ITA:'latin', FRA:'latin',
  GER:'euro', NED:'euro', SWE:'euro', NOR:'euro', POL:'euro', UKR:'euro',
  SUI:'euro', GRE:'euro', CZE:'euro',
  KEN:'afr', ETH:'afr', NGR:'afr', RSA:'afr',
  MAR:'arab', EGY:'arab', TUR:'arab', QAT:'arab',
  IND:'sasia', THA:'sasia', VIE:'sasia', INA:'sasia', PHI:'sasia',
};
const NAME_POOLS = {
  jpn:{ first:['HARUTO','YUI','SOTA','AOI','REN','MEI','KAITO','RIN'],
        last:['TANAKA','SATO','SUZUKI','NAKAMURA','KOBAYASHI','ITO','WATANABE'] },
  chn:{ first:['WEI','LI','JING','HAO','MIN','YAN','FENG','XIU'],
        last:['ZHANG','WANG','CHEN','LIU','YANG','HUANG','ZHAO'] },
  anglo:{ first:['JACK','EMMA','LIAM','OLIVIA','NOAH','AVA','ETHAN','MIA'],
          last:['SMITH','JOHNSON','BROWN','TAYLOR','WILSON','CLARK','WALKER'] },
  carib:{ first:['ANDRE','SHELLY','OMAR','KEISHA','DEVON','TIANA','MARLON'],
          last:['CAMPBELL','BROWN','THOMPSON','MCKENZIE','POWELL','BAILEY'] },
  latin:{ first:['MATEO','SOFIA','DIEGO','LUCIA','JOAO','CARLA','PABLO','ELENA'],
          last:['SILVA','GARCIA','ROSSI','MORENO','SANTOS','COSTA','FERRARI','DUBOIS'] },
  euro:{ first:['LUKAS','ANNA','JAN','KATRIN','ERIK','FREYA','PIOTR','NINA'],
         last:['NOVAK','SCHMIDT','ANDERSEN','KOWALSKI','MULLER','VAN DIJK','LARSEN'] },
  afr:{ first:['KOFI','AMARA','TENDAI','ZOLA','KWAME','NIA','JELANI','ASHA'],
        last:['OKAFOR','MBEKI','KAMAU','ABEBE','ADEBAYO','NKEMDI','WANJIRU'] },
  arab:{ first:['OMAR','LEILA','YOUSSEF','AMINA','KARIM','NOUR','TAREK'],
         last:['HADDAD','KHALIL','MANSOUR','EL SAYED','DEMIR','YILMAZ','AL FARSI'] },
  sasia:{ first:['ARJUN','PRIYA','RAVI','ANITA','SOMCHAI','LINH','BUDI','MARIA'],
          last:['SHARMA','PATEL','NGUYEN','SANTOS','WIJAYA','REYES','KUMAR'] },
};
/* 그 나라 사람의 이름 하나 */
function nationName2(code, rng){
  const reg = NAME_REGION[code] || 'anglo';
  if(reg==='kor') return null;                 // 한국은 기존 NAME_KO 를 쓴다
  const P = NAME_POOLS[reg] || NAME_POOLS.anglo;
  return P.first[(rng()*P.first.length)|0] + ' ' + P.last[(rng()*P.last.length)|0];
}
