"""Per-turn full state dump for the civilization.is replay viewer (LIG-990).

Two transports, zero LLM context either way:
  tuner  : python dump_turn.py [--out DIR]           direct FireTuner socket (game must not be held by an MCP)
  files  : python dump_turn.py --assemble F1 F2 ...  assemble run_lua outputs (persisted tool-result .txt or raw text)
Writes <out>/turns/T<turn>.json. Sections: meta players cities units plots pins diplo (see dump_turn.lua)."""
import asyncio, json, pathlib, re, sys
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
    print(f"T{doc['turn']}: {len(doc['cities'])} cities, {len(doc['units'])} units, {len(doc['players'])} players, {len(doc['greatpeople'])} GPs, {sum(1 for r in doc['plots'] if r)}/{doc['H']} rows -> {p} ({p.stat().st_size // 1024} KB)" + (f"  INCOMPLETE {doc['incomplete']}" if doc["incomplete"] else ""))
    return p

def load_text(f: str) -> str:
    t = pathlib.Path(f).read_text()
    if t.startswith("{"):
        try: t = json.loads(t)["result"]
        except Exception: pass
    return t

async def via_tuner(out_dir: pathlib.Path) -> None:
    sys.path.insert(0, r"C:\Users\danie\cc\civbench\civ6-mcp\src")
    from civ_mcp.tuner_client import connect, handshake, execute_lua
    r, w = await connect("127.0.0.1", 4318); _, raw = await handshake(r, w)
    states = {int(raw[i]): raw[i + 1] for i in range(0, len(raw) - 1, 2) if raw[i].isdigit()}
    ingame = next((k for k, v in states.items() if v.strip().lower() == "ingame"), None)
    if ingame is None: sys.exit(f"no InGame state; states={states}")
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
    if a and a[0] == "--assemble":
        acc: dict = {}
        for f in a[1:]: parse(load_text(f), acc)
        write(out, assemble(acc))
    else: asyncio.run(via_tuner(out))
