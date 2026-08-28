/* ══════════════════════════════════════════════════════════════════
   공유 카드 — 9:16 한 장.

   ⚠ 이 게임은 gamerclock.com 에서 iframe 안에 들어간다. 샌드박스 iframe 은
     <a download> 가 막힐 수 있다. 그래서 **화면에 띄우는 것**을 주 경로로 둔다 —
     모바일에서는 스크린샷이 가장 자연스러운 공유 방법이고, 언제나 된다.
     내려받기는 되면 좋은 덤으로만 붙인다.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

const Share = {
  W: 540, H: 960,          // 9:16
  cv: null,
  /* 카드 한 장을 그려 캔버스로 돌려준다 */
  build(){
    const c = this.cv || (this.cv = document.createElement('canvas'));
    c.width=this.W; c.height=this.H;
    const x = c.getContext('2d');
    const W=this.W, H=this.H;

    /* 바탕 — 밤 경기장 */
    const g=x.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#0b1026'); g.addColorStop(0.55,'#16203f'); g.addColorStop(1,'#0a0d1c');
    x.fillStyle=g; x.fillRect(0,0,W,H);
    /* 트랙 띠 — 아래쪽에 원근으로 */
    const bands=[[0.62,0.055],[0.685,0.075],[0.77,0.095]];
    bands.forEach(([ty,th],i)=>{
      x.fillStyle = i%2 ? '#a8482c' : '#9c4028';
      x.fillRect(0, H*ty, W, H*th);
      x.fillStyle='rgba(232,226,214,.55)'; x.fillRect(0, H*ty, W, 2);
      x.fillStyle='#1f6b34'; x.fillRect(0, H*ty-H*0.012, W, H*0.012);
    });
    /* 관중 실루엣 */
    x.fillStyle='#1c2340'; x.fillRect(0, H*0.44, W, H*0.16);
    for(let i=0;i<340;i++){
      const px=(i*37)%W, py=H*0.45 + ((i*61)%(H*0.14));
      x.fillStyle = ['#2a2f52','#3b4270','#c98b64'][i%3];
      x.fillRect(px, py, 5, 6);
    }

    const C = (typeof Career!=='undefined') ? Career : null;
    const T = (s)=> (typeof K==='function') ? K(s) : s;
    const line=(s,cx,cy,size,color,align,weight)=>{
      x.font = `${weight||400} ${size}px Galmuri11, "Nanum Gothic Coding", monospace`;
      x.textAlign = align||'center'; x.textBaseline='top';
      x.fillStyle = color; x.fillText(T(s), cx, cy);
    };

    /* 제목 */
    line('WORLD SPRINT CIRCUIT', W/2, 54, 30, '#ffd75e', 'center', 700);
    line(T('육상부 감독이 되어 선수를 키운다'), W/2, 94, 15, '#c9cede');

    /* 랭크 */
    if(C){
      const R=C.rank;
      line(R.name, W/2, 150, 46, R.color, 'center', 700);
      const bw=380, bx=W/2-bw/2, by=212;
      x.fillStyle='rgba(255,255,255,.14)'; x.fillRect(bx,by,bw,10);
      x.fillStyle=R.color; x.fillRect(bx,by,Math.round(bw*C.progress),10);
      const nc=C.nextCp;
      line(nc===null?`CP ${C.d.cp}`:`CP ${C.d.cp} / ${nc}`, W/2, by+18, 15, '#8a90a6');
    }

    /* 선수 한 명 — 가장 화려한 종을 세운다 */
    if(typeof CharHD!=='undefined' && typeof SPECIES!=='undefined'){
      const keys=Object.keys(SPECIES);
      const pick = keys.filter(k=>SPECIES[k].rare>=4)[0] || keys[0];
      x.save();
      /* CharHD 는 게임 좌표(키 42)로 그린다 — 크게 키워 카드에 세운다 */
      const k = 4.6;
      x.setTransform(k,0,0,k, W/2, H*0.70);
      try{ CharHD.draw(x, pick, 0, 0, 0.25, {rare:SPECIES[pick].rare, moving:true, t:0}); }catch(e){}
      x.restore();
    }

    /* 통계 */
    if(C){
      const rows=[
        [T('경기'), C.d.races], [T('개인 최고'), C.d.pbs],
        [T('금메달'), C.d.golds], [T('시즌'), C.d.seasons],
      ];
      const y0=H*0.80, cw=W/4;
      rows.forEach(([k2,v],i)=>{
        const cx=cw*i+cw/2;
        line(String(v), cx, y0, 30, '#ffffff', 'center', 700);
        line(k2, cx, y0+36, 13, '#8a90a6');
      });
      line(`${T('뱃지')} ${C.badgeCount()} / ${BADGES.length}`, W/2, y0+72, 16, '#ffd75e', 'center', 700);
    }

    /* 꼬리말 */
    x.fillStyle='rgba(255,215,94,.35)'; x.fillRect(W*0.2, H-72, W*0.6, 1);
    line('gamerclock.com', W/2, H-56, 15, '#8a90a6');
    return c;
  },
  /* 내려받기 — 되면 덤. 막히면 조용히 실패하고 화면 카드로 남는다. */
  download(){
    try{
      const c=this.build();
      const a=document.createElement('a');
      a.download='world-sprint-circuit.png';
      a.href=c.toDataURL('image/png');
      document.body.appendChild(a); a.click(); a.remove();
      return true;
    }catch(e){ return false; }
  },
};
