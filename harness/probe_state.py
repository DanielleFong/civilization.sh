import sys, asyncio; sys.path.insert(0, r"C:\Users\danie\cc\civbench\civ6-mcp\src")
from civ_mcp.tuner_client import *
async def m():
    r,w=await connect("127.0.0.1",4318); ident,raw=await handshake(r,w); await drain_messages(r,0.2)
    st={int(raw[i]):raw[i+1] for i in range(0,len(raw)-1,2) if raw[i].isdigit()}; names=sorted(st.values())
    print("states:", [n for n in names if n in ("InGame","EndGameMenu","Main State","LoadScreen")])
    idx=next((k for k,v in st.items() if v.strip().lower()=="ingame"),None)
    if idx is not None:
        await send_message(w,TAG_COMMAND,f"CMD:{idx}:print('warm')"); await recv_message_timeout(r,3)
        await send_message(w,TAG_COMMAND,f"CMD:{idx}:local me=Game.GetLocalPlayer(); print('STATE turn='..Game.GetCurrentGameTurn()..' civ='..PlayerConfigurations[me]:GetCivilizationTypeName()..' cities='..Players[me]:GetCities():GetCount()..' score='..Players[me]:GetScore()..' over='..tostring(Game.GetGameEndTurn and false))")
        m=await recv_message_timeout(r,5); print(m.payload if m else None)
    w.close()
asyncio.run(m())
