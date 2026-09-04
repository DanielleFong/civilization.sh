# Mute the Windows audio sessions of the given PIDs (per-app, leaves other apps alone). Usage: mute_app.ps1 -Pids 1234,5678 [-Unmute]
param([string]$Pids, [switch]$Unmute)
$src = @"
using System; using System.Runtime.InteropServices;
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMDeviceEnumerator { int EnumAudioEndpoints(int f, int s, out IntPtr c); int GetDefaultAudioEndpoint(int f, int r, out IMMDevice d); }
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IMMDevice { int Activate(ref Guid id, int ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object i); }
[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IAudioSessionManager2 { int GetAudioSessionControl(IntPtr g, int s, out IntPtr c); int GetSimpleAudioVolume(IntPtr g, int s, out IntPtr v); int GetSessionEnumerator(out IAudioSessionEnumerator e); }
[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IAudioSessionEnumerator { int GetCount(out int c); int GetSession(int i, out IAudioSessionControl2 s); }
[Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IAudioSessionControl2 { int GetState(out int s); int GetDisplayName(out IntPtr n); int SetDisplayName(IntPtr n, IntPtr g); int GetIconPath(out IntPtr p); int SetIconPath(IntPtr p, IntPtr g); int GetGroupingParam(out Guid g); int SetGroupingParam(ref Guid g, IntPtr c); int RegisterAudioSessionNotification(IntPtr n); int UnregisterAudioSessionNotification(IntPtr n); int GetSessionIdentifier(out IntPtr s); int GetSessionInstanceIdentifier(out IntPtr s); int GetProcessId(out uint p); int IsSystemSoundsSession(); int SetDuckingPreference(bool o); }
[Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface ISimpleAudioVolume { int SetMasterVolume(float l, IntPtr c); int GetMasterVolume(out float l); int SetMute(bool m, IntPtr c); int GetMute(out bool m); }
public static class AppMute { public static int Apply(uint[] pids, bool mute) { var en = (IMMDeviceEnumerator)new MMDeviceEnumerator(); IMMDevice dev; en.GetDefaultAudioEndpoint(0, 1, out dev); var g = typeof(IAudioSessionManager2).GUID; object o; dev.Activate(ref g, 23, IntPtr.Zero, out o); var mgr = (IAudioSessionManager2)o; IAudioSessionEnumerator se; mgr.GetSessionEnumerator(out se); int n; se.GetCount(out n); int hit = 0; for (int i = 0; i < n; i++) { IAudioSessionControl2 s; se.GetSession(i, out s); uint pid; s.GetProcessId(out pid); if (Array.IndexOf(pids, pid) >= 0) { ((ISimpleAudioVolume)s).SetMute(mute, IntPtr.Zero); hit++; } } return hit; } }
"@
Add-Type -TypeDefinition $src
$hit = [AppMute]::Apply([uint32[]]($Pids -split "," | % { [uint32]$_ }), -not $Unmute)
"sessions " + ($(if ($Unmute) {"unmuted"} else {"muted"})) + ": $hit"
