# Incidents (verbatim from the agent log)

T33 · CHENGDU founded (84,44) — 3 cities. Hanging Gardens started in Xi'an, 2 Qin charges in (30%). Faith 71 → buying builders (Monumentality). Score 88 vs Germany 170.
T34-35 · Political Philosophy → AUTOCRACY (Agoge, Corvée +15% wonders, Charismatic Leader, Urban Planning). ⚠ Xi'an 'Production Salvaged' — a Deity AI finished a wonder we were on (Hanging Gardens?). Re-targeting. Marble quarry + iron mine + silk plantation going in.
Wonders: Stonehenge, Great Bath. Lost Hanging Gardens + Apadana to Deity AIs (salvaged production → Gov Plaza, Ancestral Hall, settlers). Theater Square in Xi'an.
Score 210 · 5 cities pop 28 · 3 settlers out (2 heading N to Ha Long Bay coast 84,40; 1 recaptured from barbs) · Sci 33 · Cul 50 · Faith 250 · Gold +16.
Losses so far: 1 builder, 1 settler (both to barbs, both my escort failures). Lost wonders: Hanging Gardens, Apadana, Colosseum to Deity AIs.
Districts: Campus (Chengdu, Changsha), Theater ×2, Holy Site ×2, Commercial Hub, Entertainment. Amphitheaters ×2.
T81 · Met SCYTHIA (Tomyris, score 363 vs our 332) — the Deity horse-rush neighbor. Friendly reply; delegation sent. Theocracy switch wiped all 7 production queues (noted: government change clears queues) — reset all.
T84-86 · Barb swordsman killed at Wuhan, captured builder recovered. Scythia embassy accepted (Tomyris friendly). Castles + Enlightenment done → Banking, Opera & Ballet. Score 363 vs Scythia 395.
Tech: 25 vs Scythia 32 — behind; Universities coming (Chengdu done, Changsha 6t). Astronomy → Scientific Theory.
Harness: ~70s/turn; WC special sessions need MCP end_turn; government change wipes production queues (T81 lesson).
Since T19 takeover: 2 → 11 cities, 5 → 75 pop, score 31 → 457. Lost: 1 builder + 1 settler (T51, both recaptured/replaced), 3 wonders sniped.
- Barb man-at-arms at (85,55) holding a captured builder: Longxi city strike (25) + archer (15) + Crouching Tiger finished it. Builder fled to (86,56); chasing on hills at 1 tile/turn — it keeps skipping away. Musketman rerouting to cut it off.
- LOST settler 3801112 at (87,31) to a barbarian galley while embarked — 4th civilian lost this game. Lesson (again): never move civilians on coast without checking for barb galleys. Remaining northern settler pulled onto land at (87,33) — founds next turn. CT + Musketman heading north as escort for the 3rd settler.
- Xi'an → Art Museum, Changsha → Theater Square (83,47). Gold now +16/t after banks.
- Districts queued: Beijing Theater (83,50), Jiaodong Campus (86,46), Shanghai Campus (84,41) +5 adj, Wuhan Commercial Hub (88,54), Xingzhou Campus (80,38), Changsha Theater (83,47). Harbors unavailable (no Celestial Navigation).
- Caravel now 73→~45hp after Shanghai strike + musketman; swordsman next turn. Builder recapture possible if it dies adjacent.
- Recaptured the builder at (85,38) with the Crouching Tiger. Civilian ledger: lost 5, recovered 3.
- Xiurong siege lifted; caravel gone. Builders: farm repair after record flood at (86,45), lumber mills at Shanghai/Wuhan, marsh clear at Handan.
- Recaptured a 2nd builder at (87,32) off Xiurong with the CT (civilian ledger: lost 5, recovered 4).
- Xiurong under real threat: barb IRONCLAD (CS70) at (84,34) + caravel + galley. CT pulled back into the city (Garrison promo, +7). Walls queued (17t — too slow); will faith-buy a Musketman garrison next turn once the CT steps aside. Recaptured builder trying to reach land at (88,31).
- Shanghai Holy Site (Ha Long Bay) done → Shrine. Xiurong at 45 def vs Ironclad; walls 17t.
- LOST the recaptured builder again at (88,32): my move order ended it on a coast tile next to the Ironclad. 6th civilian loss, 4 of them to my own coast-tile pathing. Hard rule from now: civilians only get move orders to LAND destinations verified via get_map_area, and never within 3 tiles of a barb ship.
- LOST builder 4718605 at (89,57) to the barb line infantry I logged as "2 tiles out" — I left it asleep next to the threat. 7th civilian loss. Rule addendum: any builder within 3 tiles of a listed threat moves INTO the nearest city first, works later.
- TOOL BUG: propose_trade fired the AIs' stale offers instead of mine — gave Germany Salt+Marble for 5g+2gpt+OB, and Scythia something ("Unknown", possibly a Great Work) for 6gpt+OB. Verifying tourism to see if a Great Work left.
- Industrialization + Mass Media in. Tech → Flight (→ Radio/Broadcast Centers), civic → Scorched Earth (→ Mobilization → Ideology). Retainers re-slotted (amenities). Moksha → Citadel of God. Xi'an University, Changsha Amphitheater, Shanghai Campus (84,41).
- INTERVENTION: Hunza (unmet city-state) hung its AI turn on two Medic support units with unspent moves (known Civ6 AI hang). Removed the two Hunza Medics via gamecore Lua to unstick the game. Also unstacked 2 Musketmen+CT that the engine had spawned onto Xi'an's tile (teleported one to 86,48). Logged as engine-bug remediation, not a gameplay action.
- Hang persisted after medic removal → reloading save deity-tsl-agent-t119-stuck (my T119 orders intact; AI turn restarts fresh). Fallback: 0_MCP_0119 / AutoSave_0119.
- Network.LoadGame during the hang half-killed the session (tuner down, menu music, blank map). Full restart_and_load → deity-tsl-agent-t119-stuck. Stream shows blank frame while the game is down (by design).
- PRIVACY INCIDENT: with the game at the main menu (windowed), the capture region included overlapping desktop windows for ~2 min. Patching capture to blank the frame whenever the Civ window is not the foreground window.
- RECOVERED: Danielle manually loaded deity-tsl-agent-t119-stuck. Rejected Poland (our 9 coal + marble for oil/OB/4gpt — coal is for factories). Capture now blanks unless Civ is the foreground window.
- T122: Scorched Earth done → Mobilization (→ Ideology). Xi'an IZ done → Workshop. Envoy → Samarkand (7). Xiurong CT hit galley → ~25hp. Wuhan strike on line infantry (still holding the captured builder at 90,56).
- Swordsman killed the barb line infantry at (89,56); its captured builder is free-standing — recapture next turn.
- T126: Germany 947 > England 731 > Scythia 684 > China 647. Mobilization done → IDEOLOGY (tier-3 government next). Magnus → Provision. Xi'an Factory done → Stock Exchange; Shanghai Library; Beijing University; Wuhan Amphitheater. Archaeologist excavating Beijing site via Lua EXCAVATE op. Scythian tank+rangers seen at (69-72,43-50) west of Langfang — not at war, watching.
- T127: upgraded 2 Archers→Crossbowmen, 3 Swordsmen→Men-at-Arms, Warrior→Swordsman (Force Modernization halved cost). Storms pillaged Chengdu/Changsha tiles; builders repairing. Jiaodong Dam done → Campus; Taiyuan Theater → Amphitheater.
- Frederick warns: "if you continue to help my enemies I will destroy you" (our Scythia open-borders deal). Placated. Military maintenance now -126/t (gold +9) after upgrades; need Stock Exchange/markets.
- T129: ERA SCORE 98/103 (+8 from the GP haul). Score 684. Hokusai → Xi'an Art Museum (3 works), Twain → Chengdu Amphitheater (2), Goddard activated at Xi'an hub. Liu Tianhua held (no music slots until Broadcast Center — Radio next). Steam Power done → Radio. Xi'an Stock Exchange done → Bolshoi Theatre wonder at (85,50).
- Government change wiped all city queues (known cost) — re-setting every city now. Communism: +production, 8 policy slots.
- T134: Germany 1037 > England 776 > Scythia 742 > China 720. Era 102/116. Shanghai University → Temple. Culture 243/t. Barb Ironclad at Xiurong down to ~17hp.
- T136: Germany 1063 > England 801 > Scythia 761 > China 723. Conservation done → Cultural Heritage (tourism). Envoy → Samarkand (now 12+). Shanghai campus project; Yiyang builder. Faith 1648 — Tagore next turn.

## 2026-09-02 T152 — Great Writers/Artists place ONE work per activation here
Under this ruleset a Great Writer/Artist/Musician does not dump all works at once: each `activate` places one Great Work and the unit keeps its remaining works (Hokusai: 3 → placed over 3 activations). The harness prints `charges=0` for them, which is wrong — check the past timeline vs. works actually in slots. Consequence: GPs must be walked from theater to theater until spent; keep building Art Museums / Amphitheaters / Broadcast Centers so slots exist. Verified 19 → 23 works after re-activating four "spent" GPs.

## 2026-09-02 T162 — propose_trade executed a stale AI deal AGAIN (no pending deal this time)
Offered Germany duplicate Salt+Marble for 14 gpt. Result: "We give: Unknown, Unknown, 19 Diplomatic Favor; they give Open Borders, 4 gold, 2 gpt" — the exact deal Germany had proposed (and I rejected) ten turns earlier. Two Great Works and 19 favor gone. `get_pending_trades` showed nothing beforehand. **Rule: never call propose_trade in this harness. Period.** The deal-session template is reused from the AI's last proposal regardless of the arguments.
