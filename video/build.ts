// Builds dist/ for the civilization.is static Worker from server.ts templates + frames + data.
const src = await Deno.readTextFile("server.ts");
const head = src.split("async function file(")[0]
  .replace(/new URL\("\.\/frames\/", import\.meta\.url\)\.pathname/, '"frames/"')
  .replace(/Deno\.readTextFileSync\(new URL\("\.\/token\.txt", import\.meta\.url\)\)/, '"x"');
let { replayHtml, mapHtml, ZOOM } = new Function(head + "; return {replayHtml, mapHtml, ZOOM};")();

// ---- data: per-civ per-turn series from the harness diary (T19–T151, all majors) + T164 endpoints
const DIARY = "/mnt/c/Users/danie/.civ6-mcp/diary_china_-401507495_solar-amber-chariot-09.jsonl";
const drows = (await Deno.readTextFile(DIARY)).trim().split("\n").map(l => JSON.parse(l)).filter(r => r.turn);
const FIELDS = ["turn","score","science","culture","military","cities","pop","districts","great_works","era_score","gold","faith","diplo_vp"];
const series: Record<string, number[][]> = {}; const civOf: Record<string,string> = {};
for (const r of drows) { const n = String(r.civ ?? r.pid).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/ .*/,""); civOf[n] = r.leader ?? ""; (series[n] ??= []).push(FIELDS.map(f => r[f] ?? null)); }
for (const k in series) series[k].sort((a,b)=>a[0]-b[0]);
const finalScores: Record<string, number> = { GERMANY:1323, ENGLAND:1020, SCYTHIA:973, CHINA:880, INCA:820, POLAND:582 };
for (const [k,v] of Object.entries(finalScores)) { (series[k] ??= []).push([164, v, k==="CHINA"?213:null, null, null, k==="CHINA"?15:null, k==="CHINA"?135:null, null, k==="CHINA"?27:null, null, null, null, null]); }
const china = series.CHINA; const rivals: Record<string,[number,number][]> = {};
for (const [k,v] of Object.entries(series)) if (k!=="CHINA") rivals[k] = v.map(r => [r[0], r[1]]).filter(p => p[1] != null) as [number,number][];
const final = Object.entries(finalScores).sort((a,b)=>b[1]-a[1]);
await Deno.mkdir("dist", { recursive: true });
await Deno.writeTextFile("dist/data.json", JSON.stringify({ china, rivals, final, series, fields: FIELDS, leaders: civOf }));

// ---- branding + preamble + data panel
const brand = (h: string) => h.replace(/<b>civilization\.sh<\/b>/g, "<b>civilization.is</b>")
  .replace('<nav><a href="/">live</a><a class=on href="/replay">replay</a>', '<nav><a href="/watch">watch</a><a class=on href="/">replay</a><a href="/results">results</a><a href="/plan">plan</a>')
  .replace('<nav><a href="/">live</a><a href="/replay">replay</a>', '<nav><a href="/watch">watch</a><a href="/">replay</a><a href="/results">results</a><a href="/plan">plan</a>');
const PRE = `<div class=lede><h2>Can an agent beat Deity? <i>Not yet.</i><br>Can an agent <i>civilization</i>? Maybe.</h2>
<div class=meta><b>Game 1</b> · Qin · Deity · Earth TSL · BBG · Online<br>T20–T164 agent-played · 4th of 6 · defeat T164 (Germany, science)<br><a href="https://github.com/DanielleFong/civilization.sh" style="color:var(--sodium)">github</a> · <a href="mailto:dani.fong@gmail.com?subject=civilization.is%20list" style="color:var(--sodium)">mailing list</a> · blog &amp; X soon<br><span style="color:var(--fg-faint)">civilization.sh = the agentic endpoint (MCP), coming</span></div></div>`;
const PANEL = `<div class=cols style="padding-top:8px"><div><h3 class=k>Score, scrubbed</h3><canvas id=ch style="width:100%;height:220px;display:block;background:var(--bg-deep);border:1px solid var(--rule)"></canvas>
<div class=note id=dn>—</div></div>
<div><h3 class=k>Final standing · T164</h3><table id=fs style="width:100%;border-collapse:collapse;font:13px var(--mono)"></table>
<p class=note>Endgame Results / Ranking / Graphs screens were not captured from the game; this panel is built from the harness recorder (T11–T100), scores in the agent's commentary (T107+), and the T164 result.</p></div></div>`;
const DATAJS = `<script>
(async()=>{const D=await (await fetch('/data.json')).json();const C=D.china;const cv=document.getElementById('ch');const fs=document.getElementById('fs');
 fs.innerHTML=D.final.map(([c,s],k)=>'<tr style="border-bottom:1px solid var(--rule)'+(c==='CHINA'?';color:var(--sodium)':'')+'"><td style="padding:5px 0">'+(k+1)+'</td><td>'+c.toLowerCase()+(c==='CHINA'?' (agent)':'')+'</td><td style="text-align:right">'+s+'</td></tr>').join('');
 const near=t=>{let b=C[0];for(const r of C)if(r[0]<=t)b=r;return b};
 window.drawData=t=>{const W=cv.clientWidth,H=220;cv.width=W;cv.height=H;const x=cv.getContext('2d');x.fillStyle='#0E1114';x.fillRect(0,0,W,H);
  const T0=10,T1=165,S1=1400,px=tt=>10+(tt-T0)/(T1-T0)*(W-20),py=s=>H-12-s/S1*(H-24);
  x.strokeStyle='#2F363B';x.beginPath();for(const s of [400,800,1200]){x.moveTo(10,py(s));x.lineTo(W-10,py(s));}x.stroke();
  x.fillStyle='#5A5546';x.font='11px IBM Plex Mono,monospace';for(const s of [400,800,1200])x.fillText(s,12,py(s)-3);
  for(const [n,pts] of Object.entries(D.rivals)){x.strokeStyle='#4A5760';x.beginPath();pts.forEach(([tt,s],k)=>k?x.lineTo(px(tt),py(s)):x.moveTo(px(tt),py(s)));x.stroke();}
  let ly=-99;D.final.forEach(([c,s])=>{if(c==='CHINA')return;x.fillStyle='#8B8576';x.beginPath();x.arc(px(164),py(s),3,0,7);x.fill();let yy=Math.max(py(s)-5,ly+13);ly=yy;x.fillText(c.toLowerCase()+' '+s,px(164)-96,yy)});
  x.strokeStyle='#F2A413';x.lineWidth=2;x.beginPath();C.forEach((r,k)=>k?x.lineTo(px(r[0]),py(r[1])):x.moveTo(px(r[0]),py(r[1])));x.stroke();x.lineWidth=1;
  x.strokeStyle='#F3ECD8';x.beginPath();x.moveTo(px(t),0);x.lineTo(px(t),H);x.stroke();
  const r=near(t);document.getElementById('dn').innerHTML='<b style="color:var(--sodium)">T'+r[0]+'</b> · score <b>'+r[1]+'</b>'+(r[2]!=null?' · sci '+r[2]+'/t':'')+(r[3]!=null?' · cul '+r[3]+'/t':'')+(r[4]!=null?' · faith '+r[4]:'')+(r[5]!=null?' · gold '+r[5]:'')+(r[6]!=null?' · cities '+r[6]:'')+(r[7]!=null?' · pop '+r[7]:'')+(r[0]!==t?' <span style="color:var(--fg-faint)">(nearest recorded turn)</span>':'');};
 const s=document.getElementById('s');const upd=()=>{const t=parseInt(document.getElementById('turn').textContent.slice(1),10)||164;drawData(t)};
 new MutationObserver(upd).observe(document.getElementById('turn'),{childList:true});window.addEventListener('resize',upd);upd();})();
</script>`;

replayHtml = replayHtml
  .replace("s.max=files.length-1;show(files.length-1);", "s.max=files.length-1;show(0);")
  .replace("<button id=play>▶▶</button>", "<button id=play>▶▶</button><select id=spd title=speed><option value=3000>slow</option><option value=1500 selected>normal</option><option value=700>fast</option></select>")
  .replace("timer=setInterval(()=>{if(i>=files.length-1){clearInterval(timer);timer=null;play.textContent='▶▶';}else show(i+1)},700)", "timer=setInterval(()=>{if(i>=files.length-1){clearInterval(timer);timer=null;play.textContent='▶▶';}else show(i+1)},+document.getElementById('spd').value)")
  .replace('<div class=frame><img id=f alt="archived game frame"></div>', '<div class="frame stage" id=stage><img id=f alt="archived game frame"><div class=ctl><button onclick="zoomReset()">zoom / reset</button></div></div><div class=note>Wheel or pinch to zoom, drag to pan, double-click to zoom in / reset.</div>')
  .replace("<script>\nlet files=[]", "<script>" + ZOOM + "\nlet files=[]")
  .replace("init();\n</script></body></html>", "init();zoomable(document.getElementById('stage'));window.zoomReset=()=>document.getElementById('stage').dispatchEvent(new Event('dblclick'));\n</script></body></html>");
replayHtml = brand(replayHtml).replace('<div class=wrap><div class=bar>', '<div class=wrap>' + PRE + '<div class=bar>').replace('<div id=log class=log>loading…</div>', '<div id=log class=log>loading…</div>' + PANEL).replace('</body></html>', DATAJS + '</body></html>');
mapHtml = brand(mapHtml);

// ---- assets
const files: string[] = [];
for await (const e of Deno.readDir("frames/archive")) if (e.isFile && /^t\d{4}_\d{6}\.jpg$/.test(e.name)) files.push(e.name);
files.sort();
await Deno.mkdir("dist/archive", { recursive: true });
for (const f of files) await Deno.copyFile("frames/archive/" + f, "dist/archive/" + f);
await Deno.writeTextFile("dist/archive.json", JSON.stringify(files));

// ---- watch page (VOD HLS from Workers Assets)
const CSS = new Function(head + "; return CSS;")();
const watchHtml = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>civilization.is — watch</title><style>${CSS}
.stage video{width:100%;display:block;background:#000}
.pick{display:flex;gap:8px;padding:12px 0;font:13px var(--mono)}.pick button{background:var(--bg-card);border:1px solid var(--rule);color:var(--fg-body);padding:8px 14px;cursor:pointer;font:13px var(--mono)}.pick button.on{border-color:var(--sodium);color:var(--sodium)}
.chap{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;padding:8px 0 24px;font:13px/1.5 var(--mono)}.chap a{display:block;padding:10px;border:1px solid var(--rule);color:var(--fg-body);text-decoration:none;background:var(--bg-card)}.chap a b{color:var(--sodium);font-weight:500;display:block}.chap a:hover{border-color:var(--sodium)}
</style></head><body>
<header><h1><b>civilization.is</b> · watch</h1><nav><a class=on href="/watch">watch</a><a href="/">replay</a><a href="/map">state</a><a href="/results">results</a><a href="/plan">plan</a><a href="https://github.com/DanielleFong/civilization.sh">github</a></nav></header>
<div class=wrap>
<div class=lede><h2>Game 1, on film. <i>The parts that survived.</i></h2><div class=meta><b>1080p · 30 fps</b><br>highlights 20 min · full cut 64 min<br>static AI-turn waits removed</div></div>
<div class=pick><button id=bh class=on>Highlights · 20 min</button><button id=bf>Full cut · 64 min</button></div>
<div class=stage><video id=v controls playsinline preload=metadata></video></div>
<div class=note>Part I is one frame per turn (T10–T146, no continuous video existed). Part II is Danielle's 4K screen recording of T147–T152. Part III is the civilization.is live stream of T159–T161. Then the T164 result. Footage in the highlights cut runs at 3–4×.</div>
<h3 class=k>Chapters</h3><div class=chap id=chap></div>
</div>
<footer>Served from Cloudflare Workers Assets as VOD HLS. Sources, cuts and what was lost: <a href="https://github.com/DanielleFong/civilization.sh/blob/main/video/edit/EDIT-NOTES.md" style="color:var(--fg-body)">video/edit/EDIT-NOTES.md</a>.</footer>
<script src="/hls.min.js"></script>
<script>
const v=document.getElementById('v');let h=null;
const CH={highlights:[[0,'Title'],[3.5,'Part I · T10–T146 stills'],[289,'Part II · T147–T152 recording'],[1128,'Part III · T159–T161 live'],[1200,'T164 · Defeat']],
          full:[[0,'Title'],[3.5,'Part I · T10–T146 stills'],[289,'Part II · T147–T152 recording'],[3583,'Part III · T159–T161 live'],[3830,'T164 · Defeat']]};
function load(name){const src='/vod/'+name+'/index.m3u8';if(h){h.destroy();h=null}
  if(window.Hls&&Hls.isSupported()){h=new Hls({maxBufferLength:30});h.loadSource(src);h.attachMedia(v);}else{v.src=src;}
  bh.classList.toggle('on',name==='highlights');bf.classList.toggle('on',name==='full');
  chap.innerHTML=CH[name].map(([t,l])=>'<a href="#" data-t="'+t+'"><b>'+Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+'</b>'+l+'</a>').join('');
  chap.querySelectorAll('a').forEach(a=>a.onclick=e=>{e.preventDefault();v.currentTime=+a.dataset.t;v.play().catch(()=>{})});}
bh.onclick=()=>load('highlights');bf.onclick=()=>load('full');load('highlights');
</script></body></html>`;
await Deno.writeTextFile("dist/watch.html", watchHtml);


// ---- results + plan pages
const md2html = (md: string) => { let h = md.replace(/&/g,"&amp;").replace(/</g,"&lt;"); const lines = h.split("\n"); const out: string[] = []; let inList = false, inTable = false;
  const inline = (t: string) => t.replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>").replace(/_([^_]+)_/g,"<i>$1</i>").replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>');
  for (const l of lines) { if (l.startsWith("|")) { const cells = l.split("|").slice(1,-1).map(c=>c.trim()); if (cells.every(c=>/^-+$/.test(c))) continue; if (!inTable) { out.push("<table>"); inTable = true; } out.push("<tr>"+cells.map(c=>"<td>"+inline(c)+"</td>").join("")+"</tr>"); continue; } else if (inTable) { out.push("</table>"); inTable = false; }
    if (/^\s*[-*] /.test(l) || /^\d+\. /.test(l)) { if (!inList) { out.push("<ul>"); inList = true; } out.push("<li>"+inline(l.replace(/^\s*([-*]|\d+\.) /,""))+"</li>"); continue; } else if (inList && l.trim()==="") { out.push("</ul>"); inList = false; }
    if (l.startsWith("# ")) out.push("<h2>"+inline(l.slice(2))+"</h2>"); else if (l.startsWith("## ")) out.push("<h3>"+inline(l.slice(3))+"</h3>"); else if (l.trim()) out.push("<p>"+inline(l)+"</p>"); }
  if (inList) out.push("</ul>"); if (inTable) out.push("</table>"); return out.join("\n"); };
const DOC_CSS = `.doc{max-width:56rem;padding:8px 0 40px}.doc h2{font:400 32px/1.2 var(--serif);margin:18px 0 8px}.doc h3{font:600 12px var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--sodium);margin:28px 0 8px}.doc p,.doc li{color:var(--fg-body);max-width:44rem}.doc ul{padding-left:20px}.doc code{font:13px var(--mono);color:var(--fg)}.doc table{border-collapse:collapse;font:13px var(--mono);margin:8px 0}.doc td{border-bottom:1px solid var(--rule);padding:6px 14px 6px 0}.doc a{color:var(--sodium)}`;
const NAV = (on: string) => `<nav>${[["watch","/watch"],["replay","/"],["state","/map"],["results","/results"],["plan","/plan"]].map(([n,u])=>`<a${n===on?' class=on':''} href="${u}">${n}</a>`).join("")}<a href="https://github.com/DanielleFong/civilization.sh">github</a></nav>`;
const planMd = await Deno.readTextFile("../PLAN.md");
const planHtml = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>civilization.is — plan</title><style>${CSS}${DOC_CSS}</style></head><body>
<header><h1><b>civilization.is</b> · plan</h1>${NAV("plan")}</header><div class=wrap><div class=doc>${md2html(planMd)}</div></div>
<footer>Source: <a href="https://github.com/DanielleFong/civilization.sh/blob/main/PLAN.md" style="color:var(--fg-body)">PLAN.md</a> · ratchets up with each game.</footer></body></html>`;
await Deno.writeTextFile("dist/plan.html", planHtml);
await Deno.copyFile("frames/archive/t0164_101441.jpg", "dist/results-defeat.jpg");
await Deno.mkdir("dist/results", { recursive: true });
for await (const e of Deno.readDir("frames/results")) if (e.isFile && e.name.endsWith(".png")) await Deno.copyFile("frames/results/" + e.name, "dist/results/" + e.name);
const SHOTS: [string,string][] = [["rankings-score.png","World Rankings · Score (T163): Barbarossa 1335 · Victoria 1027 · Tomyris 978 · Qin 887 · unmet 863 · Pachacuti 832 · Jadwiga 588"],["rankings-overall.png","World Rankings · Overall: Germany leads Science and Conquest, England Culture, Inca Religion and Diplomacy"],["rankings-science.png","Science Victory: Germany 5/5 milestones (exoplanet en route), England 4½, China 0"],["rankings-culture.png","Culture Victory: England 171/339 visiting tourists; China 11/367, 167 domestic"],["rankings-conquest.png","Conquest: Germany 1 capital captured (Warsaw); everyone else 0"],["rankings-religion.png","Religion: Inca 2/8 civs converted to Buddhism; Confucianism 1/8"],["rankings-diplomacy.png","Diplomatic Victory: Pachacuti 16/20, Jadwiga 12/20, China 8/20"],["ranking-hall-of-fame.png","Defeat · Ranking: 887 points = ‘the level of Louis XVI’"],["graph-districts.png","Graphs · Districts constructed: Germany ~80, China ~27"],["graph-buildings.png","Graphs · Buildings constructed"],["graph-great-people.png","Graphs · Great People earned: China (green) ~14 vs Germany ~40"],["graph-cities-founded.png","Graphs · Cities founded: China 15, the most of any civ"],["graph-cities-captured.png","Graphs · Cities captured: Germany 4 by T163"],["graph-cities-lost.png","Graphs · Cities lost: Poland 2, Scythia 1"]];
const GALLERY = `<h3 class=k style="margin-top:28px">The game's own screens · World Rankings + Defeat tabs (T163–T164)</h3><div class=gal>${SHOTS.map(([f,c])=>`<figure><a href="/results/${f}" target=_blank><img loading=lazy src="/results/${f}" alt="${c.replace(/"/g,'&quot;')}"></a><figcaption>${c}</figcaption></figure>`).join("")}</div>`;
const resultsHtml = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>civilization.is — results</title><style>${CSS}${DOC_CSS}
.shot{border:1px solid var(--rule);background:var(--bg-deep)}.shot img{width:100%;display:block}
.pick{display:flex;flex-wrap:wrap;gap:6px;padding:0 0 10px;font:12px var(--mono)}.pick button{background:var(--bg-card);border:1px solid var(--rule);color:var(--fg-body);padding:5px 10px;cursor:pointer;font:12px var(--mono)}.pick button.on{border-color:var(--sodium);color:var(--sodium)}
.gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin:8px 0 28px}.gal figure{margin:0;background:var(--bg-card);border:1px solid var(--rule)}.gal img{width:100%;display:block}.gal figcaption{font:12px/1.5 var(--mono);color:var(--fg-body);padding:8px 10px}
table.rank{width:100%;border-collapse:collapse;font:15px var(--mono)}table.rank td{border-bottom:1px solid var(--rule);padding:9px 8px}table.rank tr.me td{color:var(--sodium)}
</style></head><body>
<header><h1><b>civilization.is</b> · results</h1>${NAV("results")}</header><div class=wrap>
<div class=lede><h2>T164 · Defeat. <i>Science victory, German Empire.</i></h2><div class=meta><b>Game 1</b> · Qin · Deity · Earth TSL · BBG · Online<br>agent-played T20–T164 · final score 880 · 4th of 6</div></div>
<div class=shot><img src="/results-defeat.jpg" alt="Civilization VI defeat screen: Science Victory, German Empire; Defeat, Chinese Empire"></div>
<div class=note>The game's own Results screen at T164. Below: every World Rankings tab and the Defeat Ranking/Graphs tabs, captured by Danielle from the reloaded end state, then the harness's own per-turn series for all civs.</div>
${GALLERY}
<div class=cols style="grid-template-columns:380px minmax(0,1fr)"><div><h3 class=k>Final ranking · T164</h3><table class=rank id=rk></table></div>
<div><h3 class=k>Graphs · all civs (from the harness diary, T19–T151; endpoints T164)</h3><div class=pick id=mp></div><canvas id=ch style="width:100%;height:300px;display:block;background:var(--bg-deep);border:1px solid var(--rule)"></canvas><div class=note id=mn></div></div></div>
<div class=doc><h3>What decided it</h3><p>Science. Germany reached 940 science per turn against China's 213 and launched the Exoplanet Expedition on T164. China led crop yield, ranked second in population, held 27 Great Works and Confucianism in every city, and never built a Spaceport. The full account, mistakes included, is in the <a href="/">replay commentary</a>; the corrections are the <a href="/plan">plan for Game 2</a>.</p></div>
</div>
<footer>Data: <a href="/data.json" style="color:var(--fg-body)">data.json</a> · commentary: <a href="/sitrep.md" style="color:var(--fg-body)">sitrep.md</a></footer>
<script>(async()=>{const D=await (await fetch('/data.json')).json();const rk=document.getElementById('rk');rk.innerHTML=D.final.map(([c,s],k)=>'<tr'+(c==='CHINA'?' class=me':'')+'><td>'+(k+1)+'</td><td>'+c.toLowerCase()+(c==='CHINA'?' · agent':'')+'</td><td style="text-align:right">'+s+'</td></tr>').join('');
const COL={CHINA:'#F2A413',ENGLAND:'#C8102E',GERMANY:'#8A9BA8',SCYTHIA:'#E2572B',INCA:'#B98F2E',POLAND:'#C94F8C',MAPUCHE:'#3F7FBF',MAORI:'#2FA69A'};
const METRICS=[['score','Score'],['science','Science / turn'],['culture','Culture / turn'],['military','Military strength'],['cities','Cities'],['pop','Population'],['districts','Districts'],['great_works','Great Works'],['era_score','Era score'],['gold','Gold treasury'],['faith','Faith'],['diplo_vp','Diplomatic VP']];
const mp=document.getElementById('mp');let cur='score';mp.innerHTML=METRICS.map(([k,l])=>'<button data-k="'+k+'"'+(k===cur?' class=on':'')+'>'+l+'</button>').join('');
mp.querySelectorAll('button').forEach(b=>b.onclick=()=>{cur=b.dataset.k;mp.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));drawM()});
const cv=document.getElementById('ch');
function drawM(){const fi=D.fields.indexOf(cur);const W=cv.clientWidth,H=300;cv.width=W;cv.height=H;const x=cv.getContext('2d');x.fillStyle='#0E1114';x.fillRect(0,0,W,H);
 let mx=1;for(const v of Object.values(D.series))for(const r of v)if(r[fi]!=null)mx=Math.max(mx,r[fi]);const T0=15,T1=168;const px=t=>14+(t-T0)/(T1-T0)*(W-28),py=v=>H-16-v/(mx*1.05)*(H-32);
 x.strokeStyle='#2F363B';x.fillStyle='#5A5546';x.font='11px IBM Plex Mono,monospace';for(let k=1;k<=4;k++){const v=Math.round(mx*k/4);x.beginPath();x.moveTo(14,py(v));x.lineTo(W-14,py(v));x.stroke();x.fillText(v,16,py(v)-3)}for(const t of [25,50,75,100,125,150])x.fillText('T'+t,px(t)-8,H-3);
 const names=Object.keys(D.series).sort((a,b)=>(a==='CHINA')-(b==='CHINA'));const ends=[];
 for(const n of names){const pts=D.series[n].filter(r=>r[fi]!=null);if(!pts.length)continue;x.strokeStyle=COL[n]||'#888';x.lineWidth=n==='CHINA'?2.5:1.4;x.globalAlpha=n==='CHINA'?1:.85;x.beginPath();pts.forEach((r,k)=>k?x.lineTo(px(r[0]),py(r[fi])):x.moveTo(px(r[0]),py(r[fi])));x.stroke();x.globalAlpha=1;const l=pts[pts.length-1];ends.push([py(l[fi]),n,l[fi],px(l[0])])}
 ends.sort((a,b)=>a[0]-b[0]);let ly=-99;for(const [yy,n,v,xx] of ends){const y2=Math.max(yy,ly+12);ly=y2;x.fillStyle=COL[n]||'#888';x.fillText(n.toLowerCase()+' '+Math.round(v),Math.min(xx+6,W-110),y2+4)}
 document.getElementById('mn').textContent=METRICS.find(m=>m[0]===cur)[1]+' · every major civ as the harness recorded it each turn; Germany, England and Scythia score endpoints at T164 from the result screen.'}
drawM();window.addEventListener('resize',drawM);})();</script></body></html>`;
await Deno.writeTextFile("dist/results.html", resultsHtml);

await Deno.writeTextFile("dist/index.html", replayHtml);
await Deno.writeTextFile("dist/replay.html", replayHtml);
await Deno.copyFile("map.html", "dist/map.html"); await Deno.copyFile("frames/state/gameinfo.json", "dist/state/gameinfo.json");
await Deno.copyFile("frames/sitrep.md", "dist/sitrep.md");
await Deno.mkdir("dist/state", { recursive: true });
for (const f of ["static.json", "turns.jsonl"]) await Deno.copyFile("frames/state/" + f, "dist/state/" + f);
console.log("frames:", files.length, "china pts:", china.length, "rivals:", Object.keys(rivals).join(","));
