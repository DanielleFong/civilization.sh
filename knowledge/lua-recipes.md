# Lua / MCP recipes

Extracted from the operational handoff.

# civilization.sh — Handoff, 2026-09-01 (Qin, Deity, Online, Earth TSL, BBG)

## State at T102
- Save: `deity-tsl-agent-t102.Civ6Save` (OneDrive/Documents/My Games/.../Saves/Single). Seed -401507495.
- Score 474 vs Scythia 484 (only met civ; 6 unmet). 12 cities, pop 78, Sci 84, Cul 88, Faith 1683 (Theocracy: faith buys units), Gold +5.
- Military ~500: 7 Crouching Tigers, 2 Musketmen, 3 swordsmen, castles in 8 cities. No wars. Tomyris friendly (embassy, open borders, iron deal).
- Era: Industrial, score 74/82 (Dark Age threshold). Dedication: Sky and Stars (+1 era/GP).
- 2 settlers embarking north to (87,33)/(86,29); 3 settlers in production. 9 builders.
- Research: Economics → Industrialization. Civic: Natural History → archaeologists (6+ antiquity sites in-territory).

## Human→agent handoff
Danielle played T1-19 (Xi'an, Jiaodong, pantheon Monument to the Gods, saved T19). Agent played T19→T102.

## What worked
- Qin builder charges via Lua `UnitManager.RequestCommand(unit, UnitCommandTypes.WONDER_PRODUCTION)` (builder must be ON the wonder tile with moves left; one charge/turn/builder). Stonehenge T28, Great Bath T36.
- Monumentality Golden Age (T31-50): faith → builders (Liang +1, Serfdom +2 = 7-charge builders).
- Ancestral Hall: free builder per new city. Wide expansion 2→12 cities.
- Theocracy at T80: 1000+ faith → Crouching Tigers for Deity defense.
- Turn cadence ~60-90s with `execute_plan` + Lua end-turn.

## What failed / lessons
- T17:37 agent wrote TURN_TIMER_TIME=0 into a live game → 0-second timer → T1→T27 auto-played. NEVER write config to a live game. MPH Smart-Timer "Off" (=1) is safe; do not remove MPH.
- Lost Hanging Gardens, Apadana, Colosseum to Deity AIs (salvaged production reused). Wonder racing at Deity+ is a losing tempo bet; districts/settlers won.
- Two civilians captured by barbs (T51) — no escort. Both recovered.
- Government change (Autocracy→Theocracy) WIPED all production queues (T81). Re-set every city after a switch.
- MCP `end_turn` hangs on hidden blockers; use Lua `NotificationManager.GetFirstEndTurnBlocking(0)` + `UI.RequestAction(ActionTypes.ACTION_ENDTURN)`. WC sessions & "Consider changing government" need MCP end_turn.
- `execute_plan` aborts on first error → one plan per builder.
- MCP improve validator wrong for lumber mills/plantations on features (says "remove feature") — often works via Lua BUILD_IMPROVEMENT or after 1 turn.
- Upgraded units get NEW ids. Diplomacy sessions need 1-2 POSITIVE responses to close.
- patronize_great_person returned INT_MAX cost (blocked) — unresolved.

## Infra
- Stream: https://lace-arms-chess-mit.trycloudflare.com/?k=<token in video/token.txt> ; named tunnel `civilization` → video.civilization.is once NS propagates (Namecheap set to nia/thaddeus.ns.cloudflare.com; zones created).
- Recorder: recordings/qin-deity-seed-401507495.jsonl (turn snapshots), video/frames/archive/tNNNN_*.jpg (per-turn frames), video/frames/sitrep.md (scroll).
- Capture: video/capture.py (Windows python, mss, crops to Civ window, blank when absent). Server: video/server.ts (Deno :8720, token cookie).

## World Congress special session with no resolutions (T145)
`get_world_congress` shows IN SESSION but lists nothing and MCP `end_turn` hangs on "Resume Congress". Submit the empty turn directly:
`UI.RequestPlayerOperation(Game.GetLocalPlayer(), PlayerOperations.WORLD_CONGRESS_SUBMIT_TURN, {}); UI.RequestAction(ActionTypes.ACTION_ENDTURN)` — both in the SAME Lua call (this is exactly what WorldCongressPopup.lua does when there are no choices). Verified T145→T146.

## Flood Barriers (T145)
`BUILDING_FLOOD_BARRIER` (prereq TECH_STEAM_POWER, cost 80) is only buildable in cities that currently have tiles flagged for coastal flooding; elsewhere `CANNOT_PRODUCE`. Also blocked city-wide by any pillaged district.

## Close any stuck diplomacy / leader screen (ingame context)
Hidden sessions (e.g. with a civ that never showed a popup) block end-turn and leave the leader scene glitched on screen.
```lua
local me=Game.GetLocalPlayer()
for pid=0,20 do pcall(function() local s=DiplomacyManager.FindOpenSessionID(me,pid); if s and s~=-1 then DiplomacyManager.CloseSession(s) end end) end
for _,n in ipairs({"/InGame/DiplomacyActionView","/InGame/DiplomacyDealView","/InGame/LeaderScene"}) do local c=ContextPtr:LookUpControl(n); if c then c:SetHide(true) end end
```
Note: `respond_to_diplomacy` needs the *player id* shown by `get_pending_diplomacy` (England was 9, not the diplomacy list index). Closing the last blocker can immediately fire a queued end-turn.

## Force a build when set_city_production reports SILENT_FAILURE (ingame context)
```lua
local c=CityManager.GetCity(Game.GetLocalPlayer(),CITY_ID); local h=GameInfo.Buildings["BUILDING_RESEARCH_LAB"].Hash
if CityManager.CanStartOperation(c,CityOperationTypes.BUILD,{BuildingType=h}) then CityManager.RequestOperation(c,CityOperationTypes.BUILD,{BuildingType=h,InsertMode=CityOperationTypes.VALUE_EXCLUSIVE}) end
```
## Districts destroyed by sea-level rise
A "pillaged" IZ/campus that shows `plot:GetDistrictType()==-1` is gone, not pillaged — rebuild elsewhere; `repair` will never work.
