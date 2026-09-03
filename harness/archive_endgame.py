"""Archive every end-game graph + the Ranking/Results tabs from Civ VI's end screen.

Run on Windows with the civ6-mcp venv python (has PIL + winrt OCR):
  C:\\Users\\danie\\cc\\civbench\\civ6-mcp\\.venv\\Scripts\\python.exe archive_endgame.py [--out DIR] [--tag NAME]

Method: window-capture via PrintWindow (works even if occluded), synthetic clicks on the
graph-cycle arrow, OCR of the dropdown label to name each file, stop when a label repeats.
Coordinates are relative to the client area and scaled from a 3840x2121 reference.
"""
import argparse, asyncio, ctypes, json, pathlib, sys, time
from ctypes import wintypes
from PIL import Image

u32 = ctypes.windll.user32; g32 = ctypes.windll.gdi32
u32.SetProcessDPIAware()
TITLES = ["Sid Meier's Civilization VI (DX12)", "Sid Meier's Civilization VI (DX11)", "Sid Meier's Civilization VI"]
REF_W, REF_H = 3840, 2121
# reference-resolution client coords (measured from a probe screenshot)
P = {"tab_results": (1651, 202), "tab_ranking": (1820, 202), "tab_graphs": (1991, 202),
     "arrow_left": (1638, 276), "arrow_right": (2400, 276),
     "label_box": (1660, 258, 2360, 296)}

class BIH(ctypes.Structure):
    _fields_ = [("biSize", wintypes.DWORD), ("biWidth", wintypes.LONG), ("biHeight", wintypes.LONG), ("biPlanes", wintypes.WORD), ("biBitCount", wintypes.WORD), ("biCompression", wintypes.DWORD), ("biSizeImage", wintypes.DWORD), ("biXPelsPerMeter", wintypes.LONG), ("biYPelsPerMeter", wintypes.LONG), ("biClrUsed", wintypes.DWORD), ("biClrImportant", wintypes.DWORD)]

def find_hwnd():
    for t in TITLES:
        h = u32.FindWindowW(None, t)
        if h: return h
    sys.exit("Civ VI window not found")

def client_size(h):
    r = wintypes.RECT(); u32.GetClientRect(h, ctypes.byref(r)); return r.right - r.left, r.bottom - r.top

def grab(h):
    w, hh = client_size(h)
    hdc = u32.GetDC(h); mdc = g32.CreateCompatibleDC(hdc); bmp = g32.CreateCompatibleBitmap(hdc, w, hh); g32.SelectObject(mdc, bmp)
    ok = u32.PrintWindow(h, mdc, 2)
    bi = BIH(); bi.biSize = ctypes.sizeof(BIH); bi.biWidth = w; bi.biHeight = -hh; bi.biPlanes = 1; bi.biBitCount = 32
    buf = ctypes.create_string_buffer(w * hh * 4); g32.GetDIBits(mdc, bmp, 0, hh, buf, ctypes.byref(bi), 0)
    g32.DeleteObject(bmp); g32.DeleteDC(mdc); u32.ReleaseDC(h, hdc)
    if not ok: sys.exit("PrintWindow failed")
    return Image.frombuffer("RGB", (w, hh), buf, "raw", "BGRX", 0, 1)

def foreground(h):
    # Alt-key trick defeats focus-steal protection (see handover doc)
    u32.keybd_event(0x12, 0, 0, 0); u32.SetForegroundWindow(h); u32.keybd_event(0x12, 0, 2, 0); time.sleep(0.3)

def scale(h, pt):
    w, hh = client_size(h); return int(pt[0] * w / REF_W), int(pt[1] * hh / REF_H)

class _MI(ctypes.Structure):
    _fields_ = [("dx", ctypes.c_long), ("dy", ctypes.c_long), ("mouseData", ctypes.c_ulong), ("dwFlags", ctypes.c_ulong), ("time", ctypes.c_ulong), ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong))]
class _IN(ctypes.Structure):
    _fields_ = [("type", ctypes.c_ulong), ("mi", _MI)]
def _send(dx, dy, flags):
    inp = _IN(type=0, mi=_MI(dx=dx, dy=dy, mouseData=0, dwFlags=flags, time=0, dwExtraInfo=None)); u32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(_IN))
def click(h, ref_pt):
    """SendInput click at a reference-resolution client point (same method as civ6-mcp's launcher)."""
    # PrintWindow renders the WHOLE window (title bar included) into the client-size bitmap,
    # so screenshot pixels are window-rect coordinates: screen = winrect.origin + pixel.
    x, y = scale(h, ref_pt); r = wintypes.RECT(); u32.GetWindowRect(h, ctypes.byref(r)); p = wintypes.POINT(r.left + x, r.top + y)
    vx0, vy0, vw, vh = (u32.GetSystemMetrics(i) for i in (76, 77, 78, 79))
    ax, ay = int((p.x - vx0) * 65536 / vw), int((p.y - vy0) * 65536 / vh)
    ABS = 0x8000 | 0x4000
    _send(ax - 40, ay - 20, 0x0001 | ABS); time.sleep(0.08)   # approach: Civ arms buttons on hover
    _send(ax, ay, 0x0001 | ABS); time.sleep(0.12)
    _send(ax, ay, 0x0002 | ABS); time.sleep(0.08)
    _send(ax, ay, 0x0004 | ABS); time.sleep(0.05)

def ocr(im):
    """Windows OCR on a PIL image -> text (empty string if OCR unavailable)."""
    try:
        from winrt.windows.media.ocr import OcrEngine
        from winrt.windows.graphics.imaging import SoftwareBitmap, BitmapPixelFormat
        from winrt.windows.storage.streams import DataWriter
    except Exception:
        return ""
    im = im.convert("RGBA"); w, hh = im.size
    async def run():
        dw = DataWriter(); dw.write_bytes(im.tobytes()); buf = dw.detach_buffer()
        sb = SoftwareBitmap.create_copy_from_buffer(buf, BitmapPixelFormat.RGBA8, w, hh)
        eng = OcrEngine.try_create_from_user_profile_languages()
        r = await eng.recognize_async(sb); return r.text
    return asyncio.run(run())

def ocr_lines(im):
    """-> list of (text, cx, cy) in image pixels, via Windows OCR line boxes."""
    try:
        from winrt.windows.media.ocr import OcrEngine
        from winrt.windows.graphics.imaging import SoftwareBitmap, BitmapPixelFormat
        from winrt.windows.storage.streams import DataWriter
    except Exception:
        return []
    im = im.convert("RGBA"); w, hh = im.size
    async def run():
        dw = DataWriter(); dw.write_bytes(im.tobytes()); buf = dw.detach_buffer()
        sb = SoftwareBitmap.create_copy_from_buffer(buf, BitmapPixelFormat.RGBA8, w, hh)
        r = await OcrEngine.try_create_from_user_profile_languages().recognize_async(sb)
        out = []
        for ln in r.lines:
            xs = [wd.bounding_rect.x for wd in ln.words]; ys = [wd.bounding_rect.y for wd in ln.words]
            xe = [wd.bounding_rect.x + wd.bounding_rect.width for wd in ln.words]; ye = [wd.bounding_rect.y + wd.bounding_rect.height for wd in ln.words]
            out.append((ln.text.strip(), (min(xs) + max(xe)) / 2, (min(ys) + max(ye)) / 2))
        return out
    return asyncio.run(run())

DD = {"button": (2010, 276), "list_box": (1660, 290, 2380, 1260)}   # reference coords

def dropdown_items(h):
    """Open the dropdown, OCR it -> [(label, ref_x, ref_y)] of clickable rows."""
    click(h, DD["button"]); time.sleep(0.4); return dropdown_items_open(h)

def dropdown_items_open(h):
    """OCR the already-open dropdown list -> [(label, ref_x, ref_y)]."""
    im = grab(h); w, hh = im.size
    x0, y0, x1, y1 = DD["list_box"]; sx, sy = w / REF_W, hh / REF_H
    crop = im.crop((int(x0 * sx), int(y0 * sy), int(x1 * sx), int(y1 * sy)))
    crop2 = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
    items = []
    for text, cx, cy in ocr_lines(crop2):
        if len(text) < 3 or not any(c.isalpha() for c in text): continue
        items.append((text, int((x0 * sx + cx / 2) / sx), int((y0 * sy + cy / 2) / sy)))
    return items

def label_of(h, im):
    x0, y0, x1, y1 = P["label_box"]; w, hh = im.size
    crop = im.crop((int(x0 * w / REF_W), int(y0 * hh / REF_H), int(x1 * w / REF_W), int(y1 * hh / REF_H)))
    crop = crop.resize((crop.width * 2, crop.height * 2), Image.LANCZOS)
    return ocr(crop).strip()

def safe(s): return "".join(c if c.isalnum() else "_" for c in s).strip("_") or "unnamed"

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default=r"C:\Users\danie\cc\civilization.sh\recordings\endgame"); ap.add_argument("--tag", default=time.strftime("%Y%m%d-%H%M")); ap.add_argument("--max", type=int, default=40)
    a = ap.parse_args(); out = pathlib.Path(a.out) / a.tag; out.mkdir(parents=True, exist_ok=True)
    h = find_hwnd(); foreground(h); index = []
    def save(name, im):
        p = out / f"{len(index):02d}_{safe(name)}.png"; im.save(p); index.append({"file": p.name, "label": name}); print(f"saved {p.name}", flush=True)
    click(h, P["tab_graphs"]); time.sleep(0.5)
    t0 = time.time(); done = set()
    def wheel(direction, clicks=8):
        """List must be open. Hover onto it, then plain WHEEL events (no ABSOLUTE flags — the game drops those)."""
        x, y = scale(h, (2018, 900)); r = wintypes.RECT(); u32.GetWindowRect(h, ctypes.byref(r))
        u32.SetCursorPos(r.left + x, r.top + y - 20); time.sleep(0.03); u32.SetCursorPos(r.left + x, r.top + y); time.sleep(0.08)
        for _ in range(clicks):
            inp = _IN(type=0, mi=_MI(dx=0, dy=0, mouseData=(120 * direction) & 0xFFFFFFFF, dwFlags=0x0800, time=0, dwExtraInfo=None)); u32.SendInput(1, ctypes.byref(inp), ctypes.sizeof(_IN)); time.sleep(0.02)
        time.sleep(0.15)
    def capture_page(items):
        n = 0
        for text, rx, ry in items:
            if text in done: continue
            click(h, (rx, ry)); time.sleep(0.22); im = grab(h)
            lab = label_of(h, im) or text                        # verify what actually got selected
            if lab in done: click(h, DD["button"]); time.sleep(0.2); continue
            done.add(lab); done.add(text); save(lab, im); n += 1
            click(h, DD["button"]); time.sleep(0.2)              # reopen for the next item
        return n
    # open, scroll to top, OCR page, capture; then scroll down page by page until nothing new
    click(h, DD["button"]); time.sleep(0.3); wheel(+1, 12)
    items = dropdown_items_open(h); capture_page(items)
    for _ in range(6):
        wheel(-1, 6); items = dropdown_items_open(h)
        if not capture_page(items): break
    click(h, DD["button"]); time.sleep(0.2)   # make sure the list is closed
    print(f"{len(index)} graphs in {time.time()-t0:.1f}s", flush=True)
    for tab in ("tab_ranking", "tab_results"):
        click(h, P[tab]); time.sleep(1.2); im = grab(h); save(tab.replace("tab_", ""), im)
    click(h, P["tab_graphs"]); time.sleep(0.5)
    (out / "index.json").write_text(json.dumps({"tag": a.tag, "captured": time.strftime("%Y-%m-%dT%H:%M:%S"), "items": index}, indent=1))
    print(f"done: {len(index)} images -> {out}", flush=True)

if __name__ == "__main__": main()
