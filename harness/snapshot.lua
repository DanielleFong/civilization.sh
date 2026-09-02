-- per-turn state snapshot for policy extraction (gamecore, read-only). prints one JSON line.
local p = Players[0]; local t = Game.GetCurrentGameTurn()
local function q(s) return '"'..tostring(s):gsub('"','\\"')..'"' end
local out = {'"turn":'..t, '"score":'..p:GetScore(), '"gold":'..math.floor(p:GetTreasury():GetGoldBalance()), '"gpt":'..math.floor(p:GetTreasury():GetGoldYield()-p:GetTreasury():GetTotalMaintenance()),
 '"sci":'..math.floor(p:GetTechs():GetScienceYield()), '"cul":'..math.floor(p:GetCulture():GetCultureYield()), '"faith":'..math.floor(p:GetReligion():GetFaithBalance()), '"era_score":'..(p:GetEras() and p:GetEras():GetEraScore() or -1)}
local rt = p:GetTechs():GetResearchingTech(); out[#out+1]='"tech":'..q(rt>=0 and GameInfo.Technologies[rt].TechnologyType or 'none')
local rc = p:GetCulture():GetProgressingCivic(); out[#out+1]='"civic":'..q(rc>=0 and GameInfo.Civics[rc].CivicType or 'none')
local cities={} for _,c in p:GetCities():Members() do local bq=c:GetBuildQueue(); local cur=bq:CurrentlyBuilding(); cities[#cities+1]='{"name":'..q(c:GetName())..',"x":'..c:GetX()..',"y":'..c:GetY()..',"pop":'..c:GetPopulation()..',"prod":'..q(cur or 'none')..',"turns":'..(bq:GetTurnsLeft() or -1)..'}' end
out[#out+1]='"cities":['..table.concat(cities,',')..']'
local units={} for _,u in p:GetUnits():Members() do units[#units+1]='{"t":'..q(GameInfo.Units[u:GetType()].UnitType)..',"x":'..u:GetX()..',"y":'..u:GetY()..',"hp":'..(100-u:GetDamage())..'}' end
out[#out+1]='"units":['..table.concat(units,',')..']'
local pol={} local gov=p:GetCulture() for row in GameInfo.Policies() do if gov:IsPolicyActive and gov:IsPolicyActive(row.Index) then pol[#pol+1]=q(row.PolicyType) end end
out[#out+1]='"policies":['..table.concat(pol,',')..']'
local others={} for _,pid in ipairs(PlayerManager.GetAliveMajorIDs()) do if pid~=0 then local o=Players[pid]; local cfg=PlayerConfigurations[pid]; others[#others+1]='{"id":'..pid..',"civ":'..q(cfg:GetCivilizationTypeName())..',"score":'..o:GetScore()..',"met":'..tostring(p:GetDiplomacy():HasMet(pid))..'}' end end
out[#out+1]='"others":['..table.concat(others,',')..']'
print('SNAP{'..table.concat(out,',')..'}')
