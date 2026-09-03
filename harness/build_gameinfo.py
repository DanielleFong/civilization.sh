"""Extend video/frames/state/gameinfo.json with index->name tables the replay viewer needs (techs, civics, policies,
governments, buildings, districts, improvements, units, projects, great people, religions, governors, eras, boosts).
Indices follow DB row order, which is what GameInfo.<Table>[i].Index reports in Lua. Names localized en_US."""
import json, pathlib, sqlite3
CACHE = pathlib.Path("/mnt/c/Users/danie/AppData/Local/Firaxis Games/Sid Meier's Civilization VI/Cache")
OUT = pathlib.Path(__file__).resolve().parent.parent / "video" / "frames" / "state" / "gameinfo.json"
g = sqlite3.connect(CACHE / "DebugGameplay.sqlite"); l = sqlite3.connect(CACHE / "DebugLocalization.sqlite")
LOC = dict(l.execute("select Tag, Text from LocalizedText where Language='en_US'").fetchall())
# The debug DB only carries base-game text; pull expansion / DLC / workshop-mod en_US text straight from the XML.
import re, xml.etree.ElementTree as ET
GAME = pathlib.Path("/mnt/c/Program Files (x86)/Steam/steamapps/common/Sid Meier's Civilization VI")
WORKSHOP = pathlib.Path("/mnt/c/Program Files (x86)/Steam/steamapps/workshop/content/289070")
def harvest(f):
    try: root = ET.parse(f).getroot()
    except Exception: return
    for tbl in root.iter():
        if tbl.tag not in ("BaseGameText", "LocalizedText", "EnglishText"): continue
        for r in tbl:
            if r.tag not in ("Row", "Replace") or "Tag" not in r.attrib: continue
            lang = r.attrib.get("Language", "en_US")
            if lang != "en_US": continue
            t = r.find("Text")
            if t is not None and t.text: LOC.setdefault(r.attrib["Tag"], t.text.strip())
n0 = len(LOC)
for base in [GAME / "Base", GAME / "DLC", WORKSHOP]:
    for f in base.rglob("*.xml"):
        fp = str(f)
        if "Text" not in fp or re.search(r"(de_DE|fr_FR|es_ES|it_IT|ja_JP|ko_KR|pl_PL|pt_BR|ru_RU|zh_Hans|zh_Hant)", fp): continue
        harvest(f)
print(f"LOC: {n0} from debug DB, +{len(LOC) - n0} from XML")
def human(t): return re.sub(r"^(LOC_)?(TECH|CIVIC|POLICY|BUILDING|UNIT|DISTRICT|PROJECT|GREAT_PERSON_INDIVIDUAL|RELIGION|GOVERNOR|GOVERNMENT|ERA|BELIEF|IMPROVEMENT|GREAT_PERSON_CLASS)_", "", t or "").replace("_NAME", "").replace("_", " ").title()
def loc(t):
    if not t: return ""
    v = LOC.get(t)
    return re.sub(r"\[[^\]]*\]", "", v).strip() if v else human(t)
def rows(sql): return g.execute(sql).fetchall()
gi = json.loads(OUT.read_text())
techs = [{"type": t, "name": loc(n), "cost": c, "era": e, "row": r} for t, n, c, e, r in rows("select TechnologyType,Name,Cost,EraType,UITreeRow from Technologies order by rowid")]
ti = {t["type"]: i for i, t in enumerate(techs)}
for t in techs: t["pre"] = []
for a, b in rows("select Technology,PrereqTech from TechnologyPrereqs"):
    if a in ti and b in ti: techs[ti[a]]["pre"].append(ti[b])
civics = [{"type": t, "name": loc(n), "cost": c, "era": e, "row": r} for t, n, c, e, r in rows("select CivicType,Name,Cost,EraType,UITreeRow from Civics order by rowid")]
ci = {t["type"]: i for i, t in enumerate(civics)}
for t in civics: t["pre"] = []
for a, b in rows("select Civic,PrereqCivic from CivicPrereqs"):
    if a in ci and b in ci: civics[ci[a]]["pre"].append(ci[b])
for tt, ct, d in rows("select TechnologyType,CivicType,TriggerDescription from Boosts"):
    if tt in ti: techs[ti[tt]]["boost"] = loc(d)
    if ct in ci: civics[ci[ct]]["boost"] = loc(d)
eras = [{"type": t, "name": loc(n), "chron": c} for t, n, c in rows("select EraType,Name,ChronologyIndex from Eras order by rowid")]
gi.update({
  "techs": techs, "civics": civics, "eras": eras,
  "policies": [{"type": t, "name": loc(n), "slot": s, "desc": loc(d)} for t, n, s, d in rows("select PolicyType,Name,GovernmentSlotType,Description from Policies order by rowid")],
  "governments": [{"type": t, "name": loc(n)} for t, n in rows("select GovernmentType,Name from Governments order by rowid")],
  "slots": [{"type": t, "name": loc(n)} for t, n in rows("select GovernmentSlotType,Name from GovernmentSlots order by rowid")],
  "buildings": [{"type": t, "name": loc(n), "district": d, "wonder": bool(w), "cost": c} for t, n, d, w, c in rows("select BuildingType,Name,PrereqDistrict,IsWonder,Cost from Buildings order by rowid")],
  "districts": [{"type": t, "name": loc(n)} for t, n in rows("select DistrictType,Name from Districts order by rowid")],
  "improvementNames": [{"type": t, "name": loc(n)} for t, n in rows("select ImprovementType,Name from Improvements order by rowid")],
  "units": [{"type": t, "name": loc(n), "combat": c, "ranged": r, "domain": d} for t, n, c, r, d in rows("select UnitType,Name,Combat,RangedCombat,Domain from Units order by rowid")],
  "projects": [{"type": t, "name": loc(n)} for t, n in rows("select ProjectType,Name from Projects order by rowid")],
  "gpClasses": [{"type": t, "name": loc(n)} for t, n in rows("select GreatPersonClassType,Name from GreatPersonClasses order by rowid")],
  "gpIndividuals": [{"type": t, "name": loc(n), "cls": c, "era": e} for t, n, c, e in rows("select GreatPersonIndividualType,Name,GreatPersonClassType,EraType from GreatPersonIndividuals order by rowid")],
  "religions": [{"type": t, "name": loc(n), "icon": i} for t, n, i in rows("select ReligionType,Name,IconString from Religions order by rowid")],
  "governors": [{"type": t, "name": loc(n), "title": loc(ti_)} for t, n, ti_ in rows("select GovernorType,Name,Title from Governors order by rowid")],
  "beliefs": [{"type": t, "name": loc(n), "cls": c} for t, n, c in rows("select BeliefType,Name,BeliefClassType from Beliefs order by rowid")],
  "diploStates": [{"type": t, "name": loc(n)} for t, n in rows("select StateType,Name from DiplomaticStates order by rowid")] if rows("select name from sqlite_master where name='DiplomaticStates'") else [],
})
# Cross-check against the T163 dump if present: China research idx 52 should be Advanced Ballistics per the web API.
OUT.write_text(json.dumps(gi, separators=(",", ":")))
print(f"gameinfo.json {OUT.stat().st_size // 1024} KB; techs {len(techs)} civics {len(civics)} policies {len(gi['policies'])} buildings {len(gi['buildings'])} gp {len(gi['gpIndividuals'])}")
print("tech52 =", techs[52]["name"], "| civic21 =", civics[21]["name"], "| gov8 =", gi["governments"][8]["name"], "| policy70 =", gi["policies"][70]["name"], "| slots", [s["type"] for s in gi["slots"]])
