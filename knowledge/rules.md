# Rules (learned the hard way)

Each rule cites when it was learned in the Qin Deity TSL run (seed -401507495).

## Civilians
- **Never end a civilian's move on a water tile with a barbarian ship within 6 tiles.** Pathing will happily park a builder on a reef. Lost a settler (T106) and builders (T110, T118) this way; 7 civilians lost total, 5 recovered by recapture. (T106–T118)
- Any builder within 3 tiles of a listed threat moves INTO the nearest city first, works later. (T118)
- Verify the destination tile with `get_map_area` before issuing a multi-tile civilian move; `STOPPED_MID_PATH` on coast is a loss waiting to happen. (T118)
- Barbarian melee kills do not recapture: after killing the captor, a *second* unit must step onto the tile. (T124)

## Game/engine
- **Never write game config (turn timer etc.) into a live game.** A TURN_TIMER_TIME=0 write auto-played 26 turns and voided a run. (pre-T19)
- Government change wipes production queues (T81); re-set every city immediately via the idle-city Lua scan.
- Civic completion obsoletes policy cards and silently empties the slot; a "Fill Policy Slot" blocker every few turns is normal — dump slots via Lua and refill. Some cards (Retainers, Discipline, Merchant Confederation late-game) are rejected outright. (T121–T135)
- The engine will spawn purchased/produced units onto an occupied city tile (3 military units stacked). Unstack them or the AI turn can hang. (T119, T121)
- AI-turn hangs are real (city-state with support units, 5+ minutes). Keep a checkpoint save every ~10 turns *in the folder the MCP reads* (`Documents\My Games\...\Saves\Single`, not OneDrive). Loading via `Network.LoadGame` mid-hang half-kills the session; do a full restart+load instead. (T119)
- Barbarians cannot capture cities; a besieged 2-pop island city is a pillage problem, not a loss. Buy walls (200g) rather than panic. (T117–T118)
- Storms/floods pillage tiles and districts; a pillaged Industrial Zone blocks Factory/Coal Plant/Stadium prereqs. Repair districts with a builder on the tile. (T126–T144)

## Strategy (Deity, culture/score line)
- Great People are the cheapest era-score lever: buy Writers/Artists/Musicians with faith the turn they appear (500–1600f), take the Sky and Stars dedication (+1 era each). +8 era score in one turn at T129. (T109, T128, T137, T140)
- Great Works need slots: Amphitheater 2 writing, Art Museum 3 art, Broadcast Center 1 music, Bolshoi 2. Queue museums *before* buying artists; 3 GPs idled 10+ turns for lack of slots. (T129–T144)
- Great People physically block each other: a Writer parked on a theater tile stops a Musician from activating there. Move them off after use. (T142)
- Archaeological Museum → 1 Archaeologist → 3 artifacts, then it's full; build a second museum before the next dig. (T125–T133)
- Duplicate luxuries (2nd+ copy) give no amenities — sell them freely; single copies never. (T135)
- Envoy tokens accumulate silently; a "Send Envoy" blocker means several are banked. Dumping 12 into Samarkand flipped suzerainty from Scythia. (T136–T137)
- Trade `propose_trade` when an AI counter-offer is still pending executes *their* stale deal, not yours. Check `get_pending_trades` is empty first. (T119)
- Deity AI runaway (Germany: 51 techs, 438 culture at T117) makes culture victory unreachable by T250; the honest benchmark is placement + score at the turn limit. (T117)

## Tooling
- `run_lua` returns only `print()` output. Numeric contexts ("1","2") bypass the in-game guard.
- End turn: check `NotificationManager.GetFirstEndTurnBlocking(0)==0` then `UI.RequestAction(ActionTypes.ACTION_ENDTURN)`. If the turn counter doesn't advance: `get_pending_diplomacy` → respond positive → respond "exit". World Congress needs the MCP `end_turn` twice.
- `execute_plan` aborts on first error; one plan per builder.
- The tuner exposes unmet civs and fogged tiles; a fair benchmark ruleset must filter to met players + revealed tiles.
