// civilization.is/video — phone-viewable live frame + sitrep. deno run -A server.ts
const PORT = Number(Deno.env.get("PORT") ?? 8720);
const DIR = new URL("./frames/", import.meta.url).pathname;
const html = `<!doctype html><html><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>civilization.is — live</title>
<style>
body{margin:0;background:#0b0b0c;color:#ddd;font:14px/1.4 ui-monospace,Menlo,monospace}
img{width:100%;display:block}
#bar{display:flex;justify-content:space-between;padding:6px 10px;background:#141416;font-size:12px;color:#9a9}
#sitrep{padding:10px 12px;white-space:pre-wrap}
.dim{color:#666}
</style></head><body>
<div id=bar><span>civilization.is · live · <b>Agentic Civ</b> · <a style="color:#8ab" href="/replay">▶ scrub the replay</a></span><span id=age class=dim>—</span></div>
<img id=f src="/frame.jpg">
<div id=about style="padding:10px 12px;border-bottom:1px solid #222;color:#bbb">
<b style="color:#eee">Can an AI civilization beat Civ VI Deity++?</b> Below: a frontier model (Claude, "Fable 5.1") playing Qin at Deity, Earth true-start, BBG, Online speed — every turn since T19 is the agent's; the human steers only by directive and map pins. The feed is the live game window (blank when the game isn't on screen); the log is the agent's own turn-by-turn commentary, incidents included.<br>
Modes being built: <b>Advisor</b> (agent co-plays with you, voice in/out) · <b>Play</b> (agent, or a swarm of sub-agents, plays with you live) · <b>SP benchmark</b> (fixed Deity++ challenges, scored on time/placement/score) · <b>Replay</b> (bit-accurate scrub of frame + chain-of-thought + plan) · <b>Ladder</b> (Elo, human+agent 2v2, wagered matches).
Code: <a style="color:#8ab" href="https://github.com/DanielleFong/agentic-civ">github.com/DanielleFong/agentic-civ</a> · built on civ6-mcp.
</div>
<div id=sitrep class=dim>waiting for sitrep…</div>
<script>
let last=0;
async function tick(){
  const K=new URLSearchParams(location.search).get('k');const kq=K?'&k='+K:'';
  const r=await fetch('/frame.jpg?t='+Date.now()+kq,{cache:'no-store',credentials:'same-origin'});
  if(r.ok){const b=await r.blob();f.src=URL.createObjectURL(b);last=Date.now();
    const lm=r.headers.get('last-modified');if(lm)age.textContent='frame '+Math.round((Date.now()-new Date(lm))/1000)+'s ago';}
  const s=await fetch('/sitrep.md?t='+Date.now()+kq,{cache:'no-store',credentials:'same-origin'});
  if(s.ok){sitrep.textContent=await s.text();sitrep.className='';}
}
tick();setInterval(tick,1000);
</script></body></html>`;
const replayHtml = `<!doctype html><html><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>civilization.is — replay</title>
<style>
body{margin:0;background:#0b0b0c;color:#ddd;font:14px/1.4 ui-monospace,Menlo,monospace}
img{width:100%;display:block;background:#000;min-height:40vw}
#bar{display:flex;gap:12px;align-items:center;padding:8px 10px;background:#141416;font-size:12px}
#bar a{color:#8ab} input[type=range]{flex:1}
#turn{min-width:5em;color:#eee;font-weight:bold}
#log{padding:10px 12px;white-space:pre-wrap;border-top:1px solid #222}
#log b{color:#eee} .dim{color:#666} button{background:#222;color:#ddd;border:1px solid #333;padding:2px 8px}
</style></head><body>
<div id=bar><a href="/">live</a><span id=turn>T—</span><button id=prev>◀</button><input id=s type=range min=0 max=0 value=0><button id=next>▶</button><button id=play>▶▶</button><span class=dim id=n></span></div>
<img id=f>
<div id=log class=dim>loading…</div>
<script>
const K=new URLSearchParams(location.search).get('k');const kq=K?'?k='+K:'';
let files=[],sections={},i=0,timer=null;
function turnOf(f){return parseInt(f.slice(1,5),10)}
function show(j){i=Math.max(0,Math.min(files.length-1,j));s.value=i;const f=files[i];const t=turnOf(f);
  document.getElementById('f').src='/archive/'+f+kq;turn.textContent='T'+t;n.textContent=(i+1)+'/'+files.length;
  let k=t;while(k>0&&!sections[k])k--;log.className='';log.innerHTML=(sections[k]||'(no commentary yet for this turn)').replace(/</g,'&lt;').replace(/^(### .*)$/m,'<b>$1</b>')+(k!==t?'\\n<span class=dim>(last note is from T'+k+')</span>':'');}
async function init(){files=await (await fetch('/archive.json'+kq)).json();
  const md=await (await fetch('/sitrep.md'+kq)).text();
  for(const part of md.split(/^(?=### T)/m)){const m=part.match(/^### T(\\d+)/);if(m)sections[parseInt(m[1],10)]=part.trim();}
  s.max=files.length-1;show(files.length-1);}
s.oninput=()=>show(+s.value);prev.onclick=()=>show(i-1);next.onclick=()=>show(i+1);
play.onclick=()=>{if(timer){clearInterval(timer);timer=null;play.textContent='▶▶';}else{timer=setInterval(()=>{if(i>=files.length-1){clearInterval(timer);timer=null;play.textContent='▶▶';}else show(i+1)},700);play.textContent='❚❚';}};
document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')show(i-1);if(e.key==='ArrowRight')show(i+1)});
init();
</script></body></html>`;
const TOKEN = Deno.readTextFileSync(new URL("./token.txt", import.meta.url)).trim();
Deno.serve({ port: PORT, hostname: "127.0.0.1" }, async (req) => {
  const u = new URL(req.url); const p = u.pathname;
  const cookie = req.headers.get("cookie") ?? "";
  const hasK = u.searchParams.get("k") === TOKEN;
  if (!hasK && !cookie.includes("k=" + TOKEN)) return new Response("civilization.is — private", { status: 401 });
  const setck = hasK ? { "set-cookie": "k=" + TOKEN + "; Path=/; Secure; SameSite=Lax; Max-Age=2592000" } : {};
  const nocache = { "cache-control": "no-store" };
  if (p === "/frame.jpg") {
    try {
      const st = await Deno.stat(DIR + "latest.jpg");
      const body = await Deno.readFile(DIR + "latest.jpg");
      return new Response(body, { headers: { ...nocache, "content-type": "image/jpeg", "last-modified": st.mtime!.toUTCString() } });
    } catch { return new Response("no frame yet", { status: 404, headers: nocache }); }
  }
  if (p === "/archive.json") {
    const files: string[] = [];
    try { for await (const e of Deno.readDir(DIR + "archive")) if (e.isFile && e.name.endsWith(".jpg")) files.push(e.name); } catch {}
    files.sort();
    return new Response(JSON.stringify(files), { headers: { ...nocache, "content-type": "application/json" } });
  }
  if (p.startsWith("/archive/")) {
    const name = p.slice(9).replace(/[^A-Za-z0-9_.-]/g, "");
    try { return new Response(await Deno.readFile(DIR + "archive/" + name), { headers: { "cache-control": "public, max-age=86400", "content-type": "image/jpeg" } }); }
    catch { return new Response("not found", { status: 404 }); }
  }
  if (p === "/replay") {
    return new Response(replayHtml, { headers: { ...nocache, ...setck, "content-type": "text/html; charset=utf-8" } });
  }
  if (p === "/sitrep.md") {
    try { return new Response(await Deno.readTextFile(DIR + "sitrep.md"), { headers: { ...nocache, "content-type": "text/plain; charset=utf-8" } }); }
    catch { return new Response("", { status: 404, headers: nocache }); }
  }
  return new Response(html, { headers: { ...nocache, ...setck, "content-type": "text/html; charset=utf-8" } });
});
console.log("video server on", PORT);
