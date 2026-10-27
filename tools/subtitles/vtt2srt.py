import re,sys,json
def ts(s):
    h,m,r=s.split(':'); return int(h)*3600+int(m)*60+float(r)
def fmt(t):
    h=int(t//3600); m=int(t%3600//60); s=t%60
    return f"{h:02}:{m:02}:{int(s):02},{int(round((s-int(s))*1000))%1000:03}"
def words(path):
    txt=open(path,encoding='utf-8').read()
    out=[]
    for block in txt.split('\n\n'):
        lines=block.strip().split('\n')
        if not lines or '-->' not in lines[0]: continue
        start=ts(lines[0].split(' --> ')[0])
        for ln in lines[1:]:
            if '<c>' not in ln: continue
            first=ln.split('<')[0]
            toks=[(start,first)]
            for t,w in re.findall(r'<(\d\d:\d\d:\d\d\.\d+)><c>(.*?)</c>',ln):
                toks.append((ts(t),w))
            for t,w in toks:
                w=w.strip()
                if w: out.append([t,w])
    return out
def clean(ws,fixes):
    res=[]
    for t,w in ws:
        w=w.replace('&gt;','').replace('&nbsp;','').replace('&amp;','&').strip()
        if not w or w.lower().strip(',.') in ('[music]','[laughter]','[applause]','uh','um','mhm','mm','hmm'): continue
        res.append([t,w])
    # apply phrase fixes on joined text with word index mapping
    text=' '.join(w for _,w in res)
    for a,b in fixes:
        text=re.sub(a,b,text)
    # re-split keeping times approximately: map by word count
    new=text.split(' ')
    if len(new)!=len(res):
        # redistribute times proportionally
        times=[t for t,_ in res]
        n=len(new); m=len(times)
        res=[[times[min(m-1,int(i*m/n))],w] for i,w in enumerate(new)]
    else:
        res=[[t,w] for (t,_),w in zip(res,new)]
    return [x for x in res if x[1]!='~DEL~']
def cues(ws,maxc=84,line=42,gap=2.0):
    cs=[];cur=[]
    for i,(t,w) in enumerate(ws):
        if cur:
            L=len(' '.join(x for _,x in cur))
            if t-cur[-1][0]>gap or L+1+len(w)>maxc or (L>35 and re.search(r'[.?!]$',cur[-1][1])):
                cs.append(cur);cur=[]
        cur.append([t,w])
    if cur: cs.append(cur)
    out=[]
    for i,c in enumerate(cs):
        st=c[0][0]
        nxt=cs[i+1][0][0] if i+1<len(cs) else c[-1][0]+2
        en=min(nxt, c[-1][0]+1.2)
        en=max(en,st+0.8)
        if i+1<len(cs): en=min(en,nxt-0.01)
        text=' '.join(w for _,w in c)
        if len(text)>line:
            # split into two balanced lines at a space
            mid=len(text)//2; sp=[m.start() for m in re.finditer(' ',text)]
            b=min(sp,key=lambda p:abs(p-mid)) if sp else mid
            text=text[:b]+'\n'+text[b+1:]
        prev=out[-1][2] if out else '.'
        if text and re.search(r'[.?!]$',prev.strip()): text=text[0].upper()+text[1:]
        out.append((st,en,text))
    return out
if __name__=='__main__':
    src,dst,fixfile=sys.argv[1],sys.argv[2],sys.argv[3]
    fixes=json.load(open(fixfile)) if fixfile!='-' else []
    cs=cues(clean(words(src),fixes))
    with open(dst,'w',encoding='utf-8') as f:
        for i,(a,b,t) in enumerate(cs,1):
            f.write(f"{i}\n{fmt(a)} --> {fmt(b)}\n{t}\n\n")
    print(dst,len(cs),'cues')
