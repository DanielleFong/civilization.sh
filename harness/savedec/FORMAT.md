# civilization.sh continuation · 2026-09-03 (after LIG-990 panel ship)

Read `HANDOFF-2026-09-03.md` (incl. addendum). State: replay viewer with data panel is live at civilization.is/map; one full dump (T163) in `video/frames/state/turns/`.

Next, in order:
1. Get the other saves dumped (T45, T102, T119, T132, T140). Game is at main menu. Either the operator loads a save in-game, or the MCP is stopped so `harness/dump_turn.py --out video/frames/state/turns` can use the tuner. With the MCP: emit sections via `uv run --no-project python3 harness/dt_section.py <section> [lo hi]`, run each through `mcp__civ6__run_lua` (context ingame), pad small ones, then `dump_turn.py --assemble <files>`. Rebuild (`deno run -A build.ts`), deploy (`gatekeep.sh run npx --yes wrangler@latest deploy` in `video/`), verify with cache-busted headless Edge shots.
2. Add the per-turn dump to the harness end-turn hook in the DanielleFong/civ6-mcp fork (telemetry emitter pattern), PR upstream.
3. LIG-988: layer order / glyph scale from `StrategicView.lua`; improvement icons.
4. Push via `gh api PUT contents` (repo is not a local git remote); the helper used today is in the scratchpad, trivial to recreate.
Constraints unchanged: no tunnel, no bare credentials, nothing unverified called "shipped", don't touch the captain instance's files.
