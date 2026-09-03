#!/bin/bash
# civilization.is watchdog — restarts capture, HLS encoder, and Deno if they die. Run: setsid nohup bash watchdog.sh &
cd /mnt/c/Users/danie/cc/civilization.sh/video
while true; do
  # OBS (WGC window capture + desktop audio -> obs.m3u8)
  if ! tasklist.exe 2>/dev/null | grep -qi obs64.exe; then
    echo "$(date +%T) restart OBS"; taskkill.exe /IM obs64.exe /F >/dev/null 2>&1; rm -rf /mnt/c/Users/danie/AppData/Roaming/obs-studio/.sentinel
    (cd "/mnt/c/Program Files/obs-studio/bin/64bit/" && setsid nohup ./obs64.exe --profile civ --collection civ --startrecording --minimize-to-tray --disable-shutdown-check --disable-updater --disable-missing-files-check >/tmp/obs.log 2>&1 &); sleep 20
  fi
  # HLS packager loop (stream.cmd) — exactly one loop process; the loop itself respawns ffmpeg
  loops=$(powershell.exe -NoProfile -Command "@(Get-CimInstance Win32_Process -Filter \"name='cmd.exe'\" | Where-Object { \$_.CommandLine -like '*stream.cmd*' }).Count" 2>/dev/null | tr -d '\r ')
  if ! [[ "$loops" =~ ^[0-9]+$ ]]; then echo "$(date +%T) loop count query failed ('$loops') — skipping"; sleep 30; continue; fi
  if [ "$loops" -eq 0 ]; then echo "$(date +%T) start packager loop"; (setsid nohup cmd.exe /c 'C:\Users\danie\cc\civilization.sh\video\stream.cmd' >/tmp/stream.log 2>&1 &); sleep 20; fi
  if [ "$loops" -gt 1 ]; then echo "$(date +%T) $loops packager loops — pruning all"; powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*stream.cmd*' -or \$_.Name -eq 'ffmpeg.exe' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }"; fi
  if ! pgrep -x deno >/dev/null; then echo "$(date +%T) restart deno"; (setsid nohup deno run -A server.ts >/tmp/server.log 2>&1 &); fi
  if [ -z "$(find frames/latest.jpg -mmin -1 2>/dev/null)" ]; then echo "$(date +%T) restart capture"; powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='python.exe'\" | Where-Object { \$_.CommandLine -like '*capture.py*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force }"; (setsid nohup /mnt/c/Python314/python.exe 'C:\Users\danie\cc\civilization.sh\video\capture.py' 2 >/tmp/capture.log 2>&1 &); fi
  if ! pgrep -f tunnel-civilization.yml >/dev/null; then echo "$(date +%T) restart tunnel"; (setsid nohup cloudflared tunnel --config /mnt/c/Users/danie/cc/civilization.sh/video/tunnel-civilization.yml run >/tmp/tunnel.log 2>&1 &); fi
  sleep 30
done
