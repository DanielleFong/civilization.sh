"""Run Lua in any FireTuner state (works at main menu / setup). Usage: menu_lua.py "<lua>" [state_name_substring]"""
import asyncio, sys
sys.path.insert(0, r"C:\Users\danie\cc\civbench\civ6-mcp\src")
from civ_mcp.tuner_client import connect, handshake, execute_lua
async def main():
    code = sys.argv[1] if len(sys.argv) > 1 else "print('hi')"
    want = sys.argv[2] if len(sys.argv) > 2 else None
    r, w = await connect("127.0.0.1", 4318)
    ident, raw = await handshake(r, w)
    states = {}
    i = 0
    while i + 1 < len(raw):
        try: states[int(raw[i])] = raw[i+1]; i += 2
        except ValueError: i += 1
    print("identity:", ident); print("states:", states)
    for idx, name in states.items():
        if want and want.lower() not in name.lower(): continue
        try:
            res = await execute_lua(r, w, idx, code)
            print(f"[{idx} {name}] ->", res)
        except Exception as e:
            print(f"[{idx} {name}] ERR {e}")
    w.close()
asyncio.run(main())
