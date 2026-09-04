import asyncio, sys
sys.path.insert(0, r"C:\Users\danie\cc\civbench\civ6-mcp\src")
from civ_mcp.tuner_client import connect, handshake, execute_lua
async def one(port):
    try:
        r, w = await connect("127.0.0.1", port); _, raw = await handshake(r, w)
        st = {int(raw[i]): raw[i+1].strip() for i in range(0, len(raw)-1, 2) if raw[i].isdigit()}
        k = next((k for k, v in st.items() if v == "LoadScreen"), None)
        if k is None: print(port, "no LoadScreen state; have InGame:", any(v == "InGame" for v in st.values())); w.close(); return
        res = await execute_lua(r, w, k, 'Events.LoadScreenClose(); print("closed"); print("DT_DONE")'); print(port, str(res)[:60]); w.close()
    except Exception as e: print(port, "ERR", e)
async def main(): await asyncio.gather(*(one(p) for p in range(int(sys.argv[1]), int(sys.argv[2])+1)))
asyncio.run(main())
