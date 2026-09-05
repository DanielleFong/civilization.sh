# staging.civilization.is — CivBench viewer, static

Keenan's CivBench War Room (`env/viewer/index.html`, copied verbatim from the live server) running on a Cloudflare Worker.
`worker.js` emulates `server.py`'s `/api/*` over snapshot files in Workers Assets, so the page runs with no origin.

Refresh with a game from the factory (Tailscale, http://100.115.102.83:8080):
1. `curl -s $B/ > public/index.html` (his page), pick a `game_id` from `$B/api/games`.
2. Mirror `turn_NNNN.json` for every turn in `$B/api/turns?game=…`, plus `manifest.json` and `ledger.json`, into `public/snapshots/<game_id>/`; write `public/games.json` in the `{total, games:[{game_id, first, last, n, updated, complete}]}` shape.
3. `gatekeep.sh run npx wrangler deploy -c staging/wrangler.toml`.

One game per deploy (40–90 MB of snapshots). For the whole corpus, point `worker.js` at R2 instead of `env.ASSETS`; the routes already exist.
