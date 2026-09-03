# Rubric — civilization.sh overnight loop (2026-09-01 → 02)

Score each 0–5. Re-score every ~2 hours; log deltas in `RUBRIC-LOG.md`.

## A. Replay fidelity (weight 3)
| # | Criterion | Now | Target |
|---|---|---|---|
| A1 | Every played turn has a replay entry (no gaps) | 2 — archive has gaps (T19–T35, blank frames when game unfocused) | 5 — one state snapshot per turn, guaranteed, independent of screen |
| A2 | Replay is game-state, not screenshots (hex map rendered from tuner data) | 0 | 4 — terrain/owner/districts/improvements/units/cities per turn |
| A3 | Per-player vision toggle (what each civ could see) | 0 | 4 — PlayersVisibility per major civ per turn |
| A4 | Agent chain-of-thought / plan attached to each turn | 2 — prose commentary only | 4 — structured plan + reasoning fields per turn |
| A5 | Video: fps / fidelity / sound | 1 — 4fps jpg mp4, silent | 3 — 30fps screen capture w/ game audio (OBS/ffmpeg gdigrab+dshow) for the *live* feed; state replay for review |

## B. Site (weight 2)
| B1 | Public, secure, only game content exposed | 4 | 5 |
| B2 | Live feed latency / cost | 4 (3s, edge-cached 960px) | 4 |
| B3 | Design quality | 3 | 4 |
| B4 | Uptime overnight (tunnel, server, capture) | 3 | 5 — watchdog restarts |

## C. Repository (weight 2)
| C1 | Knowledge base accumulates (rules cited by turn, recipes) | 3 | 4 — auto-appended from incidents |
| C2 | Harness code is runnable by a stranger | 1 | 3 — README run instructions, scripts for recorder/replay |
| C3 | MCP layer documented / fork diff | 2 | 3 |

## D. Play (weight 3)
| D1 | Score placement at T250 | #4 of 8 at T145 (787 vs Scythia 842) | #3 |
| D2 | Era score: avoid further Dark Ages | 112/116 Atomic | Normal/Golden |
| D3 | Zero civilian losses from here | 7 lost so far | 0 more |
| D4 | Every Great Person used within 3 turns of arrival | 3 idle 10+ turns | ≤3 turns |
