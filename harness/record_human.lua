-- Passive human-play recorder. Read-only. Run in the InGame tuner state.
-- Prints ONE line: HUMAN {json}. Each section is guarded; failures land in "errs".
local function esc(s) return (tostring(s or ""):gsub('\\','\\\\'):gsub('"','\\"'):gsub('\n',' ')) end
local function J(t) return table.concat(t, ",") end
local function S(s) return '"' .. esc(s) .. '"' end
local errs = {}
local function try(name, f) local ok, e = pcall(f); if not ok then errs[#errs+1] = S(name .. ": " .. tostring(e)) end end
local hashName = {}
for u in GameInfo.Units() do hashName[u.Hash] = u.UnitType end
for b in GameInfo.Buildings() do hashName[b.Hash] = b.BuildingType end
for d in GameInfo.Districts() do hashName[d.Hash] = d.DistrictType end
for p in GameInfo.Projects() do hashName[p.Hash] = p.ProjectType end
local me = Game.GetLocalPlayer()
local P = Players[me]
local turn = Game.GetCurrentGameTurn()
local civ = PlayerConfigurations[me]:GetCivilizationTypeName()
local out = {}
out[#out+1] = string.format('"turn":%d,"pid":%d,"civ":"%s"', turn, me, esc(civ))

-- empire ----------------------------------------------------------------
local T, C = P:GetTechs(), P:GetCulture()
try("empire", function()
  local tr, cv = "NONE", "NONE"
  local i = T:GetResearchingTech(); if i and i >= 0 then tr = GameInfo.Technologies[i].TechnologyType end
  local j = C:GetProgressingCivic(); if j and j >= 0 then cv = GameInfo.Civics[j].CivicType end
  local gov = "NONE"; local g = C:GetCurrentGovernment(); if g and g >= 0 then gov = GameInfo.Governments[g].GovernmentType end
  local pol = {}
  for s = 0, C:GetNumPolicySlots()-1 do local k = C:GetSlotPolicy(s); pol[#pol+1] = S(k >= 0 and GameInfo.Policies[k].PolicyType or "EMPTY") end
  local tre, rel = P:GetTreasury(), P:GetReligion()
  local tp, cp = -1, -1; pcall(function() tp = T:GetResearchProgress(i) end); pcall(function() cp = C:GetCulturalProgress(j) end)
  out[#out+1] = string.format('"gold":%.0f,"gold_pt":%.1f,"faith":%.0f,"faith_pt":%.1f,"sci_pt":%.1f,"cul_pt":%.1f,"score":%d,"tech":"%s","tech_progress":%.0f,"civic":"%s","civic_progress":%.0f,"gov":"%s","policies":[%s]',
    tre:GetGoldBalance(), tre:GetGoldYield(), rel:GetFaithBalance(), rel:GetFaithYield(), T:GetScienceYield(), C:GetCultureYield(), P:GetScore(), tr, tp, cv, cp, gov, J(pol))
end)
try("known", function()
  local kt, kc = {}, {}
  for row in GameInfo.Technologies() do if T:HasTech(row.Index) then kt[#kt+1] = S((row.TechnologyType:gsub("TECH_",""))) end end
  for row in GameInfo.Civics() do if C:HasCivic(row.Index) then kc[#kc+1] = S((row.CivicType:gsub("CIVIC_",""))) end end
  out[#out+1] = '"techs":[' .. J(kt) .. '],"civics":[' .. J(kc) .. ']'
end)

-- era / ages ---------------------------------------------------------------
try("era", function()
  local E = Game.GetEras()
  local age = "NORMAL"; if E:HasGoldenAge(me) then age = "GOLDEN" elseif E:HasDarkAge(me) then age = "DARK" end
  local ded = {}
  pcall(function() for _, k in ipairs(E:GetPlayerActiveCommemorations(me)) do ded[#ded+1] = S((GameInfo.CommemorationTypes[k].CommemorationType:gsub("COMMEMORATION_",""))) end end)
  local gth, dth = -1, -1; pcall(function() gth = E:GetPlayerThresholdGoldenAge(me) end); pcall(function() dth = E:GetPlayerThresholdDarkAge(me) end)
  local eraName = "?"; pcall(function() eraName = GameInfo.Eras[E:GetCurrentEra()].EraType:gsub("ERA_","") end)
  local turnsLeft = -1; pcall(function() turnsLeft = E:GetNextEraCountdown() end)
  out[#out+1] = string.format('"era":{"name":"%s","age":"%s","score":%d,"golden_at":%d,"dark_at":%d,"turns_left":%d,"dedications":[%s]}', eraName, age, E:GetPlayerCurrentScore(me), gth, dth, turnsLeft, J(ded))
end)

-- religion -----------------------------------------------------------------
try("religion", function()
  local R = P:GetReligion()
  local pan = "NONE"; local pi = R:GetPantheon(); if pi and pi >= 0 then pan = GameInfo.Beliefs[pi].BeliefType:gsub("BELIEF_","") end
  local relT = "NONE"; local ri = R:GetReligionTypeCreated(); if ri and ri > 0 then relT = GameInfo.Religions[ri].ReligionType:gsub("RELIGION_","") end
  local beliefs = {}
  if ri and ri > 0 then
    pcall(function() for _, b in ipairs(Game.GetReligion():GetBeliefsInReligion(ri)) do beliefs[#beliefs+1] = S((GameInfo.Beliefs[b].BeliefType:gsub("BELIEF_",""))) end end)
    if #beliefs == 0 then pcall(function() for _, rel in ipairs(Game.GetReligion():GetReligions()) do if rel.Religion == ri then for _, b in ipairs(rel.Beliefs) do beliefs[#beliefs+1] = S((GameInfo.Beliefs[b].BeliefType:gsub("BELIEF_",""))) end end end end) end
  end
  out[#out+1] = string.format('"religion":{"pantheon":"%s","founded":"%s","beliefs":[%s]}', pan, relT, J(beliefs))
end)

-- governors ----------------------------------------------------------------
try("governors", function()
  local G = P:GetGovernors()
  local govs = {}
  local list = nil
  pcall(function() local l = G:GetGovernorList(); if type(l) == "table" then list = l end end)
  if not list then
    list = {}
    for row in GameInfo.Governors() do
      local has = false; pcall(function() has = G:HasGovernor(row.Index) end)
      if has then local gv = nil; pcall(function() gv = G:GetGovernor(row.Index) end); if gv then list[#list+1] = gv end end
    end
  end
  for _, gv in ipairs(list) do
    local def = GameInfo.Governors[gv:GetType()]
    local city = nil; pcall(function() city = gv:GetAssignedCity() end)
    local promos = {}
    for row in GameInfo.GovernorPromotions() do pcall(function() if gv:HasPromotion(row.Index) then promos[#promos+1] = S((row.GovernorPromotionType:gsub("GOVERNOR_PROMOTION_",""))) end end) end
    local est = false; pcall(function() est = gv:IsEstablished() end)
    govs[#govs+1] = string.format('{"g":"%s","city":"%s","established":%s,"promos":[%s]}', (def.GovernorType:gsub("GOVERNOR_","")), city and esc(Locale.Lookup(city:GetName())) or "", tostring(est), J(promos))
  end
  local pts, spent = -1, -1; pcall(function() pts = G:GetGovernorPoints() end); pcall(function() spent = G:GetGovernorPointsSpent() end)
  out[#out+1] = string.format('"governor_points":%d,"governor_points_spent":%d,"governors":[%s]', pts, spent, J(govs))
end)

-- cities + tiles -----------------------------------------------------------
local cities = {}
try("cities", function()
  local CP = Map.GetCityPlots()
  for _, c in P:GetCities():Members() do
    local bq = c:GetBuildQueue()
    local q = {}
    pcall(function()
      for i = 0, bq:GetSize()-1 do
        local e = bq:GetAt(i); local nm
        if type(e) == "table" then
          if e.UnitType and e.UnitType >= 0 and e.Directive == 0 then local r = GameInfo.Units[e.UnitType]; nm = r and r.UnitType
          elseif e.BuildingType and e.BuildingType >= 0 then local r = GameInfo.Buildings[e.BuildingType]; nm = r and r.BuildingType
          elseif e.DistrictType and e.DistrictType >= 0 then local r = GameInfo.Districts[e.DistrictType]; nm = r and r.DistrictType
            if nm and type(e.Location) == "table" and e.Location.x then nm = nm .. "@" .. tostring(e.Location.x) .. "," .. tostring(e.Location.y) end
          elseif e.ProjectType and e.ProjectType >= 0 then local r = GameInfo.Projects[e.ProjectType]; nm = r and r.ProjectType end
          if not nm then nm = hashName[e.Hash or -1] end
        end
        if not nm and i == 0 then nm = hashName[bq:GetCurrentProductionTypeHash()] end
        q[#q+1] = S(nm or "UNKNOWN")
      end
    end)
    if #q == 0 then pcall(function() local h = bq:GetCurrentProductionTypeHash(); if h and h ~= 0 then q[1] = S(hashName[h] or "UNKNOWN") end end) end
    local prog, cost, tl = -1, -1, -1
    pcall(function() tl = bq:GetTurnsLeft() end)
    pcall(function()
      local h = bq:GetCurrentProductionTypeHash()
      if h and h ~= 0 then
        local nm = hashName[h]
        if nm then
          if nm:find("^UNIT_") then local r = GameInfo.Units[nm]; prog = bq:GetUnitProgress(r.Index); cost = bq:GetUnitCost(r.Index)
          elseif nm:find("^BUILDING_") then local r = GameInfo.Buildings[nm]; prog = bq:GetBuildingProgress(r.Index); cost = bq:GetBuildingCost(r.Index)
          elseif nm:find("^DISTRICT_") then local r = GameInfo.Districts[nm]; prog = bq:GetDistrictProgress(r.Index); cost = bq:GetDistrictCost(r.Index)
          elseif nm:find("^PROJECT_") then local r = GameInfo.Projects[nm]; prog = bq:GetProjectProgress(r.Index); cost = bq:GetProjectCost(r.Index) end
        end
      end
    end)
    local ds = {}
    for _, d in c:GetDistricts():Members() do
      local info = GameInfo.Districts[d:GetType()]
      if info and info.DistrictType ~= "DISTRICT_CITY_CENTER" then
        ds[#ds+1] = string.format('{"t":"%s","x":%d,"y":%d,"done":%s,"pillaged":%s}', (info.DistrictType:gsub("DISTRICT_","")), d:GetX(), d:GetY(), tostring(d:IsComplete()), tostring(d:IsPillaged()))
      end
    end
    local bl, wl = {}, {}
    for row in GameInfo.Buildings() do if c:GetBuildings():HasBuilding(row.Index) then
      local nm = S((row.BuildingType:gsub("BUILDING_","")))
      if row.IsWonder then wl[#wl+1] = nm else bl[#bl+1] = nm end end end
    local g = c:GetGrowth()
    local y = {}
    for k = 0, 5 do local v = 0; pcall(function() v = c:GetYield(k) end); y[#y+1] = string.format("%.1f", v) end
    -- tiles: owned plots with feature / improvement / resource / worked
    local tiles = {}
    pcall(function()
      local cz = c:GetCitizens()
      for _, pi in ipairs(CP:GetPurchasedPlots(c)) do
        local pl = Map.GetPlotByIndex(pi)
        local f, im, rs = pl:GetFeatureType(), pl:GetImprovementType(), pl:GetResourceType()
        local wk = false; pcall(function() wk = pl:GetWorkerCount() > 0 end); if not wk then pcall(function() wk = cz:IsPlotWorked(pi) end) end
        local pill = false; pcall(function() pill = pl:IsImprovementPillaged() end)
        tiles[#tiles+1] = string.format('[%d,%d,"%s","%s","%s",%s%s]', pl:GetX(), pl:GetY(),
          f >= 0 and (GameInfo.Features[f].FeatureType:gsub("FEATURE_","")) or "",
          im >= 0 and (GameInfo.Improvements[im].ImprovementType:gsub("IMPROVEMENT_","")) or "",
          rs >= 0 and (GameInfo.Resources[rs].ResourceType:gsub("RESOURCE_","")) or "",
          wk and 1 or 0, pill and ',"PILLAGED"' or "")
      end
    end)
    local loy, loyPT = -1, 0; pcall(function() loy = c:GetCulturalIdentity():GetLoyalty(); loyPT = c:GetCulturalIdentity():GetLoyaltyPerTurn() end)
    cities[#cities+1] = string.format('{"n":"%s","id":%d,"x":%d,"y":%d,"pop":%d,"yields":[%s],"housing":%.1f,"amen":%d,"grow":%d,"loyalty":%.0f,"loyalty_pt":%.1f,"queue":[%s],"prod_progress":%.0f,"prod_cost":%.0f,"turns_left":%d,"districts":[%s],"buildings":[%s],"wonders":[%s],"tiles":[%s]}',
      esc(Locale.Lookup(c:GetName())), c:GetID(), c:GetX(), c:GetY(), c:GetPopulation(), J(y), g:GetHousing(), g:GetAmenities(), g:GetTurnsUntilGrowth(), loy, loyPT, J(q), prog, cost, tl, J(ds), J(bl), J(wl), J(tiles))
  end
end)
out[#out+1] = '"cities":[' .. J(cities) .. ']'

-- units (mine) -------------------------------------------------------------
try("units", function()
  local units = {}
  for _, u in P:GetUnits():Members() do
    local ui = GameInfo.Units[u:GetType()]
    local ch = -1; pcall(function() ch = u:GetBuildCharges() end)
    units[#units+1] = string.format('{"id":%d,"t":"%s","x":%d,"y":%d,"hp":%d,"mv":%d,"charges":%d}', u:GetID(), ((ui and ui.UnitType or "?"):gsub("UNIT_","")), u:GetX(), u:GetY(), u:GetMaxDamage() - u:GetDamage(), u:GetMovesRemaining(), ch)
  end
  out[#out+1] = '"units":[' .. J(units) .. ']'
end)

-- trade routes -------------------------------------------------------------
try("trade", function()
  local TR = P:GetTrade()
  local routes = {}
  local list = {}
  for _, c in P:GetCities():Members() do
    pcall(function() for _, r in ipairs(c:GetTrade():GetOutgoingRoutes()) do list[#list+1] = r end end)
  end
  for _, r in ipairs(list) do
    local ocid = r.OriginCityID or r.OriginCity or -1
    local dpid = r.DestinationCityPlayer or r.DestinationPlayer or -1
    local dcid = r.DestinationCityID or r.DestinationCity or -1
    local oc = P:GetCities():FindID(ocid)
    local dp = Players[dpid]; local dc = dp and dp:GetCities():FindID(dcid)
    local keys = {}; for k, v in pairs(r) do if type(v) ~= "table" then keys[#keys+1] = tostring(k) .. "=" .. tostring(v) end end
    routes[#routes+1] = string.format('{"from":"%s","to":"%s","to_pid":%d,"raw":"%s"}', oc and esc(Locale.Lookup(oc:GetName())) or "?", dc and esc(Locale.Lookup(dc:GetName())) or "?", dpid, esc(table.concat(keys, ";")))
  end
  local cap, n = -1, -1; pcall(function() cap = TR:GetOutgoingRouteCapacity() end); pcall(function() n = TR:GetNumOutgoingRoutes() end)
  out[#out+1] = string.format('"trade":{"capacity":%d,"active":%d,"routes":[%s]}', cap, n, J(routes))
end)

-- great people -------------------------------------------------------------
try("great_people", function()
  local GP = Game.GetGreatPeople()
  local pts = {}
  for cls in GameInfo.GreatPersonClasses() do
    local tot, pt = 0, 0
    pcall(function() local pp = P:GetGreatPeoplePoints(); tot = pp:GetPointsTotal(cls.Index); pt = pp:GetPointsPerTurn(cls.Index) end)
    if tot == 0 and pt == 0 then pcall(function() tot = GP:GetPointsTotal(me, cls.Index); pt = GP:GetPointsPerTurn(me, cls.Index) end) end
    if tot > 0 or pt > 0 then pts[#pts+1] = string.format('{"c":"%s","pts":%d,"pt":%d}', (cls.GreatPersonClassType:gsub("GREAT_PERSON_CLASS_","")), tot, pt) end
  end
  local avail = {}
  pcall(function()
    for _, e in ipairs(GP:GetTimeline()) do
      if e.Claimant == nil or e.Claimant < 0 then
        local ind = GameInfo.GreatPersonIndividuals[e.Individual]
        avail[#avail+1] = string.format('{"who":"%s","cls":"%s","cost":%d}', ind and esc(Locale.Lookup(ind.Name)) or "?", (GameInfo.GreatPersonClasses[e.Class].GreatPersonClassType:gsub("GREAT_PERSON_CLASS_","")), e.Cost or -1)
      end
    end
  end)
  out[#out+1] = string.format('"great_people":{"points":[%s],"available":[%s]}', J(pts), J(avail))
end)

-- diplomacy + city-states ---------------------------------------------------
try("diplomacy", function()
  local D = P:GetDiplomacy()
  local dip = {}
  for _, p in ipairs(PlayerManager.GetAliveMajors()) do
    local pid = p:GetID()
    if pid ~= me then
      local met = D:HasMet(pid)
      local st = "UNMET"
      if met then pcall(function() st = GameInfo.DiplomaticStates[P:GetDiplomaticAI():GetDiplomaticStateIndex(pid)].StateType:gsub("DIPLO_STATE_","") end) end
      local war = false; pcall(function() war = D:IsAtWarWith(pid) end)
      local del, emb = false, false; pcall(function() del = D:HasDelegationAt(pid); emb = D:HasEmbassyAt(pid) end)
      dip[#dip+1] = string.format('{"pid":%d,"civ":"%s","state":"%s","war":%s,"delegation":%s,"embassy":%s}', pid, esc((PlayerConfigurations[pid]:GetCivilizationTypeName():gsub("CIVILIZATION_",""))), st, tostring(war), tostring(del), tostring(emb))
    end
  end
  local cs = {}
  for _, p in ipairs(PlayerManager.GetAliveMinors()) do
    local pid = p:GetID()
    local inf = p:GetInfluence()
    local tok, suz = 0, -1
    pcall(function() tok = inf:GetTokensReceived(me); suz = inf:GetSuzerain() end)
    local met = false; pcall(function() met = D:HasMet(pid) end)
    if met then cs[#cs+1] = string.format('{"pid":%d,"cs":"%s","envoys":%d,"suzerain":%d}', pid, esc((PlayerConfigurations[pid]:GetCivilizationTypeName():gsub("CIVILIZATION_",""))), tok, suz) end
  end
  local spare = -1; pcall(function() spare = P:GetInfluence():GetTokensToGive() end)
  out[#out+1] = string.format('"diplomacy":[%s],"city_states":[%s],"envoys_spare":%d', J(dip), J(cs), spare)
end)

-- rivals (omniscient: benchmark comparison only; never shown to the player) --
try("rivals", function()
  local others = {}
  for _, p in ipairs(PlayerManager.GetAliveMajors()) do
    local pid = p:GetID()
    if pid ~= me then
      local nc, nd, pop = 0, 0, 0
      local wl = {}
      for _, c in p:GetCities():Members() do
        nc = nc + 1; pop = pop + c:GetPopulation()
        for _, d in c:GetDistricts():Members() do if d:IsComplete() then nd = nd + 1 end end
        for row in GameInfo.Buildings() do if row.IsWonder and c:GetBuildings():HasBuilding(row.Index) then wl[#wl+1] = S((row.BuildingType:gsub("BUILDING_",""))) end end
      end
      nd = nd - nc
      local sci, cul, mil = 0, 0, -1
      pcall(function() sci = p:GetTechs():GetScienceYield(); cul = p:GetCulture():GetCultureYield() end)
      pcall(function() mil = p:GetStats():GetMilitaryStrength() end)
      local nt = 0; pcall(function() for row in GameInfo.Technologies() do if p:GetTechs():HasTech(row.Index) then nt = nt + 1 end end end)
      others[#others+1] = string.format('{"pid":%d,"civ":"%s","score":%d,"cities":%d,"pop":%d,"districts":%d,"techs":%d,"sci_pt":%.1f,"cul_pt":%.1f,"mil":%d,"wonders":[%s]}',
        pid, esc((PlayerConfigurations[pid]:GetCivilizationTypeName():gsub("CIVILIZATION_",""))), p:GetScore(), nc, pop, nd, nt, sci, cul, mil, J(wl))
    end
  end
  out[#out+1] = '"rivals":[' .. J(others) .. ']'
end)
-- rival + barbarian units (omniscient threat map)
try("rival_units", function()
  local ru = {}
  for pid = 0, 63 do
    local p = Players[pid]
    if p and pid ~= me and p:IsAlive() then
      for _, u in p:GetUnits():Members() do
        local ui = GameInfo.Units[u:GetType()]
        if ui and ui.Combat and ui.Combat > 0 or (ui and ui.RangedCombat and ui.RangedCombat > 0) then
          ru[#ru+1] = string.format('[%d,"%s",%d,%d]', pid, ((ui.UnitType):gsub("UNIT_","")), u:GetX(), u:GetY())
        end
      end
    end
  end
  out[#out+1] = '"rival_units":[' .. J(ru) .. ']'
end)

-- map pins ------------------------------------------------------------------
try("pins", function()
  local pins = {}
  for _, pin in pairs(PlayerConfigurations[me]:GetMapPins()) do
    pins[#pins+1] = string.format('{"x":%d,"y":%d,"icon":"%s","name":"%s"}', pin:GetHexX(), pin:GetHexY(), esc(pin:GetIconName()), esc(pin:GetName()))
  end
  out[#out+1] = '"pins":[' .. J(pins) .. ']'
end)

out[#out+1] = '"errs":[' .. J(errs) .. ']'
print("HUMAN {" .. J(out) .. "}")
