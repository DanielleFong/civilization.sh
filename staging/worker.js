// CivBench viewer (staging) — Keenan's env/viewer/index.html + a static emulation of server.py's /api over mirrored snapshots.
export default {
  async fetch(req, env) {
    const u = new URL(req.url); const p = u.pathname; const q = u.searchParams;
    const asset = (path) => env.ASSETS.fetch(new Request(new URL(path, u.origin), req));
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
    const pass = (r, cc = "public, max-age=3600") => new Response(r.body, { headers: { "content-type": "application/json", "cache-control": cc } });
    const games = async () => (await asset("/games.json")).json();
    const gid = () => { const g = q.get("game") || ""; return /^[\w.\-@]+$/.test(g) ? g : null; };
    if (p === "/api/games") return json(await games());
    if (p === "/api/running") return json([]);
    if (p === "/api/ops") { const r = await asset("/ops.json"); return r.ok ? pass(r, "no-store") : json({}); }
    if (p === "/api/live") { const g = (await games()).games[0]; return json(g ? { game_id: g.game_id, first: g.first, latest: g.last, n: g.n, updated: g.updated, running: false } : {}); }
    if (p === "/api/events") { // one SSE status frame, then close — mirror is static
      const body = `event: status\ndata: ${JSON.stringify({ running: [] })}\n\n`;
      return new Response(body, { headers: { "content-type": "text/event-stream", "cache-control": "no-store" } });
    }
    if (p === "/api/turns") { const g = gid(); if (!g) return json({ error: "bad params" }, 400); const gg = (await games()).games.find(x => x.game_id === g); if (!gg) return json({ error: "not found" }, 404); return json(Array.from({ length: gg.last - gg.first + 1 }, (_, i) => gg.first + i)); }
    if (p === "/api/snapshot" || p === "/api/manifest" || p === "/api/ledger") {
      const g = gid(); if (!g) return json({ error: "bad params" }, 400);
      let f;
      if (p === "/api/ledger") {
        const r = await asset(`/snapshots/${g}/ledger.json`); if (!r.ok) return json({ players: {} });
        const after = +(q.get("after") || 0); if (!after) return pass(r, "no-store");
        const L = await r.json(); for (const k in L.players) L.players[k] = L.players[k].filter(row => row[0] > after); return json(L);
      }
      if (p === "/api/manifest") f = `/snapshots/${g}/manifest.json`;
      else { const t = q.get("turn") || ""; if (!/^\d+$/.test(t)) return json({ error: "bad params" }, 400); f = `/snapshots/${g}/turn_${String(+t).padStart(4, "0")}.json`; }
      const r = await asset(f); if (!r.ok) return json({ error: "not found" }, 404);
      return pass(r);
    }
    return asset(p);
  }
};
