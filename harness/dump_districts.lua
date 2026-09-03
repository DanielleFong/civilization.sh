-- Dump every city's districts (all players) as one JSON line. Run in the InGame tuner state.
local out = {}
local turn = Game.GetCurrentGameTurn()
for _, p in ipairs(PlayerManager.GetAliveMajors()) do
  local pid = p:GetID()
  local civ = PlayerConfigurations[pid]:GetCivilizationTypeName()
  for _, city in p:GetCities():Members() do
    local ds = {}
    for _, d in city:GetDistricts():Members() do
      local info = GameInfo.Districts[d:GetType()]
      if info and info.DistrictType ~= "DISTRICT_CITY_CENTER" then
        ds[#ds+1] = string.format('{"t":"%s","pillaged":%s,"complete":%s}', info.DistrictType, tostring(d:IsPillaged()), tostring(d:IsComplete()))
      end
    end
    local bcount = 0
    for row in GameInfo.Buildings() do if city:GetBuildings():HasBuilding(row.Index) then bcount = bcount + 1 end end
    out[#out+1] = string.format('{"pid":%d,"civ":"%s","city":"%s","pop":%d,"x":%d,"y":%d,"buildings":%d,"districts":[%s]}',
      pid, civ, Locale.Lookup(city:GetName()), city:GetPopulation(), city:GetX(), city:GetY(), bcount, table.concat(ds, ","))
  end
end
print('DISTRICTS {"turn":' .. turn .. ',"cities":[' .. table.concat(out, ",") .. ']}')
