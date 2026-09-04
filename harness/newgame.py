"""Start a headless new game on one instance via its tuner (MainMenu Lua state).
python newgame.py PORT [--observer] [--diff DIFFICULTY_PRINCE] [--size MAPSIZE_DUEL] [--map Pangaea.lua] [--speed GAMESPEED_ONLINE] [--turns 81] [--seed N]
Preset (human meta): Online speed, 81-turn limit, turn timer off (incl. BBG/CPL smart timer and draft timer), GS ruleset.
--observer converts the human slot to AI (SS_COMPUTER) and enables Automation auto-start so the leader screen is skipped.
Then waits for InGame and, with --observer, starts AutoplayManager for --turns turns."""
import asyncio, sys, argparse, time, re
sys.path.insert(0, r"C:\Users\danie\cc\civbench\civ6-mcp\src")
from civ_mcp.tuner_client import connect, handshake, execute_lua
ap = argparse.ArgumentParser(); ap.add_argument("port", type=int); ap.add_argument("--observer", action="store_true"); ap.add_argument("--diff", default="DIFFICULTY_PRINCE")
ap.add_argument("--size", default="MAPSIZE_DUEL"); ap.add_argument("--map", default="Pangaea.lua"); ap.add_argument("--speed", default="GAMESPEED_ONLINE"); ap.add_argument("--turns", type=int, default=81); ap.add_argument("--seed", type=int, default=None)
a = ap.parse_args()

import subprocess
def owner_ok(port):
    """Refuse unless the port is LISTENed by a CivilizationVI_iNN process (never the player's DX12 instance)."""
    if port == 4318: return False, "4318 is the player's instance"
    ps = f"$c = Get-NetTCPConnection -LocalPort {port} -State Listen -ErrorAction SilentlyContinue | select -First 1; if ($c) {{ (Get-Process -Id $c.OwningProcess).ProcessName + ' ' + $c.OwningProcess }} else {{ 'none' }}"
    out = subprocess.run(["powershell.exe", "-NoProfile", "-Command", ps], capture_output=True, text=True).stdout.strip()
    return out.startswith("CivilizationVI_i"), out
ok, who = owner_ok(a.port)
if not ok: print(f"REFUSED: port {a.port} owner = {who}"); sys.exit(2)
print(f"port {a.port} owner ok: {who}")
seed = f'GameConfiguration.SetValue("GAME_SYNC_RANDOM_SEED", {a.seed}); GameConfiguration.SetValue("MAP_SEED", {a.seed})' if a.seed is not None else ""
observer = '''local ids = GameConfiguration.GetHumanPlayerIDs(); for _, id in ipairs(ids) do PlayerConfigurations[id]:SetSlotStatus(SlotStatus.SS_COMPUTER) end
if Automation and Automation.SetAutoStartEnabled then Automation.SetAutoStartEnabled(true) end''' if a.observer else ""
LUA = f'''
GameConfiguration.SetToDefaults()
GameConfiguration.SetValue("RULESET", "RULESET_EXPANSION_2")
GameConfiguration.SetValue("MAP_SCRIPT", "{a.map}")
GameConfiguration.SetValue("MAP_SIZE", "{a.size}")
GameConfiguration.SetValue("GAME_HANDICAP", "{a.diff}")
GameConfiguration.SetValue("GAME_SPEED_TYPE", "{a.speed}")
GameConfiguration.SetValue("TURN_TIMER_TYPE", "TURNTIMER_NONE")
GameConfiguration.SetValue("CPL_SMARTTIMER", 0)
GameConfiguration.SetValue("DRAFT_TIMER", 0)
GameConfiguration.SetValue("GAME_TURN_LIMIT", "TURNLIMIT_CUSTOM")
GameConfiguration.SetValue("GAME_MAX_TURNS", {a.turns})
GameConfiguration.SetValue("CIVFLEET", 1)
{seed}
if BuildHeadlessGameSetup then BuildHeadlessGameSetup() end
if RebuildPlayerParameters then RebuildPlayerParameters(true) end
if GameSetup_RefreshParameters then GameSetup_RefreshParameters() end
{observer}
if ReleasePlayerParameters then ReleasePlayerParameters() end
if HideGameSetup then HideGameSetup() end
print("CFG "..tostring(GameConfiguration.GetValue("MAP_SCRIPT")).." "..tostring(GameConfiguration.GetValue("MAP_SIZE")).." "..tostring(GameConfiguration.GetValue("GAME_HANDICAP")).." "..tostring(GameConfiguration.GetValue("GAME_SPEED_TYPE")).." timer="..tostring(GameConfiguration.GetValue("TURN_TIMER_TYPE")).." max="..tostring(GameConfiguration.GetValue("GAME_MAX_TURNS")).." humans="..#GameConfiguration.GetHumanPlayerIDs())
Network.HostGame(ServerType.SERVER_TYPE_NONE)
print("HOSTED"); print("DT_DONE")'''
AUTOPLAY = f'AutoplayManager.SetTurns({a.turns}); AutoplayManager.SetReturnAsPlayer(-1); AutoplayManager.SetObserveAsPlayer(0); AutoplayManager.SetActive(true); print("AUTOPLAY "..tostring(AutoplayManager.IsActive())); print("DT_DONE")'
async def states(port):
    r, w = await connect("127.0.0.1", port); _, raw = await handshake(r, w)
    return r, w, {int(raw[i]): raw[i+1].strip() for i in range(0, len(raw)-1, 2) if raw[i].isdigit()}
async def main():
    r, w, st = await states(a.port); k = next((k for k, v in st.items() if v == "MainMenu"), None)
    if k is None: print("no MainMenu state; states:", list(st.values())[:10]); return
    try: print(str(await asyncio.wait_for(execute_lua(r, w, k, LUA), 20))[:300], flush=True)
    except asyncio.TimeoutError: print("host sent (menu state went away)", flush=True)
    w.close(); t0 = time.time()
    while time.time() - t0 < 300:
        await asyncio.sleep(5)
        try:
            r, w, st = await states(a.port); k = next((k for k, v in st.items() if v == "InGame"), None)
            if k is not None:
                res = str(await asyncio.wait_for(execute_lua(r, w, k, 'print("TURN "..Game.GetCurrentGameTurn().." local "..Game.GetLocalPlayer()); print("DT_DONE")'), 20)); print(f"in-game after {time.time()-t0:.0f}s: {res.strip()[:80]}", flush=True)
                if a.observer: print(str(await asyncio.wait_for(execute_lua(r, w, k, AUTOPLAY), 20)).strip()[:80], flush=True)
                w.close(); return
            w.close()
        except Exception: pass
    print("no InGame within 300s")
asyncio.run(main())
