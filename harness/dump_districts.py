"""Dump districts for the currently loaded game -> ../recordings/districts_T<turn>.json
Usage (game running, save loaded, FireTuner GUI closed): python dump_districts.py"""
import asyncio, json, pathlib, re, sys
sys.path.insert(0, r"C:\Users\danie\cc\civbench\civ6-mcp\src")
from civ_mcp.tuner_client import connect, handshake, execute_lua
HERE = pathlib.Path(__file__).resolve().parent
async def main():
    lua = (HERE / "dump_districts.lua").read_text()
    r, w = await connect("127.0.0.1", 4318)
    _, raw = await handshake(r, w)
    states = {int(raw[i]): raw[i+1] for i in range(0, len(raw)-1, 2) if raw[i].isdigit()}
    idx = next((k for k, v in states.items() if v.strip().lower() == "ingame"), None)
    if idx is None: sys.exit(f"no InGame state; states={states} (is a game loaded?)")
    res = await execute_lua(r, w, idx, lua); w.close()
    m = re.search(r"DISTRICTS (\{.*\})", str(res), re.S)
    if not m: sys.exit(f"no DISTRICTS line in tuner output:\n{res}")
    d = json.loads(m.group(1))
    out = HERE.parent / "recordings" / f"districts_T{d['turn']:04d}.json"
    out.write_text(json.dumps(d, indent=1))
    mine = [c for c in d["cities"] if c["civ"] == "CIVILIZATION_CHINA"]
    print(f"T{d['turn']}: {len(d['cities'])} cities dumped -> {out.name}; China {len(mine)} cities, {sum(len(c['districts']) for c in mine)} districts")
asyncio.run(main())
