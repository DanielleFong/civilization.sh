# Plan of attack — Game 2

_Written 2026-09-02, the evening Game 1 ended (T164, Germany science victory; China 4th of 6, 880). Ratchet, don't reset: every item here is a fix for a named failure in Game 1._

## The diagnosis in one line
Effort went where feedback was fast (tool calls that return, features that ship) and away from where it was slow or silent (science compounding, sea level, what was on disk). Game 2 is built to make the slow things loud.

## 1 · Win condition first
- **Science is the clock.** Germany launched at T164 with 940 science/turn to our 213. Game 2 build order: Campus in every city by T60, Universities by T100, Research Labs as they unlock. Culture only where it pays era score.
- **Written objective, checked every 10 turns:** "Who wins this game, on what turn, and what moves that number?" Logged in the sitrep as a standing block, not a vibe.
- **Endgame liquidation rule:** when defeat is certain within N turns, every resource (faith, gold, favor) is converted to score; nothing with a build time > N is started. Game 1 ended with 2,654 faith and 900 gold unspent.

## 2 · World model that survives context resets
- **`knowledge/STATE.md` loaded at turn one**, updated whenever a standing fact changes. Climate phase, flooded tiles, threats, standing rules, harness bugs.
- **Per-turn world diff** (harness work, see §4): terrain/ownership/district/improvement changes and rival milestones surfaced to the agent every turn, not pulled on request. Sea-level rise deleted a district and five improvements before anyone noticed.
- **Flood Barriers the turn Steam Power lands**, in every coastal city, bought if needed.

## 3 · Play rules (from incidents.md)
- Never call `propose_trade`. Reject AI deals only. (Executed the AI's stale proposal twice: lost Salt+Marble, then 2 Great Works + 19 favor.)
- Great Writers/Artists/Musicians place **one work per activation** here; walk them until spent; keep slots ahead of them.
- Verify every mutation the same turn: production set → read back; GP activated → unit gone; repair issued → tile changed. The harness reports intent, not outcome.
- Builders get a job queue, checked against `IsWater()`; idle count > 3 is a turn-level alarm.
- Diplomacy blockers: enumerate open sessions with `FindOpenSessionID`, close via `DiplomacyManager.CloseSession`. WC special sessions: submit-turn + end-turn in one call.
- Vote against whoever leads Diplomatic Victory in every Congress.

## 4 · Harness (fork of civ6-mcp) — ranked by payoff
1. Per-turn world diff returned by `end_turn`.
2. Mutations return engine state or a hard failure (no SILENT_FAILURE, no fake `charges=0`).
3. One `end_turn` that clears every blocker type: diplomacy, deals, WC, dedication, artifacts, promotions.
4. Persistent builder / Great Person job queues.
5. Remove or rebuild UI-path tools (`propose_trade`) on gamecore.
6. Standing watches ("alert if any rival science VP > 12").
Target: ~5 calls per turn instead of ~50, so the reasoning budget goes to strategy.

## 5 · Capture and site — what Game 1 taught
- **Record to disk from turn one.** OBS game-window capture (never desktop), NVENC, 4K30 + audio, one process. The live stream is downstream of the recording, never the only copy.
- **One encoder, ever.** Duplicate encoder loops in Game 1 hammered a marginal 13900K; the chip is now being RMA'd.
- **Site on Cloudflare only.** Workers Assets for stills, state and VOD HLS; no tunnel to a home machine in the serving path.
- Archive a still every turn; archive the Results / Ranking / Graphs screens at game end before touching anything else.
- Never declare footage lost before inventorying every source, including the operator's own recordings.

## 6 · Measurables
| Metric | Game 1 | Game 2 target |
|---|---|---|
| Science/turn at T150 | 213 | 600+ |
| Campuses by T60 | 2 | 8+ |
| Civilians lost | 7 | 0 |
| Idle builders at any turn check | up to 19 | ≤ 3 |
| Turns with a stuck end-turn | 4 | 0 |
| Final rank | 4/6 | 2/6 or better |
| Continuous 30 fps footage | ~2.5 h of ~9 h | 100% |

## 7 · Sequence
1. Hyperion CPU RMA / replacement; until then, no game runs on it.
2. Harness fixes §4 items 1–3 on the fork, tested against the T140 save.
3. Same seed (-401507495), same settings, STATE.md loaded at T1. Clean A/B against Game 1.
4. Public: stream on civilization.is, commentary as before, rubric re-scored every 2 hours.

## 8 · The ladder (live since 2026-09-03)
`ladder.civilization.is` — leagues, open lobbies, signed match reports, Elo with game AIs as fixed anchors. Page: `civilization.is/ladder`. Four leagues: solo vs Deity AI · AI league FFA · mixed 2v2 · two-player-team FFA. Next: harness posts results automatically at game end; multiplayer proving run (two harness instances, one internet game); Civ VI's existing MP ladder community invited to open mixed lobbies.
