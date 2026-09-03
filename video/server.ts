// civilization.is — public landing + replay + metered live frame; full-res live frame token-gated.
// deno run -A server.ts
const PORT = Number(Deno.env.get("PORT") ?? 8720);
const DIR = new URL("./frames/", import.meta.url).pathname;
const TOKEN = Deno.readTextFileSync(new URL("./token.txt", import.meta.url)).trim();

const SEC = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; worker-src blob:",
};
const NOCACHE = { "cache-control": "no-store" };
const EDGE2 = { "cache-control": "public, max-age=2, s-maxage=2" };      // live public frame: edge-cached 2s
const EDGE1 = { "cache-control": "public, max-age=1, s-maxage=1" };
const EDGE_LONG = { "cache-control": "public, max-age=86400, immutable" }; // archive frames never change

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&family=Jost:wght@400;600&display=swap');
:root{--bg:#14181B;--bg-deep:#0E1114;--bg-card:#1B2024;--rule:#2F363B;--rule-strong:#4A5760;--fg:#F3ECD8;--fg-body:#D9CFB6;--fg-soft:#8B8576;--fg-faint:#5A5546;--sodium:#F2A413;--sodium-deep:#B8770A;--route:#0E6F6F;--serif:'Newsreader','EB Garamond',Georgia,serif;--sans:'Jost','Futura','Avenir Next',system-ui,sans-serif;--mono:'IBM Plex Mono',ui-monospace,Menlo,monospace}
*{box-sizing:border-box}html,body{margin:0}body{background:var(--bg);color:var(--fg);font:17px/1.62 var(--serif);font-variant-numeric:oldstyle-nums;-webkit-font-smoothing:antialiased}
header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:16px clamp(16px,3vw,40px);border-bottom:1px solid var(--rule)}
header h1{margin:0;font:600 15px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--fg-body)}header h1 b{color:var(--sodium);font-weight:600}
nav a{color:var(--fg-body);text-decoration:none;margin-left:18px;font:13px var(--mono);letter-spacing:.04em}nav a:hover,nav a.on{color:var(--sodium)}
.wrap{max-width:1600px;margin:0 auto;padding:0 clamp(12px,2vw,28px)}
.lede{display:grid;grid-template-columns:1fr auto;gap:12px 32px;align-items:end;padding:22px 0 14px}
.lede h2{margin:0;font:400 clamp(22px,2.6vw,34px)/1.15 var(--serif);color:var(--fg)}.lede h2 i{color:var(--sodium);font-style:italic}
.lede .meta{font:12px/1.7 var(--mono);color:var(--fg-soft);text-align:right;white-space:nowrap}.lede .meta b{color:var(--fg);font-weight:500}
.stage{position:relative;background:var(--bg-deep);border:1px solid var(--rule);overflow:hidden;touch-action:none;user-select:none}
.stage video,.stage img{width:100%;display:block;min-height:200px;transform-origin:0 0;will-change:transform}
.stage .hud{position:absolute;left:12px;top:12px;display:flex;gap:8px;pointer-events:none}
.pill{background:rgba(14,17,20,.78);border:1px solid var(--rule);color:var(--fg-body);font:12px/1 var(--mono);padding:6px 9px;letter-spacing:.04em}.pill b{color:var(--sodium);font-weight:500}
.pill.live::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#E60026;margin-right:7px;vertical-align:0;animation:blink 1.6s infinite}@keyframes blink{50%{opacity:.25}}
.ctl{position:absolute;right:12px;top:12px;display:flex;gap:6px}.ctl button,.bar button{background:rgba(14,17,20,.78);border:1px solid var(--rule);color:var(--fg-body);font:12px var(--mono);padding:6px 10px;cursor:pointer}.ctl button:hover,.bar button:hover{border-color:var(--sodium);color:var(--sodium)}
.stage .scrub{position:absolute;left:12px;right:12px;bottom:12px;display:flex;gap:10px;align-items:center;background:rgba(14,17,20,.78);border:1px solid var(--rule);padding:6px 10px;font:12px var(--mono);color:var(--fg-body)}.scrub input{flex:1;accent-color:var(--sodium)}.scrub button{background:none;border:1px solid var(--rule);color:var(--sodium);font:12px var(--mono);padding:3px 8px;cursor:pointer}.ctl select{background:rgba(14,17,20,.78);border:1px solid var(--rule);color:var(--fg-body);font:12px var(--mono);padding:6px}
.note{font:13px/1.6 var(--mono);color:var(--fg-soft);padding:10px 0}
.cols{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:28px;padding:18px 0 40px}@media(max-width:1000px){.cols{grid-template-columns:1fr}.lede{grid-template-columns:1fr}.lede .meta{text-align:left;white-space:normal}}
.about p{margin:0 0 12px;color:var(--fg-body);max-width:38rem}.about .modes{font:13px/1.7 var(--mono);color:var(--fg-soft)}.about .modes b{color:var(--fg-body);font-weight:500}
.log{font:13px/1.6 var(--mono);color:var(--fg-body);white-space:pre-wrap;max-height:70vh;overflow:auto;border-left:1px solid var(--rule);padding-left:16px}.log b{color:var(--sodium);font-weight:500}
h3.k{margin:0 0 10px;font:600 12px var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--fg-soft)}
footer{border-top:1px solid var(--rule);margin-top:10px;padding:18px clamp(16px,3vw,40px) 40px;color:var(--fg-soft);font:13px/1.6 var(--mono)}
.bar{display:flex;gap:10px;align-items:center;padding:12px 0;font:13px var(--mono)}.bar input[type=range]{flex:1;accent-color:var(--sodium)}.bar #turn{min-width:5em;color:var(--sodium);font-weight:500}
.frame{position:relative;background:var(--bg-deep);border:1px solid var(--rule)}.frame img{width:100%;display:block;min-height:200px}
.tag{position:absolute;left:10px;top:10px}
`;

const ABOUT = `
<p>A frontier model — Claude, run as <i>Fable&nbsp;5.1</i> — is playing Qin Shi Huang at Deity: Earth true-start, Better Balanced Game, Online speed, eight civs. A human played turns 1–19; the agent has played every turn since, steered only by written directive and map pins. The stream is the live game window at native 4K; the log is the agent's own turn-by-turn notes, mistakes included.</p>
<p class=modes><b>Live</b> video · <b>Replay</b> per turn · <b>State replay</b> from the tuner · being built: Advisor mode, play-against-Fable, 2v2 league, knowledge base, Elo ladder.</p>
`;

const ZOOM = `
// pinch / wheel / drag zoom for .stage children (video or img)
function zoomable(stage){const el=stage.querySelector('video,img');let sc=1,tx=0,ty=0,drag=null,pts=new Map(),pd=0;
 const apply=()=>{el.style.transform='translate('+tx+'px,'+ty+'px) scale('+sc+')';stage.dataset.zoom=sc>1.02?'1':''};
 const clamp=()=>{const W=stage.clientWidth,H=stage.clientHeight;sc=Math.min(8,Math.max(1,sc));tx=Math.min(0,Math.max(W-W*sc,tx));ty=Math.min(0,Math.max(H-H*sc,ty));};
 const zoomAt=(x,y,f)=>{const ns=Math.min(8,Math.max(1,sc*f));f=ns/sc;tx=x-(x-tx)*f;ty=y-(y-ty)*f;sc=ns;clamp();apply();};
 stage.addEventListener('wheel',e=>{e.preventDefault();const r=stage.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,e.deltaY<0?1.2:1/1.2)},{passive:false});
 stage.addEventListener('dblclick',e=>{if(e.target.closest('.ctl,.scrub'))return;const r=stage.getBoundingClientRect();if(sc>1.02){sc=1;tx=ty=0;apply()}else zoomAt(e.clientX-r.left,e.clientY-r.top,3)});
 stage.addEventListener('pointerdown',e=>{if(e.target.closest('.ctl,.scrub'))return;stage.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===1)drag=[e.clientX-tx,e.clientY-ty];if(pts.size===2){const a=[...pts.values()];pd=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])}});
 stage.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,[e.clientX,e.clientY]);
  if(pts.size===2){const a=[...pts.values()];const d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);const r=stage.getBoundingClientRect();zoomAt((a[0][0]+a[1][0])/2-r.left,(a[0][1]+a[1][1])/2-r.top,d/pd);pd=d;}
  else if(drag&&sc>1){tx=e.clientX-drag[0];ty=e.clientY-drag[1];clamp();apply();}});
 const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pd=0;if(pts.size===0)drag=null;};stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
 stage.querySelector('.zr')?.addEventListener('click',()=>{sc=1;tx=ty=0;apply()});stage.querySelector('.zi')?.addEventListener('click',()=>zoomAt(stage.clientWidth/2,stage.clientHeight/2,1.5));stage.querySelector('.zo')?.addEventListener('click',()=>zoomAt(stage.clientWidth/2,stage.clientHeight/2,1/1.5));
 stage.querySelector('.fs')?.addEventListener('click',()=>{document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen()});}
`;

const indexHtml = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>civilization.is — live</title><style>${CSS}</style></head><body>
<header><h1><b>civilization.sh</b> · live</h1><nav><a class=on href="/">live</a><a href="/replay">replay</a><a href="/map">state</a><a href="https://github.com/DanielleFong/civilization.sh">github</a></nav></header>
<div class=wrap>
<div class=lede><h2>Can an <i>agent</i> beat Civilization VI at Deity?</h2><div class=meta><b>Qin · Deity · Earth TSL</b><br>turn <b id=t>—</b> · game ends T250<br><span id=age>—</span></div></div>
<div class=stage id=stage>
  <video id=v muted autoplay playsinline></video>
  <div class=hud><span class="pill live">LIVE · 4K · 30fps · audio</span><span class=pill id=q>connecting…</span></div>
  <div class=ctl><button class=zi title="zoom in">+</button><button class=zo title="zoom out">−</button><button class=zr title="reset">1:1</button><button class=fs title="fullscreen">⛶</button><button id=snd title="sound">🔇</button><select id=qsel title="quality"><option value=-1>auto</option><option value=0>1080p</option><option value=1>4K</option></select></div>
  <div class=scrub><button id=golive>● LIVE</button><input id=seek type=range min=0 max=1000 value=1000><span id=tpos>live</span></div>
</div>
<div class=note>Scroll or pinch to zoom into the map — the stream is the native 3840×2121 game window, so every tooltip is legible. Double-click to zoom 3×.</div>
<div class=cols>
 <div class=about><h3 class=k>What this is</h3>${ABOUT}</div>
 <div><h3 class=k>Agent log</h3><div id=sitrep class=log>loading commentary…</div></div>
</div></div>
<footer>civilization.is · built on lmwilki/civ6-mcp · source github.com/DanielleFong/civilization.sh · stream: OBS window capture → NVENC H.264 + AAC via HLS, ~8 s behind the game. Fallback still: <a href="/frame.jpg" style="color:var(--fg-body)">/frame.jpg</a></footer>
<script src="/hls.min.js"></script>
<script>${ZOOM}
zoomable(document.getElementById('stage'));
const v=document.getElementById('v'),q=document.getElementById('q');
function fallback(){const img=document.createElement('img');img.id='f';v.replaceWith(img);q.textContent='stills · 3 s';zoomable(document.getElementById('stage'));
  const K=new URLSearchParams(location.search).get('k');const tick=async()=>{const r=await fetch((K?'/frame-hd.jpg?k='+K+'&':'/frame.jpg?')+'t='+Date.now(),{cache:'no-store'});if(r.ok){const b=await r.blob();img.src=URL.createObjectURL(b);}};tick();setInterval(tick,3000);}
if(window.Hls&&Hls.isSupported()){const h=new Hls({lowLatencyMode:false,liveSyncDurationCount:3,maxBufferLength:12,startLevel:0,capLevelToPlayerSize:true,liveDurationInfinity:true});window.__hls=h;h.loadSource('/hls/live.m3u8');h.attachMedia(v);
  h.on(Hls.Events.MANIFEST_PARSED,()=>{v.play().catch(()=>{});q.textContent='hls · h264';});let errs=0;h.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal&&++errs>3){h.destroy();fallback();}else if(d.fatal){h.startLoad();}});
  v.addEventListener('playing',()=>{q.textContent='hls · h264 · '+v.videoWidth+'×'+v.videoHeight});h.on(Hls.Events.LEVEL_SWITCHED,(e,d)=>{const l=h.levels[d.level];q.textContent='hls · '+l.height+'p · '+Math.round(l.bitrate/1e6)+' Mb/s'});}
else if(v.canPlayType('application/vnd.apple.mpegurl')){v.src='/hls/live.m3u8';v.play().catch(()=>{});q.textContent='hls · native';}
else fallback();
snd.onclick=()=>{v.muted=!v.muted;snd.textContent=v.muted?'🔇':'🔊'};
qsel.onchange=()=>{if(window.__hls){const lv=+qsel.value;if(lv<0){__hls.currentLevel=-1;__hls.autoLevelCapping=-1;__hls.capLevelToPlayerSize=true;}else{__hls.capLevelToPlayerSize=false;const idx=__hls.levels.findIndex(l=>lv===1?l.height>1500:l.height<=1500);__hls.currentLevel=idx;}}};
let seeking=false;const fmt=s=>{s=Math.max(0,Math.round(s));const m=Math.floor(s/60);return (m?m+'m':'')+String(s%60).padStart(2,'0')+'s'};
seek.oninput=()=>{seeking=true};seek.onchange=()=>{seeking=false;if(v.seekable.length){const a=v.seekable.start(0),b=v.seekable.end(0);v.currentTime=a+(b-a)*seek.value/1000;v.play().catch(()=>{});}};
golive.onclick=()=>{if(v.seekable.length){v.currentTime=v.seekable.end(0)-1;v.play().catch(()=>{});}};
setInterval(()=>{if(v.tagName!=='VIDEO'||!v.seekable.length||seeking)return;const a=v.seekable.start(0),b=v.seekable.end(0);const back=b-v.currentTime;seek.value=Math.round(1000*(v.currentTime-a)/Math.max(1,b-a));tpos.textContent=back<6?'live · '+fmt(b-a)+' buffered':'−'+fmt(back)+' behind live';},1000);
let lastT=0,stall=0;setInterval(()=>{if(v.tagName!=='VIDEO')return;if(v.currentTime===lastT&&!v.paused&&!seeking){if(++stall>=4){stall=0;q.textContent='reconnecting…';if(window.__hls){__hls.stopLoad();__hls.loadSource('/hls/live.m3u8?r='+Date.now());__hls.startLoad();v.play().catch(()=>{});}else{v.src='/hls/live.m3u8?r='+Date.now();v.play().catch(()=>{});}}}else stall=0;lastT=v.currentTime;},3000);
async function meta(){const s=await fetch('/sitrep.md?t='+Date.now(),{cache:'no-store'});
  if(s.ok){const md=await s.text();sitrep.innerHTML=md.replace(/</g,'&lt;').replace(/^(#+ .*)$/gm,'<b>$1</b>');const m=[...md.matchAll(/^### T(\\d{2,3})/gm)].map(x=>+x[1]);if(m.length)t.textContent=Math.max(...m);sitrep.scrollTop=sitrep.scrollHeight;}
  const r=await fetch('/hls/live.m3u8?t='+Date.now(),{cache:'no-store',method:'GET'});const lm=r.headers.get('last-modified');if(lm)age.textContent='stream updated '+Math.round((Date.now()-new Date(lm))/1000)+' s ago';}
meta();setInterval(meta,5000);
</script></body></html>`;

const replayHtml = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>civilization.is — replay</title><style>${CSS}</style></head><body>
<header><h1><b>civilization.sh</b> · replay</h1><nav><a href="/">live</a><a class=on href="/replay">replay</a><a href="/map">state</a><a href="https://github.com/DanielleFong/civilization.sh">github</a></nav></header>
<div class=wrap><div class=bar><span id=turn>T—</span><button id=prev>◀</button><input id=s type=range min=0 max=0 value=0><button id=next>▶</button><button id=play>▶▶</button><span style="color:var(--dim)" id=n></span></div>
<div class=frame><img id=f alt="archived game frame"></div>
<div id=log class=log>loading…</div>
</div><footer>One frame per turn from the live run, paired with the agent's commentary for that turn. Keyboard: ← → to scrub.</footer>
<script>
let files=[],sections={},i=0,timer=null;
const turnOf=f=>parseInt(f.slice(1,5),10);
function show(j){i=Math.max(0,Math.min(files.length-1,j));s.value=i;const f=files[i];const t=turnOf(f);
  document.getElementById('f').src='/archive/'+f;turn.textContent='T'+t;n.textContent=(i+1)+'/'+files.length;
  let k=t;while(k>0&&!sections[k])k--;
  log.innerHTML=(sections[k]||'(no commentary for this turn)').replace(/</g,'&lt;').replace(/^(### .*)$/m,'<b>$1</b>')+(k!==t?'\\n<span style="color:var(--dim)">(last note is from T'+k+')</span>':'');}
async function init(){files=await (await fetch('/archive.json')).json();
  const md=await (await fetch('/sitrep.md')).text();
  for(const part of md.split(/^(?=### T)/m)){const m=part.match(/^### T(\\d+)/);if(m)sections[parseInt(m[1],10)]=part.trim();}
  s.max=files.length-1;show(files.length-1);}
s.oninput=()=>show(+s.value);prev.onclick=()=>show(i-1);next.onclick=()=>show(i+1);
play.onclick=()=>{if(timer){clearInterval(timer);timer=null;play.textContent='▶▶';}else{timer=setInterval(()=>{if(i>=files.length-1){clearInterval(timer);timer=null;play.textContent='▶▶';}else show(i+1)},700);play.textContent='❚❚';}};
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});
init();
</script></body></html>`;

const mapHtml = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>civilization.is — state replay</title><style>${CSS}
.mapwrap{position:relative;width:100%;height:min(78vh,900px);background:#06080c;border:1px solid var(--line);overflow:hidden;touch-action:none;cursor:grab}
.mapwrap.drag{cursor:grabbing}
canvas{display:block;width:100%;height:100%}
.zoomctl{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:4px}
.zoomctl button{width:30px;height:30px;font:16px ui-monospace,monospace}
.tip{position:absolute;pointer-events:none;background:rgba(6,8,12,.92);color:#ddd;border:1px solid var(--line);padding:6px 8px;font:12px ui-monospace,Menlo,monospace;white-space:pre;display:none;z-index:2}
.legend{display:flex;flex-wrap:wrap;gap:8px 14px;max-width:1100px;margin:6px auto;padding:0 18px;font:12px ui-monospace,Menlo,monospace;color:var(--dim)}
.legend i{display:inline-block;width:10px;height:10px;margin-right:4px;vertical-align:-1px;border:1px solid #0006}
.legend .maj{color:#eee;font-weight:600}
.keys{max-width:1100px;margin:4px auto;padding:0 18px;font:11px ui-monospace,Menlo,monospace;color:var(--dim)}
</style></head><body>
<header><h1><b>civilization.sh</b> · state</h1><nav><a href="/">live</a><a href="/replay">replay</a><a class=on href="/map">state</a><a href="https://github.com/DanielleFong/civilization.sh">github</a></nav></header>
<div class=wrap><div class=bar><span id=turn>T—</span><button id=prev>◀</button><input id=s type=range min=0 max=0 value=0><button id=next>▶</button><button id=play>▶▶</button>
<label style="color:var(--dim)"><input type=checkbox id=own checked> territory</label>
<label style="color:var(--dim)"><input type=checkbox id=cities checked> cities</label>
<label style="color:var(--dim)"><input type=checkbox id=yields checked> yields</label>
<label style="color:var(--dim)"><input type=checkbox id=res checked> resources</label>
<span style="color:var(--dim)" id=n></span></div>
<div class=mapwrap id=mw><canvas id=c></canvas><div class=zoomctl><button id=zi>+</button><button id=zo>−</button><button id=zr title="reset">⌂</button></div><div class=tip id=tip></div></div>
<div class=legend id=legend></div>
<div class=keys>scroll / pinch = zoom · drag = pan · double-click = zoom in · ← → = turn · yields = base terrain (food ● prod ▲ gold ◆), shown when zoomed · resources: ◆ bonus / luxury / strategic (index→name best-effort)</div>
<div class=log id=log>Rendered from the tuner's own map data (terrain once; ownership, roads and city snapshots per turn) — not screenshots. Turns are recorded whenever the agent ends a turn through the harness; gaps are turns ended by the raw Lua fallback.</div>
</div><footer>Hex grid <span id=grid>—</span>; colors: terrain class + civ tint and borders. Districts & per-tile improvements: recorder upgrade pending.</footer>
<script>
// Civ 6-style primary colours for majors; city-states neutral grey with type ring.
const PAL={0:'#e8b74a',8:'#c8623c',9:'#b23a48',10:'#c94f8c',11:'#4fa86a',12:'#8d8d99',13:'#3f7fbf',14:'#e6d3a3',62:'#9c8f6a'};
const CS_RING={Trade:'#e0b000',Scientific:'#3fa0ff',Industrial:'#ff8a3d',Cultural:'#c65cff',Militaristic:'#ff4d4d',Religious:'#f0f0f0'};
const TNAME=['grass','grass hills','grass mtn','plains','plains hills','plains mtn','desert','desert hills','desert mtn','tundra','tundra hills','tundra mtn','snow','snow hills','snow mtn','coast','ocean'];
const TERR=['#8fae5c','#7fa04e','#6e7d5a','#c9c27a','#b8b46c','#8c8a6a','#e0dcc0','#d6d2ba','#a8a49a','#bcae7a','#a8a06a','#8d8a78','#e6f1f3','#dbe9ee','#c7dbe3','#2f6f9e','#183f63'];
const FNAME={0:'floodplains',1:'ice',2:'jungle',3:'forest',4:'oasis',5:'marsh',6:'reef',7:'floodplains',8:'floodplains',9:'volcano',10:'geothermal',11:'volcanic soil'};
// vanilla GameInfo.Resources order (best-effort; DLC/BBG may shift indices)
const RNAME=['bananas','cattle','copper','crabs','deer','fish','rice','sheep','stone','wheat','citrus','cocoa','coffee','cotton','diamonds','dyes','furs','gypsum','incense','ivory','jade','marble','mercury','pearls','salt','silk','silver','spices','sugar','tea','tobacco','truffles','whales','wine','aluminum','coal','horses','iron','niter','oil','uranium'];
const RCLASS=i=>i<0?null:i<10?'bonus':i<34?'luxury':i<41?'strategic':'other';
const RCOL={bonus:'#7ed957',luxury:'#d17bff',strategic:'#ff5c5c',other:'#cccccc'};
// base yields [food,prod,gold] from terrain + feature + hills
function baseYield(t,f,h){let y=[0,0,0];const b=Math.floor(t/3);const m=t%3;if(t===15)y=[1,0,1];else if(t===16)y=[1,0,0];else if(m===2)y=[0,0,0];else{y=[[2,0,0],[1,1,0],[0,0,0],[1,0,0],[0,0,0]][b].slice();if(m===1){y[1]+=1;}}
  if(f===3)y[1]+=1;else if(f===2)y[0]+=1;else if(f===5)y[0]+=1;else if(f===0||f===7||f===8)y[0]+=3;else if(f===4){y[0]+=3;y[2]+=1;}else if(f===6){y[0]+=1;}return y;}
let st=null,turns=[],owners=null,roads=null,i=0,timer=null;
const mw=document.getElementById('mw'),cvs=document.getElementById('c'),ctx=cvs.getContext('2d'),tip=document.getElementById('tip');
let view={z:1,x:0,y:0},base=null,dpr=1;
function reset(){owners=new Int16Array(st.gridW*st.gridH).fill(-1);roads=new Int8Array(st.gridW*st.gridH);(st.initialRoutes||[]).forEach((v,k)=>{if(k%2===0)roads[v]=st.initialRoutes[k+1]});(st.initialOwners||[]).forEach((v,k)=>{if(k%2===0)owners[v]=st.initialOwners[k+1]});}
function applyTo(idx){reset();let cities=st.initialCities||[];for(let k=0;k<=idx;k++){const t=turns[k];if(t.owners)for(let j=0;j<t.owners.length;j+=2)owners[t.owners[j]]=t.owners[j+1];if(t.roads)for(let j=0;j<t.roads.length;j+=2)roads[t.roads[j]]=t.roads[j+1];if(t.cities)cities=t.cities;}return cities;}
function fit(){const W=st.gridW,H=st.gridH;const cw=mw.clientWidth,ch=mw.clientHeight;dpr=window.devicePixelRatio||1;cvs.width=cw*dpr;cvs.height=ch*dpr;
  base=Math.min(cw/(W*Math.sqrt(3)+1),ch/(H*1.5+0.5));view={z:1,x:(cw-base*Math.sqrt(3)*(W+.5))/2,y:(ch-base*(1.5*H+.5))/2};}
function hexCenter(x,y,r){return [(x+(y%2?0.5:0)+0.5)*r*Math.sqrt(3),(st.gridH-1-y)*1.5*r+r];}
function hexPath(cx,cy,r){ctx.beginPath();for(let k=0;k<6;k++){const a=Math.PI/180*(60*k-30);ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}ctx.closePath();}
const NB=(x,y)=>{const o=y%2?[[1,0],[1,1],[0,1],[-1,0],[0,-1],[1,-1]]:[[1,0],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1]];return o.map(([dx,dy])=>[x+dx,y+dy]);};
function draw(idx){if(!st)return;const W=st.gridW,H=st.gridH;const r=base*view.z;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#06080c';ctx.fillRect(0,0,cvs.width,cvs.height);ctx.translate(view.x,view.y);
  const cities=applyTo(idx);const showOwn=own.checked,showY=yields.checked&&r>=13,showR=res.checked&&r>=6;
  const cw=mw.clientWidth,ch=mw.clientHeight;
  const x0=Math.max(0,Math.floor((-view.x)/(r*Math.sqrt(3)))-1),x1=Math.min(W-1,Math.ceil((cw-view.x)/(r*Math.sqrt(3)))+1);
  const yTop=Math.max(0,Math.floor((-view.y)/(r*1.5))-1),yBot=Math.min(H-1,Math.ceil((ch-view.y)/(r*1.5))+1);
  const yLo=H-1-yBot,yHi=H-1-yTop;
  // pass 1: terrain + features + tint
  for(let y=yLo;y<=yHi;y++)for(let x=x0;x<=x1;x++){const p=y*W+x;const t=st.terrain[p*6],f=st.terrain[p*6+1],hill=st.terrain[p*6+2],riv=st.terrain[p*6+3],rs=st.terrain[p*6+5];const [cx,cy]=hexCenter(x,y,r);
    hexPath(cx,cy,r);ctx.fillStyle=t<0?'#000':(TERR[t]||'#777');ctx.fill();
    if(f===1){ctx.fillStyle='rgba(235,245,255,.85)';ctx.fill();}
    const o=owners[p];if(showOwn&&o>=0){ctx.fillStyle=(o<20&&PAL[o])?PAL[o]:'#9a9a9a';ctx.globalAlpha=o<20&&PAL[o]?.38:.22;ctx.fill();ctx.globalAlpha=1;}
    if(r>=5){
      if(t%3===2&&t<15){ctx.fillStyle='rgba(60,55,50,.9)';ctx.beginPath();ctx.moveTo(cx-r*.55,cy+r*.35);ctx.lineTo(cx-r*.1,cy-r*.5);ctx.lineTo(cx+r*.2,cy+r*.05);ctx.lineTo(cx+r*.4,cy-r*.2);ctx.lineTo(cx+r*.6,cy+r*.35);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,.7)';ctx.beginPath();ctx.moveTo(cx-r*.1,cy-r*.5);ctx.lineTo(cx-r*.22,cy-r*.25);ctx.lineTo(cx+r*.02,cy-r*.25);ctx.closePath();ctx.fill();}
      else if(hill){ctx.strokeStyle='rgba(70,60,40,.55)';ctx.lineWidth=Math.max(1,r*.08);ctx.beginPath();ctx.arc(cx-r*.25,cy+r*.15,r*.3,Math.PI,0);ctx.arc(cx+r*.3,cy+r*.25,r*.25,Math.PI,0);ctx.stroke();}
      if(f===3){ctx.fillStyle='#2f5d2a';for(const [dx,dy] of [[-.3,.1],[.25,-.05],[0,.35]]){ctx.beginPath();ctx.moveTo(cx+dx*r,cy+dy*r-r*.3);ctx.lineTo(cx+dx*r-r*.18,cy+dy*r+r*.05);ctx.lineTo(cx+dx*r+r*.18,cy+dy*r+r*.05);ctx.closePath();ctx.fill();}}
      else if(f===2){ctx.fillStyle='#2c6b3a';for(const [dx,dy] of [[-.3,.05],[.2,-.15],[.05,.35],[.35,.25]]){ctx.beginPath();ctx.arc(cx+dx*r,cy+dy*r,r*.2,0,7);ctx.fill();}}
      else if(f===5){ctx.strokeStyle='#3b6f7a';ctx.lineWidth=Math.max(1,r*.07);ctx.beginPath();for(const dy of [-.25,0,.25]){ctx.moveTo(cx-r*.4,cy+dy*r);ctx.lineTo(cx+r*.4,cy+dy*r);}ctx.stroke();}
      else if(f===4){ctx.fillStyle='#3aa7d8';ctx.beginPath();ctx.ellipse(cx,cy+r*.1,r*.32,r*.2,0,0,7);ctx.fill();ctx.fillStyle='#2f7d2a';ctx.fillRect(cx-r*.05,cy-r*.45,r*.1,r*.5);}
      else if(f===0||f===7||f===8){ctx.strokeStyle='rgba(70,120,60,.6)';ctx.lineWidth=Math.max(1,r*.06);ctx.beginPath();for(const dy of [-.3,-.1,.1,.3]){ctx.moveTo(cx-r*.45,cy+dy*r);ctx.lineTo(cx+r*.45,cy+dy*r);}ctx.stroke();}
      else if(f===9){ctx.fillStyle='#6b2a2a';ctx.beginPath();ctx.moveTo(cx-r*.5,cy+r*.4);ctx.lineTo(cx,cy-r*.5);ctx.lineTo(cx+r*.5,cy+r*.4);ctx.closePath();ctx.fill();ctx.fillStyle='#ff7a2a';ctx.beginPath();ctx.arc(cx,cy-r*.42,r*.12,0,7);ctx.fill();}
      if(riv&&t<15){ctx.strokeStyle='#4aa3e0';ctx.lineWidth=Math.max(1,r*.12);ctx.beginPath();ctx.moveTo(cx-r*.5,cy+r*.62);ctx.quadraticCurveTo(cx-r*.15,cy+r*.45,cx+r*.15,cy+r*.62);ctx.quadraticCurveTo(cx+r*.35,cy+r*.72,cx+r*.5,cy+r*.62);ctx.stroke();}
    }
    if(roads[p]>0){ctx.strokeStyle='rgba(90,60,30,.85)';ctx.lineWidth=Math.max(1,r*.14);const nb=NB(x,y);ctx.beginPath();let any=false;for(let k=0;k<6;k++){const [nx,ny]=nb[k];if(nx<0||ny<0||nx>=W||ny>=H)continue;if(roads[ny*W+nx]>0){const [qx,qy]=hexCenter(nx,ny,r);ctx.moveTo(cx,cy);ctx.lineTo((cx+qx)/2,(cy+qy)/2);any=true;}}if(any)ctx.stroke();else{ctx.fillStyle='rgba(90,60,30,.85)';ctx.beginPath();ctx.arc(cx,cy,r*.12,0,7);ctx.fill();}}
    if(showR&&rs>=0){const cl=RCLASS(rs);ctx.fillStyle=RCOL[cl];ctx.strokeStyle='#000';ctx.lineWidth=1;const s=Math.max(2.5,r*.28);ctx.beginPath();ctx.moveTo(cx+r*.5,cy-r*.45-s);ctx.lineTo(cx+r*.5+s,cy-r*.45);ctx.lineTo(cx+r*.5,cy-r*.45+s);ctx.lineTo(cx+r*.5-s,cy-r*.45);ctx.closePath();ctx.fill();ctx.stroke();}
    if(showY){const y3=baseYield(t,f,hill);let k=0;const tot=y3[0]+y3[1]+y3[2];const s=Math.min(r*.13,4);const cols=Math.min(tot,4);
      const put=(col,shape)=>{const row=Math.floor(k/4),c=k%4;const px=cx+(c-(Math.min(tot-row*4,4)-1)/2)*s*2.4,py=cy+r*.55-row*s*2.3;ctx.fillStyle=col;ctx.beginPath();if(shape==='c'){ctx.arc(px,py,s,0,7);}else if(shape==='t'){ctx.moveTo(px,py-s);ctx.lineTo(px+s,py+s);ctx.lineTo(px-s,py+s);ctx.closePath();}else{ctx.moveTo(px,py-s);ctx.lineTo(px+s,py);ctx.lineTo(px,py+s);ctx.lineTo(px-s,py);ctx.closePath();}ctx.fill();k++;};
      for(let q=0;q<y3[0];q++)put('#7ed957','c');for(let q=0;q<y3[1];q++)put('#ff9a3d','t');for(let q=0;q<y3[2];q++)put('#ffd23d','d');}
  }
  // pass 2: civ borders
  if(showOwn&&r>=3){ctx.lineWidth=Math.max(1,r*.14);for(let y=yLo;y<=yHi;y++)for(let x=x0;x<=x1;x++){const p=y*W+x;const o=owners[p];if(o<0)continue;const [cx,cy]=hexCenter(x,y,r);const nb=NB(x,y);ctx.strokeStyle=(o<20&&PAL[o])?PAL[o]:'#bdbdbd';
      for(let k=0;k<6;k++){const [nx,ny]=nb[k];const no=(nx<0||ny<0||nx>=W||ny>=H)?-2:owners[ny*W+nx];if(no===o)continue;
        // edge k lies between vertex k and k+1 of hex rotated -30°: map neighbour order to edges
        const e=[0,1,2,3,4,5][k];const a0=Math.PI/180*(60*e-30),a1=Math.PI/180*(60*(e+1)-30);ctx.beginPath();ctx.moveTo(cx+r*.92*Math.cos(a0),cy+r*.92*Math.sin(a0));ctx.lineTo(cx+r*.92*Math.cos(a1),cy+r*.92*Math.sin(a1));ctx.stroke();}}}
  // pass 3: cities (markers) then labels last so text is in front
  if(document.getElementById('cities').checked){const fs=Math.max(10,Math.min(18,r*1.1));ctx.font='600 '+fs+'px ui-monospace,Menlo,monospace';ctx.textAlign='center';ctx.lineJoin='round';
    for(const c of cities){const [cx,cy]=hexCenter(c.x,c.y,r);const pl=(st.players||[]).find(p=>p.pid===c.pid);const maj=c.pid<20&&PAL[c.pid];const col=maj?PAL[c.pid]:'#9a9a9a';
      const rr=Math.max(3,r*.55);ctx.fillStyle=col;ctx.beginPath();ctx.arc(cx,cy,rr,0,7);ctx.fill();ctx.lineWidth=Math.max(1,r*.12);ctx.strokeStyle=pl&&pl.csType?(CS_RING[pl.csType]||'#fff'):'#000';ctx.stroke();
      if(r>=6){ctx.fillStyle='#000';ctx.font='700 '+Math.max(8,rr*1.1)+'px ui-monospace,monospace';ctx.fillText(String(c.pop),cx,cy+rr*.4);ctx.font='600 '+fs+'px ui-monospace,Menlo,monospace';}}
    for(const c of cities){const [cx,cy]=hexCenter(c.x,c.y,r);const name=(c.name||'').replace('LOC_CITY_NAME_','').replace(/_/g,' ').toLowerCase();const maj=c.pid<20&&PAL[c.pid];
      ctx.lineWidth=Math.max(2,fs*.28);ctx.strokeStyle='rgba(0,0,0,.95)';ctx.strokeText(name,cx,cy-r*.85);ctx.fillStyle=maj?'#fff':'#d8d8d8';ctx.fillText(name,cx,cy-r*.85);}}
  turn.textContent='T'+turns[idx].turn;n.textContent=(idx+1)+'/'+turns.length;}
function show(j){i=Math.max(0,Math.min(turns.length-1,j));s.value=i;draw(i);}
// zoom / pan
function zoomAt(f,px,py){const nz=Math.max(1,Math.min(14,view.z*f));const k=nz/view.z;view.x=px-(px-view.x)*k;view.y=py-(py-view.y)*k;view.z=nz;clamp();draw(i);}
function clamp(){const r=base*view.z,W=st.gridW,H=st.gridH,cw=mw.clientWidth,ch=mw.clientHeight;const mw_=r*Math.sqrt(3)*(W+.5),mh=r*(1.5*H+.5);
  if(mw_<=cw)view.x=(cw-mw_)/2;else view.x=Math.min(0,Math.max(cw-mw_,view.x));if(mh<=ch)view.y=(ch-mh)/2;else view.y=Math.min(0,Math.max(ch-mh,view.y));}
mw.addEventListener('wheel',e=>{e.preventDefault();const b=mw.getBoundingClientRect();zoomAt(e.deltaY<0?1.2:1/1.2,e.clientX-b.left,e.clientY-b.top);},{passive:false});
let ptrs=new Map(),drag=null,pinch=null;
mw.addEventListener('pointerdown',e=>{mw.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,[e.clientX,e.clientY]);if(ptrs.size===1){drag={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y};mw.classList.add('drag');}else if(ptrs.size===2){const a=[...ptrs.values()];pinch={d:Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]),z:view.z};drag=null;}});
mw.addEventListener('pointermove',e=>{if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,[e.clientX,e.clientY]);
  if(pinch&&ptrs.size===2){const a=[...ptrs.values()];const d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);const b=mw.getBoundingClientRect();const mx=(a[0][0]+a[1][0])/2-b.left,my=(a[0][1]+a[1][1])/2-b.top;zoomAt((pinch.z*d/pinch.d)/view.z,mx,my);return;}
  if(drag){view.x=drag.vx+(e.clientX-drag.x);view.y=drag.vy+(e.clientY-drag.y);clamp();draw(i);return;}
  hover(e);});
const up=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(ptrs.size===0){drag=null;mw.classList.remove('drag');}};
mw.addEventListener('pointerup',up);mw.addEventListener('pointercancel',up);mw.addEventListener('pointerleave',()=>{tip.style.display='none';});
mw.addEventListener('dblclick',e=>{const b=mw.getBoundingClientRect();zoomAt(1.8,e.clientX-b.left,e.clientY-b.top);});
zi.onclick=()=>zoomAt(1.4,mw.clientWidth/2,mw.clientHeight/2);zo.onclick=()=>zoomAt(1/1.4,mw.clientWidth/2,mw.clientHeight/2);zr.onclick=()=>{fit();draw(i);};
function hover(e){const b=mw.getBoundingClientRect();const mx=e.clientX-b.left-view.x,my=e.clientY-b.top-view.y;const r=base*view.z;const yrow=Math.round((my-r)/(1.5*r));const y=st.gridH-1-yrow;if(y<0||y>=st.gridH){tip.style.display='none';return;}
  const x=Math.round(mx/(r*Math.sqrt(3))-(y%2?0.5:0)-0.5);if(x<0||x>=st.gridW){tip.style.display='none';return;}const p=y*st.gridW+x;const t=st.terrain[p*6],f=st.terrain[p*6+1],h=st.terrain[p*6+2],rv=st.terrain[p*6+3],rs=st.terrain[p*6+5];const o=owners[p];const pl=(st.players||[]).find(q=>q.pid===o);const yl=baseYield(t,f,h);
  tip.textContent='('+x+','+y+') '+(TNAME[t]||t)+(f>=0?' · '+(FNAME[f]||'feature#'+f):'')+(rv?' · river':'')+(rs>=0?' · '+(RNAME[rs]||'res#'+rs)+' ['+RCLASS(rs)+']':'')+'\\nbase F'+yl[0]+' P'+yl[1]+' G'+yl[2]+(pl?'\\n'+pl.civ.replace('CIVILIZATION_','').toLowerCase():'');
  tip.style.display='block';tip.style.left=(e.clientX-b.left+14)+'px';tip.style.top=(e.clientY-b.top+14)+'px';}
async function init(){st=await (await fetch('/state/static.json')).json();const txt=await (await fetch('/state/turns.jsonl')).text();turns=txt.trim().split('\\n').map(l=>{const o=JSON.parse(l);o.turn=+o.turn;return o;});
  const ps=(st.players||[]).filter(p=>p.pid<20);const majors=ps.filter(p=>!p.csType),css=ps.filter(p=>p.csType);
  const item=p=>'<span class="'+(p.csType?'':'maj')+'"><i style="background:'+(PAL[p.pid]||'#9a9a9a')+(p.csType?';border-color:'+(CS_RING[p.csType]||'#fff'):'')+'"></i>'+p.civ.replace('CIVILIZATION_','').toLowerCase()+(p.csType?' ('+p.csType+')':'')+'</span>';
  legend.innerHTML=majors.map(item).join('')+'<span style="flex-basis:100%;height:0"></span>'+css.map(item).join('');
  document.getElementById('grid').textContent=st.gridW+'×'+st.gridH;fit();s.max=turns.length-1;const q=new URLSearchParams(location.search);if(q.get('z')){const r0=base;view.z=Math.max(1,Math.min(14,+q.get('z')));const r=r0*view.z;const [hx,hy]=hexCenter(+(q.get('x')||st.gridW/2),+(q.get('y')||st.gridH/2),r);view.x=mw.clientWidth/2-hx;view.y=mw.clientHeight/2-hy;clamp();}show(q.get('t')?turns.findIndex(t=>t.turn>=+q.get('t')):turns.length-1);}
s.oninput=()=>show(+s.value);prev.onclick=()=>show(i-1);next.onclick=()=>show(i+1);own.onchange=()=>draw(i);yields.onchange=()=>draw(i);res.onchange=()=>draw(i);document.getElementById('cities').onchange=()=>draw(i);
play.onclick=()=>{if(timer){clearInterval(timer);timer=null;play.textContent='▶▶';}else{timer=setInterval(()=>{if(i>=turns.length-1){clearInterval(timer);timer=null;play.textContent='▶▶';}else show(i+1)},600);play.textContent='❚❚';}};
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});window.onresize=()=>{if(!st)return;const r=base*view.z,cw0=cvs.width/dpr,ch0=cvs.height/dpr;const mx=(cw0/2-view.x)/r,my=(ch0/2-view.y)/r;const z=view.z;fit();view.z=z;const r2=base*z;view.x=mw.clientWidth/2-mx*r2;view.y=mw.clientHeight/2-my*r2;clamp();draw(i);};
init();
</script></body></html>`;
async function file(path: string, type: string, cache: Record<string,string>) {
  try {
    const st = await Deno.stat(path);
    const body = await Deno.readFile(path);
    return new Response(body, { headers: { ...SEC, ...cache, "content-type": type, "last-modified": st.mtime!.toUTCString() } });
  } catch { return new Response("not found", { status: 404, headers: SEC }); }
}

Deno.serve({ port: PORT, hostname: "127.0.0.1" }, async (req) => {
  const u = new URL(req.url); const p = u.pathname;
  if (req.method !== "GET") return new Response("method", { status: 405, headers: SEC });
  const hasK = u.searchParams.get("k") === TOKEN || (req.headers.get("cookie") ?? "").includes("k=" + TOKEN);

  // public routes
  if (p === "/") return new Response(indexHtml, { headers: { ...SEC, ...NOCACHE, "content-type": "text/html; charset=utf-8", ...(hasK ? { "set-cookie": "k=" + TOKEN + "; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=2592000" } : {}) } });
  if (p === "/replay") return new Response(replayHtml, { headers: { ...SEC, ...NOCACHE, "content-type": "text/html; charset=utf-8" } });
  if (p === "/frame.jpg") return file(DIR + "public.jpg", "image/jpeg", EDGE2);
  if (p === "/hls.min.js") return file(DIR + "hls.min.js", "application/javascript", EDGE_LONG);
  if (p === "/hls/live.m3u8") return file(DIR + "hls/live.m3u8", "application/vnd.apple.mpegurl", EDGE1);
  if (/^\/hls\/(4k|1080)_\d+_s\d{5}\.ts$/.test(p)) return file(DIR + "hls/" + p.slice(5), "video/mp2t", EDGE_LONG);
  if (/^\/hls\/(4k|1080)\.m3u8$/.test(p)) return file(DIR + "hls/" + p.slice(5), "application/vnd.apple.mpegurl", EDGE1);
  if (p === "/map") return new Response(mapHtml, { headers: { ...SEC, ...NOCACHE, "content-type": "text/html; charset=utf-8" } });
  if (p === "/state/static.json") return file(DIR + "state/static.json", "application/json", { "cache-control": "public, max-age=3600" });
  if (p === "/state/turns.jsonl") return file(DIR + "state/turns.jsonl", "text/plain; charset=utf-8", { "cache-control": "public, max-age=10" });
  if (p === "/sitrep.md") return file(DIR + "sitrep.md", "text/plain; charset=utf-8", { "cache-control": "public, max-age=5" });
  if (p === "/archive.json") {
    const files: string[] = [];
    try { for await (const e of Deno.readDir(DIR + "archive")) if (e.isFile && /^t\d{4}_\d{6}\.jpg$/.test(e.name)) files.push(e.name); } catch {}
    files.sort();
    return new Response(JSON.stringify(files), { headers: { ...SEC, "cache-control": "public, max-age=30", "content-type": "application/json" } });
  }
  if (p.startsWith("/archive/")) {
    const name = p.slice(9);
    if (!/^t\d{4}_\d{6}\.jpg$/.test(name)) return new Response("bad name", { status: 400, headers: SEC });
    return file(DIR + "archive/" + name, "image/jpeg", EDGE_LONG);
  }
  // gated: full-resolution live frame
  if (p === "/frame-hd.jpg") {
    if (!hasK) return new Response("civilization.is — private", { status: 401, headers: SEC });
    return file(DIR + "latest.jpg", "image/jpeg", NOCACHE);
  }
  return new Response("not found", { status: 404, headers: SEC });
});
console.log("video server on", PORT);
