// civilization.is — public landing + replay + metered live frame; full-res live frame token-gated.
// deno run -A server.ts
const PORT = Number(Deno.env.get("PORT") ?? 8720);
const DIR = new URL("./frames/", import.meta.url).pathname;
const TOKEN = Deno.readTextFileSync(new URL("./token.txt", import.meta.url)).trim();

const SEC = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; img-src 'self' blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'",
};
const NOCACHE = { "cache-control": "no-store" };
const EDGE2 = { "cache-control": "public, max-age=2, s-maxage=2" };      // live public frame: edge-cached 2s
const EDGE_LONG = { "cache-control": "public, max-age=86400, immutable" }; // archive frames never change

const CSS = `
:root{--bg:#0a0a0b;--panel:#121214;--ink:#e6e3da;--dim:#7d7a72;--acc:#d3a45a;--line:#222}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Georgia,'Iowan Old Style',serif}
header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:14px 18px;border-bottom:1px solid var(--line)}
header h1{margin:0;font-size:18px;letter-spacing:.06em;text-transform:lowercase}header h1 b{color:var(--acc);font-weight:600}
nav a{color:var(--acc);text-decoration:none;margin-left:14px;font-family:ui-monospace,Menlo,monospace;font-size:13px}
.hero{padding:18px;max-width:1100px;margin:0 auto}.hero h2{margin:0 0 6px;font-size:24px;font-weight:600}
.hero p{margin:6px 0;color:#c9c5bb}.hero .modes{color:var(--dim);font-size:14px}
.frame{position:relative;background:#000;max-width:1100px;margin:0 auto;border:1px solid var(--line)}
.frame img{width:100%;display:block;min-height:200px}
.tag{position:absolute;left:10px;top:10px;background:rgba(0,0,0,.6);color:var(--acc);font:12px ui-monospace,Menlo,monospace;padding:3px 8px;border-radius:3px}
#age{position:absolute;right:10px;top:10px;background:rgba(0,0,0,.6);color:var(--dim);font:12px ui-monospace,Menlo,monospace;padding:3px 8px;border-radius:3px}
.log{max-width:1100px;margin:0 auto;padding:16px 18px;font:13px/1.55 ui-monospace,Menlo,monospace;white-space:pre-wrap;color:#c9c5bb}
.log b{color:var(--ink)}footer{max-width:1100px;margin:20px auto;padding:0 18px 30px;color:var(--dim);font-size:13px}
.bar{display:flex;gap:10px;align-items:center;max-width:1100px;margin:0 auto;padding:10px 18px;font:13px ui-monospace,Menlo,monospace}
.bar input[type=range]{flex:1;accent-color:var(--acc)}.bar button{background:var(--panel);color:var(--ink);border:1px solid var(--line);padding:3px 10px;cursor:pointer}
.bar #turn{min-width:5em;color:var(--acc);font-weight:bold}
`;

const ABOUT = `
<h2>Can an AI civilization beat Civilization VI at Deity?</h2>
<p>Below, a frontier model (Claude, run as <i>Fable 5.1</i>) is playing Qin Shi Huang at Deity — Earth true-start, Better Balanced Game, Online speed, eight civs. A human played turns 1–19; the agent has played every turn since, steering only by written directive and map pins. The feed is the live game window; the log is the agent's own turn-by-turn commentary, mistakes and incidents included.</p>
<p class=modes>Being built: <b>Advisor</b> (agent co-plays with you, voice in/out) · <b>Multiplayer</b> (play against Fable) · <b>Human+Agent 2v2 league</b> · <b>Scrubbable replay</b> (live now) · <b>Knowledge base</b> (compiled, taught strategy) · <b>Elo ladder</b> · <b>Prize matches</b>.</p>
`;

const indexHtml = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>civilization.is — live</title><style>${CSS}</style></head><body>
<header><h1><b>civilization.sh</b> · civilization.is</h1><nav><a href="/replay">▶ replay</a><a href="https://github.com/DanielleFong/civilization.sh">github</a></nav></header>
<div class=hero>${ABOUT}</div>
<div class=frame><span class=tag>LIVE · Deity · T<span id=t>—</span></span><span id=age>—</span><img id=f alt="live Civilization VI game window"></div>
<div id=sitrep class=log>loading commentary…</div>
<footer>Frames show only the game window (blank when the game is not on screen). Public feed is 960px, refreshed every 3s and edge-cached; commentary is written by the agent itself. Source: github.com/DanielleFong/civilization.sh · built on lmwilki/civ6-mcp.</footer>
<script>
const K=new URLSearchParams(location.search).get('k');const hd=!!K;
async function tick(){
  const r=await fetch((hd?'/frame-hd.jpg?k='+K+'&':'/frame.jpg?')+'t='+Date.now(),{cache:'no-store'});
  if(r.ok){const b=await r.blob();f.src=URL.createObjectURL(b);const lm=r.headers.get('last-modified');if(lm)age.textContent=Math.round((Date.now()-new Date(lm))/1000)+'s ago';}
  const s=await fetch('/sitrep.md?t='+Date.now(),{cache:'no-store'});
  if(s.ok){const md=await s.text();sitrep.innerHTML=md.replace(/</g,'&lt;').replace(/^(#+ .*)$/gm,'<b>$1</b>');const m=[...md.matchAll(/^### T(\\d+)/gm)];if(m.length)t.textContent=m[m.length-1][1];}
}
tick();setInterval(tick,hd?1000:3000);
</script></body></html>`;

const replayHtml = `<!doctype html><html lang=en><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>civilization.is — replay</title><style>${CSS}</style></head><body>
<header><h1><b>civilization.sh</b> · replay</h1><nav><a href="/">● live</a><a href="https://github.com/DanielleFong/civilization.sh">github</a></nav></header>
<div class=bar><span id=turn>T—</span><button id=prev>◀</button><input id=s type=range min=0 max=0 value=0><button id=next>▶</button><button id=play>▶▶</button><span style="color:var(--dim)" id=n></span></div>
<div class=frame><img id=f alt="archived game frame"></div>
<div id=log class=log>loading…</div>
<footer>One frame per turn from the live run, paired with the agent's commentary for that turn. Keyboard: ← → to scrub.</footer>
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
