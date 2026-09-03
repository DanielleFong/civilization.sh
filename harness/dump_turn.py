"""Per-turn full state dump for the civilization.is replay viewer (LIG-990).

Two transports, zero LLM context either way:
  tuner  : python dump_turn.py [--out DIR]           direct FireTuner socket (game must not be held by an MCP)
  files  : python dump_turn.py --assemble F1 F2 ...  assemble run_lua outputs (persisted tool-result .txt or raw text)
  replay : python dump_turn.py --saves 0_MCP_%04d 2 163   load each save via Lua (Network.LoadGame), dump, next; skips turns already on disk
Writes <out>/turns/T<turn>.json. Sections: meta players cities units plots pins diplo (see dump_turn.lua)."""
from __future__ import annotations
import asyncio, os, json, pathlib, re, sys
PORT = int(os.environ.get("CIV_TUNER_PORT", "4318"))
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import dt_section
DEFAULT_OUT = HERE.parent / "video" / "frames" / "state"

def parse(text: str, acc: dict) -> None:
    """Fold `KEY json` lines into acc."""
    for line in text.split("\n"):
        line = line.rstrip("\r")
        m = re.match(r"^(META|PLAYER|GREATPEOPLE|CITY|UNITS|PINS|DIPLO|CITYSTATES) (.*)$", line)
        if m:
            k, v = m.group(1), json.loads(m.group(2))
            if k in ("PLAYER", "CITY"): acc.setdefault(k, []).append(v)
            else: acc[k] = v
            continue
        m = re.match(r"^ROW (\d+) (\[.*\])$", line)
        if m: acc.setdefault("ROW", {})[int(m.group(1))] = json.loads(m.group(2))

def assemble(acc: dict) -> dict:
    meta = acc.get("META") or {}
    H = meta.get("H", 0)
    rows = acc.get("ROW", {})
    plots = [rows.get(y) for y in range(H)] if H else []
    players = {str(p["pid"]): p for p in acc.get("PLAYER", [])}
    missing = [y for y in range(H) if y not in rows]
    return {"turn": meta.get("turn"), "W": meta.get("W"), "H": H, "era": meta.get("era"), "majors": meta.get("majors"),
            "players_meta": meta.get("players"), "players": players, "greatpeople": acc.get("GREATPEOPLE", []),
            "cities": acc.get("CITY", []), "units": acc.get("UNITS", []), "pins": acc.get("PINS", []),
            "diplo": acc.get("DIPLO", []), "citystates": acc.get("CITYSTATES", []),
            "plot_fields": ["owner", "district", "improvement", "pillaged", "route", "water", "vis", "appeal"], "plots": plots,
            "gp_fields": ["class", "individual", "era", "cost", "claimant", "turn"],
            "unit_fields": ["pid", "x", "y", "type", "damage", "level", "gp_individual"],
            "diplo_fields": ["a", "b", "state", "war", "alliance"], "incomplete": {"rows_missing": missing} if missing else None}

def write(out_dir: pathlib.Path, doc: dict) -> pathlib.Path:
    d = out_dir / "turns"; d.mkdir(parents=True, exist_ok=True)
    p = d / f"T{doc['turn']:03d}.json"; p.write_text(json.dumps(doc, separators=(",", ":")))
    ix = d / "index.json"; turns = sorted({int(m.group(1)) for f in d.glob("T*.json") for m in [re.match(r"T(\d+)\.json", f.name)] if m})
    ix.write_text(json.dumps({"turns": turns, "fields": {"plots": doc["plot_fields"], "gp": doc["gp_fields"], "units": doc["unit_fields"], "diplo": doc["diplo_fields"]}}))
    print(f"T{doc['turn']}: {len(doc['cities'])} cities, {len(doc['units'])} units, {len(doc['players'])} players, {len(doc['greatpeople'])} GPs, {sum(1 for r in doc['plots'] if r)}/{doc['H']} rows -> {p} ({p.stat().st_size // 1024} KB)" + (f"  INCOMPLETE {doc['incomplete']}" if doc["incomplete"] else ""), flush=True)
    return p

def load_text(f: str) -> str:
    t = pathlib.Path(f).read_text()
    if t.startswith("{"):
        try: t = json.loads(t)["result"]
        except Exception: pass
    return t

sys.path.insert(0, r"C:\Users\danie\cc\civbench\civ6-mcp\src")
try:
    from civ_mcp.tuner_client import connect, handshake, execute_lua  # Windows: captain's clone
except ImportError:
    from tuner_client import connect, handshake, execute_lua  # Mac: vendored copy next to this file
LOAD_LUA = """if not ExposedMembers then ExposedMembers = {} end
ExposedMembers.DTLoad = nil
local function OnResults(fileList, qid)
  UI.CloseFileListQuery(qid); LuaEvents.FileListQueryResults.Remove(OnResults)
  for i, s in ipairs(fileList) do if tostring(s.Name) == "%s.Civ6Save" then ExposedMembers.DTLoad = "FOUND"; Network.LeaveGame(); Network.LoadGame(s, ServerType.SERVER_TYPE_NONE); return end end
  ExposedMembers.DTLoad = "NOT_FOUND"
end
LuaEvents.FileListQueryResults.Add(OnResults)
local opts = SaveLocationOptions.NORMAL + SaveLocationOptions.AUTOSAVE + SaveLocationOptions.QUICKSAVE + SaveLocationOptions.LOAD_METADATA
UI.QuerySaveGameList(SaveLocations.LOCAL_STORAGE, SaveTypes.SINGLE_PLAYER, opts)
print("QUERY_SENT")
print("DT_DONE")"""

async def open_ingame(retries: int = 90):
    """Connect to the tuner and return (reader, writer, ingame_state_index); waits for the InGame state to exist."""
    import asyncio as _a
    for _ in range(retries):
        try:
            r, w = await connect("127.0.0.1", PORT); _, raw = await handshake(r, w)
            states = {int(raw[i]): raw[i + 1] for i in range(0, len(raw) - 1, 2) if raw[i].isdigit()}
            ingame = next((k for k, v in states.items() if v.strip().lower() == "ingame"), None)
            if ingame is not None: return r, w, ingame
            w.close()
        except (ConnectionRefusedError, OSError): pass
        await _a.sleep(2)
    sys.exit("tuner never exposed an InGame state")

async def open_any(retries: int = 90):
    """Like open_ingame, but at the main menu returns a FrontEnd-type state so a save can be loaded from there."""
    import asyncio as _a, re as _re
    for _ in range(retries):
        try:
            r, w = await connect("127.0.0.1", PORT); _, raw = await handshake(r, w)
            states = {int(raw[i]): raw[i + 1] for i in range(0, len(raw) - 1, 2) if raw[i].isdigit()}
            ingame = next((k for k, v in states.items() if v.strip().lower() == "ingame"), None)
            if ingame is not None: return r, w, ingame
            fe = next((k for k, v in states.items() if _re.search(r"frontend|mainmenu", v, _re.I)), None)
            if fe is not None: print("main menu: loading from state", states[fe], flush=True); return r, w, fe
            w.close()
        except (ConnectionRefusedError, OSError): pass
        await _a.sleep(2)
    sys.exit("tuner never exposed a usable state")

async def dump_current(r, w, ingame) -> dict:
    acc: dict = {}
    for sec, lo, hi in [("meta", None, None), ("players", None, None), ("cities", 0, 63), ("units", None, None), ("pins", None, None), ("diplo", None, None)]:
        parse(str(await execute_lua(r, w, ingame, dt_section.code(sec, lo, hi, end="DT_DONE"))), acc)
    H = (acc.get("META") or {}).get("H", 64)
    for y0 in range(0, H, 8):
        parse(str(await execute_lua(r, w, ingame, dt_section.code("plots", y0, min(H - 1, y0 + 7), end="DT_DONE"))), acc)
    return assemble(acc)

async def via_saves(out_dir: pathlib.Path, pattern: str, first: int, last: int, listing: list | None = None) -> None:
    import asyncio as _a
    plan = listing or [(t, pattern % t) for t in range(first, last + 1)]
    for t, name in plan:
        if (out_dir / "turns" / f"T{t:03d}.json").exists(): continue
        r, w, state = await open_any()
        try: await execute_lua(r, w, state, LOAD_LUA % name)
        except Exception as e: print(f"{name}: load send failed ({e})")
        w.close(); await _a.sleep(8)  # the game tears the tuner down while it loads
        r, w, ingame = await open_ingame()
        doc = None
        for _ in range(60):  # wait until the loaded game reports its turn
            try:
                res = str(await execute_lua(r, w, ingame, "print('TURN '..Game.GetCurrentGameTurn()) print('DT_DONE')"))
                m = re.search(r"TURN (\d+)", res)
                if m and Game_ok(int(m.group(1)), t): break
            except Exception: pass
            await _a.sleep(2)
        doc = await dump_current(r, w, ingame); w.close()
        if doc["turn"] is None: print(f"{name}: no data"); continue
        write(out_dir, doc)

def Game_ok(turn: int, want: int) -> bool: return turn == want or turn == want - 1 or turn == want + 1

async def via_tuner(out_dir: pathlib.Path) -> None:
    r, w, ingame = await open_ingame(retries=1)
    write(out_dir, await dump_current(r, w, ingame)); w.close()

async def _unused(out_dir):
    acc: dict = {}
    for sec, lo, hi in [("meta", None, None), ("players", None, None), ("cities", 0, 63), ("units", None, None), ("pins", None, None), ("diplo", None, None)]:
        parse(str(await execute_lua(r, w, ingame, dt_section.code(sec, lo, hi, end="DT_DONE"))), acc)
    H = (acc.get("META") or {}).get("H", 64)
    for y0 in range(0, H, 8):
        parse(str(await execute_lua(r, w, ingame, dt_section.code("plots", y0, min(H - 1, y0 + 7), end="DT_DONE"))), acc)
    w.close(); write(out_dir, assemble(acc))

if __name__ == "__main__":
    a = sys.argv[1:]; out = DEFAULT_OUT
    if "--out" in a: i = a.index("--out"); out = pathlib.Path(a[i + 1]); del a[i:i + 2]
    if a and a[0] == "--list":
        plan = [(int(l.split(" ", 1)[0]), l.split(" ", 1)[1].strip()) for l in open(a[1]) if l.strip()]
        asyncio.run(via_saves(out, "", 0, 0, plan))
    elif a and a[0] == "--saves":
        asyncio.run(via_saves(out, a[1], int(a[2]), int(a[3])))
    elif a and a[0] == "--assemble":
        acc: dict = {}
        for f in a[1:]: parse(load_text(f), acc)
        write(out, assemble(acc))
    else: asyncio.run(via_tuner(out))
