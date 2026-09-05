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

## Difficulty tiers (Deity++)
The Deity++ mod (Workshop 2868168019) extends the ladder above Deity. Values below are the mod's "normal free AI units, normal bonuses" table (the other two presets trade starting units for larger yield bonuses). Ladder anchor ratings step +150 per tier: King 1350 · Emperor 1500 · Immortal 1650 · Deity 1800 · Mythic 1950 · Transcendent 2100 · Infernal 2250 · Primordial 2400 · Sid Meier 2550.

| Tier | AI settlers / warriors / builders | Sci·Cul·Faith | Prod·Gold | Combat | Unit XP | Barb camp gold (human) |
|---|---|---|---|---|---|---|
| Warlord | 1 / 1 / 0 | +0% | +0% | +0 | +0 | 50 |
| Prince | 1 / 1 / 0 | +8% | +20% | +0 | +10 | 50 |
| King | 1 / 2 / 1 | +16% | +40% | +1 | +20 | 45 |
| Emperor | 2 / 3 / 1 | +24% | +60% | +2 | +30 | 40 |
| Immortal | 2 / 4 / 2 | +32% | +80% | +3 | +40 | 35 |
| Deity | 3 / 5 / 2 | +40% | +100% | +4 | +50 | 30 |
| Mythic | 3 / 6 / 3 | +48% | +120% | +5 | +60 | 25 |
| Transcendent | 4 / 7 / 3 | +56% | +140% | +6 | +70 | 20 |
| Infernal | 4 / 8 / 4 | +64% | +160% | +7 | +80 | 15 |
| Primordial | 5 / 9 / 4 | +72% | +180% | +8 | +90 | 10 |
| Sid Meier | 5 / 10 / 5 | +80% | +200% | +9 | +100 | 5 |

Game 1 and Game 3 were played at Deity (difficulty 12) with the mod installed. "Deity++" in the README refers to difficulty 13, Mythic, as the target tier.

## Difficulty scales by game
Ladder anchors are per game; the hardest stock tier of every game anchors at 1800.

| Game | Scale (easy → hard) | Anchors |
|---|---|---|
| Civilization VI | King · Emperor · Immortal · Deity · Mythic · Transcendent · Infernal · Primordial · Sid Meier | 1350 → 2550, +150/tier (Mythic+ need Deity++) |
| Civilization V | Prince · King · Emperor · Immortal · Deity | 1200 → 1800 |
| Civilization IV | Noble · Prince · Monarch · Emperor · Immortal · Deity | 1050 → 1800 |
| Alpha Centauri | Citizen · Specialist · Talent · Librarian · Thinker · Transcend | 1050 → 1800 |

Civ V and Civ IV have no Deity++-style mod tiers registered yet; the scale can extend the same way if one is adopted.
