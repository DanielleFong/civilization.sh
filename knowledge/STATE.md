# STANDING SITUATION — read this first every session (durable context)
_Last updated T159 (2026-09-02). Update whenever a standing fact changes._

## Climate — the coast is gone
- Sea level has risen through multiple phases. Tiles that were coastal land are now **ocean**: Xi'an IZ (87,51), Xingzhou campus (80,38), lumber mills (85,37),(82,38), farms (87,52),(88,40), mine (87,47) and more. `plot:IsWater()==true` on them.
- **Nothing on a submerged tile can be repaired or rebuilt.** Do not send builders there. `IsImprovementPillaged()` still returns true on such tiles — misleading.
- Flood Barrier (needs Steam Power ✓) protects a city's *remaining* low tiles. Wuhan has one. Every coastal city should build or buy one — cost scales with the number of flood-risk tiles.
- More flooding comes with each climate phase; assume every coastal improvement without a barrier will be lost.

## Standing rules
- GP writers/artists/musicians place ONE work per activation here; walk them until spent.
- Never trade Great Works or single luxuries. Reject AI deals that ask favor for scraps.
- Vote against Inca (15/20 DVP) in every World Congress.
- End turn via MCP `end_turn` (records replay state). Stuck leader screens: close via DiplomacyManager.CloseSession.
- Keep builders inland and on real tasks; check `IsWater()` before assigning.

## Threats
- Scythia: modern armor/artillery/helicopters staged 8–10 tiles west of Shenyang/Changsha. Peace, but defensive pact with Poland.
- Barbarian ranger + captured builder SE of Wuhan.
