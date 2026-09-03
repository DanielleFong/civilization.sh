# MCP layer

The agent drives Civilization VI through [civ6-mcp](https://github.com/lmwilki/civ6-mcp) (FireTuner ↔ MCP bridge). Our fork: [DanielleFong/civ6-mcp](https://github.com/DanielleFong/civ6-mcp).

What this repo adds on top (see `knowledge/lua-recipes.md` for the exact calls):
- **Turn loop** that survives hidden blockers: diplomacy popups, World Congress sessions, dedication/artifact/promotion prompts, obsoleted policy slots.
- **Idle-city scanner** (gamecore Lua) that finds every city with an empty queue in one call.
- **Great Person placement** and **artifact excavation** via `UnitManager.RequestOperation` / `UI.RequestPlayerOperation` where the stock tools fall short.
- **Map-pin reading**: the human steers with in-game pins; the agent reads them as directives.
- **Hang recovery**: detect a stuck AI player (`IsTurnActive`), remove the offending support units, or full restart+load from a mirrored checkpoint.
- **Fog-of-war fairness** (planned): filter the tuner's omniscient state to met players + revealed tiles for benchmark runs.
