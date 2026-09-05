# CivBench journal — 2026-09-02/03: Danielle plays Qin (Deity, Earth TSL) T1–T106; recorder + end-game archiver built alongside

## Learnings (ranked by how much they change what we build)
1. **Doctrine, not capability.** Fable (G3) had run_lua and every primitive; it never chopped, never pinned, froze at ~25 districts T110–T150. The human on the same map: 34 districts placed @T72, 57 complete @T101, Magnus+chops into every settler, pins as a committed plan. The playbook is the product.
2. **Yield per district is the science variable.** Human matched Germany on district count and still ran at ~half their science (same as Fable). Germany's districts had buildings. Track yield/district, not district count.
3. **Find the app's own code path.** Mouse+OCR end-game archiver: 35–56 s, missed scrolled entries, fought the operator's cursor. Tuner-driven (GameSummary.CoalesceDataSet, SetCurrentGraphDataSet, PrintWindow/BitBlt): 3.7 s, exact per-turn series. Same for every recorder field I first guessed.
4. **Intent is recordable.** Map pins = plan-before-production; the recorder caught each pin and each district landing on its pinned tile. Plan fidelity is a benchmark metric nobody has.
5. **Ops dominated again** (~85%): tuner one-client slot, main-menu wedge, my venv clobber (uv run inside civ6-mcp → mcp 2.x, missing OCR extras), a restart_and_load that killed the human's window, and stalling on /mcp instead of trampolining into tmux (lost the night).
6. **Takeover eval.** Agent inherits a human-built T106 position → isolates strategy from opening/ops. Set up (TAKEOVER-T106.md, save 106) but not yet played.
7. **Era score is the tell.** Fable G3: 123 final, lowest surviving major. Human: 150 @T106. Counts notable acts → direct read on agency vs turn-ending.

## Numbers (exact, from GameSummary export of G3 and the human recording)
- G3 T163: districts GER 81 / CHN 27; science/turn GER 965 / CHN 211; era score ENG 321, GER 313, CHN 123; score GER 1335, CHN 880 (4th).
- Human T101: 16 cities, 57 districts done, sci 120, cul 214, 11 wonders, score 724 vs GER 757.

## Artifacts
- civilization.sh repo @ b4c508e: harness/ (endgame_archive_tuner.py, record_human.*, tuner_proxy.py), recordings/ (human_china_*.jsonl, TAKEOVER-T106.md, endgame/game3-china-defeat-T164-exact/).
- Memory: feedback_civ6-drive-ui-via-tuner-not-mouse, feedback_tmux-trampoline-never-wait-on-mcp.

## Next
- Play the T106 takeover (tmux `fable` session exists; proxy needs menu-aware lazy connect before it runs unattended).
- Add to rubric: yield/district, plan fidelity, chops/turn, era score trajectory.
- Fold record_human fields into civ6-mcp telemetry or Keenan's recorder mod (no tuner slot).
