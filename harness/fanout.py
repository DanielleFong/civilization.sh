"""Fan-out benchmark: N game instances (one tuner port each) load the same save and autoplay K turns concurrently.
Usage: python fanout.py --ports 4401-4416 --save AutoSave_0021 --turns 10 [--out fanout.jsonl]
Per instance: MainMenu Lua -> Network.LoadGame; wait InGame; AutoplayManager runs the AI for the human slot (no blocking);
poll Game.GetCurrentGameTurn() and log timestamps. Uses only the FireTuner socket (tuner_client)."""
from __future__ import annotations
import asyncio, json, re, sys, time, pathlib, argparse
sys.path.insert(0, r"C:\Users\danie\cc\civbench\civ6-mcp\src"); sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
try: from civ_mcp.tuner_client import connect, handshake, execute_lua
except ImportError: from tuner_client import connect, handshake, execute_lua
from dump_turn import LOAD_LUA

AUTOPLAY = """AutoplayManager.SetTurns(%d); AutoplayManager.SetReturnAsPlayer(0); AutoplayManager.SetObserveAsPlayer(0); AutoplayManager.SetActive(true); print("AUTOPLAY_ON"); print("DT_DONE")"""
TURN = """print("TURN "..Game.GetCurrentGameTurn()); print("DT_DONE")"""

async def states_of(port):
    r, w = await connect("127.0.0.1", port); _, raw = await handshake(r, w)
    st = {int(raw[i]): raw[i + 1].strip() for i in range(0, len(raw) - 1, 2) if raw[i].isdigit()}
    return r, w, st

async def wait_state(port, name, timeout=300):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            r, w, st = await states_of(port)
            k = next((k for k, v in st.items() if v == name), None)
            if k is not None: return r, w, k
            w.close()
        except (ConnectionRefusedError, OSError): pass
        await asyncio.sleep(2)
    raise TimeoutError(f"port {port}: no state {name} within {timeout}s")

async def run_one(port, save, turns, log):
    t0 = time.time(); ev = lambda k, **kw: log.write(json.dumps({"port": port, "t": round(time.time() - t0, 1), "ev": k, **kw}) + "\n") or log.flush()
    r, w, k = await wait_state(port, "MainMenu"); await execute_lua(r, w, k, LOAD_LUA % save); w.close(); ev("load_sent", save=save)
    await asyncio.sleep(10)
    r, w, k = await wait_state(port, "InGame", 600); res = str(await execute_lua(r, w, k, TURN)); m = re.search(r"TURN (\d+)", res); start = int(m.group(1)) if m else -1; ev("ingame", turn=start)
    await execute_lua(r, w, k, AUTOPLAY % turns); ev("autoplay_on")
    last = start; stall = 0
    while last < start + turns and stall < 900:
        await asyncio.sleep(3)
        try: res = str(await execute_lua(r, w, k, TURN)); m = re.search(r"TURN (\d+)", res)
        except Exception: m = None
        if m and int(m.group(1)) != last: last = int(m.group(1)); ev("turn", turn=last); stall = 0
        else: stall += 3
    ev("done", turns=last - start, seconds=round(time.time() - t0, 1)); w.close()
    return port, start, last, time.time() - t0

async def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--ports", default="4401-4416"); ap.add_argument("--save", default="AutoSave_0021"); ap.add_argument("--turns", type=int, default=10); ap.add_argument("--out", default="fanout.jsonl")
    a = ap.parse_args(); lo, hi = (int(x) for x in a.ports.split("-")); ports = list(range(lo, hi + 1))
    log = open(a.out, "a"); t0 = time.time()
    res = await asyncio.gather(*(run_one(p, a.save, a.turns, log) for p in ports), return_exceptions=True)
    tot = 0
    for p, x in zip(ports, res):
        if isinstance(x, Exception): print(f"port {p}: FAILED {x}", flush=True)
        else: port, s, e, secs = x; tot += e - s; print(f"port {p}: T{s}->T{e} in {secs:.0f}s = {(e - s) / max(secs, 1) * 60:.2f} turns/min", flush=True)
    el = time.time() - t0; print(f"AGGREGATE: {tot} turns in {el:.0f}s = {tot / el * 60:.1f} turns/min across {len(ports)} instances", flush=True)
asyncio.run(main())
