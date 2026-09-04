# Press "Begin Game"/"Continue" in a specific fleet instance WITHOUT focus or cursor changes:
# posts WM_LBUTTONDOWN/UP at the ribbon's client position (0.29, 0.955). Refuses non-fleet processes.
param([int]$ProcId, [int]$X = -1, [int]$Y = -1)
Add-Type @'
using System; using System.Runtime.InteropServices; public struct R{public int L,T,Rt,B;}
public class BC{[DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out R r);[DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);[DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);}
'@
$p = Get-Process -Id $ProcId; if ($p.ProcessName -notlike 'CivilizationVI_i*') { "REFUSED: $($p.ProcessName)"; exit 2 }
$h = $p.MainWindowHandle; $r = New-Object R; [BC]::GetClientRect($h, [ref]$r) | Out-Null
$x = $(if ($X -ge 0) { $X } else { [int]($r.Rt * 0.29) }); $y = $(if ($Y -ge 0) { $Y } else { [int]($r.B * 0.955) }); $lp = [IntPtr](($y -shl 16) -bor ($x -band 0xFFFF))
[BC]::PostMessage($h, 0x0200, [IntPtr]0, $lp) | Out-Null            # WM_MOUSEMOVE
Start-Sleep -m 60
[BC]::PostMessage($h, 0x0201, [IntPtr]1, $lp) | Out-Null            # WM_LBUTTONDOWN
Start-Sleep -m 80
[BC]::PostMessage($h, 0x0202, [IntPtr]0, $lp) | Out-Null            # WM_LBUTTONUP
"posted click to $($p.ProcessName) client $x,$y (no focus change)"
