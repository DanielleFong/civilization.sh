"""Emit the Lua for one dump_turn section (helpers + section block), with DT_* vars prepended."""
import re, sys, pathlib
SRC = pathlib.Path(__file__).with_name("dump_turn.lua").read_text()
lines = [l for l in SRC.split("\n") if l.strip() and not l.strip().startswith("--")]
src = "\n".join(lines)
blocks = re.split(r'\n(?=if S == ")', src)
helpers = blocks[0]
sections = {re.match(r'if S == "(\w+)"', b).group(1): b for b in blocks[1:]}
def code(section, lo=None, hi=None, end="---END---"):
    pre = f'DT_SECTION="{section}"\n'
    if lo is not None: pre += f"DT_LO={lo}\nDT_HI={hi}\n"
    body = sections[section].replace('print("DT_END " .. S)', "")
    return pre + helpers + "\n" + body + f'\nprint("DT_END {section}")\nprint("{end}")'
if __name__ == "__main__":
    a = sys.argv[1:]; print(code(a[0], *(int(x) for x in a[1:])))
