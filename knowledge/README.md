# Knowledge base

Compiled, taught strategy for the agent — the thing it should read instead of rediscovering. Three layers:

- `rules.md` — hard behavioral rules distilled from losses and incidents (each cites the turn it was learned).
- `lua-recipes.md` — engine/tooling recipes: how to end a turn past hidden blockers, excavate artifacts, read map pins, find idle cities, recover from AI-turn hangs.
- `incidents.md` — every incident from the Deity run, verbatim from the agent's log, so the failure modes are auditable.
- `openings.md` — (in progress) Deity opening lines for Qin / wonder-rush, distilled from the human-played T1–19 and the agent's T20–60.

Every future run appends here. The harness loads `rules.md` + `lua-recipes.md` into the agent's system context at start.
