// Builds dist/ for the civilization.is static Worker from server.ts templates + frames + data.
const src = await Deno.readTextFile("server.ts");
const head = src.split("async function file(")[0]
  .replace(/new URL\("\.\/frames\/", import\.meta\.url\)\.pathname/, '"frames/"')
  .replace(/Deno\.readTextFileSync\(new URL\("\.\/token\.txt", import\.meta\.url\)\)/, '"x"');
let { replayHtml, mapHtml, ZOOM } = new Function(head + "; return {replayHtml, mapHtml, ZOOM};")();

// ---- data: China per-turn series (recordings T11–T100) + "Score NNN" mined from sitrep sections + final standing
const rec = (await Deno.readTextFile("../recordings/qin-deity-seed-401507495.jsonl")).trim().split("\n").map(l => JSON.parse(l));
const civName: Record<number,string> = {}; const rivals: Record<string,[number,number][]> = {};
for (const r of rec) for (const o of r.others ?? []) { if (o.civ) civName[o.id] = o.civ; const n = civName[o.id] ?? String(o.id); if (o.score > 0) (rivals[n] ??= []).push([r.turn, o.score]); }
const china: number[][] = rec.map(r => [r.turn, r.score, r.sci ?? null, r.cul ?? null, r.faith ?? null, r.gold ?? null, Array.isArray(r.cities) ? r.cities.length : r.cities ?? null, r.pop ?? (Array.isArray(r.cities) ? r.cities.reduce((a: number, c: any) => a + (c.pop ?? 0), 0) : null)]);
const sitrep = await Deno.readTextFile("frames/sitrep.md");
for (const part of sitrep.split(/^(?=### T)/m)) { const m = part.match(/^### T(\d+)/); const s = part.match(/\bScore (\d{3,4})\b/); if (m && s && +m[1] > 100) china.push([+m[1], +s[1], null, null, null, null, null, null]); }
china.push([164, 880, 213, null, null, null, 15, 135]);
china.sort((a, b) => a[0] - b[0]);
const final = [["GERMANY",1323],["ENGLAND",1020],["SCYTHIA",973],["CHINA",880],["INCA",820],["POLAND",582]];
await Deno.mkdir("dist", { recursive: true });
await Deno.writeTextFile("dist/data.json", JSON.stringify({ china, rivals, final, fields: ["turn","score","sci","cul","faith","gold","cities","pop"] }));

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
const resultsHtml = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>civilization.is — results</title><style>${CSS}${DOC_CSS}
.shot{border:1px solid var(--rule);background:var(--bg-deep)}.shot img{width:100%;display:block}
table.rank{width:100%;border-collapse:collapse;font:15px var(--mono)}table.rank td{border-bottom:1px solid var(--rule);padding:9px 8px}table.rank tr.me td{color:var(--sodium)}
</style></head><body>
<header><h1><b>civilization.is</b> · results</h1>${NAV("results")}</header><div class=wrap>
<div class=lede><h2>T164 · Defeat. <i>Science victory, German Empire.</i></h2><div class=meta><b>Game 1</b> · Qin · Deity · Earth TSL · BBG · Online<br>agent-played T20–T164 · final score 880 · 4th of 6</div></div>
<div class=shot><img src="/results-defeat.jpg" alt="Civilization VI defeat screen: Science Victory, German Empire; Defeat, Chinese Empire"></div>
<div class=note>The game's own Results screen, captured at T164. The Ranking and Graphs tabs were not captured before the host machine failed; the ranking and score curves below are rebuilt from the harness recorder, the agent's per-turn commentary, and the final result — labeled as such.</div>
<div class=cols><div><h3 class=k>Ranking · T164 (reconstructed)</h3><table class=rank id=rk></table></div>
<div><h3 class=k>Score over time (reconstructed)</h3><canvas id=ch style="width:100%;height:260px;display:block;background:var(--bg-deep);border:1px solid var(--rule)"></canvas><div class=note>Amber: China (agent). Grey: rivals where recorded (T11–T100 from the recorder; endpoints at T164).</div></div></div>
<div class=doc><h3>What decided it</h3><p>Science. Germany reached 940 science per turn against China's 213 and launched the Exoplanet Expedition on T164. China led crop yield, ranked second in population, held 27 Great Works and Confucianism in every city, and never built a Spaceport. The full account, mistakes included, is in the <a href="/">replay commentary</a>; the corrections are the <a href="/plan">plan for Game 2</a>.</p></div>
</div>
<footer>Data: <a href="/data.json" style="color:var(--fg-body)">data.json</a> · commentary: <a href="/sitrep.md" style="color:var(--fg-body)">sitrep.md</a></footer>
<script>(async()=>{const D=await (await fetch('/data.json')).json();const rk=document.getElementById('rk');rk.innerHTML=D.final.map(([c,s],k)=>'<tr'+(c==='CHINA'?' class=me':'')+'><td>'+(k+1)+'</td><td>'+c.toLowerCase()+(c==='CHINA'?' · agent':'')+'</td><td style="text-align:right">'+s+'</td></tr>').join('');
const cv=document.getElementById('ch');const W=cv.clientWidth,H=260;cv.width=W;cv.height=H;const x=cv.getContext('2d');x.fillStyle='#0E1114';x.fillRect(0,0,W,H);const T0=10,T1=166,S1=1400,px=t=>12+(t-T0)/(T1-T0)*(W-24),py=s=>H-14-s/S1*(H-28);
x.strokeStyle='#2F363B';x.beginPath();for(const s of [400,800,1200]){x.moveTo(12,py(s));x.lineTo(W-12,py(s));}x.stroke();x.fillStyle='#5A5546';x.font='11px IBM Plex Mono,monospace';for(const s of [400,800,1200])x.fillText(s,14,py(s)-3);for(const t of [50,100,150])x.fillText('T'+t,px(t)-8,H-2);
for(const [n,pts] of Object.entries(D.rivals)){x.strokeStyle='#4A5760';x.beginPath();pts.forEach(([t,s],k)=>k?x.lineTo(px(t),py(s)):x.moveTo(px(t),py(s)));x.stroke();}
let ly=-99;D.final.forEach(([c,s])=>{if(c==='CHINA')return;x.fillStyle='#8B8576';x.beginPath();x.arc(px(164),py(s),3,0,7);x.fill();let yy=Math.max(py(s)-5,ly+13);ly=yy;x.fillText(c.toLowerCase()+' '+s,px(164)-100,yy)});
x.strokeStyle='#F2A413';x.lineWidth=2;x.beginPath();D.china.forEach((r,k)=>k?x.lineTo(px(r[0]),py(r[1])):x.moveTo(px(r[0]),py(r[1])));x.stroke();})();</script></body></html>`;
await Deno.writeTextFile("dist/results.html", resultsHtml);

await Deno.writeTextFile("dist/index.html", replayHtml);
await Deno.writeTextFile("dist/replay.html", replayHtml);
await Deno.copyFile("map.html", "dist/map.html"); await Deno.copyFile("frames/state/gameinfo.json", "dist/state/gameinfo.json");
await Deno.copyFile("frames/sitrep.md", "dist/sitrep.md");
await Deno.mkdir("dist/state", { recursive: true });
for (const f of ["static.json", "turns.jsonl"]) await Deno.copyFile("frames/state/" + f, "dist/state/" + f);
console.log("frames:", files.length, "china pts:", china.length, "rivals:", Object.keys(rivals).join(","));
