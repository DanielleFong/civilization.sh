// Builds dist/games.json: one entry per game attempt from the harness diaries + known endpoints + compute ledger.
import { readTextFileSync } from "node:fs";
const DIR = "/mnt/c/Users/danie/.civ6-mcp/";
const norm = (s: string) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/ .*/, "");
const F = ["turn","score","science","culture","military","cities","pop","districts","great_works","era_score","gold","faith","diplo_vp"];
type Row = Record<string, any>;
function load(files: string[]) {
  const rows: Row[] = [];
  for (const f of files) for (const l of Deno.readTextFileSync(DIR + f).trim().split("\n")) { try { const o = JSON.parse(l); if (o.turn) rows.push(o); } catch {} }
  const series: Record<string, number[][]> = {}; let agent = ""; const leaders: Record<string,string> = {};
  for (const r of rows) { const n = norm(r.civ ?? r.pid); if (r.is_agent) agent = n; leaders[n] = r.leader ?? ""; (series[n] ??= []).push(F.map(k => r[k] ?? null)); }
  for (const k in series) { series[k].sort((a,b)=>a[0]-b[0]); const seen = new Set<number>(); series[k] = series[k].filter(r => seen.has(r[0]) ? false : (seen.add(r[0]), true)); }
  return { series, agent, leaders, turns: rows.length ? [Math.min(...rows.map(r=>r.turn)), Math.max(...rows.map(r=>r.turn))] : [0,0] };
}
// Elo estimate: performance rating against a field of Deity AIs anchored at 1800. Each rival = one game; agent "wins" if its score ≥ rival's at the last common turn.
const ANCHOR = 1800;
function elo(series: Record<string, number[][]>, agent: string, finalOverride?: Record<string, number>) {
  const finals: Record<string, number> = {};
  if (finalOverride) Object.assign(finals, finalOverride);
  else for (const [k,v] of Object.entries(series)) { const last = v[v.length-1]; if (last && last[1] != null) finals[k] = last[1]; }
  const mine = finals[agent]; if (mine == null) return null;
  const rivals = Object.entries(finals).filter(([k,v]) => k !== agent && v > 0);
  const W = rivals.filter(([,v]) => mine >= v).length, L = rivals.length - W;
  return { est: Math.round(ANCHOR + 400 * (W - L) / Math.max(1, rivals.length)), W, L, N: rivals.length, place: 1 + L, of: rivals.length + 1, anchor: ANCHOR };
}
const g1 = load(["diary_china_-401507495_solar-amber-chariot-09.jsonl"]);
const g1final = { GERMANY:1323, ENGLAND:1020, SCYTHIA:973, CHINA:880, INCA:820, POLAND:582 };
const g2 = load(["diary_england_-639634487_charred-flax-ember-08.jsonl","diary_england_-639634487_primal-mahogany-zeppelin-59.jsonl","diary_england_-639634487_jagged-cerulean-herald-90.jsonl","diary_england_-639634487_keen-lapis-vigil-36.jsonl","diary_england_-639634487_twilight-sage-javelin-50.jsonl"]);
const g3 = load(["diary_england_-217493652_twilight-sage-javelin-50.jsonl"]);
// the running game's diary lags; take the live turn from the harness call log
try { let mt = g3.turns[1]; for (const l of Deno.readTextFileSync(DIR + "log_england_-217493652_twilight-sage-javelin-50.jsonl").trim().split("\n")) { try { const o = JSON.parse(l); if (o.tool === "end_turn" && o.turn && o.turn > mt && o.turn < 600) mt = o.turn; } catch {} } g3.turns[1] = mt; } catch {}
const games = [
  { id: "qin-deity-tsl-401507495", n: 1, title: "Qin Shi Huang · China", sub: "Deity · Earth TSL · BBG · Online · 8 civs · seed −401507495", agent: "Claude (Fable 5.1) — civilization.sh instance", status: "complete", outcome: "Defeat T164 · Germany science victory", turns: [20,164], humanTurns: "T1–T19 human", place: 4, of: 6, score: 880,
    elo: elo(g1.series, "CHINA", g1final), series: g1.series, leaders: g1.leaders,
    compute: { model: "claude-fable-5-1", messages: 2804, input: 101499, output: 3182884, cacheWrite: 11929805, cacheRead: 1433180052, usd: 668, infraUsd: 426, note: "game-turn messages only (calls into the Civ VI harness); infra/site/video work in this session is listed separately" },
    links: { watch: "/watch", replay: "/replay", state: "/map", results: "/results", plan: "/plan", commentary: "/sitrep.md", repo: "https://github.com/DanielleFong/civilization.sh/tree/main/replays/qin-deity-tsl-401507495" } },
  { id: "england-deity-639634487", n: 2, title: "Victoria · England", sub: "Deity · seed −639634487 · 8 civs · 5 sessions", agent: "Claude (Fable 5.1) — captain instance (civbench)", status: "abandoned", outcome: `Stopped T${g2.turns[1]} · last of 8 by score`, turns: g2.turns, place: null, of: 8, score: null,
    elo: elo(g2.series, "ENGLAND"), series: g2.series, leaders: g2.leaders, compute: null, links: { repo: "https://github.com/DanielleFong/civilization.sh" } },
  { id: "england-deity-217493652", n: 3, title: "Victoria · England", sub: "Deity · seed −217493652 · 6 civs", agent: "Claude (Fable 5.1) — captain instance (civbench)", status: "in progress", outcome: "Running", turns: g3.turns, place: null, of: 6, score: null,
    elo: null, series: g3.series, leaders: g3.leaders, compute: null, links: {} },
];
for (const g of games) { const e = g.elo as any; if (e) { g.place = e.place; g.of = e.of; if (g.score == null) { const s = g.series[g.agent.includes("Qin") ? "CHINA" : "ENGLAND"]; g.score = s?.[s.length-1]?.[1] ?? null; } } }
await Deno.writeTextFile("dist/games.json", JSON.stringify({ fields: F, games, pricing: { model: "claude-fable-5-1", inputPerM: 10, outputPerM: 50, cacheWritePerM: 12.5, cacheReadPerM: 0.25, note: "List API prices; cache write assumed 1.25× input; cache read per Fable 5.1 published rate." } }));
console.log("games:", games.map(g => `${g.n}:${g.status} T${g.turns[0]}-${g.turns[1]} place ${g.place}/${g.of} score ${g.score} elo ${(g.elo as any)?.est}`).join(" | "));
