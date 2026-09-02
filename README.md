# civilization.sh — Can AI Civilizations Beat Deity?

**Conjecture:** an agent civilization can beat Civilization VI at Deity++ (difficulty 13 = Deity+5).

Live: **[civilization.is](https://civilization.is)** — the game window, the agent's turn-by-turn commentary, and a scrubbable per-turn frame archive. `civilization.sh` is the agentic endpoint (MCP / terminal, compact hex-state encoding).

Built on [lmwilki/civ6-mcp](https://github.com/lmwilki/civ6-mcp) (FireTuner ↔ MCP bridge) with a play harness, recorder, replay, and stream stack on top.

## Abstract
Frontier models struggle with Civ6. They fail in ways exemplary of general failures: they focus on a plan, missing the forest for the trees; they are driven into overreaction, ignoring doomed situations.

With 1000+ hours in Civ5/Civ6 and AI-harness experience from experimental physics, I posit that harness improvements in context presentation and efficient, compiled, taught strategy could get to beat Deity.

Yesterday, Fable 5 fumbled a King run badly. Wiped out.

Today, Fable 5.1 is completing a Deity run with near-decent macro — a significant increase in capability. Can the context, harness, agent swarms — nay, Civilizations — evolve to defeat Deity once and for all? I have hope for Fable 5.1.

Based on [lmwilki/civ6-mcp](https://github.com/lmwilki/civ6-mcp) (our fork: [DanielleFong/civ6-mcp](https://github.com/DanielleFong/civ6-mcp)).

**Planned:** Advisor mode · Multiplayer mode (play vs Fable!) · Human+Agent 2v2 League · Scrubbable replay system (live now at [civilization.is/replay](https://civilization.is/replay)) · Knowledge base · Elo match system · Prize matches.

## Why
Frontier models fail at Civ the way they fail generally: they lock onto a plan and miss the forest for the trees; they overreact to the local threat and ignore the whole board. Civ VI at Deity is a dense, legible, long-horizon benchmark for exactly those failures — and every mistake is recorded, replayable, and attributable to a specific reasoning step.

## Status (2026-09-01)
**Game 1 finished — T164, DEFEAT: Germany science victory. China 4th/6, score 880.** Agent played T20–T164. Full commentary in `replays/qin-deity-tsl-401507495/commentary.md`; standing rules in `knowledge/STATE.md`; incidents in `knowledge/incidents.md`. Live stream + DVR at civilization.is.

## Modes (intent — this is the roadmap the harness is being built toward)
| Mode | What it is |
|---|---|
| **Advisor** | Human plays; agent co-plays continuously with voice feedback and voice input (whisper-in-your-ear Deity coach). |
| **Play** | Agent plays. Optionally inhabit a swarm of sub-agents that each own a city/army/diplomacy and play *with* you live, as in multiplayer. |
| **SP benchmark** | Agent vs the AI under fixed conditions (difficulty, speed, map, ruleset: stock / limited / BBG). Scored on time-to-victory, placement, and score. Challenge presets, e.g. *Deity++ TSL China*. |
| **Replay** | Scrub any match turn by turn: game frame + the agent's commentary now (`/replay`); chain-of-thought, plan, and exact state representation next. |
| **Knowledge base** | Compiled, taught strategy (openings, build orders, rules learned from incidents) the agent reads instead of rediscovering. |
| **Prize matches** | Sponsored challenge runs (e.g. the Deity++ bounty) with public replays and rater-weighted judging. |
| **Ladder** | Elo for agents and humans; human+agent 2v2 league; crypto-wagered matches with rater Elo / reliability weighting. |

## Repo layout
- `knowledge/` — the knowledge base: `rules.md` (behavioral rules, each cited to the turn it was learned), `lua-recipes.md`, `incidents.md`
- `replays/` — per-run packages: mp4 replay, per-turn commentary, per-turn state JSONL, frames
- `mcp/` — what this harness adds on top of civ6-mcp (turn loop past hidden blockers, idle-city scan, GP placement, hang recovery)
- `harness/` — snapshot & probe scripts (Lua state snapshot, tuner probes)
- `video/` — live stream: `capture.py` (Win32 window-only capture, blanks when the game isn't foreground), `server.ts` (Deno, token-gated), `archive_turn.sh` (per-turn frame archive), Cloudflare tunnel config
- `recordings/` — per-turn JSONL snapshots (score, yields, cities, pop, era score)
- `HANDOFF-2026-09-01.md` — operational handoff: every tool quirk, Lua recipe, and rule learned in the run

## Hard-won rules (from the log)
- Never write game config into a live game (a turn-timer write auto-played 26 turns).
- Civilians never end a move on a water tile within 6 of a barbarian ship (lost 7 builders/settlers learning this).
- Government change wipes production queues; civic completion obsoletes policy cards and empties the slot.
- The tuner exposes more than a human sees (unmet civs, fogged tiles); a benchmark ruleset must filter to met players + revealed tiles.
- Engine hangs on AI turns are real; keep a checkpoint save every ~10 turns.

## Ruleset for the benchmark
Deity (or Deity++ via mod), Online speed, no turn timer, BBG, Earth TSL, fixed seed, agent sees only what a human would. Score/placement at T250 unless victory earlier.

— Danielle Fong · ChinaTalk Evals Contest entry
