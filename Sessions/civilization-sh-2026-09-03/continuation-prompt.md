# civilization.sh continuation · 2026-09-03 (late)

Read `HANDOFF-2026-09-03.md` (both addenda) and `harness/savedec/FORMAT.md`.

State: replay viewer with data panel live (T163 full dump). Save archive running. Civ6Save decoder partially working (header, techs, civics, cities, improvements, resources).

Next:
1. Decoder: find the per-plot record layout (terrain/feature/owner). Approach that worked: anchor on known values from `turns/T163.json`, search consistent offsets across many records (numpy, `uv run --no-project --with numpy`). Truth for more turns: run `harness/dump_turn.py` on T140/T119/T102 saves (game + free tuner) and diff.
2. Once terrain+owner+cities+units decode: `harness/savedec/save2turn.py` → `video/frames/state/turns/T<n>.json` for all 107 Qin saves; rebuild, deploy, verify.
3. Fork civ6-mcp: disable `cleanup_old_autosaves`, add per-turn dump hook.
Rules: never call load_game_save/restart_and_load; don't touch the captain's files; verify at the edge before saying shipped; push via `gh api PUT contents` (helper in scratchpad `push.sh`).
