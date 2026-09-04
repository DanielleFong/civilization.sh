# Civ6Save format notes (civilization.sh · 2026-09-03)

Goal: read game state straight from `.Civ6Save` files — no game, no tuner, no MCP. Reader: `civ6save.py`.
Ground truth used: the T163 tuner dump (`video/frames/state/turns/T163.json`) vs `0_MCP_0163.Civ6Save`.

## Container (from pydt/civ6-save-parser, verified)
- `CIV6` magic, then a header of TLV entries: `marker u32, type u32, payload`. Types: 1 bool (8 skip + 4), 2 int (8 skip + 4),
  4/5 ascii string (`u16 len, 00 21 01 00 00 00, bytes`), 6 utf16 string (`00 21 02 …`), 3 (12 B), 0x0D/0x14 (16 B), 0x15 (12/20 B), 0x0A/0x0B arrays.
- Header markers seen: `bde62c9d` turn, `af9ae4bb` host civ, `6bb7b2a1` host leader, `7fb416a8` difficulty, `e7170e55` era, `c45925de` ruleset,
  `9d5e5c2f`/`e8cd5e5f`/`ca55abbe` per-player civ/leader/level lists, `c643aa0f` hidden agendas, `3a0545da` game version.
  Autosaves (`AutoSave_NNNN`) omit some of these — `saves/archive/saves-index.json` used a regex fallback.
- Body: after `00 00 01 00` comes zlib (`78 9c`) split into 64 KiB blocks with 4-byte separators, ends at `00 00 FF FF`.
  `zlib.decompressobj().decompress(joined)` → ~31–33 MB.

## Body (what is proven)
- NOT a flat TLV stream (a generic walk resyncs every entry). Mostly hash-keyed tables: `[type hash u32][value]`, hashes = `Types.Hash` in `DebugGameplay.sqlite`.
- **Techs / civics per player**: full table in DB order as `[hash u32][u8]`, stride 5. Techs: 38 runs = 2 per player (pair index 2·pid, 2·pid+1),
  first run = HasTech (exact match for all 7 majors at T163). Civics: 19 runs, index = pid, exact match. Second tech run per player = unknown flag (boost/…).
  Same stride-5 runs exist for Policies (95), Governments, UnitPromotions, GovernorPromotions, Resources — not yet mapped.
- **Cities**: record header `int32 id, x, y, owner, original_owner` … `pop` at +32, loyalty byte at +38; the `LOC_CITY_NAME_*` string follows at +1123/+1328/+1730.
  City id = (pid+1)<<16 | n? (Xi'an 65536, Jiaodong 131073). Yields/housing not found as plain ints/floats within ±1.4 KB.
- **Units**: plot index (y·104+x) as int32 at −67 bytes before the unit type hash (148 of 420 units anchored; false positives exist). x/y not stored separately.
- **Plots**: per-plot int16 arrays of 6656 with 20-byte headers (`hash, count, 6656, W·256 …`): improvements @1343840, resources @1357172 (T163 offsets;
  values may be byte-shifted by one — verify per file). Terrain/feature/hills/river are NOT flat index or hash arrays at any stride ≤320 → likely inside
  per-plot property records; per-plot yield vectors appear as 6×[hash][u32] runs (39438 of them).
- Body also carries UI/notification copies of city names (many occurrences) — always anchor on the first occurrence.

## Not yet
terrain/feature per plot, ownership per plot, districts per city, build queues, gold/faith/score per player, great people, diplomacy, religion.

## Save archive
`saves/archive.ps1` (robocopy, never deletes) → `saves/archive/{onedrive,documents}/…`, scheduled task `civ6-save-archive` every 5 min via `archive-hidden.vbs`
(wscript, no window). Real save root is `%USERPROFILE%\OneDrive\Documents\My Games\…\Saves` (not `Documents\`). Index: `saves/archive/saves-index.json`.
Qin Deity Earth coverage: 107 saves over 80 distinct turns (T21–T164), gaps at 1–20, 22–23, 25–42, 55–56, 64, 79–99, 101–104, 107–122.
