# Render per-turn stills into labeled 1920x1060 frames; ffmpeg turns them into a 30fps montage.
import re, glob, os
from PIL import Image, ImageDraw, ImageFont
SRC=r"C:\Users\danie\cc\civilization.sh\video\frames\archive"; OUT=r"C:\Users\danie\cc\civilization.sh\video\edit\montage"
SIT=open(r"C:\Users\danie\cc\civilization.sh\video\frames\sitrep.md",encoding="utf-8").read()
secs={}
for part in re.split(r'^(?=### T)',SIT,flags=re.M):
    m=re.match(r'### T(\d+)',part)
    if m: secs[int(m.group(1))]=re.sub(r'\s+',' ',part.split('\n',1)[1]).strip() if '\n' in part else ''
try: F=ImageFont.truetype(r"C:\Windows\Fonts\georgia.ttf",34); Fs=ImageFont.truetype(r"C:\Windows\Fonts\consola.ttf",26)
except: F=Fs=ImageFont.load_default()
def wrap(t,w,font,d):
    words=t.split(); lines=[]; cur=''
    for wd in words:
        if d.textlength(cur+' '+wd,font=font)>w: lines.append(cur); cur=wd
        else: cur=(cur+' '+wd).strip()
    if cur: lines.append(cur)
    return lines[:3]
files=sorted(glob.glob(os.path.join(SRC,"t*.jpg")))
seen=set(); i=0
for f in files:
    t=int(os.path.basename(f)[1:5])
    if t in seen or t>146: continue
    seen.add(t)
    im=Image.open(f).convert("RGB").resize((1920,1060))
    d=ImageDraw.Draw(im,"RGBA")
    d.rectangle([0,940,1920,1060],fill=(11,12,10,215))
    d.text((28,952),f"T{t}",font=F,fill=(242,164,19))
    k=t
    while k>0 and k not in secs: k-=1
    txt=secs.get(k,'')
    for j,line in enumerate(wrap(txt,1720,Fs,d)): d.text((150,952+j*32),line,font=Fs,fill=(217,207,182))
    im.save(os.path.join(OUT,f"f{i:04d}.jpg"),quality=88); i+=1
print("frames",i)
