-- dump_turn.lua — per-turn full state for the civilization.is replay viewer (LIG-990).
-- Runs in the InGame (UI) Lua state via FireTuner. Sections are selected by DT_SECTION.
-- Every line printed is `KEY <json>`; dump_turn.py assembles them into turns/T<n>.json.
-- pcall everywhere: a missing API on one field must never kill a section.
local S = DT_SECTION or "meta"
local function esc(v) local r = v:gsub('[%c"\\]', function(c) return string.format("\\u%04x", c:byte()) end) return r end
local function J(v)
  local t = type(v)
  if t == "number" then if v ~= v or v == math.huge or v == -math.huge then return "null" end if math.floor(v) == v then return string.format("%d", v) end return string.format("%.2f", v) end
  if t == "string" then return '"' .. esc(v) .. '"' end
  if t == "boolean" then return v and "true" or "false" end
  if t == "table" then
    local o = {}
    if #v > 0 or next(v) == nil then for i = 1, #v do o[i] = J(v[i]) end return "[" .. table.concat(o, ",") .. "]" end
    for k, x in pairs(v) do o[#o + 1] = '"' .. tostring(k) .. '":' .. J(x) end
    return "{" .. table.concat(o, ",") .. "}"
  end
  return "null"
end
local function try(f, d) local ok, r = pcall(f) if ok and r ~= nil then return r end return d end
local function majors() local m = {} for i = 0, 63 do local p = Players[i] if p and p:IsAlive() and p:IsMajor() then m[#m + 1] = i end end return m end
local function alive() local m = {} for i = 0, 63 do local p = Players[i] if p and p:IsAlive() and not p:IsBarbarian() then m[#m + 1] = i end end return m end

if S == "meta" then
  local W, H = Map.GetGridSize()
  local ps = {}
  for _, i in ipairs(alive()) do
    local c = PlayerConfigurations[i]
    ps[#ps + 1] = { pid = i, civ = try(function() return c:GetCivilizationTypeName() end, ""), leader = try(function() return c:GetLeaderTypeName() end, ""),
      name = try(function() return Locale.Lookup(c:GetCivilizationShortDescription()) end, ""), major = Players[i]:IsMajor(), team = try(function() return Players[i]:GetTeam() end, i) }
  end
  print("META " .. J({ turn = Game.GetCurrentGameTurn(), W = W, H = H, era = try(function() return Game.GetEras():GetCurrentEra() end, -1), majors = majors(), players = ps }))
end

-- Per-player empire state: techs, civics, boosts, research, government, policies, GP points, era score, victory stats.
if S == "players" then
  local ge = Game.GetEras()
  for _, i in ipairs(majors()) do
    local p = Players[i]
    local te, cu = p:GetTechs(), p:GetCulture()
    local techs, boosts = {}, {}
    for row in GameInfo.Technologies() do
      if try(function() return te:HasTech(row.Index) end, false) then techs[#techs + 1] = row.Index
      elseif try(function() return te:HasBoostBeenTriggered(row.Index) end, false) then boosts[#boosts + 1] = row.Index end
    end
    local civics, cboosts = {}, {}
    for row in GameInfo.Civics() do
      if try(function() return cu:HasCivic(row.Index) end, false) then civics[#civics + 1] = row.Index
      elseif try(function() return cu:HasBoostBeenTriggered(row.Index) end, false) then cboosts[#cboosts + 1] = row.Index end
    end
    local rt = try(function() return te:GetResearchingTech() end, -1)
    local rc = try(function() return cu:GetProgressingCivic() end, -1)
    local pol = {}
    local ns = try(function() return cu:GetNumPolicySlots() end, 0)
    for s = 0, ns - 1 do pol[#pol + 1] = { try(function() return cu:GetSlotType(s) end, -1), try(function() return cu:GetSlotPolicy(s) end, -1) } end
    local gpp = {}
    local gp = try(function() return p:GetGreatPeoplePoints() end)
    if gp then for cls in GameInfo.GreatPersonClasses() do gpp[cls.GreatPersonClassType] = try(function() return gp:GetPointsTotal(cls.Index) end, 0) end end
    local st = p:GetStats()
    local tr = p:GetTreasury()
    local rel = p:GetReligion()
    local out = { pid = i,
      techs = techs, boosts = boosts, civics = civics, cboosts = cboosts,
      research = { rt, try(function() return te:GetResearchProgress(rt) end, 0), try(function() return te:GetResearchCost(rt) end, 0), try(function() return te:GetTurnsToResearch(rt) end, -1) },
      civic = { rc, try(function() return cu:GetCulturalProgress(rc) end, 0), try(function() return cu:GetCultureCost(rc) end, 0), try(function() return cu:GetTurnsLeftOnCurrentCivic() end, -1) },
      gov = try(function() return cu:GetCurrentGovernment() end, -1), policies = pol,
      gold = try(function() return tr:GetGoldBalance() end, 0), goldpt = try(function() return tr:GetGoldYield() - tr:GetTotalMaintenance() end, 0),
      faith = try(function() return rel:GetFaithBalance() end, 0), faithpt = try(function() return rel:GetFaithYield() end, 0),
      sci = try(function() return te:GetScienceYield() end, 0), cul = try(function() return cu:GetCultureYield() end, 0),
      score = try(function() return p:GetScore() end, 0), mil = try(function() return st:GetMilitaryStrength() end, 0),
      tourism = try(function() return st:GetTourism() end, 0), svp = try(function() return st:GetScienceVictoryPoints() end, 0), dvp = try(function() return st:GetDiplomaticVictoryPoints() end, 0),
      favor = try(function() return p:GetFavor() end, 0), erascore = try(function() return ge:GetPlayerCurrentScore(i) end, 0),
      golden = try(function() return ge:HasGoldenAge(i) end, false), dark = try(function() return ge:HasDarkAge(i) end, false), heroic = try(function() return ge:HasHeroicGoldenAge(i) end, false),
      religion = try(function() return rel:GetReligionTypeCreated() end, -1), pantheon = try(function() return rel:GetPantheon() end, -1),
      gpp = gpp, ncities = try(function() return p:GetCities():GetCount() end, 0), nunits = try(function() return p:GetUnits():GetCount() end, 0) }
    print("PLAYER " .. J(out))
  end
  -- Great people currently on offer / claimed timeline.
  local gps = {}
  for _, e in ipairs(try(function() return Game.GetGreatPeople():GetTimeline() end, {})) do if e.Individual then gps[#gps + 1] = { e.Class, e.Individual, e.Era or -1, e.Cost or 0, -1, -1 } end end
  for _, e in ipairs(try(function() return Game.GetGreatPeople():GetPastTimeline() end, {})) do gps[#gps + 1] = { e.Class, e.Individual, e.Era or -1, e.Cost or 0, e.Claimant or -1, e.TurnGranted or -1 } end
  print("GREATPEOPLE " .. J(gps))
end

-- Cities: yields, growth, loyalty, districts (+wonders), buildings, build queue, worked/locked plots, governor, religion.
if S == "cities" then
  local lo, hi = DT_LO or 0, DT_HI or 63
  for _, i in ipairs(alive()) do
    if i >= lo and i <= hi then
      for _, c in Players[i]:GetCities():Members() do
        local ds = {}
        for _, dd in c:GetDistricts():Members() do
          local dt = GameInfo.Districts[dd:GetType()].DistrictType
          local wn = ""
          if dt == "DISTRICT_WONDER" then local wt = try(function() return Map.GetPlot(dd:GetX(), dd:GetY()):GetWonderType() end, -1) if wt >= 0 then wn = GameInfo.Buildings[wt].BuildingType end end
          ds[#ds + 1] = { dt, dd:GetX(), dd:GetY(), try(function() return dd:IsPillaged() and 1 or 0 end, 0), wn, try(function() return dd:IsComplete() and 1 or 0 end, 1) }
        end
        local bl = c:GetBuildings()
        local blds = {}
        for row in GameInfo.Buildings() do if not row.IsWonder and try(function() return bl:HasBuilding(row.Index) end, false) then blds[#blds + 1] = row.Index end end
        local bq = c:GetBuildQueue()
        local q = {}
        local n = try(function() return bq:GetSize() end, 0)
        for k = 0, n - 1 do
          local e = try(function() return bq:GetAt(k) end)
          if e then
            local item, prog, cost = "", 0, 0
            if e.UnitType then item = GameInfo.Units[e.UnitType].UnitType prog = try(function() return bq:GetUnitProgress(e.UnitType) end, 0) cost = try(function() return bq:GetUnitCost(e.UnitType) end, 0)
            elseif e.BuildingType then item = GameInfo.Buildings[e.BuildingType].BuildingType prog = try(function() return bq:GetBuildingProgress(e.BuildingType) end, 0) cost = try(function() return bq:GetBuildingCost(e.BuildingType) end, 0)
            elseif e.DistrictType then item = GameInfo.Districts[e.DistrictType].DistrictType prog = try(function() return bq:GetDistrictProgress(e.DistrictType) end, 0) cost = try(function() return bq:GetDistrictCost(e.DistrictType) end, 0)
            elseif e.ProjectType then item = GameInfo.Projects[e.ProjectType].ProjectType prog = try(function() return bq:GetProjectProgress(e.ProjectType) end, 0) cost = try(function() return bq:GetProjectCost(e.ProjectType) end, 0) end
            q[#q + 1] = { item, prog, cost }
          end
        end
        local worked, locked = {}, {}
        local own = try(function() return Map.GetCityPlots():GetPurchasedPlots(c) end, {})
        for _, pi in ipairs(own) do
          local wc = try(function() return Map.GetPlotByIndex(pi):GetWorkerCount() end, 0)
          if wc > 0 then worked[#worked + 1] = pi end
        end
        local g = c:GetGrowth()
        local ci = c:GetCulturalIdentity()
        local cr = c:GetReligion()
        local gov = -1
        local _, gl = pcall(function() local a, b = Players[i]:GetGovernors():GetGovernorList() return b end)
        for _, gv in ipairs(type(gl) == "table" and gl or {}) do
          local ac = try(function() return gv:GetAssignedCity() end)
          if ac and ac:GetID() == c:GetID() then gov = try(function() return gv:GetType() end, -1) end
        end
        local y = {}
        for k = 0, 5 do y[k + 1] = try(function() return c:GetYield(k) end, 0) end
        local out = { pid = i, id = c:GetID(), x = c:GetX(), y = c:GetY(), name = try(function() return Locale.Lookup(c:GetName()) end, ""), pop = c:GetPopulation(),
          cap = try(function() return c:IsCapital() end, false), orig = try(function() return c:GetOriginalOwner() end, i),
          yields = y, housing = try(function() return g:GetHousing() end, 0), amen = try(function() return g:GetAmenities() end, 0), amenneed = try(function() return g:GetAmenitiesNeeded() end, 0),
          food = try(function() return g:GetFoodSurplus() end, 0), stored = try(function() return g:GetFood() end, 0), thresh = try(function() return g:GetGrowthThreshold() end, 0), grow = try(function() return g:GetTurnsUntilGrowth() end, -1),
          loy = try(function() return ci:GetLoyalty() end, 100), loypt = try(function() return ci:GetLoyaltyPerTurn() end, 0),
          rel = try(function() return cr:GetMajorityReligion() end, -1),
          d = ds, b = blds, q = q, qturns = try(function() return bq:GetTurnsLeft() end, -1), worked = worked, owned = own, gov = gov,
          def = try(function() return c:GetDistricts():GetDistrict(GameInfo.Districts["DISTRICT_CITY_CENTER"].Index):GetDefenseStrength() end, 0) }
        print("CITY " .. J(out))
      end
    end
  end
end

if S == "units" then
  local us = {}
  for _, i in ipairs(alive()) do
    for _, u in Players[i]:GetUnits():Members() do
      us[#us + 1] = { i, u:GetX(), u:GetY(), GameInfo.Units[u:GetType()].UnitType, try(function() return u:GetDamage() end, 0), try(function() return u:GetExperience():GetLevel() end, 1), try(function() return u:GetGreatPerson():GetIndividual() end, -1) }
    end
  end
  print("UNITS " .. J(us))
end

-- Plots: owner, district, improvement, pillaged, route, water, per-major visibility bits. Rows [DT_LO, DT_HI].
if S == "plots" then
  local W, H = Map.GetGridSize()
  local m = majors()
  for y = DT_LO or 0, math.min(H - 1, DT_HI or 7) do
    local row = {}
    for x = 0, W - 1 do
      local p = Map.GetPlot(x, y)
      local vis = {}
      for _, pid in ipairs(m) do vis[#vis + 1] = PlayersVisibility[pid]:IsRevealed(x, y) and 1 or 0 end
      row[#row + 1] = string.format('[%d,%d,%d,%d,%d,%d,"%s",%d]', p:GetOwner(), p:GetDistrictType(), p:GetImprovementType(), p:IsImprovementPillaged() and 1 or 0, p:GetRouteType(), p:IsWater() and 1 or 0, table.concat(vis, ""), try(function() return p:GetAppeal() end, 0))
    end
    print("ROW " .. y .. " [" .. table.concat(row, ",") .. "]")
  end
end

-- Map pins for every major (UI-side PlayerConfigurations).
if S == "pins" then
  local out = {}
  for _, i in ipairs(majors()) do
    local cfg = PlayerConfigurations[i]
    local pins = try(function() return cfg:GetMapPins() end, {})
    for _, pin in pairs(pins) do
      out[#out + 1] = { i, try(function() return pin:GetHexX() end, -1), try(function() return pin:GetHexY() end, -1), try(function() return pin:GetIconName() end, ""), try(function() return pin:GetName() end, "") }
    end
  end
  print("PINS " .. J(out))
end

-- World Congress + diplomacy matrix (war/peace/alliance per pair).
if S == "diplo" then
  local m = majors()
  local rel = {}
  for _, a in ipairs(m) do
    for _, b in ipairs(m) do
      if a ~= b then
        local d = Players[a]:GetDiplomacy()
        local st = try(function() return Players[a]:GetDiplomaticAI():GetDiplomaticStateIndex(b) end, -1)
        local war = try(function() return d:IsAtWarWith(b) end, false)
        local met = try(function() return d:HasMet(b) end, false)
        if met then rel[#rel + 1] = { a, b, st, war and 1 or 0, try(function() return d:GetAllianceType(b) end, -1) } end
      end
    end
  end
  print("DIPLO " .. J(rel))
  local cs = {}
  for _, i in ipairs(alive()) do
    if not Players[i]:IsMajor() then
      cs[#cs + 1] = { i, try(function() return Players[i]:GetInfluence():GetSuzerain() end, -1) }
    end
  end
  print("CITYSTATES " .. J(cs))
end
print("DT_END " .. S)
