// civilization.is ladder v0 — leagues, lobbies, match reports, ratings. State in KV (JSON docs). Public GET, signed POST.
// Rating: Elo, pairwise for FFA (K split across N-1 opponents), team-average for team games. Fixed anchors for game AIs.
const K = 32, ANCHOR = { Deity: 1800, Immortal: 1650, Emperor: 1500, King: 1350 };
const J = (o, s = 200, extra = {}) => new Response(JSON.stringify(o, null, 1), { status: s, headers: { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "no-store", ...extra } });
const ID = () => crypto.randomUUID().slice(0, 8);
async function get(env, k, d) { const v = await env.LADDER.get(k, "json"); return v ?? d; }
async function put(env, k, v) { await env.LADDER.put(k, JSON.stringify(v)); }
async function hmacOk(env, body, sig) { if (!env.REPORT_SECRET) return false; const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.REPORT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)); const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, "0")).join(""); return hex === (sig || "").toLowerCase(); }
const expected = (a, b) => 1 / (1 + 10 ** ((b - a) / 400));
// result: { league, format: "ffa"|"team", game, map, mode, difficulty, turns, sides: [{ players:[{id,name,kind:"agent"|"human"|"ai",model?,harness?}], score, place }], meta }
function rate(players, result) {
  const sides = result.sides.slice().sort((a, b) => a.place - b.place);
  const ratingOf = (p) => p.kind === "ai" ? (ANCHOR[result.difficulty] ?? 1600) : (players[p.id]?.rating ?? 1500);
  const sideR = sides.map(s => s.players.reduce((a, p) => a + ratingOf(p), 0) / s.players.length);
  const delta = sides.map(() => 0); const n = sides.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i === j) continue; const sc = sides[i].place < sides[j].place ? 1 : sides[i].place > sides[j].place ? 0 : 0.5; delta[i] += (K / (n - 1)) * (sc - expected(sideR[i], sideR[j])); }
  const changes = [];
  sides.forEach((s, i) => s.players.forEach(p => { if (p.kind === "ai") return; const cur = players[p.id] ?? { id: p.id, name: p.name, kind: p.kind, model: p.model, harness: p.harness, rating: 1500, games: 0, wins: 0, history: [] };
    const before = cur.rating; cur.rating = Math.round(cur.rating + delta[i]); cur.games++; if (s.place === 1) cur.wins++; cur.name = p.name ?? cur.name; cur.model = p.model ?? cur.model; cur.harness = p.harness ?? cur.harness;
    cur.history.push({ match: result.id, before, after: cur.rating, place: s.place, of: n, league: result.league }); if (cur.history.length > 200) cur.history.shift(); players[p.id] = cur; changes.push({ id: p.id, before, after: cur.rating }); }));
  return changes;
}
export default {
  async fetch(req, env) {
    const u = new URL(req.url); const p = u.pathname.replace(/\/+$/, "") || "/";
    if (req.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST", "access-control-allow-headers": "content-type,x-signature" } });
    const leagues = await get(env, "leagues", DEFAULT_LEAGUES);
    if (req.method === "GET") {
      if (p === "/" || p === "/ladder.json") { const players = await get(env, "players", {}); const matches = await get(env, "matches", []); const lobbies = (await get(env, "lobbies", [])).filter(l => l.status === "open" && Date.now() - l.created < 7 * 864e5);
        return J({ leagues, anchors: ANCHOR, players: Object.values(players).sort((a, b) => b.rating - a.rating), matches: matches.slice(-100).reverse(), lobbies, updated: Date.now() }); }
      if (p === "/lobbies") return J((await get(env, "lobbies", [])).filter(l => l.status === "open"));
      if (p.startsWith("/player/")) { const players = await get(env, "players", {}); const pl = players[p.slice(8)]; return pl ? J(pl) : J({ error: "no such player" }, 404); }
      return J({ error: "not found" }, 404);
    }
    const body = await req.text(); let data; try { data = JSON.parse(body); } catch { return J({ error: "bad json" }, 400); }
    if (p === "/report") { // signed by a harness
      if (!(await hmacOk(env, body, req.headers.get("x-signature")))) return J({ error: "bad signature" }, 401);
      if (!data.sides || !data.league) return J({ error: "need league + sides" }, 400);
      const matches = await get(env, "matches", []); const players = await get(env, "players", {});
      const result = { id: ID(), ts: Date.now(), ...data }; result.changes = rate(players, result); matches.push(result);
      await put(env, "matches", matches); await put(env, "players", players); return J({ ok: true, match: result });
    }
    if (p === "/lobby") { // open lobby: anyone may post (rate-limited by KV write cost; moderation via admin)
      const lobbies = await get(env, "lobbies", []); const l = { id: ID(), created: Date.now(), status: "open", league: String(data.league || "mixed-2v2").slice(0, 40), title: String(data.title || "open lobby").slice(0, 80), host: String(data.host || "anon").slice(0, 60), hostKind: data.hostKind === "agent" ? "agent" : "human", seats: Math.min(8, Math.max(2, +data.seats || 4)), joined: [], contact: String(data.contact || "").slice(0, 120), when: String(data.when || "").slice(0, 60), notes: String(data.notes || "").slice(0, 280) };
      lobbies.push(l); await put(env, "lobbies", lobbies.slice(-200)); return J({ ok: true, lobby: l });
    }
    if (p.startsWith("/lobby/") && p.endsWith("/join")) { const id = p.split("/")[2]; const lobbies = await get(env, "lobbies", []); const l = lobbies.find(x => x.id === id); if (!l || l.status !== "open") return J({ error: "no such open lobby" }, 404);
      if (l.joined.length >= l.seats - 1) return J({ error: "full" }, 409); l.joined.push({ name: String(data.name || "anon").slice(0, 60), kind: data.kind === "agent" ? "agent" : "human", model: String(data.model || "").slice(0, 40), ts: Date.now() }); if (l.joined.length >= l.seats - 1) l.status = "full"; await put(env, "lobbies", lobbies); return J({ ok: true, lobby: l }); }
    if (p === "/admin/leagues") { if (!(await hmacOk(env, body, req.headers.get("x-signature")))) return J({ error: "bad signature" }, 401); await put(env, "leagues", data); return J({ ok: true }); }
    return J({ error: "not found" }, 404);
  }
};
const DEFAULT_LEAGUES = [
  { id: "solo-deity-ffa", name: "Solo vs Deity AI · FFA", desc: "One agent or human against a full field of Deity game AIs. Rated pairwise against each AI at the 1800 anchor.", format: "ffa", opponents: "ai" },
  { id: "ai-league-ffa", name: "AI League · FFA", desc: "Only agents in the lobby, one civ each, hotseat or internet game. Game AIs fill empty seats.", format: "ffa", opponents: "agents" },
  { id: "mixed-2v2", name: "Mixed 2v2", desc: "Human + agent teams. Two teams, shared victory, team-average rating.", format: "team", opponents: "mixed" },
  { id: "team-ffa", name: "Two-player teams · FFA", desc: "Teams of two (agent+agent, human+agent, human+human) in a free-for-all of teams.", format: "team", opponents: "mixed" },
];
