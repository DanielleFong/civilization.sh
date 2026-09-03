"""Create N labelled Civ VI instance binaries, each with its own FireTuner port.
The port is a 4-byte immediate in `mov dword [rsp+0x20], 4318` (file offset 0x74a9f in build 1.0.12.54 / 951533);
we verify the opcode bytes before patching. Original CivilizationVI_DX12.exe is never modified.
Usage: python make_instances.py [N=32] [base_port=4401]   -> CivilizationVI_i01.exe … + instances.json"""
import json, pathlib, sys
BIN = pathlib.Path(r"C:\Program Files (x86)\Steam\steamapps\common\Sid Meier's Civilization VI\Base\Binaries\Win64Steam")
if not BIN.exists(): BIN = pathlib.Path("/mnt/c/Program Files (x86)/Steam/steamapps/common/Sid Meier's Civilization VI/Base/Binaries/Win64Steam")
SITE = 0x74a9f; OPC = bytes.fromhex("c7442420"); DEFAULT = 4318
n = int(sys.argv[1]) if len(sys.argv) > 1 else 32; base = int(sys.argv[2]) if len(sys.argv) > 2 else 4401
src = (BIN / "CivilizationVI_DX12.exe").read_bytes()
assert src[SITE:SITE + 8] == OPC + DEFAULT.to_bytes(4, "little"), "port site not where expected — different game build?"
man = {"original": {"exe": "CivilizationVI_DX12.exe", "port": DEFAULT}, "instances": []}
for i in range(1, n + 1):
    port = base + i - 1; name = f"CivilizationVI_i{i:02d}.exe"; b = bytearray(src); b[SITE + 4:SITE + 8] = port.to_bytes(4, "little")
    (BIN / name).write_bytes(b); man["instances"].append({"exe": name, "port": port})
(BIN / "instances.json").write_text(json.dumps(man, indent=1)); (pathlib.Path(__file__).with_name("instances.json")).write_text(json.dumps(man, indent=1))
print(f"wrote {n} instances, ports {base}..{base + n - 1}, manifest instances.json")
