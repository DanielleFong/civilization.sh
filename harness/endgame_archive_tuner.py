"""End-game archive via the FireTuner — no mouse, no OCR, exact data.

  C:\\Users\\danie\\cc\\civbench\\civ6-mcp\\.venv\\Scripts\\python.exe endgame_archive_tuner.py [--tag NAME] [--out DIR]

Outputs, in OUT/TAG/:
  data.json            every GameSummary dataset: {dataset: {player: [[turn, value], ...]}} + player table
  NN_<dataset>.png     the game's own graph for each dataset (switched via SetCurrentGraphDataSet)
  results.png, ranking_*.png (ranking scrolled page by page), index.json
Requires the game sitting on the end-game screen (EndGameMenu Lua state present) and a free tuner slot.
"""
import argparse, asyncio, ctypes, json, pathlib, re, sys, time
from ctypes import wintypes
from PIL import Image
sys.path.insert(0, r"C:\Users\danie\cc\civbench\civ6-mcp\src")
from civ_mcp.tuner_client import connect, handshake, send_message, recv_message_timeout, drain_messages, TAG_COMMAND

u32 = ctypes.windll.user32; g32 = ctypes.windll.gdi32; u32.SetProcessDPIAware()
TITLES = ["Sid Meier's Civilization VI (DX12)", "Sid Meier's Civilization VI (DX11)", "Sid Meier's Civilization VI"]
class BIH(ctypes.Structure):
    _fields_ = [("biSize", wintypes.DWORD), ("biWidth", wintypes.LONG), ("biHeight", wintypes.LONG), ("biPlanes", wintypes.WORD), ("biBitCount", wintypes.WORD), ("biCompression", wintypes.DWORD), ("biSizeImage", wintypes.DWORD), ("biXPelsPerMeter", wintypes.LONG), ("biYPelsPerMeter", wintypes.LONG), ("biClrUsed", wintypes.DWORD), ("biClrImportant", wintypes.DWORD)]
def find_hwnd():
    for t in TITLES:
        h = u32.FindWindowW(None, t)
        if h: return h
    sys.exit("Civ VI window not found")
def grab(h):
    r = wintypes.RECT(); u32.GetClientRect(h, ctypes.byref(r)); w, hh = r.right - r.left, r.bottom - r.top
    hdc = u32.GetDC(h); mdc = g32.CreateCompatibleDC(hdc); bmp = g32.CreateCompatibleBitmap(hdc, w, hh); g32.SelectObject(mdc, bmp)
    ok = u32.PrintWindow(h, mdc, 2)
    bi = BIH(); bi.biSize = ctypes.sizeof(BIH); bi.biWidth = w; bi.biHeight = -hh; bi.biPlanes = 1; bi.biBitCount = 32
    buf = ctypes.create_string_buffer(w * hh * 4); g32.GetDIBits(mdc, bmp, 0, hh, buf, ctypes.byref(bi), 0)
    g32.DeleteObject(bmp); g32.DeleteDC(mdc); u32.ReleaseDC(h, hdc)
    if not ok: sys.exit("PrintWindow failed")
    return Image.frombuffer("RGB", (w, hh), buf, "raw", "BGRX", 0, 1)
class Screen:
    """GDI BitBlt from the composited desktop: ~17 ms for a graph panel, ~70 ms for the full 4K window."""
    def __init__(s): s.sdc = u32.GetDC(0); s.mdc = g32.CreateCompatibleDC(s.sdc); s.bmp = None; s.wh = None
    def grab(s, x, y, w, h):
        if s.wh != (w, h):
            if s.bmp: g32.DeleteObject(s.bmp)
            s.bmp = g32.CreateCompatibleBitmap(s.sdc, w, h); g32.SelectObject(s.mdc, s.bmp); s.wh = (w, h); s.buf = ctypes.create_string_buffer(w * h * 4)
            s.bi = BIH(); s.bi.biSize = ctypes.sizeof(BIH); s.bi.biWidth = w; s.bi.biHeight = -h; s.bi.biPlanes = 1; s.bi.biBitCount = 32
        g32.BitBlt(s.mdc, 0, 0, w, h, s.sdc, x, y, 0x00CC0020 | 0x40000000)
        g32.GetDIBits(s.mdc, s.bmp, 0, h, s.buf, ctypes.byref(s.bi), 0)
        return Image.frombuffer("RGB", (w, h), s.buf, "raw", "BGRX", 0, 1)
SCR = Screen(); REF_W, REF_H = 3840, 2121; GRAPH_BOX = (1400, 240, 2460, 730)   # graph panel + legend, reference coords
def win_rect(h): r = wintypes.RECT(); u32.GetWindowRect(h, ctypes.byref(r)); return r
def grab_full(h): r = win_rect(h); return SCR.grab(r.left, r.top, r.right - r.left, r.bottom - r.top)
def grab_graph(h):
    r = win_rect(h); sx, sy = (r.right - r.left) / (REF_W + 16), (r.bottom - r.top) / (REF_H + 39)
    x0, y0, x1, y1 = GRAPH_BOX; return SCR.grab(r.left + int(x0 * sx), r.top + int(y0 * sy), int((x1 - x0) * sx), int((y1 - y0) * sy))
def fp(im): return im.tobytes()[::997]
def grab_changed(h, prev, max_wait=0.6, region=False):
    """Grab until the frame differs from prev (the game redraws asynchronously); returns (im, fp)."""
    t = time.time(); g = grab_graph if region else grab_full
    while True:
        im = g(h); f = fp(im)
        if f != prev or time.time() - t > max_wait: return im, f
        time.sleep(0.004)
def safe(s): return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_")

LUA_DATASETS = r'''
local t0=GameConfiguration.GetStartTurn(); local t1=Game.GetCurrentGameTurn(); local out={}
for i=0,GameSummary.GetDataSetCount()-1 do
  if GameSummary.GetDataSetVisible(i) and GameSummary.HasDataSetValues(i) then
    local d=GameSummary.CoalesceDataSet(i,t0,t1); local ps={}
    for pid,series in pairs(d or {}) do
      local vals={}; for turn=t0,t1 do local v=series[turn]; vals[#vals+1]= v==nil and "null" or tostring(v) end
      ps[#ps+1]='"'..pid..'":['..table.concat(vals,",")..']'
    end
    out[#out+1]=string.format('"%s":{"display":"%s","players":{%s}}',GameSummary.GetDataSetName(i),Locale.Lookup(GameSummary.GetDataSetDisplayName(i)),table.concat(ps,","))
  end
end
local pl = {}
for pid = 0, 63 do
  local p = Players[pid]; local c = PlayerConfigurations[pid]
  if p and c and c:IsParticipant() and p:WasEverAlive() and not p:IsBarbarian() then
    pl[#pl+1] = string.format('{"pid":%d,"name":"%s","civ":"%s","leader":"%s","major":%s,"alive":%s}', pid, (Locale.Lookup(c:GetPlayerName()):gsub('"','')), c:GetCivilizationTypeName(), c:GetLeaderTypeName(), tostring(p:IsMajor()), tostring(p:IsAlive()))
  end
end
print('DATA {"start_turn":'..t0..',"final_turn":'..t1..',"players":['..table.concat(pl,",")..'],"datasets":{'..table.concat(out,",")..'}}')
print("END_DUMP")
'''

async def exec_until(r, w, idx, code, marker, timeout=30):
    await send_message(w, TAG_COMMAND, f"CMD:{idx}:{code}")
    buf = ""; t = time.time() + timeout
    while time.time() < t:
        m = await recv_message_timeout(r, timeout=max(0.3, t - time.time()))
        if m is None: break
        buf += (m.payload or "") + "\n"
        if marker in buf: break
    return buf

async def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default=r"C:\Users\danie\cc\civilization.sh\recordings\endgame"); ap.add_argument("--tag", default=time.strftime("%Y%m%d-%H%M"))
    a = ap.parse_args(); out = pathlib.Path(a.out) / a.tag; out.mkdir(parents=True, exist_ok=True)
    t0 = time.time(); h = find_hwnd()
    r, w = await connect("127.0.0.1", 4318); ident, raw = await handshake(r, w); await drain_messages(r, timeout=0.05)
    states = {int(raw[i]): raw[i + 1] for i in range(0, len(raw) - 1, 2) if raw[i].isdigit()}
    idx = next((k for k, v in states.items() if "endgame" in v.lower()), None)
    if idx is None: sys.exit(f"no EndGame Lua state; states={sorted(states.values())}")
    print(f"EndGame state = {idx} ({states[idx]})", flush=True)
    # 1) exact data (warm-up command first: the first command after handshake can return stale output)
    await exec_until(r, w, idx, "print('warm')", "warm", 5)
    txt = await exec_until(r, w, idx, LUA_DATASETS, "END_DUMP", timeout=60)
    if "DATASET" not in txt: print("dump returned no DATASET lines; raw head:", txt[:400], flush=True)
    data = {"datasets": {}, "players": [], "meta": {}}
    for line in txt.splitlines():
        line = re.sub(r"^O[\x00 ][A-Za-z_]+: ", "", line.strip())
        if line.startswith("DATA "):
            d = json.loads(line[5:], strict=False)
            data = {"meta": {"start_turn": d["start_turn"], "final_turn": d["final_turn"], "series_format": "values per turn from start_turn; null = no data"}, "players": d["players"], "datasets": d["datasets"]}
    (out / "data.json").write_text(json.dumps(data, indent=1)); print(f"data: {len(data['datasets'])} datasets, {len(data['players'])} players ({time.time()-t0:.1f}s)", flush=True)
    T = lambda tag: print(f"  [{tag}] {time.time()-t0:.2f}s", flush=True)
    T("data"); index = []
    from concurrent.futures import ThreadPoolExecutor
    pool = ThreadPoolExecutor(max_workers=10); futs = []
    def save(name, im):
        p = out / f"{len(index):02d}_{safe(name)}.png"; index.append({"file": p.name, "label": name})
        futs.append(pool.submit(im.save, p, "PNG", compress_level=1))   # encode off the capture thread
    # 2) results + ranking (scrolled) + every graph, all via UI Lua
    pre = fp(grab_full(h)); await exec_until(r, w, idx, "OnInfoTab(); print('ok')", "ok", 5); im, _ = grab_changed(h, pre, 0.12); save("results", im)
    pre = fp(grab_full(h)); await exec_until(r, w, idx, "OnRankingTab(); Controls.RankingScrollPanel:SetScrollValue(0); print('ok')", "ok", 5); im, _ = grab_changed(h, pre, 0.12); save("ranking_top", im)
    last = fp(grab_full(h))
    for k, v in enumerate((0.5, 1.0), 1):
        await exec_until(r, w, idx, f"Controls.RankingScrollPanel:SetScrollValue({v}); print('ok')", "ok", 5); im, f = grab_changed(h, last, 0.1)
        if f != last: save(f"ranking_{k}", im); last = f
    T("results+ranking"); await exec_until(r, w, idx, "OnReplayTab(); print('ok')", "ok", 5); time.sleep(0.01)
    names = sorted(data["datasets"].items(), key=lambda kv: kv[1]["display"])
    last = fp(grab_graph(h))
    for name, meta in names:
        await exec_until(r, w, idx, f"SetCurrentGraphDataSet('{name}'); print('ok')", "ok", 5); im, last = grab_changed(h, last, 0.4, region=True); save(meta["display"], im)
    T("graphs")
    # 3) era-score ledger: the game's own historian export (all players' moments) + the timeline screen
    txt = await exec_until(r, w, idx, "local p, f = Game.GetHistoryManager():WritePrideMomentInfo(); print('EXPORT|' .. tostring(p) .. '|' .. tostring(f))", "EXPORT|", 20)
    m = re.search(r"EXPORT\|(.*?)\|(.*?)\s*$", txt, re.M)
    if m:
        import shutil
        src = pathlib.Path(m.group(1)); src = src if src.is_file() else src / m.group(2)
        if src.is_file():
            shutil.copy(src, out / "moments.json"); mm = json.loads(src.read_text(encoding="utf-8"))
            me = next((pl["Id"] for pl in mm["Players"] if "CHINA" in pl.get("Civilization", "")), None)
            mine = [x for x in mm["Moments"] if x["ActingPlayer"] == me] if me is not None else []
            (out / "era_score_ledger.tsv").write_text("turn\tera\tscore\ttype\tdescription\n" + "".join(f"{x['Turn']}\t{x['GameEra']}\t{x['EraScore']}\t{x['Type']}\t{x['InstanceDescription']}\n" for x in mine if x["EraScore"]), encoding="utf-8")
            print(f"moments: {len(mm['Moments'])} total, {len(mine)} ours, {sum(x['EraScore'] for x in mine)} era score -> moments.json / era_score_ledger.tsv", flush=True)
        else: print("export path not found:", m.groups(), flush=True)
    else: print("export call returned no path:", txt[:200], flush=True)
    T("export"); hm = next((k for k, v in states.items() if v.strip().lower() == "historicmoments"), None)
    if hm is not None:
        await exec_until(r, w, idx, "LuaEvents.EndGameMenu_OpenHistoricMoments(Controls.HistoricMoments); print('ok')", "ok", 5); time.sleep(0.4)
        last = None
        for k, v in enumerate((0.0, 0.25, 0.5, 0.75, 1.0)):
            await exec_until(r, w, hm, f"Controls.TimelineScroller:SetScrollValue({v}); print('ok')", "ok", 5); im, f = grab_changed(h, last, 0.15)
            if f != last: save(f"timeline_{k}", im); last = f
        await exec_until(r, w, hm, "Close(); print('ok')", "ok", 5)
    else: print("no HistoricMoments state; timeline screen skipped", flush=True)
    T("timeline"); [f.result() for f in futs]; T("encode")
    (out / "index.json").write_text(json.dumps({"tag": a.tag, "captured": time.strftime("%Y-%m-%dT%H:%M:%S"), "items": index}, indent=1))
    w.close(); print(f"done: {len(index)} images + data.json -> {out} in {time.time()-t0:.1f}s", flush=True)

asyncio.run(main())
