"""Full-map dump straight from the FireTuner socket to a file — nothing through an LLM context.
Usage (game running, save loaded): python dump_full_map.py [outdir]
Writes <outdir>/full_T<turn>.json with per-plot owner/district/improvement/pillaged/route/water,
per-major visibility bits, all cities with districts (+wonder type), and all units."""
import asyncio, json, pathlib, re, sys
sys.path.insert(0, r"C:\Users\danie\cc\civbench\civ6-mcp\src")
from civ_mcp.tuner_client import connect, handshake, execute_lua
HERE = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE.parent / "video" / "frames" / "state"
ROWS = r'''
local W,H=Map.GetGridSize(); local majors={}; for i=0,63 do local p=Players[i]; if p and p:IsAlive() and p:IsMajor() then majors[#majors+1]=i end end
for y=%d,%d do local row={}; for x=0,W-1 do local p=Map.GetPlot(x,y); local vis={}; for _,pid in ipairs(majors) do vis[#vis+1]=PlayersVisibility[pid]:IsRevealed(x,y) and 1 or 0 end
 row[#row+1]=string.format('[%%d,%%d,%%d,%%d,%%d,%%d,"%%s"]',p:GetOwner(),p:GetDistrictType(),p:GetImprovementType(),p:IsImprovementPillaged() and 1 or 0,p:GetRouteType(),p:IsWater() and 1 or 0,table.concat(vis,"")) end
 print('ROW '..y..' ['..table.concat(row,",")..']') end
print('MAJORS ['..table.concat(majors,",")..'] W '..W..' H '..H..' TURN '..Game.GetCurrentGameTurn())'''
CITIES = r'''
local cities={}; for i=0,63 do local pl=Players[i]; if pl and pl:IsAlive() then for _,c in pl:GetCities():Members() do local ds={}
 for _,dd in c:GetDistricts():Members() do local dt=GameInfo.Districts[dd:GetType()].DistrictType; local wn=""; if dt=="DISTRICT_WONDER" then local ok,wt=pcall(function() return Map.GetPlot(dd:GetX(),dd:GetY()):GetWonderType() end); if ok and wt and wt>=0 then wn=GameInfo.Buildings[wt].BuildingType end end
  local pil=0; pcall(function() if dd:IsPillaged() then pil=1 end end); ds[#ds+1]=string.format('["%s",%d,%d,%d,"%s"]',dt,dd:GetX(),dd:GetY(),pil,wn) end
 local nm=""; pcall(function() nm=Locale.Lookup(c:GetName()) end); nm=nm:gsub('"','')
 cities[#cities+1]=string.format('{"pid":%d,"x":%d,"y":%d,"pop":%d,"name":"%s","d":[%s]}',i,c:GetX(),c:GetY(),c:GetPopulation(),nm,table.concat(ds,",")) end end end
print('CITIES ['..table.concat(cities,",")..']')
local units={}; for i=0,63 do local pl=Players[i]; if pl and pl:IsAlive() then for _,u in pl:GetUnits():Members() do local dmg=0; pcall(function() dmg=u:GetDamage() end); units[#units+1]=string.format('[%d,%d,%d,"%s",%d]',i,u:GetX(),u:GetY(),GameInfo.Units[u:GetType()].UnitType,dmg) end end end
print('UNITS ['..table.concat(units,",")..']')'''
async def main():
    r, w = await connect("127.0.0.1", 4318); _, raw = await handshake(r, w)
    states = {int(raw[i]): raw[i+1] for i in range(0, len(raw)-1, 2) if raw[i].isdigit()}
    ingame = next((k for k, v in states.items() if v.strip().lower() == "ingame"), None)
    if ingame is None: sys.exit(f"no InGame state; states={states}")
    plots = {}; meta = {}
    for y0 in range(0, 64, 8):
        res = str(await execute_lua(r, w, ingame, ROWS % (y0, min(63, y0 + 7))))
        for m in re.finditer(r"ROW (\d+) (\[.*?\])\s*$", res, re.M): plots[int(m.group(1))] = json.loads(m.group(2))
        mm = re.search(r"MAJORS (\[[\d,]*\]) W (\d+) H (\d+) TURN (\d+)", res)
        if mm: meta = {"majors": json.loads(mm.group(1)), "W": int(mm.group(2)), "H": int(mm.group(3)), "turn": int(mm.group(4))}
    res = str(await execute_lua(r, w, ingame, CITIES)); w.close()
    cities = json.loads(re.search(r"CITIES (\[.*\])\s*UNITS", res, re.S).group(1))
    units = json.loads(re.search(r"UNITS (\[.*\])", res, re.S).group(1))
    H = meta.get("H", len(plots)); W = meta.get("W", 0)
    out = {"turn": meta.get("turn"), "W": W, "H": H, "majors": meta.get("majors"), "fields": ["owner","district","improvement","pillaged","route","water","vis"],
           "plots": [plots[y] for y in range(H)], "cities": cities, "units": units}
    OUT.mkdir(parents=True, exist_ok=True); p = OUT / f"full_T{out['turn']:04d}.json"; p.write_text(json.dumps(out, separators=(",", ":")))
    nd = sum(len(c["d"]) for c in cities); print(f"T{out['turn']}: {W}x{H} plots, {len(cities)} cities, {nd} districts, {len(units)} units -> {p} ({p.stat().st_size//1024} KB)")
asyncio.run(main())
