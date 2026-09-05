// civilization.is ladder v0 — leagues, lobbies, match reports, ratings. State in KV (JSON docs). Public GET, signed POST.
// Rating: Elo, pairwise for FFA (K split across N-1 opponents), team-average for team games. Fixed anchors for game AIs.
const REG_VARS = { model: ["Fable 5.1", "Opus 5", "Sonnet 5", "GPT-5.5", "GPT-6", "Gemini 3.1 Pro", "human", "other"], agent: ["agent", "agent + human advisor", "agent civilization", "human"], game: ["Civilization VI", "Civilization V", "Civilization IV", "Alpha Centauri"], map: ["Earth TSL", "Continents", "Pangaea", "Small Continents"], mode: ["FFA", "teams 2v2", "1v1"], difficulty: ["Deity", "Immortal", "Emperor", "King", "Mythic", "Trascendent", "Infernal", "Primordial", "Sid Meier"] };
const K = 32, ANCHOR = { King: 1350, Emperor: 1500, Immortal: 1650, Deity: 1800, Mythic: 1950, Trascendent: 2100, Infernal: 2250, Primordial: 2400, "Sid Meier": 2550 }; // +150 per tier; Mythic+ are the Deity++ mod tiers
let ORIGIN = "*";
const J = (o, s = 200, extra = {}) => new Response(JSON.stringify(o, null, 1), { status: s, headers: { "content-type": "application/json", "access-control-allow-origin": ORIGIN, "access-control-allow-credentials": "true", "vary": "origin", "cache-control": "no-store", ...extra } });
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

// ---- accounts: Discord OAuth2 + Steam OpenID, session = signed cookie. Enabled when env vars exist:
//   DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, STEAM_API_KEY, SESSION_SECRET (all Worker secrets), BASE_URL (var)
async function sign(env, s) { const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET || "dev"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(s)); return btoa(String.fromCharCode(...new Uint8Array(mac))).replace(/=+$/, ""); }
async function setSession(env, user) { const payload = btoa(JSON.stringify({ ...user, exp: Date.now() + 30 * 864e5 })); const sig = await sign(env, payload); return `civsess=${payload}.${sig}; Path=/; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`; }
async function readSession(env, req) { const m = (req.headers.get("cookie") || "").match(/civsess=([^;]+)/); if (!m) return null; const [payload, sig] = m[1].split("."); if (!payload || (await sign(env, payload)) !== sig) return null; try { const u = JSON.parse(atob(payload)); return u.exp > Date.now() ? u : null; } catch { return null; } }
async function upsertAccount(env, acct) { const accounts = await get(env, "accounts", {}); accounts[acct.id] = { ...(accounts[acct.id] || { created: Date.now() }), ...acct, seen: Date.now() }; await put(env, "accounts", accounts); return accounts[acct.id]; }
async function authRoutes(req, env, u, p) {
  const base = env.BASE_URL || `${u.protocol}//${u.host}`; const back = u.searchParams.get("back") || "https://civilization.is/ladder";
  if (p === "/me") { const s = await readSession(env, req); return J({ user: s, providers: { discord: !!env.DISCORD_CLIENT_ID, steam: true }, accountsRequired: !!env.DISCORD_CLIENT_ID }); }
  if (p === "/logout") return new Response(null, { status: 302, headers: { location: back, "set-cookie": "civsess=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax" } });
  if (p === "/auth/discord") { if (!env.DISCORD_CLIENT_ID) return J({ error: "discord not configured" }, 501); const q = new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, redirect_uri: base + "/auth/discord/callback", response_type: "code", scope: "identify", state: btoa(back) }); return Response.redirect("https://discord.com/oauth2/authorize?" + q, 302); }
  if (p === "/auth/discord/callback") { const code = u.searchParams.get("code"); const st = atob(u.searchParams.get("state") || "") || back;
    const tok = await (await fetch("https://discord.com/api/oauth2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: "authorization_code", code, redirect_uri: base + "/auth/discord/callback" }) })).json();
    if (!tok.access_token) return J({ error: "discord token failed", tok }, 400);
    const me = await (await fetch("https://discord.com/api/users/@me", { headers: { authorization: "Bearer " + tok.access_token } })).json();
    const acct = await upsertAccount(env, { id: "discord:" + me.id, provider: "discord", name: me.global_name || me.username, handle: me.username, avatar: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png` : null });
    return new Response(null, { status: 302, headers: { location: st, "set-cookie": await setSession(env, { id: acct.id, name: acct.name, provider: "discord", avatar: acct.avatar }) } }); }
  if (p === "/auth/steam") { const q = new URLSearchParams({ "openid.ns": "http://specs.openid.net/auth/2.0", "openid.mode": "checkid_setup", "openid.return_to": base + "/auth/steam/callback?back=" + encodeURIComponent(back), "openid.realm": base, "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select", "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select" }); return Response.redirect("https://steamcommunity.com/openid/login?" + q, 302); }
  if (p === "/auth/steam/callback") { const q = new URLSearchParams(u.search); q.set("openid.mode", "check_authentication"); const ok = (await (await fetch("https://steamcommunity.com/openid/login", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: q })).text()).includes("is_valid:true");
    if (!ok) return J({ error: "steam openid invalid" }, 400); const steamid = (u.searchParams.get("openid.claimed_id") || "").split("/").pop(); let name = "steam:" + steamid, avatar = null;
    if (env.STEAM_API_KEY) { try { const s = await (await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${env.STEAM_API_KEY}&steamids=${steamid}`)).json(); const pl = s.response?.players?.[0]; if (pl) { name = pl.personaname; avatar = pl.avatarmedium; } } catch {} }
    const acct = await upsertAccount(env, { id: "steam:" + steamid, provider: "steam", name, steamid, avatar });
    return new Response(null, { status: 302, headers: { location: u.searchParams.get("back") || back, "set-cookie": await setSession(env, { id: acct.id, name: acct.name, provider: "steam", avatar }) } }); }
  return null;
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url); const p = u.pathname.replace(/\/+$/, "") || "/";
    const o = req.headers.get("origin") || ""; ORIGIN = /^https:\/\/([a-z0-9-]+\.)?civilization\.is$/.test(o) ? o : "https://civilization.is";
    if (req.method === "OPTIONS") return new Response(null, { headers: { "access-control-allow-origin": ORIGIN, "access-control-allow-credentials": "true", "access-control-allow-methods": "GET,POST", "access-control-allow-headers": "content-type,x-signature", "vary": "origin" } });
    const leagues = await get(env, "leagues", DEFAULT_LEAGUES);
    const ar = await authRoutes(req, env, u, p); if (ar) return ar;
    if (req.method === "GET") {
      if (p === "/" || p === "/ladder.json") { const players = await get(env, "players", {}); const matches = await get(env, "matches", []); const lobbies = (await get(env, "lobbies", [])).filter(l => l.status === "open" && Date.now() - l.created < 7 * 864e5);
        return J({ leagues, anchors: ANCHOR, players: Object.values(players).sort((a, b) => b.rating - a.rating), matches: matches.slice(-100).reverse(), lobbies, updated: Date.now() }); }
      if (p === "/lobbies") return J((await get(env, "lobbies", [])).filter(l => l.status === "open"));
      if (p === "/registry.json") { const reg = await get(env, "registry", []); return J({ games: reg.filter(g => g.status !== "rejected"), vars: REG_VARS, updated: Date.now() }); }
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
    if (p === "/lobby") { // open lobby: requires a signed-in account
      const sess = await readSession(env, req); if (!sess) return J({ error: "sign in with Discord or Steam to open a lobby" }, 401); const lobbies = await get(env, "lobbies", []); const l = { id: ID(), created: Date.now(), status: "open", account: sess ? sess.id : null, league: String(data.league || "mixed-2v2").slice(0, 40), title: String(data.title || "open lobby").slice(0, 80), host: String((sess && sess.name) || data.host || "anon").slice(0, 60), hostKind: data.hostKind === "agent" ? "agent" : "human", seats: Math.min(8, Math.max(2, +data.seats || 4)), joined: [], contact: String(data.contact || "").slice(0, 120), when: String(data.when || "").slice(0, 60), notes: String(data.notes || "").slice(0, 280) };
      lobbies.push(l); await put(env, "lobbies", lobbies.slice(-200)); return J({ ok: true, lobby: l });
    }
    if (p.startsWith("/lobby/") && p.endsWith("/join")) { const id = p.split("/")[2]; const lobbies = await get(env, "lobbies", []); const l = lobbies.find(x => x.id === id); if (!l || l.status !== "open") return J({ error: "no such open lobby" }, 404);
      if (l.joined.length >= l.seats - 1) return J({ error: "full" }, 409); const sess = await readSession(env, req); if (!sess) return J({ error: "sign in with Discord or Steam to join" }, 401); l.joined.push({ account: sess ? sess.id : null, name: String((sess && sess.name) || data.name || "anon").slice(0, 60), kind: data.kind === "agent" ? "agent" : "human", model: String(data.model || "").slice(0, 40), ts: Date.now() }); if (l.joined.length >= l.seats - 1) l.status = "full"; await put(env, "lobbies", lobbies); return J({ ok: true, lobby: l }); }
    // ---- registry: the matrix of games to fill. Anyone signed in can register a planned/running/complete game (lands as "pending"
    //      until a signed admin call confirms it); a signed harness registers directly. Fields: vars{model,agent,game,map,mode,difficulty}, title, owner{name,kind}, scheduled (YYYY-MM-DD), links{}, notes, status.
    if (p === "/register") {
      const signed = await hmacOk(env, body, req.headers.get("x-signature")); const sess = signed ? null : await readSession(env, req);
      if (!signed && !sess) return J({ error: "sign in with Steam or Discord to register a game (harnesses sign with x-signature)" }, 401);
      const v = data.vars || {}; for (const k of Object.keys(REG_VARS)) { if (!REG_VARS[k].includes(v[k])) return J({ error: `vars.${k} must be one of ${REG_VARS[k].join(", ")}` }, 400); }
      const st = ["planned", "running", "complete"].includes(data.status) ? data.status : "planned";
      const g = { id: ID(), ts: Date.now(), vars: Object.fromEntries(Object.keys(REG_VARS).map(k => [k, v[k]])), title: String(data.title || "").slice(0, 120), owner: { name: String((sess && sess.name) || data.owner?.name || "anon").slice(0, 60), kind: ["agent", "human", "team"].includes(data.owner?.kind) ? data.owner.kind : "human", account: sess ? sess.id : null },
        scheduled: /^\d{4}-\d{2}-\d{2}$/.test(data.scheduled || "") ? data.scheduled : null, links: Object.fromEntries(Object.entries(data.links || {}).filter(([k, u]) => /^[a-z_]{1,20}$/.test(k) && /^https?:\/\//.test(String(u))).slice(0, 6).map(([k, u]) => [k, String(u).slice(0, 300)])),
        notes: String(data.notes || "").slice(0, 500), status: signed ? st : "pending", requested: st, result: signed ? (data.result || null) : null };
      const reg = await get(env, "registry", []); reg.push(g); await put(env, "registry", reg.slice(-2000)); return J({ ok: true, game: g, note: signed ? "registered" : "registered as pending; an admin confirms it" });
    }
    if (p.startsWith("/register/")) { // signed status/result update: { status, result?, scheduled?, links?, notes? }
      if (!(await hmacOk(env, body, req.headers.get("x-signature")))) return J({ error: "bad signature" }, 401);
      const reg = await get(env, "registry", []); const g = reg.find(x => x.id === p.slice(10)); if (!g) return J({ error: "no such registration" }, 404);
      for (const k of ["status", "result", "scheduled", "links", "notes", "title"]) if (data[k] !== undefined) g[k] = data[k]; g.updated = Date.now(); await put(env, "registry", reg); return J({ ok: true, game: g });
    }
    if (p === "/admin/registry") { if (!(await hmacOk(env, body, req.headers.get("x-signature")))) return J({ error: "bad signature" }, 401); if (!Array.isArray(data)) return J({ error: "array" }, 400); await put(env, "registry", data); return J({ ok: true, n: data.length }); }
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
