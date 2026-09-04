#!/bin/bash
# fleet_driver.sh PORT PID [nohost] — drive one fleet instance: (host minimal game) -> click Begin (posted msg) -> autoplay 81. Logs to fleet_PORT.log
port=$1; pid=$2; nohost=$3; log=/mnt/c/Users/danie/cc/civilization.sh/harness/fleet_$port.log; cd /mnt/c/Users/danie/cc/civilization.sh/harness
L() { echo "[$port $(date +%H:%M:%S)] $*" >> $log; }
P() { WSLENV=CIV_TUNER_PORT CIV_TUNER_PORT=$port timeout ${3:-12} /mnt/c/Python314/python.exe menu_lua.py "$1" "$2" 2>/dev/null | tr -d '\0'; }
own=$(powershell.exe -NoProfile -Command "\$c=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | select -First 1; if (\$c) { (Get-Process -Id \$c.OwningProcess).ProcessName } else { 'none' }" | tr -d '\r')
case "$own" in CivilizationVI_i*) L "owner $own ok";; *) L "REFUSED owner=$own"; exit 2;; esac
if [ "$nohost" != nohost ]; then
  for i in $(seq 1 40); do P "print(1)" ZZZ | grep -q "'MainMenu'" && break; sleep 5; done; L "menu"
  P "GameConfiguration.SetToDefaults(); GameConfiguration.SetValue('RULESET','RULESET_EXPANSION_2'); GameConfiguration.SetValue('MAP_SCRIPT','Pangaea.lua'); GameConfiguration.SetValue('MAP_SIZE','MAPSIZE_DUEL'); GameConfiguration.SetValue('GAME_HANDICAP','DIFFICULTY_PRINCE'); GameConfiguration.SetValue('GAME_SPEED_TYPE','GAMESPEED_ONLINE'); GameConfiguration.SetValue('CIVFLEET',1); if BuildHeadlessGameSetup then BuildHeadlessGameSetup() end; if RebuildPlayerParameters then RebuildPlayerParameters(true) end; if GameSetup_RefreshParameters then GameSetup_RefreshParameters() end; if ReleasePlayerParameters then ReleasePlayerParameters() end; if HideGameSetup then HideGameSetup() end; Network.HostGame(ServerType.SERVER_TYPE_NONE); print('HOST_SENT')" MainMenu 25 >/dev/null; L "host sent"
fi
clicked=0
for i in $(seq 1 120); do out=$(P "print(1)" ZZZ); if echo "$out" | grep -q "'InGame'"; then L "in-game"; break; fi
  if echo "$out" | grep -q "^identity: Civ6" && echo "$out" | grep -q "states: {}"; then L "begin screen"; sleep 2; powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'C:\Users\danie\cc\civilization.sh\harness\begin_click.ps1' -ProcId $pid | tr -d '\r' >> $log; clicked=$((clicked+1)); sleep 15; fi; sleep 8; done
for i in $(seq 1 20); do r=$(P "AutoplayManager.SetTurns(81); AutoplayManager.SetReturnAsPlayer(0); AutoplayManager.SetObserveAsPlayer(0); AutoplayManager.SetActive(true); print('AUTOPLAY', tostring(AutoplayManager.IsActive()), 'TURN', Game.GetCurrentGameTurn(), PlayerConfigurations[Game.GetLocalPlayer()]:GetLeaderTypeName())" InGame 20 | grep -E "^\[[0-9]+ InGame\]" | sed 's/.*-> //'); [ -n "$r" ] && { L "$r"; break; }; sleep 10; done; L "driver done (clicks=$clicked)"
