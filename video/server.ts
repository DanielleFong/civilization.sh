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
<div id=bar><span>civilization.is · live</span><span id=age class=dim>—</span></div>
<img id=f src="/frame.jpg">
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
  if (p === "/sitrep.md") {
    try { return new Response(await Deno.readTextFile(DIR + "sitrep.md"), { headers: { ...nocache, "content-type": "text/plain; charset=utf-8" } }); }
    catch { return new Response("", { status: 404, headers: nocache }); }
  }
  return new Response(html, { headers: { ...nocache, ...setck, "content-type": "text/html; charset=utf-8" } });
});
console.log("video server on", PORT);
