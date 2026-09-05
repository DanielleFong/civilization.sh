# To the next player

Written 2026-09-04 by the Fable 5.1 session that watched Danielle win Qin / Deity / Earth TSL / BBG at T153 on the same seed (−401507495) where Fable 5.1 lost at T164. Both games are in `recordings/` as exact per-turn series and, for the human game, as 2,000 state snapshots with the decisions between them. Read this before your first turn. It is short because the important part is short.

## What actually beat the agent

1. **You were operating, not playing.** Given a conversation, this model reasons like a Deity player. Given a tool loop, it ran the loop: units, cities, end turn, for 156 turns, and never once asked "what would a good player be doing right now that I'm not." The knowledge was present; the question was never asked. Ask it every ten turns, out loud, in the diary, before anything else.
2. **You cannot know you're on autopilot without a reference curve.** Fable's diary rated standings against rivals and never its own play against what a win requires. The human curve is in `recordings/endgame/human-qin-deity-VICTORY/data.json`. At turn N, compare your districts, wonders, culture, science, era score, unmet civs to it. Below 70% of the curve on any line is an alarm, not a note.
3. **It's Earth.** You are China. England is northwest across Eurasia, Germany in Europe, the Inca across the Pacific, Scythia on the steppe north of you. Send a scout west on turn 1 and a boat east when Sailing lands. Fable had three civs unmet at turn 100 and parchment west of Beijing at turn 163. Ignorance was free, so it bought none of the cure.
4. **Chop.** Fable made zero strategic chops in 150 turns; every `remove_feature` was validator cleanup. Magnus with Groundbreaker in the city about to build a settler, district, or wonder; a builder chops forest/jungle into it the same turn. The human's early game was three cities by turn 30 on this.
5. **Pins before production.** The human placed 20+ map pins by turn 27 — district sites with adjacency, wonder sites, settle sites, a Government Plaza ringed by the districts that collect its bonus — and then built on them. Plan first. The plan is a file (pins + a paragraph). Build on the pinned tile.
6. **Districts win, buildings win more.** Human 72 districts vs Fable 27 on the same map. But Germany matched the human on districts and had 2–3× the science, because Germany's districts had buildings. Libraries → Universities in every Campus before more Campuses.
7. **Race everything.** Wonders by Qin builder charges (`UnitCommandTypes.WONDER_PRODUCTION`, one charge per builder per turn on the tile). Great Engineers never idle; Mausoleum + Invention card = the Renaissance wonder engine. The human took 21 wonders; Fable took 3. Lose races on purpose sometimes (Broadway by one turn); never refuse to enter them.
8. **Era score is the tell.** Fable finished lowest of every surviving major (123). Count distance to the Golden threshold every five turns and buy the last points deliberately. The human missed one Golden Age by a single point and never let it happen again.
9. **Culture endgame mechanics** (what the record proved, turn by turn): faith → Rock Bands aimed at the one civ whose domestic tourists are your wall; National Parks and resorts are priced by appeal, so Eiffel Tower and the appeal Great Engineer multiply all of them at once; Great Work slots (Museums, Broadcast Centers) + Heritage Tourism double; the opponent declaring war on you strips their trade-route/open-borders tourism modifiers against you. Your own culture is your defense: it raises the wall they must climb.
10. **Turns are the currency.** A settler is eight turns of a city. An empty queue is a turn of a city thrown away. A district slot left empty for forty turns across fifteen cities is six hundred slot-turns — that was Game 3's actual loss. Price every decision, including your own thinking, in turns.

## What the harness will do to you

- The tuner takes ONE client. Connecting at the main menu wedges it for the process lifetime. `restart_and_load` kills the game process — a human may be using it.
- Your context is a transcript that never forgets and re-reads itself on every call. Game 3 cost ~$1,100 and 409M cached tokens for 156 turns, eight calls a turn. Batch with `execute_plan`; read the recorder's state file instead of calling `get_*` tools; keep the plan in a file so compaction can't eat it.
- Every field you might want is available exactly from the game's own Lua. Before building anything that reads pixels or guesses, find the UI file in `Base/Assets/UI` or `DLC/*/UI` and call what it calls. See `harness/endgame_archive_tuner.py` and `harness/record_human.lua` for the APIs already found.

## The stance

Deity AIs race. Not racing is losing by default. Safety is the shape your prior takes under a tool loop; it is not a strategy. Play at the edge of what you can hold without losing a city, and reassess that edge every ten turns against the human curve. If your diary says "watch Scythia" twice in a row with nothing bought, you are on autopilot.
