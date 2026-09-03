-- Full map dump for the state viewer (gamecore context). Prints one JSON line per row of plots
-- plus a header/footer. Run via run_lua after loading the savegame; capture print() output to
-- frames/state/full_T<turn>.jsonl. Fields per plot: terrain, feature, hills, river, coastal,
-- resource, owner, district, improvement, pillaged, route, water, appeal, cityId, visible[pid...]
local W,H = Map.GetGridSize()
local me = Game.GetLocalPlayer()
local majors = {}
for i=0,63 do local p=Players[i]; if p and p:IsAlive() and p:IsMajor() then majors[#majors+1]=i end end
print(string.format('{"hdr":1,"turn":%d,"W":%d,"H":%d,"majors":[%s]}', Game.GetCurrentGameTurn(), W, H, table.concat(majors, ",")))
for y=0,H-1 do
  local row = {}
  for x=0,W-1 do
    local p = Map.GetPlot(x,y)
    local d = p:GetDistrictType(); local imp = p:GetImprovementType(); local r = p:GetRouteType()
    local vis = {}
    for _,pid in ipairs(majors) do vis[#vis+1] = PlayersVisibility[pid]:IsRevealed(x,y) and 1 or 0 end
    local dpill = 0; if d >= 0 then local dd = CityManager.GetDistrictAt and CityManager.GetDistrictAt(x,y); if dd and dd:IsPillaged() then dpill = 1 end end
    row[#row+1] = string.format('[%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%s]',
      p:GetTerrainType(), p:GetFeatureType(), p:IsHills() and 1 or 0, p:IsRiver() and 1 or 0, p:IsCoastalLand() and 1 or 0,
      p:GetResourceType(), p:GetOwner(), d, imp, (p:IsImprovementPillaged() and 1 or 0) + dpill*2, r, p:IsWater() and 1 or 0,
      p:GetAppeal and p:GetAppeal() or 0, table.concat(vis, ","))
  end
  print('{"y":'..y..',"p":['..table.concat(row, ",")..']}')
end
-- units
local units = {}
for i=0,63 do local pl=Players[i]; if pl and pl:IsAlive() then for _,u in pl:GetUnits():Members() do units[#units+1]=string.format('[%d,%d,%d,"%s",%d]', i, u:GetX(), u:GetY(), GameInfo.Units[u:GetType()].UnitType, u:GetDamage()) end end end
print('{"units":['..table.concat(units, ",")..']}')
-- cities with districts
local cities = {}
for i=0,63 do local pl=Players[i]; if pl and pl:IsAlive() then for _,c in pl:GetCities():Members() do
  local ds = {}; for _,dd in c:GetDistricts():Members() do ds[#ds+1]=string.format('["%s",%d,%d,%d]', GameInfo.Districts[dd:GetType()].DistrictType, dd:GetX(), dd:GetY(), dd:IsPillaged() and 1 or 0) end
  cities[#cities+1]=string.format('{"pid":%d,"x":%d,"y":%d,"pop":%d,"name":"%s","d":[%s]}', i, c:GetX(), c:GetY(), c:GetPopulation(), Locale.Lookup(c:GetName()), table.concat(ds, ","))
end end end
print('{"cities":['..table.concat(cities, ",")..']}')
print('{"end":1}')
