@echo off
:loop
"C:\ProgramData\chocolatey\bin\ffmpeg.exe" -hide_banner -loglevel warning -probesize 50M -f gdigrab -framerate 30 -draw_mouse 0 -i title="Sid Meier's Civilization VI (DX12)" -filter_complex "[0:v]format=yuv420p,split=2[a][b];[a]scale=3840:-2[v4k];[b]scale=1920:-2[v1080]" -map "[v4k]" -c:v:0 h264_nvenc -preset p4 -tune ll -rc cbr -b:v:0 14M -maxrate:v:0 14M -bufsize:v:0 28M -g 60 -bf 0 -map "[v1080]" -c:v:1 h264_nvenc -preset p4 -tune ll -rc cbr -b:v:1 4M -maxrate:v:1 4M -bufsize:v:1 8M -g 60 -bf 0 -f hls -hls_time 2 -hls_list_size 8 -hls_flags delete_segments+independent_segments+temp_file -var_stream_map "v:0,name:4k v:1,name:1080" -master_pl_name live.m3u8 -hls_segment_filename "C:\Users\danie\cc\civilization.sh\video\frames\hls\%%v_s%%05d.ts" "C:\Users\danie\cc\civilization.sh\video\frames\hls\%%v.m3u8"
timeout /t 3 >nul
goto loop
