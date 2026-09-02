@echo off
rem transcode OBS 4K HLS (video+audio) to a 1080p rendition for phones; master playlist is static (live.m3u8)
:loop
"C:\ProgramData\chocolatey\bin\ffmpeg.exe" -hide_banner -loglevel warning -re -i "C:\Users\danie\cc\civilization.sh\video\frames\hls\obs.m3u8" -vf "scale=1920:-2" -c:v h264_nvenc -preset p4 -tune ll -rc cbr -b:v 4M -maxrate 4M -bufsize 8M -g 60 -bf 0 -c:a copy -f hls -hls_time 2 -hls_list_size 1800 -hls_flags delete_segments+independent_segments+temp_file -hls_segment_filename "C:\Users\danie\cc\civilization.sh\video\frames\hls\1080_%RANDOM%_s%%05d.ts" "C:\Users\danie\cc\civilization.sh\video\frames\hls\1080.m3u8"
timeout /t 3 >nul
goto loop
