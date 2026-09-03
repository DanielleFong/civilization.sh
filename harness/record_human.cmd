@echo off
rem Start the passive human-play recorder (game must be loaded and in-game).
cd /d C:\Users\danie\cc\civilization.sh\harness
C:\Python314\python.exe record_human.py --poll 4 >> ..\recordings\record_human.log 2>&1
