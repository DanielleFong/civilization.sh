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
canvas{width:100%;display:block;background:#06080c;border:1px solid var(--line)}
.legend{display:flex;flex-wrap:wrap;gap:8px 14px;max-width:1100px;margin:6px auto;padding:0 18px;font:12px ui-monospace,Menlo,monospace;color:var(--dim)}
.legend i{display:inline-block;width:10px;height:10px;margin-right:4px;vertical-align:-1px}
</style></head><body>
<header><h1><b>civilization.sh</b> · state</h1><nav><a href="/">live</a><a href="/replay">replay</a><a class=on href="/map">state</a><a href="https://github.com/DanielleFong/civilization.sh">github</a></nav></header>
<div class=wrap><div class=bar><span id=turn>T—</span><button id=prev>◀</button><input id=s type=range min=0 max=0 value=0><button id=next>▶</button><button id=play>▶▶</button><label style="color:var(--dim)"><input type=checkbox id=own checked> territory</label><label style="color:var(--dim)"><input type=checkbox id=cities checked> cities</label><span style="color:var(--dim)" id=n></span></div>
<div class=frame style="border:0"><canvas id=c></canvas></div>
<div class=legend id=legend></div>
<div class=log id=log>Rendered from the tuner's own map data (terrain once; ownership, roads and city snapshots per turn) — not screenshots. Turns are recorded whenever the agent ends a turn through the harness; gaps are turns ended by the raw Lua fallback.</div>
</div><footer>Hex grid ${"${"}W}×${"${"}H}; colors: terrain class + owner tint. Per-civ vision layers coming next.</footer>
<script>
const PAL={0:'#e8b74a',8:'#c8623c',9:'#b23a48',10:'#c94f8c',11:'#5aa06b',12:'#7d7d7d',13:'#3f7fbf',14:'#e0e0e0',62:'#9c8f6a'};
const TERR=['#8fae5c','#7fa04e','#c9c27a','#b8b46c','#d9c98a','#c9b36f','#e0dcc0','#d6d2ba','#bcae7a','#a8a06a','#c7c1a1','#b6b08e','#e6f1f3','#dbe9ee','#c7dbe3','#2f6f9e','#183f63'];
let st=null,turns=[],owners=null,roads=null,i=0,timer=null,cvs=document.getElementById('c'),ctx=cvs.getContext('2d');
function hexColorForTerrain(t){if(t<0)return '#000';const cls=Math.floor(t/3);const base=TERR[t]||'#777';return base;}
function reset(){owners=new Int16Array(st.gridW*st.gridH).fill(-1);roads=new Uint8Array(st.gridW*st.gridH);(st.initialOwners||[]).forEach((v,k)=>{if(k%2===0)owners[v]=st.initialOwners[k+1]});}
function applyTo(idx){reset();let cities=st.initialCities||[];for(let k=0;k<=idx;k++){const t=turns[k];if(t.owners)for(let j=0;j<t.owners.length;j+=2)owners[t.owners[j]]=t.owners[j+1];if(t.roads)for(let j=0;j<t.roads.length;j+=2)roads[t.roads[j]]=t.roads[j+1];if(t.cities)cities=t.cities;}return cities;}
function draw(idx){const W=st.gridW,H=st.gridH;const cw=cvs.clientWidth;const r=cw/(W*Math.sqrt(3)+1);cvs.width=cw;cvs.height=Math.ceil(r*1.5*H+r);ctx.fillStyle='#06080c';ctx.fillRect(0,0,cvs.width,cvs.height);
  const cities=applyTo(idx);const showOwn=own.checked;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=y*W+x;const t=st.terrain[p*6];const cx=(x+(y%2?0.5:0)+0.5)*r*Math.sqrt(3),cy=cvs.height-(y*1.5+1)*r;
    ctx.beginPath();for(let k=0;k<6;k++){const a=Math.PI/180*(60*k-30);ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}ctx.closePath();
    ctx.fillStyle=hexColorForTerrain(t);ctx.fill();
    const o=owners[p];if(showOwn&&o>=0){ctx.fillStyle=(PAL[o]||'#aaa');ctx.globalAlpha=.45;ctx.fill();ctx.globalAlpha=1;}
    if(roads[p]){ctx.fillStyle='rgba(60,40,20,.7)';ctx.beginPath();ctx.arc(cx,cy,r*.18,0,7);ctx.fill();}}
  if(cities.checked!==false&&document.getElementById('cities').checked){ctx.font=Math.max(9,r*1.1)+'px ui-monospace,Menlo,monospace';ctx.textAlign='center';
    for(const c of cities){const cx=(c.x+(c.y%2?0.5:0)+0.5)*r*Math.sqrt(3),cy=cvs.height-(c.y*1.5+1)*r;ctx.fillStyle=PAL[c.pid]||'#fff';ctx.beginPath();ctx.arc(cx,cy,r*.55,0,7);ctx.fill();ctx.strokeStyle='#000';ctx.stroke();ctx.fillStyle='#fff';ctx.fillText(String(c.pop),cx,cy+r*.4);ctx.fillStyle='#ddd';ctx.fillText((c.name||'').replace('LOC_CITY_NAME_','').replace(/_/g,' ').toLowerCase(),cx,cy-r*.8);}}
  turn.textContent='T'+turns[idx].turn;n.textContent=(idx+1)+'/'+turns.length;}
function show(j){i=Math.max(0,Math.min(turns.length-1,j));s.value=i;draw(i);}
async function init(){st=await (await fetch('/state/static.json')).json();const txt=await (await fetch('/state/turns.jsonl')).text();turns=txt.trim().split('\\n').map(l=>{const o=JSON.parse(l);o.turn=+o.turn;return o;});
  legend.innerHTML=(st.players||[]).filter(p=>p.pid<20).map(p=>'<span><i style="background:'+(PAL[p.pid]||'#aaa')+'"></i>'+p.civ.replace('CIVILIZATION_','').toLowerCase()+(p.csType?' ('+p.csType+')':'')+'</span>').join('');
  s.max=turns.length-1;show(turns.length-1);}
s.oninput=()=>show(+s.value);prev.onclick=()=>show(i-1);next.onclick=()=>show(i+1);own.onchange=()=>draw(i);document.getElementById('cities').onchange=()=>draw(i);
play.onclick=()=>{if(timer){clearInterval(timer);timer=null;play.textContent='▶▶';}else{timer=setInterval(()=>{if(i>=turns.length-1){clearInterval(timer);timer=null;play.textContent='▶▶';}else show(i+1)},600);play.textContent='❚❚';}};
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});window.onresize=()=>draw(i);
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
  if (/^\/hls\/1080_\d+_s\d{5}\.ts$/.test(p)) return file(DIR + "hls/" + p.slice(5), "video/mp2t", EDGE_LONG);
  if (/^\/hls\/obs_\d{5}\.ts$/.test(p)) return file(DIR + "hls/" + p.slice(5), "video/mp2t", { "cache-control": "public, max-age=4, s-maxage=4" });
  if (/^\/hls\/(obs|1080)\.m3u8$/.test(p)) return file(DIR + "hls/" + p.slice(5), "application/vnd.apple.mpegurl", EDGE1);
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
