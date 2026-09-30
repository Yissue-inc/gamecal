/* GamerClock iframe adapter. Full progress stays in this browser; only scalar run results leave it. */
(function(){
 const bridge=window.GamerClockMiniGame;if(!bridge)return;
 const report=()=>({score:Math.min(5000000,Math.floor(game.totalCleaned||0)),durationMs:Math.floor((game.totalTime||0)*1000),result:game.dead?'lose':'complete',rankLabel:game.variant==='journey'?'Story · '+(game.chapter+1)+'/8':'City · '+(game.management().rank),stats:{mode:game.variant,cleaned:Math.floor(game.totalCleaned||0),wave:game.wave||0,storyChapter:game.chapter+1,contracts:game.variant==='tycoon'?game.management().wins:0}});
 const begin=beginMode;beginMode=function(mode){begin(mode);bridge.started({miniGameSlug:'clean-keep',mode});};
 const resume=continueGame;continueGame=function(){resume();if(saveSessionReady)bridge.started({miniGameSlug:'clean-keep',mode:game.variant,resumed:true});};
 const events=handleExpansionEvent;handleExpansionEvent=function(e){events(e);if(e.type==='journey_solved'||e.type==='commission_end'){bridge.scoreChanged({score:report().score});bridge.completed(report());}};
 const menu=showQuickMenu;showQuickMenu=function(){menu();if(!saveSessionReady)return;let b=document.createElement('button');b.className='btn secondary';b.textContent=CleanHouse.language==='en'?'Send cleaning record to GamerClock':'GamerClock에 청소 기록 보내기';b.onclick=()=>{save();bridge.completed(report());toast(CleanHouse.language==='en'?'Record sent. Profile saving is below the game.':'기록을 보냈어요. 게임 아래에서 로그인 후 기록을 저장할 수 있어요.');};$('modal').append(b);};
 bridge.onContext(ctx=>{try{if(!localStorage.getItem('clean-keep-story-language')){CleanHouse.setStoryLanguage(String(ctx.locale||'ko').startsWith('ko')?'ko':'en');document.documentElement.lang=CleanHouse.language;if(modalKind==='title')showTitle();}}catch{}});
 bridge.ready({miniGameSlug:'clean-keep',version:'27.0.0'});
})();
