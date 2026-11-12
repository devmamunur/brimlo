# /// script
# dependencies = ["numpy", "pillow", "scipy"]
# ///
"""Make the 4 avatar faces (mouth closed/open x eyes open/blink) from the channel logo.

Run once (already done 13 Nov 2026): uv run tools/avatar/make_faces.py
Input: channel/brand/logo-v3-2026-11-05.png  Output: channel/brand/avatar/brimlo-mouth-*.png
Pixel positions are tuned for this logo; a new logo needs new positions.
"""
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
os.chdir(os.path.join(ROOT, "channel", "brand", "avatar"))
import sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
src="../logo-v3-2026-11-05.png"
im=np.array(Image.open(src).convert('RGB')).astype(int)
r,g,b=im[...,0],im[...,1],im[...,2]
blue=(b>r+40)&(b>g+10)
lab,n=ndimage.label(blue)
edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
bg=np.isin(lab,list(edge))
fg=~bg
fg=ndimage.binary_fill_holes(fg)
# keep largest component
lab2,n2=ndimage.label(fg); sizes=ndimage.sum(fg,lab2,range(1,n2+1)); fg=lab2==(np.argmax(sizes)+1)
fg=ndimage.binary_erosion(fg,iterations=1)
alpha=(ndimage.gaussian_filter(fg.astype(float),0.8)*255).clip(0,255).astype(np.uint8)
out=np.dstack([im.astype(np.uint8),alpha])
ys,xs=np.where(fg); print('bbox',xs.min(),ys.min(),xs.max(),ys.max())
Image.fromarray(out,'RGBA').save('cut.png')
S=4
base=Image.open('cut.png').convert('RGBA'); W,H=base.size
arr=np.array(base).astype(float)

def ell(cx,cy,rx,ry):
    y,x=np.mgrid[0:H,0:W]; return ((x-cx)/rx)**2+((y-cy)/ry)**2<=1

def inpaint(a,mask,iters=5000):
    a=a.copy(); rgb=a[...,:3].copy()
    ys,xs=np.nonzero(mask); y0,y1,x0,x1=ys.min()-3,ys.max()+4,xs.min()-3,xs.max()+4
    sub=rgb[y0:y1,x0:x1].copy(); m=mask[y0:y1,x0:x1]
    ok=(~NOBLEED[y0:y1,x0:x1])|m
    sub[m]=sub[~m&ok].mean(0)
    w=ok.astype(float)
    def sh(v,d,ax): return np.roll(v,d,ax)
    for _ in range(iters):
        num=sum(sh(sub*w[...,None],d,ax) for d in (1,-1) for ax in (0,1))
        den=sum(sh(w,d,ax) for d in (1,-1) for ax in (0,1))[...,None]
        avg=num/np.maximum(den,1e-6)
        sub[m]=avg[m]
    rgb[y0:y1,x0:x1]=sub; a[...,:3]=rgb; return a

def comps_at(points,cond):
    lab,_=ndimage.label(cond); ids={lab[y,x] for x,y in points}-{0}
    return np.isin(lab,list(ids))

yy=np.mgrid[0:H,0:W][0]
rgb0=arr[...,:3]; R,G,B=rgb0[...,0],rgb0[...,1],rgb0[...,2]
yellow=(R>185)&(G>130)&(B<130)&~((R>190)&(G<190)&(B>90))
nonyellow=~yellow
ny=nonyellow.copy(); ny[:330]=False; ny[540:]=False; ny[:, :240]=False; ny[:, 600:]=False
lab,n=ndimage.label(ny)
objs=ndimage.find_objects(lab)
def pick(x0,x1,y0,y1):
    out=np.zeros((H,W),bool)
    for i,sl in enumerate(objs,1):
        if sl is None: continue
        if x0<=sl[1].start and sl[1].stop<=x1 and y0<=sl[0].start and sl[0].stop<=y1 and (lab[sl]==i).sum()>100:
            out|=lab==i; print('pick',i,sl)
    return out
brow=pick(450,545,340,380)|pick(268,366,348,403)
blush=pick(520,595,465,510)|pick(240,316,485,530)
eye_px=pick(440,568,386,480)|pick(262,390,395,486)
NOBLEED=ndimage.binary_dilation(brow|blush,iterations=1)
eyes=ndimage.binary_dilation(eye_px,iterations=5)&~NOBLEED
smile_px=pick(328,512,480,532)
smile=ndimage.binary_dilation(smile_px,iterations=5)&~NOBLEED
def smile_mask(): return smile
def layer():
    return Image.new('RGBA',(W*S,H*S),(0,0,0,0))
def down(l): return l.resize((W,H),Image.LANCZOS)

def draw_closed_eyes():
    l=layer(); d=ImageDraw.Draw(l)
    for cx,cy in ((327,452),(503,447)):
        # happy closed eye: arc curving down (like a smile line)
        bbox=[(cx-52)*S,(cy-30)*S,(cx+52)*S,(cy+22)*S]
        d.arc(bbox,start=200,end=340,fill=(0,0,0,255),width=10*S)
        # small lash at outer side
    return down(l)

def draw_open_mouth(depth=1.0):
    l=layer(); d=ImageDraw.Draw(l)
    top=[(338,496),(370,503),(420,506),(470,502),(503,494)]
    bot=[(503,494),(495,520),(470,545),(420,557),(370,546),(346,522),(338,496)]
    top=[(x,500+(y-500)*(0.6+0.4*depth)) for x,y in top]
    bot=[(x,500+(y-500)*depth) if y>500 else (x,500+(y-500)*(0.6+0.4*depth)) for x,y in bot]
    poly=[(x*S,y*S) for x,y in top+bot]
    d.polygon(poly,fill=(70,20,25,255))
    # tongue
    tl=layer(); td=ImageDraw.Draw(tl)
    td.ellipse([380*S,(500+25*depth)*S,465*S,(500+75*depth)*S],fill=(235,95,105,255))
    mask=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(mask).polygon(poly,fill=255)
    l.paste(tl,(0,0),Image.fromarray(np.minimum(np.array(tl)[...,3],np.array(mask)).astype(np.uint8)))
    d=ImageDraw.Draw(l)
    d.line(poly+[poly[0]],fill=(0,0,0,255),width=8*S,joint='curve')
    for x,y in (top[0],top[-1]):
        d.ellipse([(x-6)*S,(y-6)*S,(x+6)*S,(y+6)*S],fill=(0,0,0,255))
    return down(l)

def build(mouth_open,blink):
    a=arr.copy(); m=np.zeros((H,W),bool)
    if mouth_open: m|=smile_mask()
    if blink: m|=eyes
    if m.any(): a=inpaint(a,m)
    im=Image.fromarray(a.clip(0,255).astype(np.uint8),'RGBA')
    if mouth_open: im.alpha_composite(draw_open_mouth(mouth_open))
    if blink: im.alpha_composite(draw_closed_eyes())
    return im

out={'brimlo-mouth-closed.png':(0,0),'brimlo-mouth-half.png':(0.5,0),'brimlo-mouth-half-blink.png':(0.5,1),'brimlo-mouth-open.png':(1,0),'brimlo-mouth-closed-blink.png':(0,1),'brimlo-mouth-open-blink.png':(1,1)}
ims=[]
for n,(o,b) in out.items():
    im=build(o,b).crop((130,85,670,670)); im.save(n); ims.append(im)

# ---------- expressions (wow / happy / sad / think), each with closed / half / open mouth ----------
lum0=rgb0.mean(-1)
brow_L=pick(268,366,348,403); brow_R=pick(450,545,340,380)

def brow_img(bm):
    """The brow as its own RGBA layer (soft edges kept)."""
    reg=ndimage.binary_dilation(bm,iterations=2)
    al=np.clip((200-lum0)/150,0,1)*reg
    l=np.zeros((H,W,4),np.uint8); l[...,3]=(al*255).astype(np.uint8)
    return Image.fromarray(l,'RGBA'), ndimage.center_of_mass(bm)

def moved(img_c, dx=0, dy=0, ang=0):
    img,(cy,cx)=img_c
    out=Image.new('RGBA',(W,H),(0,0,0,0))
    r=img.rotate(ang,resample=Image.BICUBIC,center=(cx,cy),translate=(dx,dy))
    out.alpha_composite(r); return out

BL,BR=brow_img(brow_L),brow_img(brow_R)

def erase(a,*masks):
    m=np.zeros((H,W),bool)
    for k in masks: m|=k
    return inpaint(a,m)

brows_m=ndimage.binary_dilation(brow_L|brow_R,iterations=3)

def poly_mouth(top,bot,tongue=None,lw=8):
    l=layer(); d=ImageDraw.Draw(l)
    poly=[(x*S,y*S) for x,y in top+bot]
    d.polygon(poly,fill=(70,20,25,255))
    if tongue:
        tl=layer(); ImageDraw.Draw(tl).ellipse([v*S for v in tongue],fill=(235,95,105,255))
        mk=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(mk).polygon(poly,fill=255)
        l.paste(tl,(0,0),Image.fromarray(np.minimum(np.array(tl)[...,3],np.array(mk)).astype(np.uint8)))
        d=ImageDraw.Draw(l)
    d.line(poly+[poly[0]],fill=(0,0,0,255),width=lw*S,joint='curve')
    return down(l)

def o_mouth(cx,cy,rx,ry):
    l=layer(); d=ImageDraw.Draw(l)
    d.ellipse([(cx-rx)*S,(cy-ry)*S,(cx+rx)*S,(cy+ry)*S],fill=(70,20,25,255),outline=(0,0,0,255),width=7*S)
    if ry>20:
        tl=layer(); ImageDraw.Draw(tl).ellipse([(cx-rx*0.7)*S,(cy+ry*0.25)*S,(cx+rx*0.7)*S,(cy+ry*1.2)*S],fill=(235,95,105,255))
        mk=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(mk).ellipse([(cx-rx+4)*S,(cy-ry+4)*S,(cx+rx-4)*S,(cy+ry-4)*S],fill=255)
        l.paste(tl,(0,0),Image.fromarray(np.minimum(np.array(tl)[...,3],np.array(mk)).astype(np.uint8)))
    return down(l)

def stroke(pts,w=8):
    l=layer(); d=ImageDraw.Draw(l)
    d.line([(x*S,y*S) for x,y in pts],fill=(0,0,0,255),width=w*S,joint='curve')
    for x,y in (pts[0],pts[-1]): d.ellipse([(x-w/2)*S,(y-w/2)*S,(x+w/2)*S,(y+w/2)*S],fill=(0,0,0,255))
    return down(l)

def happy_eyes():
    l=layer(); d=ImageDraw.Draw(l)
    for cx,cy in ((327,450),(503,445)):
        d.arc([(cx-50)*S,(cy-34)*S,(cx+50)*S,(cy+30)*S],start=195,end=345,fill=(0,0,0,255),width=12*S)
    return down(l)

def tear():
    l=layer(); d=ImageDraw.Draw(l)
    cx,cy=548,500
    d.polygon([(cx*S,(cy-30)*S),((cx-14)*S,(cy+2)*S),((cx+14)*S,(cy+2)*S)],fill=(120,210,255,255))
    d.ellipse([(cx-14)*S,(cy-12)*S,(cx+14)*S,(cy+16)*S],fill=(120,210,255,255),outline=(30,90,160,255),width=3*S)
    d.ellipse([(cx-5)*S,(cy-4)*S,(cx)*S,(cy+2)*S],fill=(255,255,255,230))
    return down(l)

def face(expr, lvl):
    a=arr.copy()
    if expr=='wow':
        a=erase(a,smile,brows_m); im=Image.fromarray(a.clip(0,255).astype(np.uint8),'RGBA')
        im.alpha_composite(moved(BL,0,-24,-8)); im.alpha_composite(moved(BR,0,-24,8))
        rx,ry={0:(13,15),0.5:(20,25),1:(26,34)}[lvl]
        im.alpha_composite(o_mouth(420,516+ry*0.3,rx,ry))
    elif expr=='happy':
        a=erase(a,smile,eyes,brows_m); im=Image.fromarray(a.clip(0,255).astype(np.uint8),'RGBA')
        im.alpha_composite(moved(BL,0,-8,0)); im.alpha_composite(moved(BR,0,-8,0))
        im.alpha_composite(happy_eyes())
        im.alpha_composite(draw_open_mouth({0:0.55,0.5:0.85,1:1.15}[lvl]))
    elif expr=='sad':
        a=erase(a,smile,brows_m); im=Image.fromarray(a.clip(0,255).astype(np.uint8),'RGBA')
        im.alpha_composite(moved(BL,6,8,24)); im.alpha_composite(moved(BR,-6,10,-24))
        if lvl==0:
            im.alpha_composite(stroke([(380,525),(400,513),(420,509),(440,512),(462,524)],8))
        else:
            h={0.5:12,1:20}[lvl]
            top=[(382,522),(400,510),(420,506),(442,509),(460,521)]
            bot=[(460,521),(445,521+h*0.3),(420,520+h*0.45),(395,521+h*0.3),(382,522)]
            top=[(x,y-h*0.5) for x,y in top]
            im.alpha_composite(poly_mouth(top,bot,lw=7))
        im.alpha_composite(tear())
    elif expr=='think':
        a=erase(a,smile,brows_m); im=Image.fromarray(a.clip(0,255).astype(np.uint8),'RGBA')
        im.alpha_composite(moved(BL,0,8,-8)); im.alpha_composite(moved(BR,0,-22,10))
        if lvl==0:
            im.alpha_composite(stroke([(395,518),(415,515),(435,513),(455,508)],8))
        else:
            rx,ry={0.5:(12,9),1:(15,14)}[lvl]
            im.alpha_composite(o_mouth(440,513,rx,ry))
    return im

for expr in ('wow','happy','sad','think'):
    for lvl,name in ((0,'closed'),(0.5,'half'),(1,'open')):
        face(expr,lvl).crop((130,85,670,670)).save(f'brimlo-{expr}-{name}.png')
os.remove("cut.png")
