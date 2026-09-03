@echo off
rem ingest OBS mpegts over UDP (4K video + AAC) -> HLS: 4K passthrough + 1080p NVENC transcode, 1h DVR window
:loop
set SID=%RANDOM%%RANDOM%
"C:\ProgramData\chocolatey\bin\ffmpeg.exe" -hide_banner -loglevel warning -fflags +genpts -i "udp://127.0.0.1:9710?fifo_size=1000000&overrun_nonfatal=1" -map 0:v -map 0:a -c:v:0 copy -c:a:0 copy -map 0:v -map 0:a -filter:v:1 "scale=1920:-2" -c:v:1 h264_nvenc -preset p4 -tune ll -rc cbr -b:v:1 4M -maxrate:v:1 4M -bufsize:v:1 8M -g 60 -bf 0 -c:a:1 copy -f hls -hls_time 2 -hls_list_size 1800 -hls_flags delete_segments+independent_segments -var_stream_map "v:0,a:0,name:4k v:1,a:1,name:1080" -hls_segment_filename "C:\Users\danie\cc\civilization.sh\video\frames\hls\%%v_%SID%_s%%05d.ts" "C:\Users\danie\cc\civilization.sh\video\frames\hls\%%v.m3u8"
timeout /t 3 >nul
goto loop
