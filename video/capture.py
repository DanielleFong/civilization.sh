"""Live frame capture for civilization.is. Windows python: python.exe capture.py [interval]
Captures ONLY the Civ VI window contents via PrintWindow(PW_RENDERFULLCONTENT) — works while
the window is behind other windows, never includes the desktop. Falls back to a dark card."""
import time, os, sys, ctypes
from ctypes import wintypes
from PIL import Image
OUT = r"C:\Users\danie\cc\civilization.sh\video\frames"
W = 3840; INTERVAL = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
u32 = ctypes.windll.user32; g32 = ctypes.windll.gdi32
u32.SetProcessDPIAware()
TITLES = ["Sid Meier's Civilization VI (DX12)", "Sid Meier's Civilization VI (DX11)", "Sid Meier's Civilization VI"]
PW_RENDERFULLCONTENT = 2
class BITMAPINFOHEADER(ctypes.Structure):
    _fields_=[("biSize",wintypes.DWORD),("biWidth",wintypes.LONG),("biHeight",wintypes.LONG),("biPlanes",wintypes.WORD),("biBitCount",wintypes.WORD),("biCompression",wintypes.DWORD),("biSizeImage",wintypes.DWORD),("biXPelsPerMeter",wintypes.LONG),("biYPelsPerMeter",wintypes.LONG),("biClrUsed",wintypes.DWORD),("biClrImportant",wintypes.DWORD)]
def find_hwnd():
    for t in TITLES:
        h = u32.FindWindowW(None, t)
        if h: return h
    return 0
def grab(hwnd):
    r = wintypes.RECT(); u32.GetClientRect(hwnd, ctypes.byref(r))
    w, h = r.right - r.left, r.bottom - r.top
    if w < 200 or h < 200 or u32.IsIconic(hwnd): return None
    hdc = u32.GetDC(hwnd); mdc = g32.CreateCompatibleDC(hdc); bmp = g32.CreateCompatibleBitmap(hdc, w, h)
    g32.SelectObject(mdc, bmp)
    ok = u32.PrintWindow(hwnd, mdc, PW_RENDERFULLCONTENT)
    bi = BITMAPINFOHEADER(); bi.biSize = ctypes.sizeof(BITMAPINFOHEADER); bi.biWidth = w; bi.biHeight = -h; bi.biPlanes = 1; bi.biBitCount = 32
    buf = ctypes.create_string_buffer(w * h * 4)
    g32.GetDIBits(mdc, bmp, 0, h, buf, ctypes.byref(bi), 0)
    g32.DeleteObject(bmp); g32.DeleteDC(mdc); u32.ReleaseDC(hwnd, hdc)
    if not ok: return None
    im = Image.frombuffer("RGB", (w, h), buf, "raw", "BGRX", 0, 1)
    if im.getbbox() is None: return None  # all black = capture failed
    return im
blank = Image.new("RGB", (W, 1080), (11, 11, 12))
while True:
    try:
        hwnd = find_hwnd(); im = grab(hwnd) if hwnd else None
        if im is None: im = blank
        hh = int(W * im.height / im.width); im = im.resize((W, hh), Image.BILINEAR)
        tmp = os.path.join(OUT, "latest.tmp.jpg"); im.save(tmp, "JPEG", quality=78); os.replace(tmp, os.path.join(OUT, "latest.jpg"))
        sm = im.resize((1920, int(1920 * hh / W)), Image.BILINEAR)
        tmp2 = os.path.join(OUT, "public.tmp.jpg"); sm.save(tmp2, "JPEG", quality=72); os.replace(tmp2, os.path.join(OUT, "public.jpg"))
    except Exception as e:
        print("err", e, flush=True); time.sleep(1)
    time.sleep(INTERVAL)
