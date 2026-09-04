"""Passive recorder for HUMAN play via the FireTuner socket (read-only).

Polls record_human.lua every POLL seconds. Writes a JSONL line whenever the turn
advances or the player's decision state changes (queues, policies, research, civic,
government, districts, city count), with the diff spelled out in "events".
Rival data is omniscient and is written to the file only — never printed.

Usage (Windows python, game loaded and IN-GAME — never at the main menu; tuner GUI closed):
  python record_human.py [--poll 4] [--out DIR]
"""
import asyncio, json, pathlib, re, sys, time, argparse
sys.path.insert(0, r"C:\Users\danie\cc\civbench\civ6-mcp\src")
from civ_mcp.tuner_client import connect, handshake, send_message, recv_message_timeout, drain_messages, TAG_COMMAND

async def exec_lua(r, w, idx, code, timeout=15):
    await drain_messages(r, timeout=0.2)
    await send_message(w, TAG_COMMAND, f"CMD:{idx}:{code}")
    buf = ""; deadline = time.time() + timeout
    while time.time() < deadline:
        m = await recv_message_timeout(r, timeout=max(0.5, deadline - time.time()))
        if m is None: break
        buf += (m.payload or "")
        if "HUMAN {" in buf and buf.rstrip().endswith("}"): break
    return buf

HERE = pathlib.Path(__file__).resolve().parent
LUA = (HERE / "record_human.lua").read_text(encoding="utf-8")

def fingerprint(d):
    return json.dumps({
        "tech": d["tech"], "civic": d["civic"], "gov": d["gov"], "policies": d["policies"],
        "cities": [(c["n"], c["queue"], sorted((x["t"], x["x"], x["y"]) for x in c["districts"])) for c in d["cities"]],
        "governors": sorted((g["g"], g["city"], g["established"], tuple(g["promos"])) for g in d.get("governors", [])),
        "wonders": sorted((c["n"], tuple(c.get("wonders", []))) for c in d["cities"]),
        "buildings": sorted((c["n"], tuple(c.get("buildings", []))) for c in d["cities"]),
        "units": sorted((u["id"], u["t"], u["x"], u["y"]) for u in d.get("units", [])),
        "tiles": [(c["n"], c.get("tiles")) for c in d["cities"]],
        "religion": d.get("religion"), "governors_": d.get("governors"), "trade": d.get("trade"), "city_states": d.get("city_states"), "diplomacy": d.get("diplomacy"), "era_": d.get("era"),
        "pins": sorted((p["x"], p["y"], p["icon"], p["name"]) for p in d.get("pins", [])),
    }, sort_keys=True)

def diff_events(a, b):
    ev = []
    if a is None:
        return ["recorder start"]
    for k in ("tech", "civic", "gov"):
        if a[k] != b[k]: ev.append(f"{k}: {a[k]} -> {b[k]}")
    if a["policies"] != b["policies"]:
        for i, (x, y) in enumerate(zip(a["policies"], b["policies"])):
            if x != y: ev.append(f"policy slot {i}: {x} -> {y}")
        if len(a["policies"]) != len(b["policies"]): ev.append(f"policy slots {len(a['policies'])} -> {len(b['policies'])}")
    ac = {c["n"]: c for c in a["cities"]}; bc = {c["n"]: c for c in b["cities"]}
    for n in bc.keys() - ac.keys(): ev.append(f"city founded: {n} ({bc[n]['x']},{bc[n]['y']})")
    for n in ac.keys() - bc.keys(): ev.append(f"city lost: {n}")
    for n in ac.keys() & bc.keys():
        for wnd in set(bc[n].get("wonders", [])) - set(ac[n].get("wonders", [])): ev.append(f"{n} WONDER complete: {wnd}")
        for bld in set(bc[n].get("buildings", [])) - set(ac[n].get("buildings", [])): ev.append(f"{n} built: {bld}")
        if ac[n]["queue"] != bc[n]["queue"]: ev.append(f"{n} queue: {ac[n]['queue']} -> {bc[n]['queue']}")
        da = {(x["t"], x["x"], x["y"]) for x in ac[n]["districts"]}; db = {(x["t"], x["x"], x["y"]) for x in bc[n]["districts"]}
        for t, x, y in db - da: ev.append(f"{n} district placed: {t} @({x},{y})")
        for x in bc[n]["districts"]:
            prev = next((p for p in ac[n]["districts"] if (p["t"], p["x"], p["y"]) == (x["t"], x["x"], x["y"])), None)
            if prev and not prev["done"] and x["done"]: ev.append(f"{n} district complete: {x['t']}")
    ga = {g["g"]: g for g in a.get("governors", [])}; gb = {g["g"]: g for g in b.get("governors", [])}
    for k in gb.keys() - ga.keys(): ev.append(f"governor appointed: {k} -> {gb[k]['city']}")
    for k in ga.keys() & gb.keys():
        if ga[k]["city"] != gb[k]["city"]: ev.append(f"governor {k}: {ga[k]['city']} -> {gb[k]['city']}")
        if ga[k]["promos"] != gb[k]["promos"]: ev.append(f"governor {k} promotions: {gb[k]['promos']}")
        if not ga[k]["established"] and gb[k]["established"]: ev.append(f"governor {k} established in {gb[k]['city']}")
    # tiles: chops / improvements / pillage / worked changes
    for n in ac.keys() & bc.keys():
        ta = {(t[0], t[1]): t for t in ac[n].get("tiles", [])}; tb = {(t[0], t[1]): t for t in bc[n].get("tiles", [])}
        for k in ta.keys() & tb.keys():
            x, y = ta[k], tb[k]
            if x[2] and not y[2]: ev.append(f"{n} CHOP {x[2]} @{k}")
            if x[3] != y[3]: ev.append(f"{n} improvement @{k}: {x[3] or '-'} -> {y[3] or '-'}")
            if (len(x) > 6) != (len(y) > 6): ev.append(f"{n} @{k} {'PILLAGED' if len(y) > 6 else 'repaired'}")
        if a["turn"] == b["turn"] and ac[n].get("prod_progress", -1) >= 0 and bc[n].get("prod_progress", -1) >= 0 and bc[n]["queue"][:1] == ac[n]["queue"][:1] and bc[n]["prod_progress"] > ac[n]["prod_progress"]:
            ev.append(f"{n} +{bc[n]['prod_progress']-ac[n]['prod_progress']:.0f} prod -> {bc[n]['prod_progress']:.0f}/{bc[n]['prod_cost']:.0f} {bc[n]['queue'][0].split('_',1)[-1]}")
    if a.get("gold", 0) - b.get("gold", 0) > 30: ev.append(f"gold spent: {a['gold']:.0f} -> {b['gold']:.0f}")
    if a.get("faith", 0) - b.get("faith", 0) > 30: ev.append(f"faith spent: {a['faith']:.0f} -> {b['faith']:.0f}")
    for k in ("religion", "era"):
        if a.get(k) != b.get(k): ev.append(f"{k}: {json.dumps(b.get(k))}")
    ua = {u["id"]: u for u in a.get("units", [])}; ub = {u["id"]: u for u in b.get("units", [])}
    for k in ub.keys() - ua.keys(): ev.append(f"unit new: {ub[k]['t']} @({ub[k]['x']},{ub[k]['y']})")
    for k in ua.keys() - ub.keys(): ev.append(f"unit gone: {ua[k]['t']} @({ua[k]['x']},{ua[k]['y']})")
    for k in ua.keys() & ub.keys():
        if (ua[k]["x"], ua[k]["y"]) != (ub[k]["x"], ub[k]["y"]): ev.append(f"{ub[k]['t']} moved ({ua[k]['x']},{ua[k]['y']})->({ub[k]['x']},{ub[k]['y']})")
        if ub[k]["hp"] < ua[k]["hp"]: ev.append(f"{ub[k]['t']} took {ua[k]['hp']-ub[k]['hp']} dmg @({ub[k]['x']},{ub[k]['y']})")
    ca = {c["cs"]: c for c in a.get("city_states", [])}; cb = {c["cs"]: c for c in b.get("city_states", [])}
    for k in cb.keys() & ca.keys():
        if cb[k]["envoys"] != ca[k]["envoys"]: ev.append(f"envoys {k}: {ca[k]['envoys']} -> {cb[k]['envoys']}")
        if cb[k]["suzerain"] != ca[k]["suzerain"]: ev.append(f"suzerain {k}: {ca[k]['suzerain']} -> {cb[k]['suzerain']}")
    for k in cb.keys() - ca.keys(): ev.append(f"met city-state {k}")
    da = {x["pid"]: x for x in a.get("diplomacy", [])}; db = {x["pid"]: x for x in b.get("diplomacy", [])}
    for k in db:
        if k in da and da[k]["state"] != db[k]["state"]: ev.append(f"diplo {db[k]['civ']}: {da[k]['state']} -> {db[k]['state']}")
        if k in da and da[k]["war"] != db[k]["war"]: ev.append(f"WAR {db[k]['civ']}: {db[k]['war']}")
    if a.get("trade") != b.get("trade"): ev.append(f"trade routes: {[ (r['from'], r['to']) for r in b.get('trade', {}).get('routes', [])]}")
    if b.get("errs"): ev.append(f"errs: {b['errs']}")
    pa = {(p["x"], p["y"]): p for p in a.get("pins", [])}; pb = {(p["x"], p["y"]): p for p in b.get("pins", [])}
    for k in pb.keys() - pa.keys(): ev.append(f"pin added: {pb[k]['icon']} '{pb[k]['name']}' @{k}")
    for k in pa.keys() - pb.keys(): ev.append(f"pin removed: {pa[k]['icon']} @{k}")
    for k in pa.keys() & pb.keys():
        if (pa[k]["icon"], pa[k]["name"]) != (pb[k]["icon"], pb[k]["name"]): ev.append(f"pin changed @{k}: {pa[k]['icon']} -> {pb[k]['icon']}")
    return ev

async def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--poll", type=float, default=4.0); ap.add_argument("--out", default=str(HERE.parent / "recordings"))
    a = ap.parse_args()
    r, w = await connect("127.0.0.1", int(__import__("os").environ.get("CIV_TUNER_PORT", "4318")))
    ident, raw = await handshake(r, w)
    states = {int(raw[i]): raw[i + 1] for i in range(0, len(raw) - 1, 2) if raw[i].isdigit()}
    idx = next((k for k, v in states.items() if v.strip().lower() == "ingame"), None)
    if idx is None:
        sys.exit(f"no InGame state (states={states}); is a game loaded?")
    out = None; prev = None; prev_fp = None; last_turn = None; n = 0; owners_at = 0.0
    print(f"connected: {ident.strip()} InGame={idx}; polling {a.poll}s", flush=True)
    while True:
        t0 = time.time()
        try:
            want = last_turn is None or (prev is not None and time.time() - owners_at > 20)   # owner grid at most every ~20 s (turn boundaries)
            res = await exec_lua(r, w, idx, ("WANT_OWNERS=true\n" if want else "WANT_OWNERS=false\n") + LUA, timeout=15)
            if want: owners_at = time.time()
            m = re.search(r"HUMAN (\{.*\})", str(res), re.S)
            if not m:
                print(f"[{time.strftime('%H:%M:%S')}] no HUMAN line: {str(res)[:200]}", flush=True)
            else:
                d = json.loads(m.group(1), strict=False); d["ts"] = time.strftime("%Y-%m-%dT%H:%M:%S")
                if out is None:
                    civ = d["civ"].replace("CIVILIZATION_", "").lower()
                    out = pathlib.Path(a.out) / f"human_{civ}_{d.get('seed',-1)}_{time.strftime('%Y%m%d-%H%M')}.jsonl"
                    out.parent.mkdir(parents=True, exist_ok=True)
                    print(f"writing {out}", flush=True)
                fp = fingerprint(d)
                if d["turn"] != last_turn or fp != prev_fp:
                    d["events"] = diff_events(prev, d)
                    if d["turn"] != last_turn: d["events"].insert(0, f"turn {last_turn} -> {d['turn']}")
                    with out.open("a", encoding="utf-8") as f: f.write(json.dumps(d, separators=(",", ":")) + "\n")
                    n += 1
                    # console: only the player's own decisions, never rival data
                    print(f"[{d['ts'][11:]}] T{d['turn']} #{n} " + " | ".join(d["events"])[:600], flush=True)
                    if d["turn"] != last_turn:
                        e = d.get("era", {}) or {}
                        cs = "; ".join(f"{c['n']} p{c['pop']} {(c['queue'][:1] or ['idle'])[0].split('_',1)[-1]} {c['prod_progress']:.0f}/{c['prod_cost']:.0f} d{len(c['districts'])}" for c in d["cities"])
                        riv = sorted(d.get("rivals", []), key=lambda r: -r["score"])[:3]
                        print(f"STATE T{d['turn']} score {d['score']} gold {d['gold']:.0f}({d['gold_pt']:+.0f}) faith {d['faith']:.0f} sci {d['sci_pt']:.0f} cul {d['cul_pt']:.0f} era {e.get('score')}/{e.get('golden_at')} {e.get('age')} tech {d['tech'].replace('TECH_','')} civic {d['civic'].replace('CIVIC_','')} | {cs} | top: " + ", ".join(f"{r['civ']} {r['score']} c{r['cities']} d{r['districts']}" for r in riv), flush=True)
                    prev, prev_fp, last_turn = d, fp, d["turn"]
        except (ConnectionError, asyncio.IncompleteReadError, OSError) as e:
            print(f"connection lost ({e}); reconnecting (save load / restart)", flush=True)
            try: w.close()
            except Exception: pass
            while True:
                await asyncio.sleep(15)
                try:
                    r, w = await connect("127.0.0.1", int(__import__("os").environ.get("CIV_TUNER_PORT", "4318")))
                    ident, raw = await handshake(r, w)
                    states = {int(raw[i]): raw[i + 1] for i in range(0, len(raw) - 1, 2) if raw[i].isdigit()}
                    idx = next((k for k, v in states.items() if v.strip().lower() == "ingame"), None)
                    if idx is None:
                        print(f"[{time.strftime('%H:%M:%S')}] reconnected but no InGame state yet; retrying", flush=True)
                        w.close(); continue
                    print(f"[{time.strftime('%H:%M:%S')}] reconnected InGame={idx}", flush=True)
                    prev, prev_fp, last_turn = None, None, None
                    break
                except Exception as e2:
                    print(f"[{time.strftime('%H:%M:%S')}] reconnect failed: {e2}", flush=True)
        except Exception as e:
            print(f"poll error: {e}", flush=True)
        await asyncio.sleep(max(0.5, a.poll - (time.time() - t0)))

asyncio.run(main())
