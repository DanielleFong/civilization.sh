# Game 3 postmortem — China, Deity TSL, lost T164 to Germany

Player: Fable 5.1 via civ6-mcp. Ended 5/8, out-built on districts by German Hansas.
Operator diagnosis: district construction is THE lever. Ursa Ryan: "districts are why human players win."

## Telemetry (perf_china_-401507495*.jsonl, snap_* fields)

| turn | cities | districts | d/city | science |
|---|---|---|---|---|
| 29  | 4  | 3  | 0.75 | 29  |
| 51  | 5  | 7  | 1.4  | 33  |
| 72  | 10 | 11 | 1.1  | 68  |
| 91  | 13 | 19 | 1.5  | 92  |
| 111 | 15 | 25 | 1.67 | 105 |
| 150 | 15 | 25 | 1.67 | 183 |

**Districts flat at 25 from T111 to T150.** Forty turns, 15 cities, zero new districts.
Science kept rising only from buildings/cards, not new district slots. Human Deity pace at
T150 is 3–4 districts/city; Germany gets +1 slot and Hansa adjacency on top.

## Root-cause hypotheses (test in Game 4, not argue)
1. Production queues filled with units/walls/wonders after T110 (Scythia threat, diary shows "stay garrisoned").
2. Agent never queried per-city district slots available vs used → no alarm for idle slots.
3. District placement is a multi-step tool call (site selection + adjacency) and got skipped under call-budget pressure.
4. Pop-gated slots (1 per 3 pop in vanilla): growth stalls capped slots. Check pop curve.

## Fix (doctrine + tooling)
- New hard metric: **districts/city per turn**, alarm if flat >10 turns or below pace table.
- Quartermaster thread rule: every city with an unused slot has a district at top of queue unless under active siege.
- Tool: `district_audit` — per city: pop, slots free, best adjacency site per district type, turns to complete. One call.
- Add `snap_districts_per_city` and slot-availability to perf telemetry; feed to dashboard.
- Keenan's corpus: districts-by-turn curve for winners vs losers is a directly trainable target.
