# Civ VI save archiver: copy every save (never delete) from the game's save tree into the repo archive.
# Robocopy /E /XO: recurse, copy newer/new only, no purge. Run by the scheduled task "civ6-save-archive" every 2 minutes.
$src = "$env:USERPROFILE\OneDrive\Documents\My Games\Sid Meier's Civilization VI\Saves"
$src2 = "$env:USERPROFILE\Documents\My Games\Sid Meier's Civilization VI\Saves"
$dst = "C:\Users\danie\cc\civilization.sh\saves\archive"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
robocopy $src "$dst\onedrive" /E /XO /R:2 /W:2 /NP /NJH /NDL /NFL /NS /NC /LOG+:"$dst\archive.log" | Out-Null
if (Test-Path $src2) { robocopy $src2 "$dst\documents" /E /XO /R:2 /W:2 /NP /NJH /NDL /NFL /NS /NC /LOG+:"$dst\archive.log" | Out-Null }
# Index: name, size, mtime for every archived save
Get-ChildItem -Recurse -Filter *.Civ6Save $dst | Sort-Object FullName | ForEach-Object { "{0}`t{1}`t{2}" -f $_.FullName.Substring($dst.Length+1), $_.Length, $_.LastWriteTime.ToString("s") } | Set-Content "$dst\index.tsv"
