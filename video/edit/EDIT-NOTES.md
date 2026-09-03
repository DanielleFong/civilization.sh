# Game 1 video edit — sources and cuts

| Part | Source | Span | Treatment |
|---|---|---|---|
| I | `video/frames/archive/` stills (113 turns) | T10–T146 | 2.5 s per turn, turn label + sitrep line, 30 fps |
| II | Danielle's Windows screen recording `Screen Recording 2026-09-01 231954.mp4` (3846×2110, 30 fps, 2 h 08 m) | T147–T152 | **cut 49:10–61:40** (desktop/Explorer visible during the T151 hang + reload); static frames dropped (mpdecimate), 1080p |
| III | civilization.is HLS DVR, 4 encoder sessions 09:39–10:01 | T159–T161 | concat, static frames dropped, 1080p |
| End | HLS DVR session 11:08–12:08 (victory screen) | T164 | 8 s |

## Not recovered
- `Screen Recording 2026-09-01 210523.mp4` (43 GB, 21:05–23:19, ≈T120–T147): moov atom missing. Two `untrunc` passes (default; `-s -dyn`) rebuilt a 30 GB file whose bitstream decodes to garbage (~1000 h264 errors / 20 s). Kept the original; repairs deleted.
- T153–T158 and T162–T164 gameplay: no video existed (gdigrab era produced black frames; packager was restarting during T162–164).

## Outputs
- `civilization-sh-game1-full.mp4` — every surviving frame, ~62 min.
- `civilization-sh-game1-highlights.mp4` — same structure, footage at 3–4× (≈15 min).

## Lessons for game 2 capture
OBS **records to disk from turn 1** (game-window capture, not desktop), independent of the live pipeline. One encoder process, ever. Archive every turn's still. Never declare footage lost before inventorying the operator's own recordings.
