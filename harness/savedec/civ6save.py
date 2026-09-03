"""Civ6Save reader — header fields + decompressed body + generic TLV walk. No game, no tuner.
Format (from pydt/civ6-save-parser, verified here): 'CIV6' magic; entries of marker(u32) type(u32) payload;
types: 1 bool (8 skip + 4), 2 int (8 skip + 4), 3 (12), 4/5 ascii string (u16 len, 6 tag bytes 00 21 01 00 00 00, bytes),
6 utf16 string, 0x0A/0x0B arrays, 0x0D/0x14 (16), 0x15 (12 or 20), 0x18 compressed. Body: after marker 00 00 01 00 comes
zlib data split in 64 KiB blocks with 4-byte separators, ending at 00 00 FF FF; decompress with Z_SYNC_FLUSH semantics."""
import struct, zlib, sys, json, pathlib

def body(d: bytes) -> bytes:
    s = d.find(b"\x00\x00\x01\x00\x78\x9c") + 4
    e = d.find(b"\x00\x00\xff\xff", s) + 4
    b = d[s:e]; chunks = []; p = 0
    while p < len(b): chunks.append(b[p:p + 65536]); p += 65536 + 4
    return zlib.decompressobj().decompress(b"".join(chunks))

def u32(d, p): return struct.unpack_from("<I", d, p)[0]

def walk(d: bytes, start: int = 0, end: int | None = None, limit: int = 10**9):
    """Yield (pos, marker, type, value) over a TLV region. Unknown types resync by advancing 4 bytes."""
    p = start; end = len(d) if end is None else end; n = 0
    while p + 8 <= end and n < limit:
        m, t = u32(d, p), u32(d, p + 4); q = p + 8; v = None
        try:
            if t == 1: v = bool(d[q + 8]); q += 12
            elif t == 2: v = struct.unpack_from("<i", d, q + 8)[0]; q += 12
            elif t == 3: v = d[q:q + 12]; q += 12
            elif t in (4, 5):
                ln = struct.unpack_from("<H", d, q)[0]; tag = d[q + 2:q + 8]
                if tag[1] == 0x21: v = d[q + 8:q + 8 + ln].split(b"\x00")[0].decode("latin1"); q += 8 + ln
                elif tag[1] in (0, 0x20): v = None; q += 12
                else: raise ValueError
            elif t == 6:
                ln = struct.unpack_from("<H", d, q)[0] * 2
                if d[q + 2:q + 8] == b"\x00\x21\x02\x00\x00\x00": v = d[q + 8:q + 8 + ln - 2].decode("utf-16-le", "replace"); q += 8 + ln
                else: raise ValueError
            elif t in (0x0D, 0x14): v = d[q:q + 16]; q += 16
            elif t == 0x15: q += 20 if d[q:q + 4] == b"\x00\x00\x00\x80" else 12
            elif t == 0x0A: ln = u32(d, q + 8); v = ("array0A", ln); q += 12
            elif t == 0x0B: ln = u32(d, q + 8); v = ("array0B", ln); q += 12
            else: raise ValueError
        except (ValueError, IndexError, struct.error):
            p += 4; continue
        yield p, m, t, v; p = q; n += 1

def header(d: bytes) -> dict:
    """Header key/values by marker hex; also the well-known ones by name."""
    end = d.find(b"\x00\x00\x01\x00\x78\x9c")
    out = {}
    for p, m, t, v in walk(d, 0, end):
        if v is None or t in (3, 0x0D, 0x14): continue
        out.setdefault(f"{m:08x}", []).append(v)
    return out

if __name__ == "__main__":
    f = pathlib.Path(sys.argv[1]); d = f.read_bytes()
    h = header(d); print(f.name, "header keys", len(h))
    for k in list(h)[:60]: print(k, str(h[k])[:100])

# ---------------------------------------------------------------------------------------------
# Body decoders (verified against the T163 tuner dump, 2026-09-03). Offsets are relative, not absolute.
import re, sqlite3
CACHE = pathlib.Path("/mnt/c/Users/danie/AppData/Local/Firaxis Games/Sid Meier's Civilization VI/Cache/DebugGameplay.sqlite")
_db = None
def db():
    global _db
    if _db is None: _db = sqlite3.connect(CACHE)
    return _db
def hashes():
    return {t: h & 0xffffffff for t, k, h in db().execute("select Type,Kind,Hash from Types") if h is not None}
def table(tbl, col): return [r[0] for r in db().execute(f"select {col} from {tbl} order by rowid")]

def hash_runs(b: bytes, names: list[str], stride: int = 5):
    """Positions where the whole table appears as consecutive [hash u32][stride-4 bytes] entries, in DB order."""
    H = hashes(); hv = [H[t] for t in names]; first = struct.pack("<I", hv[0]); out = []; p = 0
    while True:
        p = b.find(first, p)
        if p < 0: break
        if p + stride * len(hv) <= len(b) and all(u32(b, p + stride * i) == hv[i] for i in range(len(hv))): out.append(p)
        p += 1
    return out

def decode_flags(b: bytes, tbl="Technologies", col="TechnologyType"):
    """Per player (in player-id order), the set of owned indices. Each player has two consecutive 77x5 runs:
    run A = HasTech, run B = boost/other. Returns list of (setA, setB) in run-pair order == player id order."""
    names = table(tbl, col); n = len(names); runs = hash_runs(b, names, 5); out = []
    i = 0
    while i < len(runs):
        a = runs[i]; setA = {k for k in range(n) if b[a + 5 * k + 4]}
        if i + 1 < len(runs) and runs[i + 1] - a == 5 * n + 4:
            c = runs[i + 1]; setB = {k for k in range(n) if b[c + 5 * k + 4]}; i += 2
        else: setB = set(); i += 1
        out.append((setA, setB))
    return out

CITY_HDR = struct.Struct("<iiiii")  # id, x, y, owner, original owner  (pop at +32, loyalty byte at +38)
def decode_cities(b: bytes):
    """Cities via LOC_CITY_NAME_* anchors: the record header [id,x,y,owner,orig] precedes the name by 1123/1328/1730 bytes.
    We locate it by scanning back for an id whose +4/+8 look like map coords."""
    out = []; seen = set()
    for m in re.finditer(rb"LOC_CITY_NAME_[A-Z0-9_]+", b):
        p = m.start(); name = m.group().decode()
        if name in seen: continue
        cands = [p - d for d in (1123, 1328, 1730)] + list(range(p - 1, max(0, p - 3000), -1))
        for q in cands:
            if q < 0: continue
            cid, x, y, own, orig = CITY_HDR.unpack_from(b, q)
            if 0 <= x < 200 and 0 <= y < 200 and 0 <= own < 64 and 0 <= orig < 64 and cid > 0 and (cid >> 16) < 64 and cid & 0xffff < 1024:
                pop = struct.unpack_from("<i", b, q + 32)[0]
                if 0 <= pop < 60:
                    out.append({"name": name, "id": cid, "x": x, "y": y, "pid": own, "orig": orig, "pop": pop, "loy": b[q + 38], "rec": q}); seen.add(name); break
    return out

def decode_plot_arrays(b: bytes, n: int = 6656):
    """Flat int16 per-plot arrays found so far (T163: improvements @1343840, resources @1357172, 20-byte headers)."""
    imp = np_or_list(b, 1343840, n); res = np_or_list(b, 1357172, n)
    return {"improvement": imp, "resource": res}
def np_or_list(b, start, n): return list(struct.unpack_from(f"<{n}h", b, start))
