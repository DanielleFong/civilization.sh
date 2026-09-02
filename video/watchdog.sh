#!/bin/bash
# civilization.is watchdog — restarts capture, HLS encoder, and Deno if they die. Run: setsid nohup bash watchdog.sh &
cd /mnt/c/Users/danie/cc/civilization.sh/video
while true; do
  n=$(tasklist.exe 2>/dev/null | grep -ic ffmpeg)
  if [ "$n" -lt 2 ]; then echo "$(date +%T) restart ffmpeg"; (setsid nohup cmd.exe /c 'C:\Users\danie\cc\civilization.sh\video\stream.cmd' >/tmp/stream.log 2>&1 &); fi
  if [ "$n" -gt 2 ]; then echo "$(date +%T) too many ffmpeg ($n) — pruning"; powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*stream.cmd*' -or \$_.Name -eq 'ffmpeg.exe' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }"; fi
  if [ $(( $(date +%s) - $(stat -c %Y frames/hls/live.m3u8 2>/dev/null || echo 0) )) -gt 600 ] && [ -z "$(find frames/hls -name '*.ts' -mmin -1 2>/dev/null)" ]; then echo "$(date +%T) stale HLS — restarting"; powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { \$_.CommandLine -like '*stream.cmd*' -or \$_.Name -eq 'ffmpeg.exe' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }"; fi
  if ! pgrep -x deno >/dev/null; then echo "$(date +%T) restart deno"; (setsid nohup deno run -A server.ts >/tmp/server.log 2>&1 &); fi
  if [ -z "$(find frames/latest.jpg -mmin -1 2>/dev/null)" ]; then echo "$(date +%T) restart capture"; powershell.exe -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"name='python.exe'\" | Where-Object { \$_.CommandLine -like '*capture.py*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force }"; (setsid nohup /mnt/c/Python314/python.exe 'C:\Users\danie\cc\civilization.sh\video\capture.py' 2 >/tmp/capture.log 2>&1 &); fi
  if ! pgrep -f tunnel-civilization.yml >/dev/null; then echo "$(date +%T) restart tunnel"; (setsid nohup cloudflared tunnel --config /mnt/c/Users/danie/cc/civilization.sh/video/tunnel-civilization.yml run >/tmp/tunnel.log 2>&1 &); fi
  sleep 30
done
