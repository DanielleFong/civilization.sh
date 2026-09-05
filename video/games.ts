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
// Game 3 — Danielle, human, same board. Rows from harness/record_human.py (tuner poll, one row per turn; gaps where the recorder was down).
function loadHuman() {
  const rows: Row[] = [];
  for (const f of [...Deno.readDirSync("../recordings")].map(e => e.name).filter(n => /^human_china_.*\.jsonl$/.test(n)).sort())
    for (const l of Deno.readTextFileSync("../recordings/" + f).trim().split("\n")) { try { const o = JSON.parse(l); if (o.turn && o.cities) rows.push(o); } catch {} }
  rows.sort((a, b) => a.turn - b.turn);
  const series: Record<string, number[][]> = {}; const seen = new Set<number>();
  for (const r of rows) { if (seen.has(r.turn)) continue; seen.add(r.turn);
    const cities = r.cities ?? []; const districts = cities.reduce((a: number, c: any) => a + (c.districts ?? []).filter((d: any) => d.done && d.t !== "WONDER").length, 0);
    (series.CHINA ??= []).push([r.turn, r.score ?? null, r.sci_pt ?? null, r.cul_pt ?? null, null, cities.length, cities.reduce((a: number, c: any) => a + (c.pop ?? 0), 0), districts, null, r.era?.score ?? null, r.gold ?? null, r.faith ?? null, null]);
    for (const v of r.rivals ?? []) { if (!v.civ || !(v.score > 0)) continue; (series[norm(String(v.civ).replace(/^CIVILIZATION_/, ""))] ??= []).push([r.turn, v.score, v.sci_pt ?? null, v.cul_pt ?? null, v.mil ?? null, v.cities ?? null, v.pop ?? null, v.districts ?? null, null, null, null, null, null]); }
  }
  return { series, turns: rows.length ? [rows[0].turn, rows[rows.length - 1].turn] : [0, 0], last: rows[rows.length - 1] };
}
const gh = loadHuman();
const ghFinal: Record<string, number> = {}; for (const [k, v] of Object.entries(gh.series)) { const l = v[v.length - 1]; if (l && l[1] != null) ghFinal[k] = l[1]; }
const g1 = load(["diary_china_-401507495_solar-amber-chariot-09.jsonl"]);
const g1final = { GERMANY:1323, ENGLAND:1020, SCYTHIA:973, CHINA:880, INCA:820, POLAND:582 };
for (const [k,v] of Object.entries(g1final)) { const row = F.map(() => null as any); row[0] = 164; row[1] = v; if (k === "CHINA") { row[2] = 213; row[5] = 15; row[6] = 135; row[8] = 27; } (g1.series[k] ??= []).push(row); }
const g2 = load(["diary_england_-639634487_charred-flax-ember-08.jsonl","diary_england_-639634487_primal-mahogany-zeppelin-59.jsonl","diary_england_-639634487_jagged-cerulean-herald-90.jsonl","diary_england_-639634487_keen-lapis-vigil-36.jsonl","diary_england_-639634487_twilight-sage-javelin-50.jsonl"]);
const g3 = load(["diary_england_-217493652_twilight-sage-javelin-50.jsonl"]);
// the running game's diary lags; take the live turn from the harness call log
try { let mt = g3.turns[1]; for (const l of Deno.readTextFileSync(DIR + "log_england_-217493652_twilight-sage-javelin-50.jsonl").trim().split("\n")) { try { const o = JSON.parse(l); if (o.tool === "end_turn" && o.turn && o.turn > mt && o.turn < 600) mt = o.turn; } catch {} } g3.turns[1] = mt; } catch {}
const games = [
  { id: "qin-deity-tsl-401507495", n: 1, vars: { model: "Fable 5.1", agent: "agent", game: "Civilization VI", map: "Earth TSL", mode: "FFA", difficulty: "Deity" }, harness: "civbench_v0.1", title: "Qin Shi Huang · China", sub: "Deity · Earth TSL · BBG · Online · 8 civs · seed −401507495", agent: "Claude (Fable 5.1) — civilization.sh instance", status: "complete", outcome: "Defeat T164 · Germany science victory", turns: [20,164], humanTurns: "T1–T19 human", place: 4, of: 6, score: 880,
    elo: elo(g1.series, "CHINA", g1final), series: g1.series, leaders: g1.leaders,
    compute: { model: "claude-fable-5-1", messages: 2804, input: 101499, output: 3182884, cacheWrite: 11929805, cacheRead: 1433180052, usd: 668, infraUsd: 426, note: "game-turn messages only (calls into the Civ VI harness); infra/site/video work in this session is listed separately" },
    links: { watch: "/watch", replay: "/replay", state: "/map", results: "/results", plan: "/plan", commentary: "/sitrep.md", repo: "https://github.com/DanielleFong/civilization.sh/tree/main/replays/qin-deity-tsl-401507495" } },
  { id: "qin-deity-human-win", n: 3, vars: { model: "human", agent: "human", game: "Civilization VI", map: "Earth TSL", mode: "FFA", difficulty: "Deity" }, harness: "human · record_human.py", title: "Qin Shi Huang · China", sub: "Deity · Earth TSL · BBG · Online · 8 civs · same board as Game 1", agent: "Danielle Fong (human)", status: "complete", outcome: "VICTORY T154 · 1st of 6", turns: [1, 154], humanTurns: "human T1–T154", score: gh.last?.score ?? null,
    elo: { ...(elo(gh.series, "CHINA", ghFinal) ?? {}), place: 1, of: 6 }, series: gh.series, leaders: { CHINA: "Qin Shi Huang" }, compute: { model: "human", messages: 0, usd: 0, note: "human play; no model tokens" },
    links: { save: "/saves/qin-deity-human-win-T154.Civ6Save", start: "/saves/qin-deity-earth-tsl-T001-start.Civ6Save", endgame: "https://github.com/DanielleFong/civilization.sh/tree/main/recordings/endgame/human-qin-deity-VICTORY", recording: "https://github.com/DanielleFong/civilization.sh/tree/main/recordings" } },
  { id: "england-deity-639634487", n: 2, vars: { model: "Fable 5.1", agent: "agent", game: "Civilization VI", map: "Continents", mode: "FFA", difficulty: "Deity" }, harness: "civbench_v0.1", hidden: true, title: "Victoria · England", sub: "Deity · seed −639634487 · 8 civs · 5 sessions", agent: "Claude (Fable 5.1) — captain instance (civbench)", status: "abandoned", outcome: `Stopped T${g2.turns[1]} · last of 8 by score`, turns: g2.turns, place: null, of: 8, score: null,
    elo: elo(g2.series, "ENGLAND"), series: g2.series, leaders: g2.leaders, compute: null, links: { repo: "https://github.com/DanielleFong/civilization.sh" } },
  { id: "england-deity-217493652", n: 3, vars: { model: "Fable 5.1", agent: "agent", game: "Civilization VI", map: "Continents", mode: "FFA", difficulty: "Deity" }, harness: "civbench_v0.1", hidden: true, title: "Victoria · England", sub: "Deity · seed −217493652 · 6 civs", agent: "Claude (Fable 5.1) — captain instance (civbench)", status: "in progress", outcome: "Running", turns: g3.turns, place: null, of: 6, score: null,
    elo: null, series: g3.series, leaders: g3.leaders, compute: null, links: {} },
];
for (const g of games) { const e = g.elo as any; if (e) { g.place = e.place; g.of = e.of; if (g.score == null) { const s = g.series[g.agent.includes("Qin") ? "CHINA" : "ENGLAND"]; g.score = s?.[s.length-1]?.[1] ?? null; } } }
await Deno.writeTextFile("dist/games.json", JSON.stringify({ fields: F, games, pricing: { model: "claude-fable-5-1", inputPerM: 10, outputPerM: 50, cacheWritePerM: 12.5, cacheReadPerM: 0.25, note: "List API prices; cache write assumed 1.25× input; cache read per Fable 5.1 published rate." } }));
console.log("human rows:", gh.turns, "civs:", Object.keys(gh.series).join(","));
console.log("games:", games.map(g => `${g.n}:${g.status} T${g.turns[0]}-${g.turns[1]} place ${g.place}/${g.of} score ${g.score} elo ${(g.elo as any)?.est}`).join(" | "));
