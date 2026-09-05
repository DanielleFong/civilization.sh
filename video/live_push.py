"""Push the live game frame + Astra's latest commentary to ladder.civilization.is/live every few seconds.
Frame: video/frames/latest.jpg (from capture.py), downscaled with ffmpeg. Commentary: newest agentMessage items
(phase=commentary) in ~/.local/state/civbench/codex/*/events.jsonl. Signed with ladder/.report-secret.
Usage: uv run python3 live_push.py [interval=4] [game_id] [model] [player]"""
import glob, hashlib, hmac, json, os, re, subprocess, sys, time, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
SEC = open(os.path.join(ROOT, "ladder", ".report-secret")).read().strip().encode()
INTERVAL = float(sys.argv[1]) if len(sys.argv) > 1 else 4.0
GAME_ID = sys.argv[2] if len(sys.argv) > 2 else "gpt6-astra-deity-live"
MODEL = sys.argv[3] if len(sys.argv) > 3 else "GPT-6 (Astra)"
PLAYER = sys.argv[4] if len(sys.argv) > 4 else "Astra via Codex · Peter the Great · Russia"
FRAME = os.path.join(HERE, "frames", "latest.jpg"); SMALL = "/tmp/live_small.jpg"
def newest_events():
    """The events log whose latest agentMessage is most recent (new empty Codex sessions must not win on mtime)."""
    best, best_t = None, -1
    for f in glob.glob(os.path.expanduser("~/.local/state/civbench/codex/*/events.jsonl")):
        t = -1
        for l in open(f, errors="ignore"):
            if '"agentMessage"' in l and '"item/completed"' in l:
                try: t = max(t, int(json.loads(l).get("emittedAtMs") or 0))
                except: pass
        if t > best_t: best, best_t = f, t
    return best
def commentary(path, n=6):
    msgs = []
    for l in open(path, errors="ignore"):
        try: d = json.loads(l)
        except: continue
        if d.get("method") != "item/completed": continue
        it = d.get("params", {}).get("item", {})
        if it.get("type") == "agentMessage" and it.get("text"): msgs.append((d.get("emittedAtMs"), it["text"].strip()))
    msgs = msgs[-n:]
    turn = None
    for _, t in reversed(msgs):
        m = re.search(r"\bTurn (\d+)", t)
        if m: turn = int(m.group(1)); break
    text = "\n\n".join(t.replace("**", "") for _, t in msgs)
    return text, turn, (msgs[-1][0] if msgs else None)
def frame_b64():
    if not os.path.exists(FRAME) or time.time() - os.path.getmtime(FRAME) > 30: return None
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", FRAME, "-vf", "scale=1600:-2", "-q:v", "6", SMALL], capture_output=True)
    if r.returncode != 0 or not os.path.exists(SMALL): return None
    import base64; return base64.b64encode(open(SMALL, "rb").read()).decode()
def post(payload):
    body = json.dumps(payload).encode(); sig = hmac.new(SEC, body, hashlib.sha256).hexdigest()
    req = urllib.request.Request("https://ladder.civilization.is/live", data=body, headers={"content-type": "application/json", "x-signature": sig, "user-agent": "civilization.sh live_push"})
    return json.loads(urllib.request.urlopen(req, timeout=20).read())
last_sig = None
while True:
    try:
        ev = newest_events(); text, turn, cts = commentary(ev) if ev else ("", None, None)
        fb = frame_b64()
        payload = {"game_id": GAME_ID, "model": MODEL, "player": PLAYER, "turn": turn, "title": f"{MODEL} · Deity · live", "commentary": text, "commentary_ts": cts, "frame_b64": fb}
        r = post(payload); print(time.strftime("%H:%M:%S"), "ok turn", turn, "frame", bool(fb), "commentary", len(text), flush=True)
    except Exception as e:
        print(time.strftime("%H:%M:%S"), "ERR", str(e)[:200], flush=True)
    time.sleep(INTERVAL)
