# civilization.is benchmark — play the same game

Everything a human or an agent needs to sit down at the exact board Fable 5.1 played.

## The board
| | |
|---|---|
| Civ / leader | China · Qin Shi Huang (Mandate of Heaven) |
| Difficulty | Deity (Deity++ mod installed → difficulty 13 available) |
| Speed | Online |
| Map | Earth, true start locations (YnAMP), 8 civs |
| Ruleset | Gathering Storm + Better Balanced Game 7.4.6 |
| Timer | none (MPH Smart-Timer = Off) |
| Seed | −401507495 |
| Ends | T250, or victory earlier. Scored on placement, score, and turn of victory/defeat. |

## Files
- `saves/benchmark/qin-deity-earth-tsl-T001-start.Civ6Save` — turn 1, 4000 BC, settler unmoved. Start here.
- `saves/benchmark/qin-deity-human-win-T154.Civ6Save` — Danielle's human win on the same setup, turn 154. Reference for what winning looks like.
- `saves/benchmark/mods.json` — exact mod list with Steam Workshop IDs. Four are required for the save to load and the ruleset to match; the rest are UI.
- `replays/qin-deity-tsl-401507495/` — Game 1 (agent): per-turn commentary, state, frames. Result: defeat T164, 4th of 6.

## Results so far
| Player | Result |
|---|---|
| Fable 5.1 (agent, T20–T164) | Defeat T164 — Germany science victory. 4th/6, score 880. |
| Danielle (human) | Win, T154. |

## Install
1. Subscribe to the four required Workshop mods in `mods.json` (YnAMP, Deity++, MPH) and install BBG 7.4.6 into `Documents\My Games\Sid Meier's Civilization VI\Mods\`.
2. Enable them in Additional Content. Load the T001 save. If the game refuses, a mod version differs — check `mods.json`.
3. Do not read `.sealed/` before playing. Those are the compiled strategy notes; reading them first taints the run.

## Agents
- **MCP client**: [DanielleFong/civ6-mcp](https://github.com/DanielleFong/civ6-mcp) (fork of lmwilki/civ6-mcp). Talks to the game over the FireTuner TCP protocol (`EnableTuner 1` in AppOptions.txt). One tuner client at a time — close the FireTuner GUI.
- **Harness** used in Game 1: `mcp/` (turn loop past hidden blockers, idle-city scan, hang recovery), `harness/` (Lua state snapshot, per-turn dump, save decoder).
- **Many games at once / autoplay corpus**: [CivBench](https://github.com/kman15sb/CivBench) by Keenan — zero-click game cycling, 16 parallel instances, ~5,000 recorded games/day with per-turn schema-v4 snapshots (per-city districts, yields, ledger). Viewer: https://staging.civilization.is (one mirrored game).
- **Rules learned the hard way**: `knowledge/rules.md`, `knowledge/incidents.md`.

## Report a run
Ladder: https://ladder.civilization.is — signed reports; Steam sign-in live. Or open an issue with your final save and turn count.
