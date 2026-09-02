"""Live frame capture for civilization.is/video. Windows python: python.exe capture.py [interval]"""
import mss, time, os, sys, ctypes
from ctypes import wintypes
from PIL import Image
OUT = r"C:\Users\danie\cc\civilization.sh\video\frames"
W = 1920; INTERVAL = float(sys.argv[1]) if len(sys.argv) > 1 else 2.0
u32 = ctypes.windll.user32
u32.SetProcessDPIAware()
TITLES = ["Sid Meier's Civilization VI (DX12)", "Sid Meier's Civilization VI (DX11)", "Sid Meier's Civilization VI"]
def civ_rect():
    hwnd = 0
    for t in TITLES:
        hwnd = u32.FindWindowW(None, t)
        if hwnd: break
    if not hwnd: return None
    if u32.GetForegroundWindow() != hwnd: return None  # other windows may overlap: never stream them
    r = wintypes.RECT(); u32.GetClientRect(hwnd, ctypes.byref(r))
    pt = wintypes.POINT(0, 0); u32.ClientToScreen(hwnd, ctypes.byref(pt))
    w, h = r.right - r.left, r.bottom - r.top
    if w < 200 or h < 200: return None
    return {"left": pt.x, "top": pt.y, "width": w, "height": h}
with mss.mss() as sct:
    while True:
        try:
            mon = civ_rect()
            if mon is None:
                im = Image.new("RGB", (W, 1080), (11, 11, 12))  # never stream the desktop
            else:
                s = sct.grab(mon)
                im = Image.frombytes("RGB", s.size, s.bgra, "raw", "BGRX")
            h = int(W * im.height / im.width)
            im = im.resize((W, h), Image.BILINEAR)
            tmp = os.path.join(OUT, "latest.tmp.jpg")
            im.save(tmp, "JPEG", quality=82)
            os.replace(tmp, os.path.join(OUT, "latest.jpg"))
            # public (metered) variant: 960px, lower quality, ~80KB
            sm = im.resize((960, int(960 * im.height / im.width)), Image.BILINEAR)
            tmp2 = os.path.join(OUT, "public.tmp.jpg")
            sm.save(tmp2, "JPEG", quality=60)
            os.replace(tmp2, os.path.join(OUT, "public.jpg"))
        except Exception as e:
            print("err", e, flush=True); time.sleep(1)
        time.sleep(INTERVAL)
